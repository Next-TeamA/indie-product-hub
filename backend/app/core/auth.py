from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from app.core.config import settings

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Supabase JWT access token을 검증하고 user 정보를 반환합니다.

    Frontend에서 Supabase Auth로 Google 로그인 후 받은 access_token을
    Authorization: Bearer <token> 형태로 보내면, 이 dependency가 검증합니다.
    """
    token = credentials.credentials
    try:
        # Supabase JWT는 HMAC-SHA256, secret = supabase_key (anon key의 JWT secret)
        payload = jwt.decode(
            token,
            settings.supabase_key,
            algorithms=["HS256"],
            audience="authenticated",
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token: no sub claim",
            )
        return {"id": user_id, "email": payload.get("email"), "role": payload.get("role")}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
