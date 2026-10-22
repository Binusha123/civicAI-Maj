import os

from bson import ObjectId
from fastapi import HTTPException, UploadFile, status


UPLOAD_DIR = "uploads"
MAX_UPLOAD_SIZE = 5 * 1024 * 1024
ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "avif"}


async def save_upload(file: UploadFile) -> str:
    extension = os.path.splitext(file.filename or "")[1].lstrip(".").lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported image extension",
        )

    if not file.content_type or not file.content_type.lower().startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content type must be an image",
        )

    content = await file.read(MAX_UPLOAD_SIZE + 1)
    if len(content) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 5 MB limit",
        )

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    filename = f"{ObjectId()}.{extension}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as destination:
        destination.write(content)

    return f"/uploads/{filename}"
