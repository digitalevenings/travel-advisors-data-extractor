import crypto from "crypto";
import axios from "axios";
import websearchProxy from "./websearch-proxy.js";
import { getRotatedHeaders } from "./custom-headers.js";
import FileCache from "./file-cache.js";

/**
 * ProxyFetch - HTTP client with proxy rotation and file-based caching
 *
 * Provides a fetch interface that automatically:
 * - Rotates through available proxies
 * - Caches responses to disk
 * - Rotates User-Agent headers
 */
class ProxyFetch {
  constructor() {
    this.cache = new FileCache();
  }

  /**
   * Fetches a URL through a proxy with caching support
   * @param {string} url - The URL to fetch
   * @param {object} customHeaders - Additional headers to include in the request
   * @param {number} ttl - Cache time-to-live in seconds (0 = no caching)
   * @returns {Promise<object>} Response data
   */
  async fetch(url, customHeaders = {}, ttl = 0) {
    return new Promise((resolve, reject) => {
      const cacheKey = this._getRequestHash(url, customHeaders);
      const cachedResult = this.cache.get(cacheKey);

      // Return cached result if available
      if (cachedResult) {
        resolve(cachedResult);
        return;
      }

      // Generate realistic browser headers
      const headers = getRotatedHeaders(customHeaders);

      // Get a proxy agent and make the request
      websearchProxy.getProxyAgent().then((agent) => {
        axios
          .get(url, {
            headers: { ...headers, ...customHeaders },
            httpsAgent: agent,
            timeout: 20000,
          })
          .then((response) => {
            // Cache the response data
            this.cache.set(cacheKey, response.data, ttl);
            resolve(response.data);
          })
          .catch((error) => {
            reject(error);
          });
      });
    });
  }

  /**
   * Generates a SHA-256 hash for caching purposes
   * @private
   * @param {string} url - Request URL
   * @param {object} headers - Request headers
   * @returns {string} SHA-256 hash of the request
   */
  _getRequestHash(url, headers = {}) {
    const keyInput = {
      url,
      cookie: headers.Cookie || "", // Only include cookie for cache key
    };

    return crypto
      .createHash("sha256")
      .update(JSON.stringify(keyInput))
      .digest("hex");
  }
}

export default new ProxyFetch();
