import os
import time
import threading
from typing import Dict, List
from logging_config import logger

class InMemoryRateLimiter:
    def __init__(self):
        self._store: Dict[str, List[float]] = {}
        self._lock = threading.Lock()

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int, increment: bool = True) -> bool:
        now = time.time()
        cutoff = now - window_seconds
        
        with self._lock:
            # Clean up old timestamps for the key
            if key in self._store:
                self._store[key] = [ts for ts in self._store[key] if ts > cutoff]
            else:
                self._store[key] = []
                
            if len(self._store[key]) >= max_requests:
                return True
                
            if increment:
                self._store[key].append(now)
            return False

class RedisRateLimiter:
    def __init__(self, redis_url: str):
        self.redis_url = redis_url
        self.client = None
        self._connect_failed = False
        
        try:
            import redis
            self.client = redis.from_url(redis_url, decode_responses=True)
            # Ping to verify connection
            self.client.ping()
            logger.info("Successfully connected to Redis for rate limiting.")
        except Exception as e:
            logger.error(f"Failed to initialize Redis connection: {e}")
            self._connect_failed = True

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int, increment: bool = True) -> bool:
        if self._connect_failed or not self.client:
            return False
            
        try:
            now = time.time()
            zset_key = f"rate_limit:{key}"
            cutoff = now - window_seconds
            
            if not increment:
                self.client.zremrangebyscore(zset_key, 0, cutoff)
                count = self.client.zcard(zset_key)
                return count >= max_requests
            
            pipe = self.client.pipeline()
            # Clean up timestamps older than the window
            pipe.zremrangebyscore(zset_key, 0, cutoff)
            # Add current timestamp (use uuid suffix to ensure uniqueness of members in zset if timestamps collide)
            import uuid
            member = f"{now}:{uuid.uuid4().hex[:4]}"
            pipe.zadd(zset_key, {member: now})
            # Count elements in the window
            pipe.zcard(zset_key)
            # Set TTL on the key
            pipe.expire(zset_key, window_seconds)
            
            results = pipe.execute()
            count = results[2] # Index 2 corresponds to zcard result
            
            if count > max_requests:
                return True
            return False
        except Exception as e:
            logger.warning(f"Redis rate limiter exception: {e}. Falling back to in-memory.")
            self._connect_failed = True
            return False

class PluggableRateLimiter:
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL")
        self.redis_limiter = None
        self.in_memory_limiter = InMemoryRateLimiter()
        
        if self.redis_url:
            try:
                import redis
                self.redis_limiter = RedisRateLimiter(self.redis_url)
            except ImportError:
                logger.warning("redis-py package is not installed. Using in-memory rate limiter.")

    def is_rate_limited(self, key: str, max_requests: int, window_seconds: int, increment: bool = True) -> bool:
        if self.redis_limiter and not self.redis_limiter._connect_failed:
            res = self.redis_limiter.is_rate_limited(key, max_requests, window_seconds, increment)
            if not self.redis_limiter._connect_failed:
                return res
        return self.in_memory_limiter.is_rate_limited(key, max_requests, window_seconds, increment)

# Global rate limiter instance
_global_rate_limiter = PluggableRateLimiter()

def check_rate_limit(key: str, max_requests: int = 5, window_seconds: int = 600, increment: bool = True) -> bool:
    """
    Checks rate limits for a given identifier key.
    Returns:
        bool: True if key is rate limited, False otherwise.
    """
    return _global_rate_limiter.is_rate_limited(key, max_requests, window_seconds, increment)
