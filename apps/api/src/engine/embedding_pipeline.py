import uuid
import logging
from typing import List, Dict, Any, Optional
from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct, PayloadSchemaType
from apps.api.src.config import settings
from apps.api.src.models import DocumentChunk
from apps.api.src.utils.ai_client import ai_gateway_client

logger = logging.getLogger("cis-embedding-pipeline")

class EmbeddingPipeline:
    def __init__(self, qdrant_url: Optional[str] = None):
        self.qdrant_url = qdrant_url or settings.QDRURL if hasattr(settings, "QDRURL") else getattr(settings, "QDRANT_URL", "http://localhost:6333")
        self.qdrant_url = qdrant_url or settings.QDRANT_URL
        try:
            self.qdrant_client = QdrantClient(url=self.qdrant_url)
            # Re-ensure collection is created
            self._ensure_collection_exists()
            logger.info("Successfully connected to Qdrant inside EmbeddingPipeline.")
        except Exception as e:
            logger.warning(f"EmbeddingPipeline could not connect to Qdrant at {self.qdrant_url}: {e}. Running in DB-only mode.")
            self.qdrant_client = None

    def _ensure_collection_exists(self, collection_name: str = "career_chunks"):
        if self.qdrant_client:
            # Check if collection exists, if not create it
            collections = self.qdrant_client.get_collections().collections
            collection_names = [c.name for c in collections]
            if collection_name not in collection_names:
                self.qdrant_client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=1024, distance=Distance.COSINE),
                )
                logger.info(f"Created Qdrant collection: {collection_name}")
                
                try:
                    self.qdrant_client.create_payload_index(
                        collection_name=collection_name,
                        field_name="user_id",
                        field_schema=PayloadSchemaType.KEYWORD,
                    )
                    logger.info(f"Created keyword payload index on user_id for collection: {collection_name}")
                except Exception as index_err:
                    logger.warning(f"Failed to create Qdrant payload index on user_id: {index_err}")

    def chunk_text(self, text: str, chunk_size: int = 500, overlap: int = 50) -> List[str]:
        """
        Splits text into chunks, respecting paragraph boundaries (\n\n or \n) and sentence boundaries,
        while maintaining target chunk sizes.
        """
        if not text:
            return []

        # First, split by obvious paragraph breaks
        raw_paragraphs = [p.strip() for p in re_split_paragraphs(text) if p.strip()]
        chunks = []
        current_chunk = []
        current_len = 0

        for para in raw_paragraphs:
            # If a single paragraph is too large, split it by sentences
            if len(para) > chunk_size:
                sentences = [s.strip() for s in re_split_sentences(para) if s.strip()]
                for sent in sentences:
                    if current_len + len(sent) > chunk_size:
                        if current_chunk:
                            chunks.append(" ".join(current_chunk))
                        # implement overlap: take last sentence if overlap is configured
                        if overlap > 0 and current_chunk:
                            current_chunk = [current_chunk[-1], sent] if len(current_chunk[-1]) < overlap else [sent]
                        else:
                            current_chunk = [sent]
                        current_len = sum(len(s) for s in current_chunk)
                    else:
                        current_chunk.append(sent)
                        current_len += len(sent)
            else:
                if current_len + len(para) > chunk_size:
                    if current_chunk:
                        chunks.append("\n".join(current_chunk))
                    # implement overlap
                    if overlap > 0 and current_chunk:
                        current_chunk = [current_chunk[-1], para] if len(current_chunk[-1]) < overlap else [para]
                    else:
                        current_chunk = [para]
                    current_len = sum(len(p) for p in current_chunk)
                else:
                    current_chunk.append(para)
                    current_len += len(para)

        if current_chunk:
            chunks.append("\n".join(current_chunk))

        # Backup: if we somehow got no chunks, split text naively
        if not chunks:
            chunks = [text]

        return chunks

    async def generate_embeddings(self, chunks: List[str]) -> List[List[float]]:
        """Generates embeddings via AI Gateway."""
        if not chunks:
            return []
        try:
            embeddings = await ai_gateway_client.embed(chunks)
            return embeddings
        except Exception as e:
            logger.error(f"Error generating embeddings: {e}")
            # Fallback to zero vectors of size 1024
            return [[0.0] * 1024 for _ in chunks]

    async def process_and_index_document(
        self,
        db_session,
        user_id: uuid.UUID,
        document_id: uuid.UUID,
        text: str,
        chunk_size: int = 500,
        overlap: int = 50
    ) -> List[DocumentChunk]:
        """
        Runs the full ingestion pipeline:
        1. Chunks parsed text
        2. Generates vector embeddings
        3. Saves chunks in Relational DB
        4. Indexes vectors in Qdrant (if available)
        """
        chunks_text = self.chunk_text(text, chunk_size, overlap)
        embeddings = await self.generate_embeddings(chunks_text)
        
        db_chunks = []
        qdrant_points = []
        
        for idx, (chunk_text, vector) in enumerate(zip(chunks_text, embeddings)):
            chunk_id = uuid.uuid4()
            
            # 1. SQL Database Chunk
            db_chunk = DocumentChunk(
                id=chunk_id,
                document_id=document_id,
                user_id=user_id,
                chunk_index=idx,
                chunk_text=chunk_text,
                embedding_vector_id=chunk_id,
                meta_data={}
            )
            db_session.add(db_chunk)
            db_chunks.append(db_chunk)
            
            # 2. Qdrant Point
            if self.qdrant_client:
                qdrant_points.append(
                    PointStruct(
                        id=str(chunk_id),
                        vector=vector,
                        payload={
                            "document_id": str(document_id),
                            "user_id": str(user_id),
                            "chunk_index": idx,
                            "text": chunk_text
                        }
                    )
                )
        
        # Commit to SQL DB
        db_session.commit()
        
        # Upsert to Qdrant
        if self.qdrant_client and qdrant_points:
            try:
                self.qdrant_client.upsert(
                    collection_name="career_chunks",
                    points=qdrant_points
                )
                logger.info(f"Successfully upserted {len(qdrant_points)} points to Qdrant.")
            except Exception as e:
                logger.error(f"Failed to upsert points to Qdrant: {e}")
                
        return db_chunks

def re_split_paragraphs(text: str) -> List[str]:
    # splits by double newlines or single newlines
    import re
    return re.split(r"\n\s*\n|\n", text)

def re_split_sentences(text: str) -> List[str]:
    # splits by sentence boundaries (dot, question, exclamation) followed by whitespace
    import re
    return re.split(r"(?<=[.!?])\s+", text)
