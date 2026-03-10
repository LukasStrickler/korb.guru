"""
Placeholder protected route: requires Clerk auth.

Shows how to use require_clerk_auth and how the mobile app should send
the Bearer token. See .docs/guides/authentication.md.
"""

from fastapi import APIRouter, Depends

from ..auth import AuthUser, require_clerk_auth

router = APIRouter(tags=["me"])


@router.get("/me")
async def get_me(user: AuthUser = Depends(require_clerk_auth)):
    """
    Return the current authenticated user (placeholder).

    Requires `Authorization: Bearer <clerk_session_token>`.
    The mobile app obtains the token via Clerk's getToken() and sends it here.
    """
    return {
        "user_id": user.user_id,
        "message": "Authenticated. Use this pattern for other protected routes.",
    }


@router.delete("/me")
async def delete_me(user: AuthUser = Depends(require_clerk_auth)):
    """
    Request account deletion (App Store compliance).

    Requires `Authorization: Bearer <clerk_session_token>`.
    Stub: returns 200. For production, call Clerk Backend API to delete the user
    (see https://clerk.com/docs/reference/backend-api/tag/Users#operation/DeleteUser)
    and remove any API-held user data. The app will then delete Convex data and
    sign out.
    """
    # TODO: production — delete user via Clerk Backend API (CLERK_SECRET_KEY);
    # optionally delete any user data stored in this API (e.g. DB).
    return {"ok": True}
