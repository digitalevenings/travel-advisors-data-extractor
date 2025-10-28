/**
 * memoryCache.js
 *
 * A simple, in-memory key-value cache with optional TTL (time-to-live).
 * This is not distributed: it's just in process memory.
 * If your Node.js process restarts, this cache is cleared.
 */

class MemoryCache {
    constructor() {
      // Internal store: key -> { value, expiresAt }
      this.store = new Map();
    }
  
    /**
     * Set a key-value pair in the cache.
     * @param {string} key - The cache key.
     * @param {*} value - The data to store.
     * @param {number} ttlSeconds - (Optional) Time-to-live in seconds.
     */
    set(key, value, ttlSeconds = 0) {
      let expiresAt = 0;
      if (ttlSeconds > 0) {
        expiresAt = Date.now() + ttlSeconds * 1000;
      }else{
        return
      }
  
      this.store.set(key, { value, expiresAt });
    }
  
    /**
     * Get an item from the cache.
     * If the item is expired or not found, return undefined.
     * @param {string} key - The cache key.
     * @return {*} - The cached value or undefined.
     */
    get(key) {
      const cacheEntry = this.store.get(key);
      if (!cacheEntry) {
        return undefined;
      }
  
      const { value, expiresAt } = cacheEntry;
  
      // Check if item is expired
      if (expiresAt !== 0 && Date.now() > expiresAt) {
        this.store.delete(key);
        return undefined;
      }
  
      return value;
    }
  
    /**
     * Delete an item from the cache, if it exists.
     * @param {string} key - The cache key.
     * @return {boolean} - True if the key was in the cache and has been removed.
     */
    delete(key) {
      return this.store.delete(key);
    }
  
    /**
     * Clear all items from the cache.
     */
    clear() {
      this.store.clear();
    }
  
    /**
     * Optional: A housekeeping method to remove all expired items.
     * You could call this periodically (e.g. setInterval).
     */
    purgeExpired() {
      const now = Date.now();
      for (const [key, { expiresAt }] of this.store.entries()) {
        if (expiresAt !== 0 && now > expiresAt) {
          this.store.delete(key);
        }
      }
    }
  }
  
  // Export a singleton instance or the class itself.
  export default new MemoryCache();
  // or:
  // module.exports = MemoryCache;
  