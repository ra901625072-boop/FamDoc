"""
In-memory TTL cache for reducing redundant computations and API calls.
Used by routers to cache frequently-accessed data like file listings,
folder trees, dashboard stats, and search results.
"""
import threading
import time
import logging

logger = logging.getLogger(__name__)


class TTLCache:
    """Thread-safe in-memory cache with per-key TTL expiration."""
    
    def __init__(self, default_ttl: int = 60, max_size: int = 500):
        self._store = {}  # key -> (value, expire_time)
        self._lock = threading.Lock()
        self._default_ttl = default_ttl
        self._max_size = max_size
    
    def get(self, key: str):
        """Get a cached value. Returns None if not found or expired."""
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expire_time = entry
            if time.time() > expire_time:
                del self._store[key]
                return None
            return value
    
    def set(self, key: str, value, ttl: int = None):
        """Set a cached value with optional custom TTL."""
        with self._lock:
            # Evict expired entries if at capacity
            if len(self._store) >= self._max_size:
                self._evict_expired()
                if len(self._store) >= self._max_size:
                    # Remove oldest entry
                    oldest_key = min(self._store, key=lambda k: self._store[k][1])
                    del self._store[oldest_key]
            
            expire_time = time.time() + (ttl if ttl is not None else self._default_ttl)
            self._store[key] = (value, expire_time)
    
    def invalidate(self, key: str):
        """Remove a specific key from cache."""
        with self._lock:
            self._store.pop(key, None)
    
    def invalidate_prefix(self, prefix: str):
        """Remove all keys starting with a given prefix."""
        with self._lock:
            keys_to_remove = [k for k in self._store if k.startswith(prefix)]
            for k in keys_to_remove:
                del self._store[k]
    
    def clear(self):
        """Clear the entire cache."""
        with self._lock:
            self._store.clear()
    
    def _evict_expired(self):
        """Remove all expired entries. Must be called with lock held."""
        now = time.time()
        expired = [k for k, (_, exp) in self._store.items() if now > exp]
        for k in expired:
            del self._store[k]
    
    @property
    def size(self):
        """Current number of entries in cache."""
        return len(self._store)


# ---------------------------------------------------------------------------
# Global cache instances (module-level singletons, shared across requests)
# ---------------------------------------------------------------------------

# Cache for dashboard stats (TTL: 30 seconds)
dashboard_cache = TTLCache(default_ttl=30, max_size=100)

# Cache for folder file listings (TTL: 15 seconds)
folder_listing_cache = TTLCache(default_ttl=15, max_size=200)

# Cache for search results (TTL: 10 seconds)
search_cache = TTLCache(default_ttl=10, max_size=100)


def invalidate_family_caches(family_id: str):
    """Invalidate all caches related to a specific family after write operations.
    
    Called after uploads, deletes, renames, moves, folder mutations, etc.
    to ensure subsequent reads return fresh data.
    """
    dashboard_cache.invalidate(f"stats:{family_id}")
    folder_listing_cache.invalidate_prefix(f"files:{family_id}:")
    folder_listing_cache.invalidate_prefix(f"folders:{family_id}")
    search_cache.invalidate_prefix(f"search:{family_id}:")
    logger.debug(f"Invalidated all caches for family {family_id}")
