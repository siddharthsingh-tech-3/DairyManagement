from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.business_setting import BusinessSetting


class DocumentNumberingMixin:
    """Formats and bumps a per-tenant `{doc_type}_prefix` / `{doc_type}_seq` pair
    stored in BusinessSetting. Mutates in place — no commit — so it rides the
    caller's single transaction. Because `business_settings` is tenant-scoped
    (RLS + `UniqueConstraint("tenant_id", "key")`), this gives every tenant
    independent numbering per document type for free.

    Mixed into every repository that issues a human-facing document number
    (orders, invoices, purchase orders/invoices/returns, sales
    quotes/invoices/returns, payments, debit/credit notes, loans, expenses, ...).
    Requires the including class to expose `self.db: AsyncSession` and a
    `DOCUMENT_DEFAULT_PREFIXES: dict[str, str]` class attribute.
    """

    db: AsyncSession
    DOCUMENT_DEFAULT_PREFIXES: dict[str, str]
    DOCUMENT_STARTING_SEQ: dict[str, str] = {}

    async def next_document_number(self, doc_type: str) -> str:
        prefix_key = f"{doc_type}_prefix"
        seq_key = f"{doc_type}_seq"

        default_prefix = self.DOCUMENT_DEFAULT_PREFIXES[doc_type]
        starting_seq = self.DOCUMENT_STARTING_SEQ.get(doc_type, "1")
        prefix_setting = await self._get_or_create_setting(prefix_key, default_prefix)
        seq_setting = await self._get_or_create_setting(seq_key, starting_seq)

        number = f"{prefix_setting.value}{seq_setting.value}"
        seq_setting.value = str(int(seq_setting.value) + 1)
        return number

    async def reserve_document_number(self, doc_type: str, number: str) -> None:
        """Records a client-supplied document number (e.g. a manually edited invoice
        number) so a later `next_document_number` call doesn't reissue it. If `number`
        starts with the configured prefix and the remainder parses as an integer, bumps
        the stored sequence to stay ahead of it."""
        prefix_key = f"{doc_type}_prefix"
        seq_key = f"{doc_type}_seq"

        default_prefix = self.DOCUMENT_DEFAULT_PREFIXES[doc_type]
        starting_seq = self.DOCUMENT_STARTING_SEQ.get(doc_type, "1")
        prefix_setting = await self._get_or_create_setting(prefix_key, default_prefix)
        seq_setting = await self._get_or_create_setting(seq_key, starting_seq)

        if not number.startswith(prefix_setting.value):
            return
        remainder = number[len(prefix_setting.value) :]
        if not remainder.isdigit():
            return
        seq_setting.value = str(max(int(seq_setting.value), int(remainder) + 1))

    async def _get_or_create_setting(self, key: str, default: str) -> BusinessSetting:
        result = await self.db.execute(
            select(BusinessSetting).where(BusinessSetting.key == key).with_for_update()
        )
        setting = result.scalar_one_or_none()
        if setting is None:
            setting = BusinessSetting(key=key, value=default)
            self.db.add(setting)
            await self.db.flush()
        return setting
