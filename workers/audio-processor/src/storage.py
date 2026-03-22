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


async def refund_job_credits(job_id: str):
    """작업 실패 시 크레딧 환불. job doc에서 userId, creditsCharged를 읽어서 환불."""
    job_ref = _db.collection("jobs").document(job_id)
    job_doc = job_ref.get()
    if not job_doc.exists:
        return

    job = job_doc.to_dict()
    user_id = job.get("userId")
    credits = job.get("creditsCharged", 0)
    if not user_id or credits <= 0:
        return

    user_ref = _db.collection("users").document(user_id)

    @firestore.transactional
    def _refund(tx):
        user_doc = user_ref.get(transaction=tx)
        if not user_doc.exists:
            return
        current = user_doc.to_dict().get("credits", 0)
        new_balance = current + credits

        tx.update(user_ref, {
            "credits": new_balance,
            "totalCreditsUsed": firestore.Increment(-credits),
            "updatedAt": firestore.SERVER_TIMESTAMP,
        })
        tx.set(_db.collection("creditTransactions").document(), {
            "userId": user_id,
            "type": "job_refund",
            "amount": credits,
            "balanceBefore": current,
            "balanceAfter": new_balance,
            "jobId": job_id,
            "description": "Job failed - refund",
            "createdAt": firestore.SERVER_TIMESTAMP,
        })

    tx = _db.transaction()
    _refund(tx)
