"""Outbound notification integrations (email/SMS/WhatsApp).

This is intentionally a thin seam: in this environment there is no configured
email/SMS/WhatsApp provider (SES, Twilio, WhatsApp Business API, etc.). Each
method logs the notification it *would* send so the calling business logic and
audit trail are fully wired — swap the body for a real provider call when
credentials are available, without touching any caller.
"""

from app.core.logging import get_logger

logger = get_logger(__name__)


class NotificationService:
    async def send_password_reset(self, email: str, raw_token: str) -> None:
        logger.info("notification.password_reset", email=email, token=raw_token)

    async def send_payment_reminder(self, vendor_name: str, phone: str, amount: str, upi_link: str) -> None:
        logger.info(
            "notification.payment_reminder", vendor=vendor_name, phone=phone, amount=amount, upi_link=upi_link
        )
