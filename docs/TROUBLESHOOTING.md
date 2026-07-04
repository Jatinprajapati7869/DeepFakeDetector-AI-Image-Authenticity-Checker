# Troubleshooting Guide

This document covers common issues you might encounter while running or developing DeepFakeDetector.

---

## Installation & Setup Issues

### 1. `torch` version not found (Python 3.13 / 3.14)
**Symptom**: Running `npm run setup` fails during the Python dependency installation with:
> `ERROR: Could not find a version that satisfies the requirement torch==2.3.1`

**Cause**: PyTorch releases binary wheels specific to Python versions. If you are running a bleeding-edge version of Python (e.g., 3.14), pre-compiled wheels for `torch==2.3.1` might not exist yet.

**Solution**: 
Downgrade your local Python environment to `3.11` or `3.12`. Alternatively, use `pyenv` or `conda` to manage a compatible Python version for this project.

### 2. SQLite "Database is Locked" Errors
**Symptom**: Intermittent `OperationalError: database is locked` in the backend terminal.

**Cause**: A transaction is holding a lock on the `history.db` file. We enabled `WAL` mode to prevent this, but it can still occur if a GUI database viewer (like DB Browser for SQLite) is holding a lock on the file.

**Solution**:
Close any external applications viewing the `history.db` file and restart the backend server.

---

## Development Issues

### 3. Missing `ruff` or `pytest` command
**Symptom**: `npm run check` fails with `'ruff' is not recognized as an internal or external command`.

**Cause**: The Python bin/scripts directory is not in your system's PATH.

**Solution**:
Our `package.json` scripts use `python -m ruff` to bypass PATH issues. Ensure you are using the latest `package.json` scripts. If it still fails, ensure the dependencies were actually installed (`cd backend && pip install -r requirements.txt`).

### 4. Tests failing with "Warning: An update to TestComponent inside a test was not wrapped in act(...)"
**Symptom**: React frontend tests pass, but output numerous red warnings about `act()`.

**Cause**: A hook or component triggered a state update asynchronously (e.g., `React.lazy`, or a `setTimeout` inside a `useEffect`), and the test finished or progressed before the React reconciliation engine could catch up.

**Solution**:
Use `waitFor` from `@testing-library/react` to await the specific DOM changes you expect, rather than directly invoking `act()`.

---

## Production Issues

### 5. Render Free Tier Cold Starts
**Symptom**: The first API request to the deployed application takes 30-50 seconds, resulting in a timeout on the frontend.

**Cause**: Render's free tier spins down the backend container after 15 minutes of inactivity. When a request hits the sleeping container, it must boot Python, load PyTorch, and download the EfficientNet weights into memory.

**Solution**:
This is expected behavior for the free tier. The frontend handles this by showing a "Waking up server..." message. If this is unacceptable, upgrade the Render instance to a paid tier.
