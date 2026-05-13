import jwt
from jwt import PyJWKClient
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.exceptions import AppError

security = HTTPBearer()

# Supabase JWKS endpoint -- ES256 공개키를 여기서 가져옴
_jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
_jwk_client = PyJWKClient(_jwks_url, cache_keys=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Supabase JWT access token을 검증하고 user 정보를 반환한다.

    Supabase가 ES256 (비대칭키)으로 마이그레이션된 경우 JWKS에서
    공개키를 가져와 검증한다. Legacy HS256도 fallback으로 지원.
    """
    token = credentials.credentials
    try:
        # JWKS에서 토큰의 kid에 맞는 공개키 가져오기
        signing_key = _jwk_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256"],
            audience="authenticated",
        )
    except Exception:
        # Fallback: Legacy HS256 (구 프로젝트)
        try:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except Exception:
            raise AppError("Invalid or expired token", 401, "UNAUTHORIZED")

    user_id: str = payload.get("sub")
    if user_id is None:
        raise AppError("Invalid token: no sub claim", 401, "UNAUTHORIZED")
    return {
        "id": user_id,
        "email": payload.get("email"),
        "role": payload.get("role"),
    }
