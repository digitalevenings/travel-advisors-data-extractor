/**
 * Browser User-Agent rotation for realistic HTTP requests
 *
 * Provides realistic browser headers to avoid detection and blocking
 */

/**
 * Collection of desktop browser User-Agent strings
 * Includes Chrome, Firefox, Safari, and Edge across different platforms
 */
const desktopUserAgents = [
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.113 Safari/537.36",
    browser: "chrome",
  },
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.113 Safari/537.36",
    browser: "chrome",
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0",
    browser: "firefox",
  },
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 13.4; rv:126.0) Gecko/20100101 Firefox/126.0",
    browser: "firefox",
  },
  {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15",
    browser: "safari",
  },
  {
    ua: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.119 Safari/537.36 Edg/124.0.2478.97",
    browser: "edge",
  },
  {
    ua: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.113 Safari/537.36",
    browser: "chrome",
  },
  {
    ua: "Mozilla/5.0 (X11; Linux x86_64; rv:125.0) Gecko/20100101 Firefox/125.0",
    browser: "firefox",
  },
];

/**
 * Generates realistic HTTP headers that mimic a real browser
 *
 * Randomly selects a User-Agent and adds appropriate headers for that browser type.
 * Includes browser-specific headers (Sec-Fetch-*) for Chromium-based browsers.
 *
 * @param {object} overrides - Additional headers to merge with the generated ones
 * @returns {object} Complete set of HTTP headers
 *
 * @example
 * const headers = getRotatedHeaders({ 'Cookie': 'session=abc123' });
 */
export function getRotatedHeaders(overrides = {}) {
  const choice =
    desktopUserAgents[Math.floor(Math.random() * desktopUserAgents.length)];

  let headers = {
    "User-Agent": choice.ua,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    Connection: "keep-alive",
  };

  // Add Chromium-specific headers for Chrome and Edge
  if (choice.browser === "chrome" || choice.browser === "edge") {
    headers = {
      ...headers,
      "Upgrade-Insecure-Requests": "1",
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
    };
  }

  return {
    ...headers,
    ...overrides,
  };
}
