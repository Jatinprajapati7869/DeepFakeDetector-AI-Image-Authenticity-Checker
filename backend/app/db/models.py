from datetime import datetime, timezone
from sqlalchemy import String, Float, Integer, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class AnalysisRecord(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    filename: Mapped[str] = mapped_column(String, nullable=False)
    verdict: Mapped[str] = mapped_column(String(4), nullable=False)  # REAL | FAKE
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    heatmap_url: Mapped[str] = mapped_column(String, nullable=False)

    # Artifact sub-scores
    texture_score: Mapped[float] = mapped_column(Float, nullable=False)
    lighting_score: Mapped[float] = mapped_column(Float, nullable=False)
    edge_score: Mapped[float] = mapped_column(Float, nullable=False)
    frequency_score: Mapped[float] = mapped_column(Float, nullable=False)

    analysis_time_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
