"""
Soundril Audio Processor - FastAPI Server
Cloud Run GPU worker for audio processing tasks.
"""

import os
import signal
import time
import traceback

from fastapi import FastAPI, Request, HTTPException
from pydantic import BaseModel

from .pipeline import process_job
from .logger import get_logger
from .storage import update_job_status, refund_job_credits

app = FastAPI(title="Soundril Audio Processor")
logger = get_logger("server")

SECRET = os.environ.get("AUDIO_PROCESSOR_SECRET", "")
is_shutting_down = False


def handle_shutdown(signum, frame):
    global is_shutting_down
    logger.info("Received shutdown signal, draining...")
    is_shutting_down = True


signal.signal(signal.SIGTERM, handle_shutdown)


class ProcessRequest(BaseModel):
    jobId: str
    userId: str
    type: str  # 'mr' | 'lrc' | 'lrc_mr'
    inputStoragePath: str
    lyrics: str | None = None
    coverStoragePath: str | None = None


@app.get("/")
def health():
    if is_shutting_down:
        raise HTTPException(status_code=503, detail="Shutting down")
    return {"status": "ok"}


@app.post("/process")
async def process(request: Request):
    if is_shutting_down:
        raise HTTPException(status_code=503, detail="Shutting down")

    # Verify bearer token
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer ") or auth[7:] != SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    req = ProcessRequest(**body)

    logger.info(f"Processing job {req.jobId} (type={req.type})")
    start_time = time.time()

    try:
        # Update status to processing
        await update_job_status(req.jobId, {
            "status": "processing",
            "progress": 0,
            "progressStep": "Starting...",
        })

        # Run pipeline
        result = await process_job(
            job_id=req.jobId,
            user_id=req.userId,
            job_type=req.type,
            input_storage_path=req.inputStoragePath,
            lyrics=req.lyrics,
            cover_storage_path=req.coverStoragePath,
        )

        elapsed_ms = int((time.time() - start_time) * 1000)

        # Update completed
        await update_job_status(req.jobId, {
            "status": "completed",
            "progress": 100,
            "progressStep": "Done",
            "processingTimeMs": elapsed_ms,
            "completedAt": "SERVER_TIMESTAMP",
            **result,
        })

        logger.info(f"Job {req.jobId} completed in {elapsed_ms}ms")
        return {"status": "completed", "jobId": req.jobId}

    except Exception as e:
        elapsed_ms = int((time.time() - start_time) * 1000)
        error_msg = str(e)
        logger.error(f"Job {req.jobId} failed: {error_msg}\n{traceback.format_exc()}")

        try:
            await update_job_status(req.jobId, {
                "status": "failed",
                "errorMessage": error_msg[:500],
                "processingTimeMs": elapsed_ms,
            })
            # 크레딧 환불
            await refund_job_credits(req.jobId)
            logger.info(f"Credits refunded for job {req.jobId}")
        except Exception as refund_err:
            logger.error(f"Failed to update/refund job {req.jobId}: {refund_err}")

        # Return 200 so Cloud Tasks doesn't retry
        return {"status": "failed", "jobId": req.jobId, "error": error_msg[:200]}
