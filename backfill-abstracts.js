#!/usr/bin/env node
/**
 * backfill-abstracts.js — one-off: add the original abstract to articles
 * published before 10.10.2026, so they can go into the NotebookLM source doc.
 *
 *   node backfill-abstracts.js          — dry run: report what would be filled
 *   node backfill-abstracts.js --write  — write content/articles.json
 *
 * Their Hebrew summaries were written from the headline alone, so each filled
 * article is marked `legacy: true` and the doc carries the abstract, not the summary.
 * Google News links are redirects with no abstract and are left as they are.
 */

import { readFileSync, writeFileSync } from "fs";

const CONTENT_PATH = new URL("./content/articles.json", import.meta.url);
const ABSTRACT_MAX = 2000;
// First article summarized from its abstract (PR #1, 10.10.2026); older ids were written from the headline
const FIRST_ABSTRACT_ID = 167;

const clean = (s) =>
  s.replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, "&")
    .replace(/\s+/g, " ").trim().substring(0, ABSTRACT_MAX);

async function pubmedAbstracts(ids) {
  const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&rettype=abstract&retmode=xml`;
  const xml = await (await fetch(url)).text();
  const out = new Map();
  for (const [, article] of xml.matchAll(/<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g)) {
    const id = article.match(/<PMID[^>]*>(\d+)<\/PMID>/)?.[1];
    const text = [...article.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) => m[1]).join(" ");
    if (id && text) out.set(id, clean(text));
  }
  return out;
}

async function openAlexAbstract(doiUrl) {
  const res = await fetch(`https://api.openalex.org/works/${doiUrl}`);
  if (!res.ok) return "";
  const index = (await res.json()).abstract_inverted_index;
  if (!index) return "";
  const words = [];
  for (const [word, positions] of Object.entries(index)) for (const p of positions) words[p] = word;
  return clean(words.join(" "));
}

async function scienceDailyAbstract(url) {
  const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) return "";
  const html = await res.text();
  return clean(html.match(/<meta name="description" content="([^"]*)"/)?.[1] || "");
}

const articles = JSON.parse(readFileSync(CONTENT_PATH, "utf-8"));
const todo = articles.filter((a) => !a.abstract && !a.sourceUrl.includes("news.google.com"));

const pubmedIds = todo
  .map((a) => a.sourceUrl.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/)?.[1])
  .filter(Boolean);
const pubmed = pubmedIds.length ? await pubmedAbstracts(pubmedIds) : new Map();

let filled = 0;
const missing = [];
for (const a of todo) {
  let abstract = "";
  const pmid = a.sourceUrl.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/)?.[1];
  if (pmid) abstract = pubmed.get(pmid) || "";
  else if (a.sourceUrl.includes("doi.org")) abstract = await openAlexAbstract(a.sourceUrl);
  else if (a.sourceUrl.includes("sciencedaily.com")) abstract = await scienceDailyAbstract(a.sourceUrl);

  if (!abstract) {
    missing.push(`#${a.id} ${a.sourceUrl}`);
    continue;
  }
  a.abstract = abstract;
  if (parseInt(a.id, 10) < FIRST_ABSTRACT_ID) a.legacy = true;
  filled++;
}

console.log(`Candidates: ${todo.length} · filled: ${filled} · no abstract: ${missing.length}`);
for (const m of missing) console.log(`  MISSING ${m}`);

if (process.argv.includes("--write")) {
  writeFileSync(CONTENT_PATH, JSON.stringify(articles, null, 2) + "\n", "utf-8");
  console.log("Written.");
}
