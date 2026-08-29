#!/usr/bin/env node
/**
 * auto-scout.js — Fetch latest longevity & health headlines from multiple sources,
 * deduplicate against existing content.json, and optionally summarize + inject automatically.
 *
 * Usage:
 *   node auto-scout.js              — Dry run: prints new candidates
 *   node auto-scout.js --auto       — Full autonomy: fetch → AI summarize → write content.json
 *   node auto-scout.js --apply --articles='[...]'  — Inject pre-summarized articles
 *
 * Sources:
 *   1. Google News RSS     (health/longevity news)
 *   2. ScienceDaily RSS    (aging & longevity research)
 *   3. Medical News Today  (aging category)
 *   4. PubMed RSS          (longevity search)
 *   5. OpenAlex API        (academic papers)
 *
 * Rate Limiting:
 *   - MAX_PER_SOURCE = 2 (top 2 new articles per source)
 *   - MAX_ARTICLES_PER_BATCH = 10 (max sent to Claude)
 *
 * Environment:
 *   ANTHROPIC_API_KEY  — Required for --auto mode (Claude API for Hebrew summarization)
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONTENT_PATH = resolve(__dirname, "content/articles.json");

const MAX_PER_SOURCE = 2;
const MAX_ARTICLES_PER_BATCH = 10;

// ── Helpers ──────────────────────────────────────────────

/** Sanitize external text to prevent prompt injection and control chars */
function sanitizeText(str, maxLen = 300) {
  if (!str) return '';
  return str
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // control chars
    .replace(/[<>{}]/g, '')                           // HTML/template chars
    .trim()
    .substring(0, maxLen);
}

/** Validate URL format */
function isValidUrl(url) {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function hebrewDate() {
  return new Date().toLocaleDateString("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function loadExisting() {
  try {
    return JSON.parse(readFileSync(CONTENT_PATH, "utf-8"));
  } catch {
    return [];
  }
}

function isDuplicate(existing, url, title) {
  const normalizedUrl = url.replace(/\/+$/, "").toLowerCase();
  const normalizedTitle = title.toLowerCase().trim();
  return existing.some((a) => {
    const existingUrl = (a.sourceUrl || "").replace(/\/+$/, "").toLowerCase();
    const existingTitle = (a.title || "").toLowerCase().trim();
    return existingUrl === normalizedUrl || existingTitle === normalizedTitle;
  });
}

function parseRSSItems(xml) {
  const items = [];
  const regex = /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<pubDate>([\s\S]*?)<\/pubDate>[\s\S]*?<\/item>/g;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    const rawTitle = match[1].trim().replace(/<!\[CDATA\[|\]\]>/g, "");
    const link = match[2].trim();
    if (!isValidUrl(link)) continue;
    items.push({
      title: sanitizeText(rawTitle),
      link: link,
      pubDate: sanitizeText(match[3].trim(), 50),
    });
  }
  return items;
}

// ── Source 1: Google News RSS ────────────────────────────

async function fetchGoogleNews() {
  const query = encodeURIComponent("longevity OR anti-aging OR lifespan OR healthy aging");
  const url = `https://news.google.com/rss/search?q=${query}&hl=en&gl=US&ceid=US:en`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google News RSS: ${res.status}`);
  const xml = await res.text();

  const items = parseRSSItems(xml);
  return items.slice(0, MAX_PER_SOURCE).map((item) => {
    const titleParts = item.title.split(" - ");
    const title = titleParts.slice(0, -1).join(" - ") || item.title;
    const source = titleParts.length > 1 ? titleParts[titleParts.length - 1] : "Google News";
    return { title: title.trim(), source: source.trim(), link: item.link, pubDate: item.pubDate, origin: "google-news" };
  });
}

// ── Source 2: ScienceDaily RSS ───────────────────────────

async function fetchScienceDaily() {
  const url = "https://www.sciencedaily.com/rss/health_medicine/healthy_aging.xml";

  const res = await fetch(url);
  if (!res.ok) throw new Error(`ScienceDaily RSS: ${res.status}`);
  const xml = await res.text();

  return parseRSSItems(xml).slice(0, MAX_PER_SOURCE).map((item) => ({
    title: item.title,
    source: "ScienceDaily",
    link: item.link,
    pubDate: item.pubDate,
    origin: "sciencedaily",
  }));
}

// ── Source 3: Medical News Today RSS ─────────────────────

async function fetchMedicalNewsToday() {
  const url = "https://www.medicalnewstoday.com/categories/aging/rss";

  const res = await fetch(url);
  if (!res.ok) throw new Error(`MedNewsToday RSS: ${res.status}`);
  const xml = await res.text();

  return parseRSSItems(xml).slice(0, MAX_PER_SOURCE).map((item) => ({
    title: item.title,
    source: "Medical News Today",
    link: item.link,
    pubDate: item.pubDate,
    origin: "medicalnewstoday",
  }));
}

// ── Source 4: PubMed RSS ─────────────────────────────────

async function fetchPubMed() {
  const query = encodeURIComponent("longevity aging lifespan");
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${query}&retmax=5&sort=date&retmode=json`;

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) throw new Error(`PubMed search: ${searchRes.status}`);
  const searchData = await searchRes.json();
  const ids = searchData.esearchresult?.idlist || [];
  if (ids.length === 0) return [];

  const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.slice(0, MAX_PER_SOURCE).join(",")}&retmode=json`;
  const summaryRes = await fetch(summaryUrl);
  if (!summaryRes.ok) throw new Error(`PubMed summary: ${summaryRes.status}`);
  const summaryData = await summaryRes.json();

  const items = [];
  for (const id of ids.slice(0, MAX_PER_SOURCE)) {
    const article = summaryData.result?.[id];
    if (!article) continue;
    items.push({
      title: article.title || "Untitled",
      source: article.source || "PubMed",
      link: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
      pubDate: article.pubdate || "",
      origin: "pubmed",
    });
  }
  return items;
}

// ── Source 5: OpenAlex API ───────────────────────────────

async function fetchOpenAlex() {
  const url =
    "https://api.openalex.org/works?search=longevity+aging+lifespan+healthspan&sort=publication_date:desc&per_page=5&mailto=scout@longevity-news.dev";

  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenAlex: ${res.status}`);
  const data = await res.json();

  return data.results.slice(0, MAX_PER_SOURCE).map((w) => ({
    title: w.title || "Untitled",
    source: w.primary_location?.source?.display_name || "Academic",
    link: w.doi || w.id || "",
    pubDate: w.publication_date || "",
    origin: "openalex",
  }));
}

// ── AI Summarization via Anthropic API ───────────────────

async function summarizeWithClaude(items) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required for --auto mode");
  }

  const batch = items.slice(0, MAX_ARTICLES_PER_BATCH);
  if (items.length > MAX_ARTICLES_PER_BATCH) {
    console.log(`  Limiting to ${MAX_ARTICLES_PER_BATCH} of ${items.length} candidates\n`);
  }

  const itemsList = batch
    .map((item, i) => `[${i + 1}] Title: ${sanitizeText(item.title)}\n    Source: ${sanitizeText(item.source, 100)}\n    URL: ${item.link}\n    Date: ${sanitizeText(item.pubDate, 50)}`)
    .join("\n\n");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 8192,
      messages: [
        {
          role: "user",
          content: `אתה עורך מדעי בכיר באתר "חיים ארוכים" — פורטל חדשות בריאות ואריכות ימים בעברית.
הקהל שלך: אינטליגנטי, סקרן, לא בהכרח אנשי מקצוע רפואי.
הטון: אופטימי אך מבוסס ראיות. לעולם אל תגזים או תבטיח ריפוי.

לכל כתבה מהרשימה למטה, ספק אובייקט JSON עם השדות הבאים:
- "title": כותרת עברית קצרה ומושכת (לא תרגום מילולי — כתוב כעיתונאי מדעי)
- "summary": סיכום של 2-3 משפטים — מה נמצא, למה זה חשוב, מה ההשלכות
- "bottomLine": שורה תחתונה פרקטית אחת — מה הקורא יכול לעשות עם המידע הזה
- "category": אחת מ: "מחקר", "תזונה", "אורח חיים", "טכנולוגיה רפואית", "גנטיקה"
- "sourceUrl": כתובת המקור (העתק כמו שהיא מהקלט)

חשוב:
- כתוב בעברית טבעית כעורך מדעי מקצועי.
- כותרות צריכות להיות מושכות וספציפיות — כלול מספרים ותוצאות קונקרטיות כשאפשר.
- חייב להגיב ב-JSON בלבד — מערך JSON אחד.
- אל תעטוף ב-markdown, אל תוסיף טקסט לפני או אחרי ה-JSON.

כתבות לעיבוד:

${itemsList}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  const text = data.content[0].text.trim();
  const stopReason = data.stop_reason;

  if (stopReason === "max_tokens") {
    console.error("Response was truncated (hit max_tokens). Raw response:\n", text);
    throw new Error("Claude response was truncated — reduce article count or increase max_tokens");
  }

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error("Raw Claude response:\n", text);
    throw new Error("Could not find JSON array in Claude response");
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("JSON parse failed. Raw extracted text:\n", jsonMatch[0]);
    throw new Error(`Failed to parse Claude response as JSON: ${e.message}`);
  }
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const autoMode = args.includes("--auto");
  const applyMode = args.includes("--apply");
  const articlesJson = args.find((a) => a.startsWith("--articles="));

  // ── Mode 1: --apply with --articles=JSON (manual inject) ──
  if (applyMode && articlesJson) {
    let newArticles;
    try {
      newArticles = JSON.parse(articlesJson.slice("--articles=".length));
    } catch (e) {
      console.error("Failed to parse --articles JSON:", e.message);
      process.exit(1);
    }
    const existing = loadExisting();
    let maxId = existing.reduce((max, a) => Math.max(max, parseInt(a.id, 10) || 0), 0);

    let added = 0;
    for (const article of newArticles) {
      if (isDuplicate(existing, article.sourceUrl, article.title)) {
        console.log(`  SKIP (duplicate): ${article.title.slice(0, 50)}...`);
        continue;
      }
      maxId++;
      const entry = {
        id: String(maxId),
        title: article.title,
        summary: article.summary,
        bottomLine: article.bottomLine,
        category: article.category,
        publishDate: hebrewDate(),
        sourceUrl: article.sourceUrl,
      };
      existing.unshift(entry);
      added++;
      console.log(`  ADDED #${entry.id}: ${entry.title.slice(0, 60)}...`);
    }

    writeFileSync(CONTENT_PATH, JSON.stringify(existing, null, 2) + "\n", "utf-8");
    console.log(`\nDone: ${added} articles added, ${existing.length} total.`);
    return;
  }

  // ── Fetch from all sources ──
  console.log("🌿 Scouting for new longevity articles...\n");

  const existing = loadExisting();
  console.log(`Existing articles in content.json: ${existing.length}\n`);

  const sources = [
    { name: "Google News", fn: fetchGoogleNews },
    { name: "ScienceDaily", fn: fetchScienceDaily },
    { name: "Medical News Today", fn: fetchMedicalNewsToday },
    { name: "PubMed", fn: fetchPubMed },
    { name: "OpenAlex", fn: fetchOpenAlex },
  ];

  const results = await Promise.all(
    sources.map(async (s) => {
      try {
        const items = await s.fn();
        console.log(`  ${s.name}: ${items.length} articles (max ${MAX_PER_SOURCE})`);
        return items;
      } catch (e) {
        console.error(`  ${s.name}: ERROR — ${e.message}`);
        return [];
      }
    })
  );

  const allItems = results.flat();
  console.log(`\nTotal fetched: ${allItems.length}\n`);

  const newItems = allItems.filter((item) => !isDuplicate(existing, item.link, item.title));
  const skipped = allItems.length - newItems.length;

  if (skipped > 0) {
    console.log(`Skipped ${skipped} duplicates already in content.json\n`);
  }

  if (newItems.length === 0) {
    console.log("No new articles found. Content is up to date.");
    return;
  }

  console.log(`=== ${newItems.length} NEW CANDIDATES ===\n`);

  for (let i = 0; i < newItems.length; i++) {
    const item = newItems[i];
    console.log(`[${i + 1}] ${item.title}`);
    console.log(`    Source: ${item.source} | Origin: ${item.origin}`);
    console.log(`    URL: ${item.link}`);
    console.log(`    Date: ${item.pubDate}`);
    console.log();
  }

  // ── Mode 2: --auto (full autonomy) ──
  if (autoMode) {
    console.log("Summarizing with Claude API...\n");
    const summarized = await summarizeWithClaude(newItems);

    let maxId = existing.reduce((max, a) => Math.max(max, parseInt(a.id, 10) || 0), 0);
    let added = 0;

    for (const article of summarized) {
      if (isDuplicate(existing, article.sourceUrl, article.title)) {
        console.log(`  SKIP (duplicate after summarization): ${article.title.slice(0, 50)}...`);
        continue;
      }
      maxId++;
      const entry = {
        id: String(maxId),
        title: article.title,
        summary: article.summary,
        bottomLine: article.bottomLine || "",
        category: article.category,
        publishDate: hebrewDate(),
        sourceUrl: article.sourceUrl,
      };
      existing.unshift(entry);
      added++;
      console.log(`  ADDED #${entry.id}: ${entry.title.slice(0, 60)}...`);
    }

    writeFileSync(CONTENT_PATH, JSON.stringify(existing, null, 2) + "\n", "utf-8");
    console.log(`\nDone: ${added} articles added, ${existing.length} total.`);
    return;
  }

  // ── Mode 3: Dry run (default) ──
  console.log("─".repeat(60));
  console.log("To add articles, review the candidates above, then run:");
  console.log('  node auto-scout.js --apply --articles=\'[{"title":"...","summary":"...","bottomLine":"...","category":"...","sourceUrl":"..."}]\'');
  console.log("\nOr run fully automated:");
  console.log("  ANTHROPIC_API_KEY=sk-... node auto-scout.js --auto");
}

main().catch((e) => {
  console.error("Fatal:", e.message);
  process.exit(1);
});
