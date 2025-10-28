import fs from "fs";
import path from "path";

/**
 * FileCache - A file-based caching system with TTL support
 *
 * Stores cached data as JSON files in the filesystem. Supports both
 * string and object values with optional time-to-live (TTL) expiration.
 */
class FileCache {
  /**
   * Creates a new FileCache instance
   * @param {string} cacheDir - Directory path where cache files will be stored (default: "./.cache")
   */
  constructor(cacheDir = "./.cache") {
    this.cacheDir = cacheDir;
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  /**
   * Generates a safe file path for the given cache key
   * @private
   * @param {string} key - Cache key
   * @returns {string} Full file path
   */
  _getFilePath(key) {
    const safeKey = encodeURIComponent(key);
    return path.join(this.cacheDir, `${safeKey}.cache`);
  }

  /**
   * Stores a value in the cache with an optional TTL
   * @param {string} key - Cache key
   * @param {string|object} value - Value to store (string or object)
   * @param {number} ttlSeconds - Time-to-live in seconds (0 = no caching)
   */
  set(key, value, ttlSeconds = 0) {
    if (ttlSeconds <= 0) return;

    const expiresAt = Date.now() + ttlSeconds * 1000;
    const isString = typeof value === "string";

    const data = {
      type: isString ? "string" : "json",
      value: isString ? value : JSON.stringify(value),
      expiresAt,
    };

    const filePath = this._getFilePath(key);
    fs.writeFileSync(filePath, JSON.stringify(data));
  }

  /**
   * Retrieves a value from the cache
   * Returns undefined if the key doesn't exist or has expired.
   * Automatically returns the correct type (string or parsed object).
   * @param {string} key - Cache key
   * @returns {string|object|undefined} Cached value or undefined
   */
  get(key) {
    const filePath = this._getFilePath(key);
    if (!fs.existsSync(filePath)) return undefined;

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const { type, value, expiresAt } = JSON.parse(content);

      // Check if cache entry has expired
      if (expiresAt !== 0 && Date.now() > expiresAt) {
        fs.unlinkSync(filePath);
        return undefined;
      }

      // Return value in original type
      if (type === "string") return value;
      if (type === "json") return JSON.parse(value);
      return undefined;
    } catch (err) {
      // Remove corrupted cache file
      try {
        fs.unlinkSync(filePath);
      } catch {}
      return undefined;
    }
  }

  /**
   * Deletes a cache entry
   * @param {string} key - Cache key
   * @returns {boolean} True if the key existed and was deleted
   */
  delete(key) {
    const filePath = this._getFilePath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  }

  /**
   * Clears all cache entries
   */
  clear() {
    for (const file of fs.readdirSync(this.cacheDir)) {
      fs.unlinkSync(path.join(this.cacheDir, file));
    }
  }

  /**
   * Removes all expired cache entries
   * Useful for periodic housekeeping
   */
  purgeExpired() {
    const now = Date.now();
    for (const file of fs.readdirSync(this.cacheDir)) {
      const filePath = path.join(this.cacheDir, file);
      try {
        const { expiresAt } = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (expiresAt && now > expiresAt) fs.unlinkSync(filePath);
      } catch {}
    }
  }
}

export default FileCache;
