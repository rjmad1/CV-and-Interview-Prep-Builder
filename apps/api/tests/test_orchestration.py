import pytest
import uuid
import os
import tempfile
from fastapi.testclient import TestClient
from apps.api.src.main import app
from apps.api.src.database import get_db, Base
from apps.api.src.models import User, DeveloperRequest, DeveloperTask
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

@pytest.fixture(name="client")
def fixture_client():
    # Setup temporary file-backed SQLite database
    db_fd, db_path = tempfile.mkstemp()
    db_url = f"sqlite:///{db_path}"
    engine = create_engine(db_url, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Override get_db dependency
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()
            
    app.dependency_overrides[get_db] = override_get_db
    
    # Seed a developer user to satisfy get_current_user
    db = TestingSessionLocal()
    dev_email = "developer@career-intelligence.studio"
    user = User(
        id=uuid.uuid4(),
        email=dev_email,
        hashed_password="pbkdf2:sha256:mock_hash_for_dev",
        first_name="Lead",
        last_name="Architect",
        role="admin"
    )
    db.add(user)
    db.commit()
    db.close()
    
    client = TestClient(app)
    yield client
    
    app.dependency_overrides.clear()
    
    # Cleanup temp database file
    os.close(db_fd)
    try:
        os.unlink(db_path)
    except OSError:
        pass

def test_create_and_list_developer_requests(client):
    # Submit request payload
    payload = {
        "title": "Fix Auth Bypass vulnerability",
        "description": "The authentication module contains a hardcoded developer bypass in apps/api/src/main.py that needs to be removed.",
        "request_type": "security",
        "url": "http://localhost:3000/settings",
        "screen_name": "Settings Page",
        "component_name": "Authentication module",
        "meta_data": {"platform": "Windows"}
    }
    
    # Post request
    response = client.post("/api/orchestration/requests", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Fix Auth Bypass vulnerability"
    assert data["request_type"] == "security"
    assert data["priority"] == "critical"
    assert len(data["tasks"]) > 0
    assert data["tasks"][0]["affected_layer"] == "backend"
    
    # List requests
    list_response = client.get("/api/orchestration/requests")
    assert list_response.status_code == 200
    list_data = list_response.json()
    assert len(list_data) == 1
    assert list_data[0]["title"] == "Fix Auth Bypass vulnerability"
    
    # List tasks
    tasks_response = client.get("/api/orchestration/tasks")
    assert tasks_response.status_code == 200
    tasks_data = tasks_response.json()
    assert len(tasks_data) > 0
    assert tasks_data[0]["title"] is not None
