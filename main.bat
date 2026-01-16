@echo off
setlocal enabledelayedexpansion

set "REPO_URL=https://github.com/ebanion/On-site-On-Transit.git"
set "TARGET_DIR=On-site-On-Transit"

if not exist "%TARGET_DIR%" (
  git clone "%REPO_URL%" "%TARGET_DIR%"
)

cd /d "%TARGET_DIR%"

if not exist ".venv" (
  python -m venv .venv
)

call .venv\Scripts\activate
pip install -r requirements.txt

if not exist ".env" (
  copy .env.example .env
)

echo.
echo Make sure PostgreSQL and Redis are running locally.
echo Update .env if needed before continuing.
echo.

alembic upgrade head

start "API" cmd /k "call .venv\Scripts\activate && uvicorn app.main:app --reload"
start "Worker" cmd /k "call .venv\Scripts\activate && celery -A app.workers.celery_app.celery_app worker --loglevel=info"
start "Beat" cmd /k "call .venv\Scripts\activate && celery -A app.workers.celery_app.celery_app beat --loglevel=info"

set "LOCAL_IP="
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /R /C:"IPv4 Address"') do (
  set "LOCAL_IP=%%A"
  goto :afterip
)
:afterip
if defined LOCAL_IP set "LOCAL_IP=%LOCAL_IP: =%"

echo.
echo API docs: http://localhost:8000/docs
if defined LOCAL_IP echo LAN access: http://%LOCAL_IP%:8000/docs

echo.
echo Services started. Use Ctrl+C in each window to stop.
pause
