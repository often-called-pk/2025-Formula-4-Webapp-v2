from fastapi import HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any
import os
import requests
import time
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# Security scheme
security = HTTPBearer(auto_error=False)

class AuthConfig:
    """Authentication configuration"""
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL", "")
        self.supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        self.jwt_secret = os.getenv("SUPABASE_JWT_SECRET", "")
        self.auth_enabled = os.getenv("AUTH_ENABLED", "true").lower() == "true"
        
        # API key for internal services
        self.api_key = os.getenv("DATA_PROCESSING_API_KEY", "")

auth_config = AuthConfig()

class AuthenticationError(Exception):
    """Custom authentication error"""
    pass

class AuthManager:
    """Handle authentication and authorization"""
    
    def __init__(self):
        self.config = auth_config
        
    async def verify_supabase_token(self, token: str) -> Dict[str, Any]:
        """Verify Supabase JWT token"""
        try:
            if not self.config.supabase_url or not self.config.supabase_service_key:
                logger.warning("Supabase configuration missing, skipping token verification")
                return {"sub": "anonymous", "role": "anonymous"}
            
            # Verify token with Supabase
            headers = {
                "Authorization": f"Bearer {token}",
                "apikey": self.config.supabase_service_key
            }
            
            response = requests.get(
                f"{self.config.supabase_url}/auth/v1/user",
                headers=headers,
                timeout=5
            )
            
            if response.status_code == 200:
                user_data = response.json()
                return {
                    "sub": user_data.get("id"),
                    "email": user_data.get("email"),
                    "role": user_data.get("role", "authenticated"),
                    "user_metadata": user_data.get("user_metadata", {})
                }
            else:
                raise AuthenticationError(f"Token verification failed: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Supabase authentication error: {e}")
            raise AuthenticationError("Authentication service unavailable")
        except Exception as e:
            logger.error(f"Token verification error: {e}")
            raise AuthenticationError("Invalid token")
    
    def verify_api_key(self, api_key: str) -> bool:
        """Verify internal API key"""
        if not self.config.api_key:
            return False
        return api_key == self.config.api_key
    
    async def get_current_user(self, credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
        """Get current authenticated user"""
        # If auth is disabled, return anonymous user
        if not self.config.auth_enabled:
            return {"sub": "anonymous", "role": "anonymous", "auth_type": "disabled"}
        
        if not credentials:
            raise HTTPException(status_code=401, detail="Authentication required")
        
        token = credentials.credentials
        
        # Check if it's an API key
        if token.startswith("apk_"):
            if self.verify_api_key(token):
                return {"sub": "service", "role": "service", "auth_type": "api_key"}
            else:
                raise HTTPException(status_code=401, detail="Invalid API key")
        
        # Verify as Supabase JWT token
        try:
            user = await self.verify_supabase_token(token)
            user["auth_type"] = "jwt"
            return user
        except AuthenticationError as e:
            raise HTTPException(status_code=401, detail=str(e))

# Global auth manager
auth_manager = AuthManager()

# Dependency for authenticated endpoints
async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
    """Dependency to get current authenticated user"""
    return await auth_manager.get_current_user(credentials)

async def get_current_user_optional(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[Dict[str, Any]]:
    """Optional authentication - returns None if not authenticated"""
    try:
        return await auth_manager.get_current_user(credentials)
    except HTTPException:
        return None

def require_role(required_role: str):
    """Decorator to require specific role"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get user from kwargs (injected by dependency)
            user = kwargs.get('current_user')
            if not user:
                raise HTTPException(status_code=401, detail="Authentication required")
            
            user_role = user.get('role', 'anonymous')
            
            # Define role hierarchy
            role_hierarchy = {
                'anonymous': 0,
                'authenticated': 1,
                'service': 2,
                'admin': 3
            }
            
            required_level = role_hierarchy.get(required_role, 999)
            user_level = role_hierarchy.get(user_role, 0)
            
            if user_level < required_level:
                raise HTTPException(
                    status_code=403, 
                    detail=f"Insufficient permissions. Required: {required_role}, Current: {user_role}"
                )
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

# Rate limiting utilities
class RateLimiter:
    """Simple in-memory rate limiter"""
    
    def __init__(self):
        self.requests = {}  # {client_id: [(timestamp, count), ...]}
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = time.time()
    
    def is_allowed(self, client_id: str, max_requests: int = 100, window_seconds: int = 3600) -> bool:
        """Check if request is allowed under rate limit"""
        current_time = time.time()
        
        # Cleanup old entries periodically
        if current_time - self.last_cleanup > self.cleanup_interval:
            self._cleanup(current_time, window_seconds)
            self.last_cleanup = current_time
        
        # Get client's request history
        if client_id not in self.requests:
            self.requests[client_id] = []
        
        client_requests = self.requests[client_id]
        
        # Remove old requests outside the window
        cutoff_time = current_time - window_seconds
        client_requests[:] = [req for req in client_requests if req[0] > cutoff_time]
        
        # Check if under limit
        if len(client_requests) >= max_requests:
            return False
        
        # Add current request
        client_requests.append((current_time, 1))
        return True
    
    def _cleanup(self, current_time: float, window_seconds: int):
        """Remove old entries"""
        cutoff_time = current_time - window_seconds
        for client_id in list(self.requests.keys()):
            self.requests[client_id] = [
                req for req in self.requests[client_id] 
                if req[0] > cutoff_time
            ]
            # Remove empty entries
            if not self.requests[client_id]:
                del self.requests[client_id]

# Global rate limiter
rate_limiter = RateLimiter()

async def check_rate_limit(
    request: Request,
    max_requests: int = 100,
    window_seconds: int = 3600,
    current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)
) -> None:
    """Check rate limit for current request"""
    # Identify client
    if current_user and current_user.get("sub"):
        client_id = f"user:{current_user['sub']}"
    else:
        # Use IP address for anonymous users
        client_ip = request.client.host if request.client else "unknown"
        client_id = f"ip:{client_ip}"
    
    # Check rate limit
    if not rate_limiter.is_allowed(client_id, max_requests, window_seconds):
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Max {max_requests} requests per {window_seconds} seconds.",
            headers={"Retry-After": str(window_seconds)}
        )

# Rate limit presets
async def basic_rate_limit(request: Request, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)) -> None:
    """Basic rate limit: 100 requests per hour"""
    await check_rate_limit(request, 100, 3600, current_user)

async def heavy_rate_limit(request: Request, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)) -> None:
    """Heavy operation rate limit: 10 requests per hour"""
    await check_rate_limit(request, 10, 3600, current_user)

async def comparison_rate_limit(request: Request, current_user: Optional[Dict[str, Any]] = Depends(get_current_user_optional)) -> None:
    """Comparison operation rate limit: 20 requests per hour"""
    await check_rate_limit(request, 20, 3600, current_user)