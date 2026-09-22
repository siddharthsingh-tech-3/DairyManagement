from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundError
from app.models.enums import PermissionFeature, PermissionLevel, UserRole
from app.models.permission import Permission
from app.repositories.permission_repository import PermissionRepository
from app.services.audit_service import AuditService

# Default seed matrix — admin is implicitly full on everything and not stored.
# Mirrors the prototype's actual nav-visibility map (ACCESS), not its separate
# decorative "Permission matrix" demo table, which never gated anything live.
# Vendor only ever saw Dashboard + My Orders; driver only Dashboard + My Deliveries.
DEFAULT_MATRIX: dict[PermissionFeature, dict[UserRole, PermissionLevel]] = {
    PermissionFeature.ORDERS: {UserRole.VENDOR: PermissionLevel.FULL, UserRole.DRIVER: PermissionLevel.NONE},
    PermissionFeature.DELIVERY: {UserRole.VENDOR: PermissionLevel.NONE, UserRole.DRIVER: PermissionLevel.FULL},
    PermissionFeature.CRATES: {UserRole.VENDOR: PermissionLevel.NONE, UserRole.DRIVER: PermissionLevel.NONE},
    PermissionFeature.PRODUCTS: {UserRole.VENDOR: PermissionLevel.NONE, UserRole.DRIVER: PermissionLevel.NONE},
    PermissionFeature.VENDORS: {UserRole.VENDOR: PermissionLevel.NONE, UserRole.DRIVER: PermissionLevel.NONE},
    PermissionFeature.BILLING: {UserRole.VENDOR: PermissionLevel.NONE, UserRole.DRIVER: PermissionLevel.NONE},
    PermissionFeature.PAYMENTS: {UserRole.VENDOR: PermissionLevel.NONE, UserRole.DRIVER: PermissionLevel.NONE},
    PermissionFeature.USER_ACCESS: {UserRole.VENDOR: PermissionLevel.NONE, UserRole.DRIVER: PermissionLevel.NONE},
    PermissionFeature.REPORTS: {UserRole.VENDOR: PermissionLevel.NONE, UserRole.DRIVER: PermissionLevel.NONE},
    PermissionFeature.PURCHASES: {UserRole.VENDOR: PermissionLevel.NONE, UserRole.DRIVER: PermissionLevel.NONE},
    PermissionFeature.SALES: {UserRole.VENDOR: PermissionLevel.NONE, UserRole.DRIVER: PermissionLevel.NONE},
    PermissionFeature.EXPENSES: {UserRole.VENDOR: PermissionLevel.NONE, UserRole.DRIVER: PermissionLevel.NONE},
    PermissionFeature.BUSINESS_PARTNERS: {UserRole.VENDOR: PermissionLevel.NONE, UserRole.DRIVER: PermissionLevel.NONE},
    PermissionFeature.TRANSPORT: {
        UserRole.VENDOR: PermissionLevel.NONE,
        UserRole.DRIVER: PermissionLevel.NONE,
    },
    PermissionFeature.LOANS: {UserRole.VENDOR: PermissionLevel.NONE, UserRole.DRIVER: PermissionLevel.NONE},
}

CYCLE_ORDER = [PermissionLevel.FULL, PermissionLevel.VIEW, PermissionLevel.NONE]


class PermissionService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = PermissionRepository(db)
        self.audit = AuditService(db)

    async def ensure_seeded(self) -> None:
        existing = await self.repo.list_all()
        existing_keys = {(p.feature, p.role) for p in existing}
        for feature, role_levels in DEFAULT_MATRIX.items():
            for role, level in role_levels.items():
                if (feature.value, role) not in existing_keys:
                    self.repo.add(Permission(feature=feature.value, role=role, level=level))
        await self.db.commit()

    async def get_matrix(self) -> list[Permission]:
        await self.ensure_seeded()
        return await self.repo.list_all()

    async def get_level(self, feature: PermissionFeature, role: UserRole) -> PermissionLevel:
        if role == UserRole.SUPER_ADMIN:
            return PermissionLevel.FULL
        perm = await self.repo.get(feature.value, role)
        if perm is None:
            return DEFAULT_MATRIX.get(feature, {}).get(role, PermissionLevel.NONE)
        return perm.level

    async def update_level(
        self, feature: str, role: UserRole, level: PermissionLevel, actor_name: str
    ) -> Permission:
        perm = await self.repo.get(feature, role)
        if perm is None:
            perm = Permission(feature=feature, role=role, level=level)
            self.repo.add(perm)
        else:
            perm.level = level
        self.audit.log(actor_name, f"changed {role.value} access to {feature} → {level.value.title()}")
        await self.db.commit()
        return perm

    async def cycle_level(self, feature: str, role: UserRole, actor_name: str) -> Permission:
        perm = await self.repo.get(feature, role)
        current = perm.level if perm else DEFAULT_MATRIX.get(PermissionFeature(feature), {}).get(
            role, PermissionLevel.NONE
        )
        next_level = CYCLE_ORDER[(CYCLE_ORDER.index(current) + 1) % len(CYCLE_ORDER)]
        return await self.update_level(feature, role, next_level, actor_name)
