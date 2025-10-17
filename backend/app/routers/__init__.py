from .contracts import router as contracts_router
from .auth import router as auth_router
from .users import router as users_router
from .approvals import router as approvals_router
from .settings import router as settings_router
from .profile import router as profile_router
from .announcement import router as announcement_router

__all__ = [
    "contracts_router",
    "auth_router",
    "users_router",
    "approvals_router",
    "settings_router",
    "profile_router",
    "announcement_router",
]
