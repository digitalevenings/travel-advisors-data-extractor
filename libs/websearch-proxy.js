import dotenv from "dotenv";
import { HttpsProxyAgent } from "https-proxy-agent";

dotenv.config();

/**
 * Proxy - Manages proxy rotation using Webshare.io API
 *
 * Fetches a list of proxies from Webshare and rotates through them
 * in a round-robin fashion for load distribution.
 */
class Proxy {
  constructor() {
    this.proxies = [];
    this.index = 0;
  }

  /**
   * Gets an HTTPS proxy agent for the next proxy in rotation
   * Automatically fetches the proxy list if not already loaded
   * @returns {Promise<HttpsProxyAgent>} Configured proxy agent
   */
  async getProxyAgent() {
    if (this.proxies.length === 0) {
      await this._getProxyList();
    }
    const proxyData = this._getNextProxy();
    const proxyUrl = `http://${proxyData.username}:${proxyData.password}@${proxyData.proxy_address}:${proxyData.port}`;
    return new HttpsProxyAgent(proxyUrl);
  }

  /**
   * Gets the next proxy in round-robin rotation
   * @private
   * @returns {object} Proxy configuration object
   */
  _getNextProxy() {
    const proxy = this.proxies[this.index % this.proxies.length];
    this.index++;
    return proxy;
  }

  /**
   * Fetches the list of available proxies from Webshare API
   * @private
   * @returns {Promise<void>}
   */
  async _getProxyList() {
    const url = new URL("https://proxy.webshare.io/api/v2/proxy/list/");
    url.searchParams.append("mode", "direct");
    url.searchParams.append("page", "1");
    url.searchParams.append("page_size", "100");

    const req = await fetch(url.href, {
      method: "GET",
      headers: {
        Authorization: `Token ${process.env.WEBSHARE_PROXY_API_KEY}`,
      },
    });

    const res = await req.json();
    this.proxies = res.results;
  }
}

export default new Proxy();
