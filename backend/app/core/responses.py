from typing import Any, Generic, TypeVar

from pydantic import BaseModel, Field

T = TypeVar("T")


class Envelope(BaseModel, Generic[T]):
    success: bool = True
    message: str = "OK"
    data: T | None = None


class ErrorEnvelope(BaseModel):
    success: bool = False
    message: str
    data: Any | None = None
    errors: list[dict[str, Any]] | None = None


def success_envelope(data: Any = None, message: str = "OK") -> dict[str, Any]:
    return {"success": True, "message": message, "data": data}


class PageMeta(BaseModel):
    page: int
    page_size: int
    total_items: int
    total_pages: int


class Page(BaseModel, Generic[T]):
    items: list[T]
    meta: PageMeta


def paginate(items: list[T], total_items: int, page: int, page_size: int) -> Page[T]:
    total_pages = (total_items + page_size - 1) // page_size if page_size else 0
    return Page(
        items=items,
        meta=PageMeta(page=page, page_size=page_size, total_items=total_items, total_pages=total_pages),
    )


class PageParams(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=200)
    search: str | None = None
    sort_by: str | None = None
    sort_dir: str = Field(default="asc", pattern="^(asc|desc)$")

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size
