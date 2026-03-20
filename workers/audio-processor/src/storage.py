"""
Firebase Storage + Firestore operations for the worker.
"""

import os

import firebase_admin
from firebase_admin import credentials, firestore, storage

# Initialize Firebase Admin
if not firebase_admin._apps:
    # In Cloud Run, uses default service account
    firebase_admin.initialize_app()

_db = firestore.client()
_bucket_name = os.environ.get(
    "STORAGE_BUCKET",
    "wedding-invitation-51a73.firebasestorage.app",  # TODO: change to soundril bucket
)


def _get_bucket():
    return storage.bucket(_bucket_name)


async def download_file(storage_path: str, local_path: str):
    """Download a file from Firebase Storage."""
    bucket = _get_bucket()
    blob = bucket.blob(storage_path)
    blob.download_to_filename(local_path)


async def upload_file(local_path: str, storage_path: str, content_type: str | None = None):
    """Upload a file to Firebase Storage."""
    bucket = _get_bucket()
    blob = bucket.blob(storage_path)

    if content_type:
        blob.content_type = content_type
    elif storage_path.endswith(".mp3"):
        blob.content_type = "audio/mpeg"
    elif storage_path.endswith(".lrc"):
        blob.content_type = "text/plain"
    elif storage_path.endswith(".log"):
        blob.content_type = "text/plain"

    blob.upload_from_filename(local_path)


async def update_job_status(job_id: str, data: dict):
    """Update job document in Firestore."""
    doc_ref = _db.collection("jobs").document(job_id)

    # Handle SERVER_TIMESTAMP sentinel
    update_data = {}
    for key, value in data.items():
        if value == "SERVER_TIMESTAMP":
            update_data[key] = firestore.SERVER_TIMESTAMP
        else:
            update_data[key] = value

    update_data["updatedAt"] = firestore.SERVER_TIMESTAMP
    doc_ref.update(update_data)


async def update_job_progress(job_id: str, progress: int, step: str):
    """Convenience method to update progress."""
    await update_job_status(job_id, {
        "progress": progress,
        "progressStep": step,
    })
