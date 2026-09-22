import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile

from app.core.config import settings
from app.core.exceptions import ValidationAppError
from app.core.responses import success_envelope
from app.dependencies.permissions import require_permission
from app.models.enums import PermissionFeature, PermissionLevel
from app.models.user import User

router = APIRouter(prefix="/uploads", tags=["uploads"])

ALLOWED_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    _: User = Depends(require_permission(PermissionFeature.PURCHASES, PermissionLevel.FULL)),
) -> dict:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise ValidationAppError("Only PNG, JPEG, or WEBP images are allowed")

    contents = await file.read()
    if len(contents) > settings.UPLOAD_MAX_BYTES:
        raise ValidationAppError("File exceeds the maximum allowed size")

    upload_dir = Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)

    extension = Path(file.filename or "").suffix.lower() or ".bin"
    filename = f"{uuid.uuid4()}{extension}"
    (upload_dir / filename).write_bytes(contents)

    return success_envelope({"url": f"/uploads/{filename}"}, "File uploaded")
