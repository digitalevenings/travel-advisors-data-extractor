/**
 * Travel Advisors Data Scraper
 *
 * Scrapes travel advisor profiles from travelleaders.com in two phases:
 * 1. Collects all agent IDs from paginated listings
 * 2. Fetches detailed biographical information for each agent
 *
 * Features:
 * - Proxy rotation for distributed requests
 * - File-based caching to avoid re-fetching data
 * - Progress bars for real-time feedback
 * - Automatic retry logic with exponential backoff
 * - Streaming output to NDJSON for memory efficiency
 */

import proxyFetch from "./libs/proxy-fetch.js";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import fs1 from "fs";
import cliProgress from "cli-progress";
import dotenv from "dotenv";

dotenv.config();

// Configuration from environment variables
const ttl = parseInt(process.env.CACHE_TTL) || 604800; // Cache TTL in seconds
const pageSize = parseInt(process.env.PAGE_SIZE) || 500; // Items per page
const maxRetries = parseInt(process.env.MAX_RETRIES) || 3; // Retry attempts
const batchSize = parseInt(process.env.BATCH_SIZE) || 5; // Concurrent requests
const delayBetweenBatchesMs =
  parseInt(process.env.DELAY_BETWEEN_BATCHES_MS) || 1000; // Delay between batches
const outputFile = "./output/agents_full.ndjson";

/**
 * Builds URL for paginated agent listing
 * @param {number} page - Page number (0-indexed)
 * @returns {string} API endpoint URL
 */
function buildListUrl(page) {
  return `https://www.travelleaders.com/agent/getAgents?ZIP=&Name=&AgentInterest=&AgentDestination=&AgentState=&AgentMetroRegion=&AgentLanguage=&AgentCity=&AgentSupplier=&AgentId=0&AgencyId=0&Locality=AR&AgentSort=&CurrentPage=${page}&PageSize=${pageSize}`;
}

/**
 * Builds URL for agent biographical details
 * @param {number} id - Agent ID
 * @returns {string} API endpoint URL
 */
function buildBioUrl(id) {
  return `https://www.travelleaders.com/agent/getAgentFullBio?agentId=${id}&preview=false&destination=`;
}

/**
 * Delays execution for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetches a single page of agent listings with retry logic
 * @param {number} page - Page number to fetch
 * @param {object} bar - Progress bar instance
 * @param {Array} errors - Array to collect error messages
 * @param {number} attempt - Current attempt number (for retries)
 * @returns {Promise<Array>} Array of agent objects
 */
async function fetchPage(page, bar, errors, attempt = 1) {
  try {
    const url = buildListUrl(page);
    const res = await proxyFetch.fetch(url, {}, ttl);
    bar.increment();
    return res.data.agent;
  } catch (e) {
    if (attempt < maxRetries) {
      await sleep(200);
      return fetchPage(page, bar, errors, attempt + 1);
    } else {
      errors.push(
        `Failed to fetch page ${page} after ${maxRetries} attempts.`
      );
      bar.increment();
      return [];
    }
  }
}

/**
 * Fetches full biographical details for a single agent with retry logic
 * @param {number} agentId - Agent ID to fetch
 * @param {Array} errors - Array to collect error messages
 * @param {object} bar - Progress bar instance
 * @param {number} attempt - Current attempt number (for retries)
 * @returns {Promise<object|null>} Agent bio object or null on failure
 */
async function fetchAgentBio(agentId, errors, bar, attempt = 1) {
  try {
    const url = buildBioUrl(agentId);
    const res = await proxyFetch.fetch(url, {}, ttl);
    if (bar) bar.increment();
    return { id: agentId, ...res.data };
  } catch (e) {
    if (attempt < maxRetries) {
      await sleep(200);
      return fetchAgentBio(agentId, errors, bar, attempt + 1);
    } else {
      errors.push(`Failed agent ${agentId} after ${maxRetries} attempts`);
      if (bar) bar.increment();
      return null;
    }
  }
}

/**
 * Main scraping workflow
 * Phase 1: Collects all agent IDs from paginated listings
 * Phase 2: Fetches and streams full biographical details to NDJSON
 */
async function work() {
  // Ensure output directory exists
  await fs.mkdir("./output", { recursive: true });

  // Clear output file if it exists
  if (fs1.existsSync(outputFile)) {
    fs1.unlinkSync(outputFile);
  }

  console.log("Phase 1: Fetching agent IDs...\n");

  // Fetch first page to get total count
  const firstPageResult = await proxyFetch.fetch(buildListUrl(0), {}, ttl);
  const total = parseInt(firstPageResult.data.totalAgents);
  const pages = Math.ceil(total / pageSize);
  const errors = [];
  const allAgentIds = [];

  // Collect IDs from first page
  allAgentIds.push(...firstPageResult.data.agent.map((a) => a.agentId));

  // Initialize progress bar for phase 1
  const bar1 = new cliProgress.SingleBar(
    {
      format:
        "Fetching Agent IDs [{bar}] {percentage}% | Page {value}/{total}",
      clearOnComplete: true,
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );

  bar1.start(pages, 1); // Start at 1 since page 0 is already done

  // Fetch remaining pages in batches
  for (let i = 1; i < pages; i += batchSize) {
    const batchPages = Array.from(
      { length: Math.min(batchSize, pages - i) },
      (_, j) => i + j
    );

    const results = await Promise.allSettled(
      batchPages.map((page) => fetchPage(page, bar1, errors))
    );

    // Collect agent IDs from successful fetches
    for (const result of results) {
      if (result.status === "fulfilled") {
        allAgentIds.push(...result.value.map((a) => a.agentId));
      }
    }

    await sleep(delayBetweenBatchesMs);
  }

  bar1.stop();

  console.log(`\n✅ Collected ${allAgentIds.length} agent IDs`);
  console.log("\nPhase 2: Fetching full advisor details...\n");

  // Initialize streaming output
  const outputStream = createWriteStream(outputFile, { flags: "a" });
  let totalWritten = 0;

  // Initialize progress bar for phase 2
  const bar2 = new cliProgress.SingleBar(
    {
      format:
        "Fetching Full Details [{bar}] {percentage}% | {value}/{total}",
      clearOnComplete: true,
      hideCursor: true,
    },
    cliProgress.Presets.shades_classic
  );

  bar2.start(allAgentIds.length, 0);

  // Fetch full details in batches and stream to file
  for (let i = 0; i < allAgentIds.length; i += batchSize) {
    const batch = allAgentIds.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((id) => fetchAgentBio(id, errors, bar2))
    );

    // Write successful results to stream
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        outputStream.write(JSON.stringify(result.value) + "\n");
        totalWritten++;
      }
    }

    await sleep(delayBetweenBatchesMs);
  }

  bar2.stop();
  outputStream.end();

  // Display error summary if any errors occurred
  if (errors.length > 0) {
    console.log(`\n⚠️  ${errors.length} errors occurred:`);
    errors.slice(0, 10).forEach((err) => console.log(`  - ${err}`));
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more errors`);
    }
  }

  console.log(
    `\n✅ Streamed ${totalWritten} full advisor details to ${outputFile}`
  );
}

// Execute main workflow
work().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
