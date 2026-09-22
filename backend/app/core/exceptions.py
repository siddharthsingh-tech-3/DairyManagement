from fastapi import status


class AppError(Exception):
    """Base class for all application-raised errors that map to an HTTP response."""

    status_code: int = status.HTTP_400_BAD_REQUEST
    default_message: str = "Something went wrong"

    def __init__(self, message: str | None = None) -> None:
        self.message = message or self.default_message
        super().__init__(self.message)


class NotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    default_message = "Resource not found"


class ConflictError(AppError):
    status_code = status.HTTP_409_CONFLICT
    default_message = "Resource already exists"


class ValidationAppError(AppError):
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_message = "Validation failed"


class AuthenticationError(AppError):
    status_code = status.HTTP_401_UNAUTHORIZED
    default_message = "Authentication failed"


class PermissionDeniedError(AppError):
    status_code = status.HTTP_403_FORBIDDEN
    default_message = "You do not have permission to perform this action"


class BusinessRuleError(AppError):
    """Raised when a domain business rule is violated (e.g. credit limit, order cutoff)."""

    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_message = "This action violates a business rule"
