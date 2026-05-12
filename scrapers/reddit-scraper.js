/**
 * Deshly Reddit Scraper — JSON API version
 * Scrapes public Bangladeshi diaspora subreddits via Reddit's public JSON endpoint.
 * 
 * Usage: node --env-file=.env.local scrapers/reddit-scraper.js
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const SUBREDDITS = [
  { name: "bangladesh", cluster_signal: "bd_dhaka_professional_25_40", segment: "local" },
  { name: "dhaka", cluster_signal: "bd_dhaka_professional_25_40", segment: "local" },
  { name: "ABCDesis", cluster_signal: "us_nyc_metro_25_45", segment: "diaspora" },
  { name: "londonbangladeshis", cluster_signal: "uk_london_professional_25_34", segment: "diaspora" },
];

const RELEVANT_KEYWORDS = [
  "eid", "panjabi", "saree", "bangladeshi", "dhaka", "fashion",
  "clothing", "gift", "shopping", "halal", "culture", "heritage",
  "diaspora", "remittance", "family", "celebration", "festival",
  "pohela", "boishakh", "nakshi", "jamdani", "wedding", "kurti",
  "lehenga", "desi", "south asian",
];

async function logToSupabase(source, recordsPulled, status, errorMessage = null) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ingestion_logs`, {
      method: "POST",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({
        source,
        records_pulled: recordsPulled,
        status,
        error_message: errorMessage,
      }),
    });
    if (!res.ok) {
      console.warn(`  Log write failed: ${res.status}`);
    }
  } catch (e) {
    console.warn(`  Log write error: ${e.message}`);
  }
}

async function scrapeSubreddit(subreddit, clusterSignal) {
  console.log(`\n📡 Scraping r/${subreddit}...`);
  const url = `https://www.reddit.com/r/${subreddit}/new.json?limit=50`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "DeshlyDiasporaScraper/1.0 (research)",
        "Accept": "application/json",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const posts = (data?.data?.children || []).map((c) => ({
      title: c.data?.title || "",
      score: c.data?.score || 0,
      num_comments: c.data?.num_comments || 0,
      created_utc: c.data?.created_utc || 0,
      author: c.data?.author || "",
      flair: c.data?.link_flair_text || "",
      permalink: c.data?.permalink || "",
    }));

    const relevant = posts.filter((post) => {
      const titleLower = post.title.toLowerCase();
      return RELEVANT_KEYWORDS.some((kw) => titleLower.includes(kw));
    });

    console.log(`  ✓ Fetched ${posts.length} posts, ${relevant.length} relevant`);

    if (relevant.length > 0) {
      console.log(`  Sample titles:`);
      relevant.slice(0, 3).forEach((p, i) => {
        console.log(`    ${i + 1}. "${p.title.substring(0, 80)}${p.title.length > 80 ? '...' : ''}"`);
      });
    }

    await logToSupabase(
      `reddit/r/${subreddit}`,
      relevant.length,
      "success"
    );

    return {
      subreddit,
      cluster_signal: clusterSignal,
      total_posts: posts.length,
      relevant_posts: relevant.length,
      sample_titles: relevant.slice(0, 5).map((p) => p.title),
    };
  } catch (err) {
    console.error(`  ✗ Error: ${err.message}`);
    await logToSupabase(`reddit/r/${subreddit}`, 0, "error", err.message);
    return { subreddit, error: err.message };
  }
}

async function runScraper() {
  console.log("🚀 Deshly Reddit Scraper starting...");
  console.log("Target: Bangladeshi diaspora signal extraction");
  console.log("Method: Reddit public JSON API\n");

  const results = [];

  for (const config of SUBREDDITS) {
    const result = await scrapeSubreddit(config.name, config.cluster_signal);
    results.push(result);
    // Polite rate limiting
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log("\n═══════════════════════════════════════");
  console.log("✅ Scraping complete");
  console.log("═══════════════════════════════════════");

  let totalRelevant = 0;
  results.forEach((r) => {
    if (r.error) {
      console.log(`  r/${r.subreddit}: ERROR — ${r.error}`);
    } else {
      console.log(`  r/${r.subreddit}: ${r.relevant_posts} relevant / ${r.total_posts} total`);
      totalRelevant += r.relevant_posts;
    }
  });

  console.log(`\n📊 Total relevant posts captured: ${totalRelevant}`);
  console.log(`📊 Ingestion logs saved to Supabase`);
  console.log(`\nNext run: schedule via cron or n8n workflow`);
  return results;
}

runScraper().catch(console.error);