#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(projectRoot, '..');

const TYPE_IDS = Array.from({ length: 10 }, (_, index) => `${index + 1}`);

const TYPE_SOURCES = TYPE_IDS.map((typeId) => ({
  typeId,
  file: path.join('..', 'jiji-compe2', `append_news_mcq3_with_gemma3_type${typeId}.py`),
}));

const readSystemInstructions = (sourceText) => {
  const match = sourceText.match(/SYSTEM_INSTRUCTIONS\s*=\s*\(([\s\S]*?)\)/);
  if (!match) {
    throw new Error('SYSTEM_INSTRUCTIONS block was not found.');
  }

  const literals = [...match[1].matchAll(/"([^"\\]*(?:\\.[^"\\]*)*)"/g)].map(([, raw]) =>
    raw.replace(/\\"/g, '"').replace(/\\n/g, '\n'),
  );
  return literals.join('');
};

const splitSentences = (text) =>
  text
    .split(/(?<=[。．！？])\s*/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

const typeInstructions = {};

for (const { typeId, file } of TYPE_SOURCES) {
  const filePath = path.join(repoRoot, file);
  let sourceText;
  try {
    sourceText = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    console.error(`Failed to read ${filePath}: ${error.message}`);
    process.exitCode = 1;
    continue;
  }

  try {
    const text = readSystemInstructions(sourceText);
    const sentences = splitSentences(text);
    typeInstructions[typeId] = {
      file: path.relative(projectRoot, filePath),
      text,
      sentences,
    };
  } catch (error) {
    console.error(`Failed to parse SYSTEM_INSTRUCTIONS in ${file}: ${error.message}`);
    process.exitCode = 1;
  }
}

const availableTypes = Object.keys(typeInstructions);
if (!availableTypes.length) {
  console.error('No SYSTEM_INSTRUCTIONS could be extracted. Aborting.');
  process.exit(1);
}

let commonSentences = new Set(typeInstructions[availableTypes[0]].sentences);
for (const typeId of availableTypes.slice(1)) {
  const nextSet = new Set();
  for (const sentence of typeInstructions[typeId].sentences) {
    if (commonSentences.has(sentence)) {
      nextSet.add(sentence);
    }
  }
  commonSentences = nextSet;
}

const output = {
  generatedAt: new Date().toISOString(),
  commonInstructions: Array.from(commonSentences),
  types: {},
};

for (const typeId of availableTypes) {
  const { file, text, sentences } = typeInstructions[typeId];
  output.types[typeId] = {
    source: file,
    systemInstructions: sentences,
    typeSpecificInstructions: sentences.filter((sentence) => !commonSentences.has(sentence)),
    fullText: text,
  };
}

const dataDir = path.join(projectRoot, 'src', 'data');
await fs.mkdir(dataDir, { recursive: true });

const outFile = path.join(dataDir, 'mcq3SystemInstructions.json');
await fs.writeFile(outFile, JSON.stringify(output, null, 2), 'utf8');

console.log(`Wrote instruction summary for ${availableTypes.length} types to ${outFile}`);
