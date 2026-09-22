from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.transport_bill_repository import TransportBillRepository
from app.schemas.transport_report import CategoryWiseReportRow, TransportSummaryResponse, ZoneWiseReportRow


class TransportReportService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.repo = TransportBillRepository(db)

    async def get_summary(self, start: date | None, end: date | None) -> TransportSummaryResponse:
        row = await self.repo.summary(start, end)
        return TransportSummaryResponse(
            total_transport=row.total_transport,
            own_count=row.own_count,
            rented_count=row.rented_count,
            total_km_running=row.total_km_running,
            total_bill_amount=row.total_bill_amount,
        )

    async def get_zone_wise(self, start: date | None, end: date | None) -> list[ZoneWiseReportRow]:
        rows = await self.repo.zone_wise(start, end)
        return [
            ZoneWiseReportRow(
                zone_id=r.zone_id,
                zone_name=r.zone_name,
                bill_count=r.bill_count,
                total_amount=r.total_amount,
            )
            for r in rows
        ]

    async def get_category_wise(self, start: date | None, end: date | None) -> list[CategoryWiseReportRow]:
        rows = await self.repo.category_wise(start, end)
        return [
            CategoryWiseReportRow(
                category_id=r.category_id,
                category_name=r.category_name,
                bill_count=r.bill_count,
                total_amount=r.total_amount,
            )
            for r in rows
        ]
