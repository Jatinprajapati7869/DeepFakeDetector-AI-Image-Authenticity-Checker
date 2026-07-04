from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class JobAcceptedResponse(BaseModel):
    job_id: str
    message: str = "Job accepted and is processing in the background."


class JobStatusResponse(BaseModel):
    job_id: str
    status: Literal["processing", "completed", "failed"]
    result: dict | None = None
    error: str | None = None


class ArtifactBreakdown(BaseModel):
    texture_score: float = Field(..., ge=0.0, le=1.0)
    lighting_score: float = Field(..., ge=0.0, le=1.0)
    edge_score: float = Field(..., ge=0.0, le=1.0)
    frequency_score: float = Field(..., ge=0.0, le=1.0)


class AnalysisResult(BaseModel):
    id: str
    verdict: Literal["REAL", "FAKE"]
    confidence: float = Field(..., ge=0.0, le=1.0)
    heatmap_url: str
    artifacts: ArtifactBreakdown
    analysis_time_ms: int
    created_at: datetime
    filename: str


class BatchResultItem(BaseModel):
    filename: str
    result: AnalysisResult | None = None
    error: str | None = None


class BatchResponse(BaseModel):
    results: list[BatchResultItem]
    total_analysis_time_ms: int


class HistoryPage(BaseModel):
    items: list[AnalysisResult]
    total: int
    page: int
    page_size: int


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    version: str
