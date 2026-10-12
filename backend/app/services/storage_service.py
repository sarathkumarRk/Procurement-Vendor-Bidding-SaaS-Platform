import logging
from pathlib import Path

import cloudinary
import cloudinary.uploader

from app.config import settings

logger = logging.getLogger(__name__)

cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

ALLOWED_EXTENSIONS = {
    ".pdf",
    ".doc",
    ".docx",
    ".png",
    ".jpg",
    ".jpeg",
}

MAX_FILE_SIZE = 10 * 1024 * 1024

RAW_EXTENSIONS = {".pdf", ".doc", ".docx"}


def upload_quotation_document(file) -> dict:
    original_filename = file.filename or ""
    extension = Path(original_filename).suffix.lower()

    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError("Unsupported document file type.")

    content = file.file.read()

    if not content:
        raise ValueError("Uploaded document is empty.")

    if len(content) > MAX_FILE_SIZE:
        raise ValueError("Document size must not exceed 10 MB.")

    try:
        resource_type = (
            "raw" if extension in RAW_EXTENSIONS else "image"
        )

        result = cloudinary.uploader.upload(
            content,
            resource_type=resource_type,
            folder="procurement/quotations",
            use_filename=False,
            unique_filename=True,
        )

        document_url = result.get("secure_url")
        public_id = result.get("public_id")

        if not document_url or not public_id:
            raise RuntimeError(
                "Cloudinary did not return the document URL or public ID."
            )

        return {
            "document_url": document_url,
            "public_id": public_id,
            "resource_type": resource_type,
            "original_filename": original_filename,
        }

    except Exception as exc:
        logger.exception("Quotation document upload failed")
        raise RuntimeError(
            "Quotation document upload failed."
        ) from exc

    finally:
        file.file.seek(0)


def delete_quotation_document(
    public_id: str,
    resource_type: str = "raw",
) -> bool:
    if resource_type not in {"raw", "image"}:
        raise ValueError("Unsupported Cloudinary resource type.")

    try:
        result = cloudinary.uploader.destroy(
            public_id,
            resource_type=resource_type,
            invalidate=True,
        )

        return result.get("result") == "ok"

    except Exception:
        logger.exception(
            "Failed to delete Cloudinary document: %s",
            public_id,
        )
        return False