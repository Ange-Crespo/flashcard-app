#!/usr/bin/env node

/**
 * Script to split squad-flashcards.json into 10 smaller JSON files
 * 
 * Usage: node scripts/split-squad-flashcards.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../data/cards/QA/Stanford Question Answering Dataset/squad-flashcards.json');
const OUTPUT_DIR = path.join(__dirname, '../data/cards/QA/Stanford Question Answering Dataset');
const NUM_FILES = 10;

console.log('🔄 Splitting SQuAD flashcards into multiple files...');
console.log(`📖 Reading from: ${INPUT_FILE}`);

// Read and parse the flashcards JSON file
const flashcards = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

if (!Array.isArray(flashcards)) {
  throw new Error('Invalid format: expected an array of flashcards');
}

const totalEntries = flashcards.length;
const entriesPerFile = Math.ceil(totalEntries / NUM_FILES);

console.log(`\n📊 Statistics:`);
console.log(`   Total entries: ${totalEntries.toLocaleString()}`);
console.log(`   Number of files: ${NUM_FILES}`);
console.log(`   Entries per file: ~${entriesPerFile.toLocaleString()}`);

// Split into chunks
for (let i = 0; i < NUM_FILES; i++) {
  const start = i * entriesPerFile;
  const end = Math.min(start + entriesPerFile, totalEntries);
  const chunk = flashcards.slice(start, end);
  
  const outputFile = path.join(OUTPUT_DIR, `squad-flashcards-${i + 1}.json`);
  
  console.log(`\n💾 Writing file ${i + 1}/${NUM_FILES}: ${path.basename(outputFile)}`);
  console.log(`   Entries: ${chunk.length.toLocaleString()} (${start.toLocaleString()}-${(end - 1).toLocaleString()})`);
  
  fs.writeFileSync(outputFile, JSON.stringify(chunk, null, 2), 'utf8');
  
  const fileSize = (fs.statSync(outputFile).size / 1024 / 1024).toFixed(2);
  console.log(`   File size: ${fileSize} MB`);
}

console.log(`\n✅ Split complete!`);
console.log(`   Created ${NUM_FILES} files in: ${OUTPUT_DIR}`);

