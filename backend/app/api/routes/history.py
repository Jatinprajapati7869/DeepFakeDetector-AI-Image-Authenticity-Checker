from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import settings
from app.models.schemas import AnalysisResult, HistoryPage
from app.services.history_service import get_analysis_by_id, get_history_page

router = APIRouter()


@router.get("/history", response_model=HistoryPage, summary="Paginated analysis history")
async def list_history(
    page: int = Query(default=1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(default=20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db),
) -> HistoryPage:
    return await get_history_page(db, page=page, page_size=page_size)


@router.get(
    "/history/{analysis_id}", response_model=AnalysisResult, summary="Get a single analysis"
)
async def get_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
) -> AnalysisResult:
    result = await get_analysis_by_id(db, analysis_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Analysis not found.")
    return result


@router.get("/heatmap/{analysis_id}", summary="Serve heatmap PNG")
async def get_heatmap(analysis_id: str) -> FileResponse:
    # Sanitize: ensure no path traversal
    safe_id = Path(analysis_id).name
    heatmap_path = settings.heatmap_dir / f"{safe_id}.png"

    if not heatmap_path.exists():
        raise HTTPException(status_code=404, detail="Heatmap not found.")

    return FileResponse(path=str(heatmap_path), media_type="image/png")
