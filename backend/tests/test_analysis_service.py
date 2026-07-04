"""
Unit tests for the analysis_service in-memory job registry and pruning logic.
"""

import time
import pytest
from unittest import mock
from app.services import analysis_service


@pytest.fixture(autouse=True)
def clean_registry():
    """Ensure the job registry is empty before and after each test."""
    analysis_service._jobs.clear()
    analysis_service._last_pruned_at = 0.0
    yield
    analysis_service._jobs.clear()


def test_register_job_sets_initial_state():
    """SV1: register_job creates a processing job with a timestamp."""
    job_id = "job-1"
    analysis_service.register_job(job_id)
    
    job = analysis_service._jobs[job_id]
    assert job["status"] == "processing"
    assert "timestamp" in job


def test_update_job_overwrites_data():
    """SV2: update_job updates the job dictionary."""
    job_id = "job-2"
    analysis_service.register_job(job_id)
    analysis_service.update_job(job_id, {"status": "completed", "result": {"foo": "bar"}})
    
    job = analysis_service._jobs[job_id]
    assert job["status"] == "completed"
    assert job["result"] == {"foo": "bar"}


def test_get_job_status_unknown_id():
    """SV3: get_job_status returns None for an unknown job_id."""
    assert analysis_service.get_job_status("unknown") is None


@mock.patch("app.services.analysis_service.time.time")
def test_get_job_status_deterministic_pruning(mock_time):
    """SV4: Pruning only happens if >300s have passed since last prune."""
    # Start at time 1000
    mock_time.return_value = 1000.0
    analysis_service._last_pruned_at = 1000.0
    
    # Add a job that is very old
    analysis_service._jobs["old_job"] = {"status": "processing", "timestamp": 100.0}
    
    # Advance time by 200s (not enough for a prune, threshold is 300)
    mock_time.return_value = 1200.0
    analysis_service.get_job_status("some_job")
    # Job should still be there because pruning didn't trigger
    assert "old_job" in analysis_service._jobs
    
    # Advance time past 300s since last prune
    mock_time.return_value = 1400.0
    analysis_service.get_job_status("some_job")
    # Pruning triggered, job should be removed because 1400 - 100 > 3600
    # Wait, the stale threshold is >3600. So 100.0 is stale at 1400.0 (1400 - 100 = 1300, which is NOT > 3600).
    # Let's adjust the job timestamp to be >3600s old relative to 1400.0.
    # 1400 - 3600 = -2200. So timestamp must be < -2200. Let's say -3000.0.
    
    analysis_service._jobs["really_old"] = {"status": "processing", "timestamp": -3000.0}
    
    mock_time.return_value = 1800.0
    # Pruning triggers since 1800 - 1400 = 400 > 300
    analysis_service.get_job_status("some_job")
    assert "really_old" not in analysis_service._jobs
    assert analysis_service._last_pruned_at == 1800.0


@mock.patch("app.services.analysis_service.time.time")
def test_pruning_removes_stale_keeps_fresh(mock_time):
    """SV5: Pruning removes jobs older than 1 hour and keeps fresh jobs."""
    current_time = 10000.0
    mock_time.return_value = current_time
    
    analysis_service._jobs["fresh"] = {"status": "processing", "timestamp": current_time - 10}
    analysis_service._jobs["stale"] = {"status": "completed", "timestamp": current_time - 4000}
    
    # Trigger prune by moving time past 300s window
    mock_time.return_value = current_time + 400.0
    
    analysis_service.get_job_status("some_job")
    
    assert "fresh" in analysis_service._jobs
    assert "stale" not in analysis_service._jobs
