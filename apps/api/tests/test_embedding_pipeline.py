import pytest
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from apps.api.src.database import Base
from apps.api.src.models import User, Document, DocumentChunk
from apps.api.src.engine.embedding_pipeline import EmbeddingPipeline

@pytest.fixture(name="db_session")
def fixture_db_session():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = TestingSessionLocal()
    
    # Create default user
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        hashed_password="hashed_pwd"
    )
    session.add(user)
    session.commit()
    yield session
    session.close()

def test_text_chunking():
    pipeline = EmbeddingPipeline()
    text = "Short text."
    chunks = pipeline.chunk_text(text, chunk_size=50)
    assert len(chunks) == 1
    assert chunks[0] == "Short text."
    
    # Larger text to force split
    text = "Paragraph one of text. It has some sentences.\n\nParagraph two of text. It has more sentences."
    chunks = pipeline.chunk_text(text, chunk_size=30)
    assert len(chunks) > 1
    assert any("Paragraph one" in c for c in chunks)
    assert any("Paragraph two" in c for c in chunks)

@pytest.mark.asyncio
async def test_process_and_index_document(db_session):
    user = db_session.query(User).first()
    pipeline = EmbeddingPipeline()
    
    # Create document
    doc = Document(
        id=uuid.uuid4(),
        user_id=user.id,
        filename="resume.txt",
        file_path="/path/resume.txt",
        mime_type="text/plain",
        document_type="resume"
    )
    db_session.add(doc)
    db_session.commit()
    
    # Mocking Qdrant by letting the client run in fallback mock mode
    text = "This is a software developer resume.\n\nI code in Python and FastAPI daily."
    db_chunks = await pipeline.process_and_index_document(
        db_session=db_session,
        user_id=user.id,
        document_id=doc.id,
        text=text,
        chunk_size=30
    )
    
    assert len(db_chunks) >= 2
    # Verify chunks are saved in database
    saved_chunks = db_session.query(DocumentChunk).filter(DocumentChunk.document_id == doc.id).all()
    assert len(saved_chunks) == len(db_chunks)
    assert saved_chunks[0].chunk_text is not None
