#!/usr/bin/env node
/**
 * Road Watch — wire refresher
 *
 * Fetches a handful of public news feeds and writes data/live.json.
 * Runs on a schedule in GitHub Actions, which sidesteps the browser CORS
 * rules that would otherwise block these feeds from a static page.
 *
 * No dependencies. Node 20 or newer (needs global fetch).
 *   node scripts/refresh.mjs
 */

import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(ROOT, 'data/live.json');

const gnews = q =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`;

/* Edit this list to change what the wire panel shows.
   `cap` is how many headlines each feed may contribute. */
const FEEDS = [
  { id: 'ga-roads',  cap: 7, url: gnews('(Georgia OR Atlanta) (crash OR "car accident" OR "traffic death") when:7d') },
  { id: 'ga-metro',  cap: 4, url: gnews('("I-285" OR "I-75" OR "I-20" OR "GA-400") crash Atlanta when:7d') },
  { id: 'recalls',   cap: 4, url: gnews('NHTSA vehicle recall when:14d') },
  { id: 'injurylaw', cap: 4, url: gnews('Georgia "personal injury" OR "tort reform" law when:21d') },
  { id: 'us-safety', cap: 4, url: gnews('NHTSA traffic fatalities OR "road safety" United States when:14d') }
];

const TIMEOUT = 20_000;
const UA = 'Mozilla/5.0 (compatible; AP-RoadWatch/1.0; +https://accidentprofessionals.com)';

const decode = s => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
  .replace(/<[^>]+>/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return m ? decode(m[1]) : '';
};

function parseRss(xml, cap) {
  const items = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const raw of blocks) {
    const block = '<item ' + raw;
    const rawTitle = tag(block, 'title');
    if (!rawTitle) continue;

    // Google News formats titles as "Headline - Publisher"
    let title = rawTitle;
    let source = tag(block, 'source');
    const split = rawTitle.lastIndexOf(' - ');
    if (!source && split > 25) {
      title = rawTitle.slice(0, split);
      source = rawTitle.slice(split + 3);
    } else if (source && rawTitle.endsWith(' - ' + source)) {
      title = rawTitle.slice(0, -(source.length + 3));
    }

    const pub = tag(block, 'pubDate');
    const published = pub && !isNaN(Date.parse(pub))
      ? new Date(pub).toISOString()
      : null;

    items.push({
      title: title.trim(),
      source: (source || 'Unattributed').trim(),
      link: tag(block, 'link'),
      published
    });
    if (items.length >= cap) break;
  }
  return items;
}

async function pull(feed) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(feed.url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': UA, Accept: 'application/rss+xml, application/xml, text/xml' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const items = parseRss(await res.text(), feed.cap);
    console.log(`  ${feed.id.padEnd(10)} ${items.length} items`);
    return items.map(i => ({ ...i, feed: feed.id }));
  } catch (err) {
    console.warn(`  ${feed.id.padEnd(10)} failed — ${err.message}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/* Two outlets covering one crash produce near-identical headlines. */
const key = t => t.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).slice(0, 7).join(' ');

async function main() {
  console.log('Road Watch — refreshing the wire');
  const batches = await Promise.all(FEEDS.map(pull));

  const seen = new Set();
  const items = batches.flat()
    .filter(i => i.title.length > 12)
    .filter(i => { const k = key(i.title); return seen.has(k) ? false : (seen.add(k), true); })
    .sort((a, b) => new Date(b.published || 0) - new Date(a.published || 0))
    .slice(0, 30);

  if (!items.length) {
    console.warn('Every feed came back empty. Keeping the existing file.');
    try { await readFile(OUT); process.exit(0); } catch { /* fall through and write the empty shell */ }
  }

  const payload = {
    generated: new Date().toISOString(),
    sources: FEEDS.map(f => f.id),
    count: items.length,
    items
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload, null, 2) + '\n');
  console.log(`Wrote ${items.length} items to data/live.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
