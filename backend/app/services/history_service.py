from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AnalysisRecord
from app.models.schemas import AnalysisResult, ArtifactBreakdown, HistoryPage


def _record_to_schema(record: AnalysisRecord) -> AnalysisResult:
    return AnalysisResult(
        id=record.id,
        filename=record.filename,
        verdict=record.verdict,  # type: ignore[arg-type]
        confidence=record.confidence,
        heatmap_url=record.heatmap_url,
        artifacts=ArtifactBreakdown(
            texture_score=record.texture_score,
            lighting_score=record.lighting_score,
            edge_score=record.edge_score,
            frequency_score=record.frequency_score,
        ),
        analysis_time_ms=record.analysis_time_ms,
        created_at=record.created_at,
    )


async def get_history_page(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 20,
) -> HistoryPage:
    offset = (page - 1) * page_size

    count_result = await db.execute(select(func.count()).select_from(AnalysisRecord))
    total = count_result.scalar_one()

    rows = await db.execute(
        select(AnalysisRecord)
        .order_by(AnalysisRecord.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    records = rows.scalars().all()

    return HistoryPage(
        items=[_record_to_schema(r) for r in records],
        total=total,
        page=page,
        page_size=page_size,
    )


async def get_analysis_by_id(
    db: AsyncSession, analysis_id: str
) -> AnalysisResult | None:
    result = await db.execute(
        select(AnalysisRecord).where(AnalysisRecord.id == analysis_id)
    )
    record = result.scalar_one_or_none()
    return _record_to_schema(record) if record else None
