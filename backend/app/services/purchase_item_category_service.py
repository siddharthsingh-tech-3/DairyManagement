import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BusinessRuleError, ConflictError, NotFoundError
from app.models.purchase_item_category import PurchaseItemCategory
from app.repositories.purchase_item_category_repository import PurchaseItemCategoryRepository
from app.schemas.purchase_item_category import (
    PurchaseItemCategoryCreateRequest,
    PurchaseItemCategoryUpdateRequest,
)
from app.services.audit_service import AuditService


class PurchaseItemCategoryService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = PurchaseItemCategoryRepository(db)
        self.audit = AuditService(db)

    async def list_categories(self) -> list[tuple[PurchaseItemCategory, int]]:
        return await self.repo.list_with_counts()

    async def get_bill_count(self, category_id: uuid.UUID) -> int:
        return await self.repo.count_for_category(category_id)

    async def create_category(
        self, data: PurchaseItemCategoryCreateRequest, actor_name: str
    ) -> PurchaseItemCategory:
        if await self.repo.get_by_name(data.name) is not None:
            raise ConflictError(f"Purchase item category {data.name} already exists")
        category = PurchaseItemCategory(name=data.name)
        self.repo.add(category)
        self.audit.log(actor_name, f"created purchase item category {data.name}")
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def rename_category(
        self, category_id: uuid.UUID, data: PurchaseItemCategoryUpdateRequest, actor_name: str
    ) -> PurchaseItemCategory:
        category = await self.repo.get_by_id(category_id)
        if category is None:
            raise NotFoundError("Purchase item category not found")
        old_name = category.name
        if data.name != old_name:
            clashing = await self.repo.get_by_name(data.name)
            if clashing is not None and clashing.id != category.id:
                raise ConflictError(f"Purchase item category {data.name} already exists")
            category.name = data.name
            self.audit.log(
                actor_name,
                f"renamed purchase item category {old_name} to {data.name}",
                entity_type="purchase_item_category",
                entity_id=category.id,
            )
        await self.db.commit()
        await self.db.refresh(category)
        return category

    async def delete_category(self, category_id: uuid.UUID, actor_name: str) -> None:
        category = await self.repo.get_by_id(category_id)
        if category is None:
            raise NotFoundError("Purchase item category not found")
        bill_count = await self.repo.count_for_category(category.id)
        if bill_count > 0:
            raise BusinessRuleError(
                f"Purchase item category {category.name} still has {bill_count} bill(s) assigned"
            )
        self.audit.log(
            actor_name,
            f"deleted purchase item category {category.name}",
            entity_type="purchase_item_category",
            entity_id=category.id,
        )
        await self.repo.delete(category)
        await self.db.commit()
