# Travel Advisors Data Extractor

A high-performance Node.js scraper for extracting travel advisor profiles from travelleaders.com. Features proxy rotation, intelligent caching, and real-time progress tracking.

> 💡 **New to web scraping with proxies?** This project uses [Webshare.io](https://www.webshare.io/?referral_code=f2etuk0lcc0l) for reliable proxy rotation. Get **10 free proxies** to get started - no credit card required! (Referral link - supports this project 🙏)

## Features

- 🚀 **High Performance**: Concurrent requests with configurable batch sizes
- 🔄 **Proxy Rotation**: Automatic rotation through Webshare proxy pool
- 💾 **Smart Caching**: File-based caching with TTL to avoid redundant requests
- 📊 **Progress Tracking**: Real-time progress bars for both scraping phases
- 🔁 **Automatic Retry**: Exponential backoff retry logic for failed requests
- 🎯 **Browser Emulation**: Rotates User-Agent headers to mimic real browsers
- 💧 **Memory Efficient**: Streams output to NDJSON format
- ⚙️ **Configurable**: All parameters adjustable via environment variables

## Prerequisites

- Node.js 16+
- [Webshare.io](https://www.webshare.io/?referral_code=f2etuk0lcc0l) proxy account (free tier includes 10 proxies - no credit card required)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd travel-advisors-data-extractor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Webshare proxy API key:
   ```env
   WEBSHARE_PROXY_API_KEY = your-api-key-here
   ```

   **To get your API key:**
   1. Sign up at [Webshare.io](https://www.webshare.io/?referral_code=f2etuk0lcc0l) (referral link - free tier available)
   2. Go to your [Dashboard → Proxy → List](https://proxy.webshare.io/proxy/list)
   3. Copy your API key from the top of the page
   4. Paste it in your `.env` file

## Usage

### Quick Start

Run the full scraper (recommended):

```bash
npm run scrape
```

This will:
1. Fetch all agent IDs from paginated listings (~21,000 agents)
2. Retrieve detailed biographical information for each agent
3. Stream results to `./output/agents_full.ndjson`

### Output

The scraper generates **NDJSON** (newline-delimited JSON) files where each line is a valid JSON object:

```json
{"id": "3102", "firstName": "Melissa", "lastName": "Becker", ...}
{"id": "4567", "firstName": "John", "lastName": "Smith", ...}
```

**Output location:** `./output/agents_full.ndjson`

### Processing NDJSON

```bash
# Count total records
wc -l ./output/agents_full.ndjson

# View first 10 records
head -10 ./output/agents_full.ndjson | jq

# Filter agents by city
grep '"city":"Chicago"' ./output/agents_full.ndjson | jq

# Convert to regular JSON array
jq -s '.' ./output/agents_full.ndjson > agents.json
```

## Configuration

All scraper parameters can be adjusted in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `CACHE_TTL` | 604800 | Cache duration in seconds (7 days) |
| `PAGE_SIZE` | 500 | Number of results per page |
| `MAX_RETRIES` | 3 | Maximum retry attempts for failed requests |
| `BATCH_SIZE` | 20 | Number of concurrent requests |
| `DELAY_BETWEEN_BATCHES_MS` | 500 | Delay between batches in milliseconds |

### Performance Tuning

**For faster scraping:**
- Increase `BATCH_SIZE` (requires more proxies)
- Decrease `DELAY_BETWEEN_BATCHES_MS`

**For rate-limit protection:**
- Decrease `BATCH_SIZE`
- Increase `DELAY_BETWEEN_BATCHES_MS`

**Recommended settings with 100 proxies:**
```env
BATCH_SIZE = 20
DELAY_BETWEEN_BATCHES_MS = 500
```

## Architecture

### Components

```
├── scrape-full-advisors.js    # Main scraper (recommended)
├── libs/
│   ├── proxy-fetch.js         # HTTP client with proxy rotation
│   ├── websearch-proxy.js     # Webshare proxy pool manager
│   ├── file-cache.js          # File-based caching system
│   ├── custom-headers.js      # User-Agent rotation
│   └── memory-cache.js        # In-memory cache (alternative)
├── output/                    # Generated data files
└── .cache/                    # Cache storage
```

### How It Works

1. **Phase 1: ID Collection**
   - Fetches paginated agent listings
   - Extracts agent IDs
   - Displays progress bar

2. **Phase 2: Detail Fetching**
   - Retrieves full biographical data for each agent
   - Uses round-robin proxy rotation
   - Streams results to NDJSON file
   - Updates progress bar in real-time

3. **Caching Layer**
   - Stores responses in `.cache/` directory
   - Automatic expiration based on TTL
   - Reduces load on target server

4. **Error Handling**
   - Automatic retry with 200ms delay
   - Collects and displays error summary
   - Continues scraping on partial failures

## Advanced Usage

### Two-Step Scraping

For more control, you can run the scraping process in two steps:

**Step 1: Extract basic agent information**
```bash
npm run scrape:basic
```
Output: `./output/agents.ndjson`

**Step 2: Fetch detailed biographies**
```bash
npm run scrape:details
```
Output: `./output/agents_full.ndjson`

### Custom Scripts

All scraper modules can be imported and used programmatically:

```javascript
import proxyFetch from './libs/proxy-fetch.js';

// Fetch with caching
const data = await proxyFetch.fetch('https://example.com', {}, 3600);
```

## Troubleshooting

### Proxy Errors

If you see timeout errors:
- Verify your [Webshare](https://www.webshare.io/?referral_code=f2etuk0lcc0l) API key is correct
- Check your proxy account has available bandwidth (free tier: 250 proxies, 1GB bandwidth)
- Reduce `BATCH_SIZE` to avoid overwhelming proxies
- Consider upgrading to a paid plan for more proxies and bandwidth

### Progress Bar Stuck

The progress bar updates after each successful/failed request. If it appears stuck:
- Wait for the current batch to complete (up to 20 seconds per batch)
- Check your network connection
- Verify proxies are working: the scraper will retry automatically

### Memory Issues

If you encounter memory problems:
- The scraper uses streaming output to minimize memory usage
- Large batch sizes may temporarily increase memory
- Consider reducing `BATCH_SIZE`

## License

ISC

## Disclaimer

This scraper is intended for educational purposes and legitimate data collection use cases. Please:

- Respect the target website's `robots.txt` and terms of service
- Use reasonable rate limits to avoid overloading servers
- Ensure your use case complies with applicable laws and regulations
- Review and comply with data privacy regulations (GDPR, CCPA, etc.)

The authors are not responsible for misuse of this software.

## Acknowledgments

- Built with [axios](https://github.com/axios/axios) for HTTP requests
- Proxy support via [https-proxy-agent](https://github.com/TooTallNate/proxy-agents)
- Progress tracking with [cli-progress](https://github.com/npkgz/cli-progress)
- Proxy rotation powered by [Webshare.io](https://www.webshare.io/?referral_code=f2etuk0lcc0l) (referral link)
