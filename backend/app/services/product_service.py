import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError, ValidationAppError
from app.models.enums import StockMovementType
from app.models.product import Product, StockMovement
from app.repositories.product_repository import ProductRepository
from app.schemas.product import ProductCreateRequest, ProductUpdateRequest, StockAdjustmentRequest
from app.services.audit_service import AuditService
from app.services.category_service import CategoryService


class ProductService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = ProductRepository(db)
        self.audit = AuditService(db)
        self.categories = CategoryService(db)

    async def list_products(self) -> list[Product]:
        return await self.repo.list_active()

    async def get_product(self, product_id: uuid.UUID) -> Product:
        product = await self.repo.get_by_id(product_id)
        if product is None:
            raise NotFoundError("Product not found")
        return product

    async def create_product(self, data: ProductCreateRequest, actor_name: str) -> Product:
        if await self.repo.get_by_sku(data.sku) is not None:
            raise ConflictError(f"SKU {data.sku} already exists")
        await self.categories.ensure_category(data.category)
        product = Product(**data.model_dump())
        self.repo.add(product)
        if data.current_stock:
            self.repo.add_movement(
                StockMovement(
                    product=product,
                    movement_type=StockMovementType.PURCHASE,
                    quantity_delta=data.current_stock,
                    note="Opening stock",
                )
            )
        self.audit.log(actor_name, f"added product {data.name} ({data.sku})")
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def bulk_create_products(self, items: list[ProductCreateRequest], actor_name: str) -> list[Product]:
        seen_skus: set[str] = set()
        for data in items:
            if data.sku in seen_skus:
                raise ConflictError(f"Duplicate SKU {data.sku} in batch")
            seen_skus.add(data.sku)
            if await self.repo.get_by_sku(data.sku) is not None:
                raise ConflictError(f"SKU {data.sku} already exists")

        created: list[Product] = []
        for data in items:
            await self.categories.ensure_category(data.category)
            product = Product(**data.model_dump())
            self.repo.add(product)
            if data.current_stock:
                self.repo.add_movement(
                    StockMovement(
                        product=product,
                        movement_type=StockMovementType.PURCHASE,
                        quantity_delta=data.current_stock,
                        note="Opening stock",
                    )
                )
            created.append(product)

        self.audit.log(actor_name, f"bulk added {len(created)} products")
        await self.db.commit()
        for product in created:
            await self.db.refresh(product)
        return created

    async def bulk_update_products(
        self, ids: list[uuid.UUID], data: ProductUpdateRequest, actor_name: str
    ) -> list[Product]:
        fields = data.model_dump(exclude_unset=True)
        if "category" in fields:
            await self.categories.ensure_category(fields["category"])
        updated: list[Product] = []
        for product_id in ids:
            product = await self.get_product(product_id)
            for field, value in fields.items():
                setattr(product, field, value)
            updated.append(product)

        self.audit.log(actor_name, f"bulk updated {len(updated)} products")
        await self.db.commit()
        for product in updated:
            await self.db.refresh(product)
        return updated

    async def update_product(self, product_id: uuid.UUID, data: ProductUpdateRequest, actor_name: str) -> Product:
        product = await self.get_product(product_id)
        fields = data.model_dump(exclude_unset=True)
        if "category" in fields:
            await self.categories.ensure_category(fields["category"])
        for field, value in fields.items():
            setattr(product, field, value)
        self.audit.log(actor_name, f"updated product {product.name}", entity_type="product", entity_id=product.id)
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def adjust_stock(
        self, product_id: uuid.UUID, data: StockAdjustmentRequest, actor_name: str, actor_id: uuid.UUID
    ) -> Product:
        product = await self.get_product(product_id)
        new_stock = product.current_stock + data.quantity_delta
        if new_stock < 0:
            raise ValidationAppError("Stock cannot go negative")
        product.current_stock = new_stock
        self.repo.add_movement(
            StockMovement(
                product_id=product.id,
                movement_type=data.movement_type,
                quantity_delta=data.quantity_delta,
                note=data.note,
                created_by=actor_id,
            )
        )
        self.audit.log(
            actor_name,
            f"adjusted stock for {product.name} ({data.quantity_delta:+d})",
            entity_type="product",
            entity_id=product.id,
        )
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def reorder_stock(self, product_id: uuid.UUID, actor_name: str, actor_id: uuid.UUID) -> Product:
        product = await self.get_product(product_id)
        qty = product.reorder_level or 1
        product.current_stock += qty
        self.repo.add_movement(
            StockMovement(
                product_id=product.id,
                movement_type=StockMovementType.PURCHASE,
                quantity_delta=qty,
                note="Purchase order raised — stock replenished",
                created_by=actor_id,
            )
        )
        self.audit.log(
            actor_name, f"raised purchase / restocked {product.sku}", entity_type="product", entity_id=product.id
        )
        await self.db.commit()
        await self.db.refresh(product)
        return product

    async def consume_stock(
        self, product_id: uuid.UUID, quantity: int, reference_type: str, reference_id: uuid.UUID
    ) -> None:
        """Used by the orders/delivery flow to decrement stock on dispatch."""
        product = await self.get_product(product_id)
        product.current_stock -= quantity
        self.repo.add_movement(
            StockMovement(
                product_id=product.id,
                movement_type=StockMovementType.SALE_DISPATCH,
                quantity_delta=-quantity,
                reference_type=reference_type,
                reference_id=reference_id,
            )
        )
