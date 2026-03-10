"""
Protected routes for current user: GET /me and DELETE /me.

DEV NOTE: These routes are scaffolded for development. DELETE /me returns a stub
and does not actually delete the user. For production, implement the Clerk Backend
API call to delete the user and any API-held data. See AGENTS.md Dev vs Production.
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
    # DEV PLACEHOLDER: Returns 200 without actual deletion.
    # PRODUCTION: Call Clerk Backend API with CLERK_SECRET_KEY to delete the user:
    #   https://clerk.com/docs/reference/backend-api/tag/Users#operation/DeleteUser
    # Then delete any user data stored in this API (e.g., database records).
    # The mobile app will handle deleting Convex data and signing out.
    return {"ok": True}
