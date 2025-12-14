#!/usr/bin/env node

/**
 * Script to convert SQuAD v2.0 format to flashcard-compatible JSON format
 * 
 * Usage: node scripts/convert-squad-to-flashcards.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.join(__dirname, '../data/cards/QA/Stanford Question Answering Dataset/train-v2.0.json');
const OUTPUT_FILE = path.join(__dirname, '../data/cards/QA/Stanford Question Answering Dataset/squad-flashcards.json');

console.log('🔄 Converting SQuAD dataset to flashcard format...');
console.log(`📖 Reading from: ${INPUT_FILE}`);

// Read and parse the SQuAD JSON file
const squadData = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

if (!squadData.data || !Array.isArray(squadData.data)) {
  throw new Error('Invalid SQuAD format: missing or invalid data array');
}

const flashcards = [];
let totalQAs = 0;
let skippedImpossible = 0;
let skippedNoAnswer = 0;

// Process each article
for (const dataItem of squadData.data) {
  const title = dataItem.title || 'Unknown';
  
  // Process each paragraph
  for (const paragraph of dataItem.paragraphs) {
    const context = paragraph.context || '';
    
    // Process each question-answer pair
    for (const qa of paragraph.qas) {
      totalQAs++;
      
      // Skip impossible questions (unanswerable)
      if (qa.is_impossible) {
        skippedImpossible++;
        continue;
      }
      
      // Get the best answer (first answer, or first plausible answer if no answers)
      const answer = qa.answers && qa.answers.length > 0 
        ? qa.answers[0] 
        : (qa.plausible_answers && qa.plausible_answers.length > 0 
            ? qa.plausible_answers[0] 
            : null);
      
      if (!answer) {
        skippedNoAnswer++;
        continue;
      }
      
      // Create flashcard entry
      const entry = {
        question: qa.question || '',
        answer: answer.text || '',
        context: context,
        title: title,
        qa_id: qa.id || '',
        answer_start: answer.answer_start || 0,
        all_answers: qa.answers ? qa.answers.map(a => a.text) : [],
        useful_for_flashcard: true, // All valid SQuAD entries are useful
      };
      
      flashcards.push(entry);
    }
  }
}

console.log(`\n📊 Conversion Statistics:`);
console.log(`   Total QAs processed: ${totalQAs.toLocaleString()}`);
console.log(`   Impossible QAs skipped: ${skippedImpossible.toLocaleString()}`);
console.log(`   QAs with no answer skipped: ${skippedNoAnswer.toLocaleString()}`);
console.log(`   ✅ Valid flashcards created: ${flashcards.length.toLocaleString()}`);

// Write the output file
console.log(`\n💾 Writing to: ${OUTPUT_FILE}`);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(flashcards, null, 2), 'utf8');

console.log(`\n✅ Conversion complete!`);
console.log(`   Output file: ${OUTPUT_FILE}`);
console.log(`   File size: ${(fs.statSync(OUTPUT_FILE).size / 1024 / 1024).toFixed(2)} MB`);

