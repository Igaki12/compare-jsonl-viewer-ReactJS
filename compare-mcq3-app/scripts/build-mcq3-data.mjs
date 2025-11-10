#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '..');
const typeFiles = Array.from({ length: 10 }, (_, i) => `news_mcq3_with_gemma3_type${i + 1}_sample50.jsonl`);

const articlesById = new Map();
let orderCounter = 0;

const dataDir = path.join(rootDir, 'public', 'data');

for (const file of typeFiles) {
  const filePath = path.join(dataDir, file);
  const typeMatch = file.match(/type(\d+)/);
  if (!typeMatch) {
    console.warn(`Skipping ${file} because type number could not be parsed.`);
    continue;
  }
  const typeLabel = `type${typeMatch[1]}`;

  let text;
  try {
    text = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`Skipping missing file ${filePath}`);
      continue;
    }
    console.error(`Failed to read ${filePath}:`, error.message);
    process.exitCode = 1;
    continue;
  }

  for (const line of text.split('\n').filter(Boolean)) {
    let record;
    try {
      record = JSON.parse(line);
    } catch (error) {
      console.warn(`Skipping malformed JSON line in ${file}:`, error.message);
      continue;
    }

    const key = record.news_item_id || record.id;
    if (!key) {
      console.warn(`Skipping record without stable id in ${file}.`);
      continue;
    }

    if (!articlesById.has(key)) {
      articlesById.set(key, {
        news_item_id: record.news_item_id,
        id: record.id,
        headline: record.headline,
        sub_headline: record.sub_headline,
        content: record.content,
        date_time: record.date_time,
        provider_id: record.provider_id,
        first_created: record.first_created,
        questionTypes: {},
        order: orderCounter++,
      });
    }

    const entry = articlesById.get(key);
    entry.questionTypes[typeLabel] = record.questions;
  }
}

const articles = Array.from(articlesById.values())
  .sort((a, b) => a.order - b.order)
  .map(({ order, ...rest }) => rest);

const output = {
  generatedAt: new Date().toISOString(),
  types: typeFiles.map((file) => file.match(/type(\d+)/)[1]),
  articleCount: articles.length,
  articles,
};

await fs.mkdir(dataDir, { recursive: true });
const outFile = path.join(dataDir, 'articles.json');
await fs.writeFile(outFile, JSON.stringify(output, null, 2), 'utf8');
console.log(`Wrote ${articles.length} articles to ${outFile}`);
