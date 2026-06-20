import uuid
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from apps.api.src.models import Achievement, Certification, Document, DocumentChunk, Education, Experience, Skill


class CareerRepository:
    def __init__(self, db: Session):
        self.db = db

    def _to_uuid(self, val: Any) -> uuid.UUID:
        if isinstance(val, str):
            return uuid.UUID(val)
        return val

    # --- Profile Aggregation ---
    def get_user_profile(self, user_id: Any) -> dict[str, Any]:
        """Aggregates all career components for a user into a single profile payload."""
        uid = self._to_uuid(user_id)
        return {
            "experiences": self.get_experiences(uid),
            "skills": self.get_skills(uid),
            "certifications": self.get_certifications(uid),
            "education": self.get_education(uid),
            "achievements": self.get_achievements(uid),
        }

    # --- Experience CRUD ---
    def get_experiences(self, user_id: Any) -> list[Experience]:
        uid = self._to_uuid(user_id)
        return self.db.query(Experience).filter(Experience.user_id == uid).order_by(Experience.start_date.desc()).all()

    def add_experience(
        self,
        user_id: Any,
        company_name: str,
        role_title: str,
        start_date: date,
        description: str,
        end_date: date | None = None,
        is_current: bool = False
    ) -> Experience:
        exp = Experience(
            id=uuid.uuid4(),
            user_id=self._to_uuid(user_id),
            company_name=company_name,
            role_title=role_title,
            start_date=start_date,
            end_date=end_date,
            description=description,
            is_current=is_current
        )
        self.db.add(exp)
        self.db.commit()
        self.db.refresh(exp)
        return exp

    def update_experience(self, user_id: Any, experience_id: Any, updates: dict[str, Any]) -> Experience | None:
        uid = self._to_uuid(user_id)
        eid = self._to_uuid(experience_id)
        exp = self.db.query(Experience).filter(Experience.id == eid, Experience.user_id == uid).first()
        if exp:
            for key, val in updates.items():
                if hasattr(exp, key):
                    setattr(exp, key, val)
            self.db.commit()
            self.db.refresh(exp)
        return exp

    def delete_experience(self, user_id: Any, experience_id: Any) -> bool:
        uid = self._to_uuid(user_id)
        eid = self._to_uuid(experience_id)
        exp = self.db.query(Experience).filter(Experience.id == eid, Experience.user_id == uid).first()
        if exp:
            self.db.delete(exp)
            self.db.commit()
            return True
        return False

    # --- Skill CRUD ---
    def get_skills(self, user_id: Any) -> list[Skill]:
        uid = self._to_uuid(user_id)
        return self.db.query(Skill).filter(Skill.user_id == uid).all()

    def add_skill(self, user_id: Any, name: str, category: str, proficiency_level: str | None = None) -> Skill:
        skill = Skill(
            id=uuid.uuid4(),
            user_id=self._to_uuid(user_id),
            name=name,
            category=category,
            proficiency_level=proficiency_level
        )
        self.db.add(skill)
        self.db.commit()
        self.db.refresh(skill)
        return skill

    def delete_skill(self, user_id: Any, skill_id: Any) -> bool:
        uid = self._to_uuid(user_id)
        sid = self._to_uuid(skill_id)
        skill = self.db.query(Skill).filter(Skill.id == sid, Skill.user_id == uid).first()
        if skill:
            self.db.delete(skill)
            self.db.commit()
            return True
        return False

    # --- Certification CRUD ---
    def get_certifications(self, user_id: Any) -> list[Certification]:
        uid = self._to_uuid(user_id)
        return self.db.query(Certification).filter(Certification.user_id == uid).all()

    def add_certification(
        self,
        user_id: Any,
        name: str,
        issuing_organization: str,
        issue_date: date,
        expiry_date: date | None = None,
        credential_id: str | None = None
    ) -> Certification:
        cert = Certification(
            id=uuid.uuid4(),
            user_id=self._to_uuid(user_id),
            name=name,
            issuing_organization=issuing_organization,
            issue_date=issue_date,
            expiry_date=expiry_date,
            credential_id=credential_id
        )
        self.db.add(cert)
        self.db.commit()
        self.db.refresh(cert)
        return cert

    def delete_certification(self, user_id: Any, certification_id: Any) -> bool:
        uid = self._to_uuid(user_id)
        cid = self._to_uuid(certification_id)
        cert = self.db.query(Certification).filter(Certification.id == cid, Certification.user_id == uid).first()
        if cert:
            self.db.delete(cert)
            self.db.commit()
            return True
        return False

    # --- Education CRUD ---
    def get_education(self, user_id: Any) -> list[Education]:
        uid = self._to_uuid(user_id)
        return self.db.query(Education).filter(Education.user_id == uid).all()

    def add_education(
        self,
        user_id: Any,
        institution: str,
        degree: str,
        field_of_study: str,
        start_date: date,
        end_date: date | None = None,
        grade: str | None = None
    ) -> Education:
        edu = Education(
            id=uuid.uuid4(),
            user_id=self._to_uuid(user_id),
            institution=institution,
            degree=degree,
            field_of_study=field_of_study,
            start_date=start_date,
            end_date=end_date,
            grade=grade
        )
        self.db.add(edu)
        self.db.commit()
        self.db.refresh(edu)
        return edu

    def delete_education(self, user_id: Any, education_id: Any) -> bool:
        uid = self._to_uuid(user_id)
        eid = self._to_uuid(education_id)
        edu = self.db.query(Education).filter(Education.id == eid, Education.user_id == uid).first()
        if edu:
            self.db.delete(edu)
            self.db.commit()
            return True
        return False

    # --- Achievement CRUD ---
    def get_achievements(self, user_id: Any) -> list[Achievement]:
        uid = self._to_uuid(user_id)
        return self.db.query(Achievement).filter(Achievement.user_id == uid).all()

    def add_achievement(self, user_id: Any, title: str, description: str, date_achieved: date | None = None) -> Achievement:
        ach = Achievement(
            id=uuid.uuid4(),
            user_id=self._to_uuid(user_id),
            title=title,
            description=description,
            date_achieved=date_achieved
        )
        self.db.add(ach)
        self.db.commit()
        self.db.refresh(ach)
        return ach

    def delete_achievement(self, user_id: Any, achievement_id: Any) -> bool:
        uid = self._to_uuid(user_id)
        aid = self._to_uuid(achievement_id)
        ach = self.db.query(Achievement).filter(Achievement.id == aid, Achievement.user_id == uid).first()
        if ach:
            self.db.delete(ach)
            self.db.commit()
            return True
        return False

    # --- Document and Chunk Ingestion Operations ---
    def get_documents(self, user_id: Any) -> list[Document]:
        uid = self._to_uuid(user_id)
        return self.db.query(Document).filter(Document.user_id == uid).all()

    def get_document(self, user_id: Any, document_id: Any) -> Document | None:
        uid = self._to_uuid(user_id)
        did = self._to_uuid(document_id)
        return self.db.query(Document).filter(Document.id == did, Document.user_id == uid).first()

    def create_document(
        self,
        user_id: Any,
        filename: str,
        file_path: str,
        mime_type: str,
        document_type: str,
        parsed_text: str = "",
        metadata: dict[str, Any] | None = None
    ) -> Document:
        doc = Document(
            id=uuid.uuid4(),
            user_id=self._to_uuid(user_id),
            filename=filename,
            file_path=file_path,
            mime_type=mime_type,
            document_type=document_type,
            parsed_text=parsed_text,
            meta_data=metadata or {}
        )
        self.db.add(doc)
        self.db.commit()
        self.db.refresh(doc)
        return doc

    def delete_document(self, user_id: Any, document_id: Any) -> bool:
        uid = self._to_uuid(user_id)
        did = self._to_uuid(document_id)
        doc = self.db.query(Document).filter(Document.id == did, Document.user_id == uid).first()
        if doc:
            self.db.delete(doc)
            self.db.commit()
            return True
        return False

    def get_document_chunks(self, user_id: Any, document_id: Any) -> list[DocumentChunk]:
        uid = self._to_uuid(user_id)
        did = self._to_uuid(document_id)
        return self.db.query(DocumentChunk).filter(
            DocumentChunk.document_id == did,
            DocumentChunk.user_id == uid
        ).order_by(DocumentChunk.chunk_index.asc()).all()

    def save_document_chunk(
        self,
        user_id: Any,
        document_id: Any,
        chunk_index: int,
        chunk_text: str,
        embedding_vector_id: uuid.UUID,
        metadata: dict[str, Any] | None = None
    ) -> DocumentChunk:
        chunk = DocumentChunk(
            id=uuid.uuid4(),
            document_id=self._to_uuid(document_id),
            user_id=self._to_uuid(user_id),
            chunk_index=chunk_index,
            chunk_text=chunk_text,
            embedding_vector_id=embedding_vector_id,
            meta_data=metadata or {}
        )
        self.db.add(chunk)
        self.db.commit()
        self.db.refresh(chunk)
        return chunk
