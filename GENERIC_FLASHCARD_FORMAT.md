# Generic Flashcard Format

The app now supports loading **any flashcard format** without requiring code changes. The system uses intelligent auto-detection and supports custom field mappings.

## How It Works

The app tries formats in this order:

1. **Known formats** (Mandarin, SQuAD, Standard GistFlashcard)
2. **Auto-detection** - Automatically detects common field patterns
3. **Custom mapping** - Uses configuration you provide

## Auto-Detection

The system automatically detects common field names:

### Front/Question Fields

- `question`, `q`, `front`, `prompt`, `word`, `term`, `vocabulary`
- `front_text`, `question_text`, `frontside`, `front_side`

### Back/Answer Fields

- `answer`, `a`, `back`, `response`, `translation`, `definition`
- `back_text`, `answer_text`, `backside`, `back_side`, `english_translation`

### Other Fields

- **Category**: `category`, `cat`, `topic`, `subject`, `title`, `cefr_level`, `level`
- **Tags**: `tags`, `tag`, `labels`, `label`
- **Language**: `language`, `lang`, `locale`
- **Examples**: `example`, `examples`, `context`, `usage`, `note`, `notes`

## Basic Usage (Auto-Detection)

Just provide an array of objects with at least two string fields:

```json
[
  {
    "term": "Hello",
    "definition": "A greeting"
  },
  {
    "term": "World",
    "definition": "The earth"
  }
]
```

The app will automatically:

- Use `term` as the front
- Use `definition` as the back
- Create flashcards from your data

## Custom Mapping (Recommended)

For more control, embed a `_config` object in your JSON:

```json
{
  "_config": {
    "mapping": {
      "front": "term",
      "back": "definition",
      "category": "subject",
      "tags": "topics",
      "language": "english",
      "examples": "usage_examples"
    },
    "defaults": {
      "language": "english",
      "deckId": "my-deck",
      "deckName": "My Custom Deck",
      "frontTitle": "Term",
      "backTitle": "Definition",
      "frontHint": "Read the term",
      "backHint": "Check the definition"
    }
  },
  "data": [
    {
      "term": "Hello",
      "definition": "A greeting",
      "subject": "Greetings",
      "topics": ["basic", "common"],
      "usage_examples": "Hello, how are you?"
    }
  ]
}
```

## Field Mapping Options

### Required Fields

- `front` - Field name(s) for the question/front side
- `back` - Field name(s) for the answer/back side

### Optional Fields

- `frontSubText` - Subtitle on front (e.g., pronunciation)
- `backSubText` - Subtitle on back
- `category` - Category/grouping field
- `tags` - Tags field(s) (can be array or comma-separated)
- `language` - Language field
- `difficulty` - Difficulty level field
- `frontExamples` - Examples shown on front
- `backExamples` - Examples shown on back
- `examples` - Shared examples
- `metadata` - Metadata object or field names
- `id` - Unique ID field
- `deckId` - Deck ID field
- `deckName` - Deck name field
- `frontTitle` - Custom title for front face
- `backTitle` - Custom title for back face
- `frontHint` - Custom hint for front
- `backHint` - Custom hint for back
- `filter` - Function to filter entries (not supported in JSON, only in code)

### Multiple Field Names

You can provide multiple field names as an array. The first one found will be used:

```json
{
  "_config": {
    "mapping": {
      "front": ["question", "q", "prompt"],
      "back": ["answer", "a", "response"]
    }
  }
}
```

## Examples

### Example 1: Simple Q&A Format

```json
[
  {
    "question": "What is React?",
    "answer": "A JavaScript library for building user interfaces"
  }
]
```

### Example 2: Vocabulary with Examples

```json
{
  "_config": {
    "mapping": {
      "front": "word",
      "back": "translation",
      "frontSubText": "pronunciation",
      "examples": "example_sentence",
      "category": "level"
    },
    "defaults": {
      "language": "spanish",
      "frontTitle": "Word",
      "backTitle": "Translation"
    }
  },
  "data": [
    {
      "word": "hola",
      "pronunciation": "OH-lah",
      "translation": "hello",
      "level": "A1",
      "example_sentence": "Hola, ¿cómo estás?"
    }
  ]
}
```

### Example 3: Medical Terms

```json
{
  "_config": {
    "mapping": {
      "front": "term",
      "back": "definition",
      "category": "specialty",
      "tags": "tags",
      "examples": "clinical_note"
    },
    "defaults": {
      "language": "english",
      "deckName": "Medical Terminology",
      "frontTitle": "Medical Term",
      "backTitle": "Definition"
    }
  },
  "data": [
    {
      "term": "Hypertension",
      "definition": "High blood pressure",
      "specialty": "Cardiology",
      "tags": ["cardiovascular", "common"],
      "clinical_note": "Patient presents with hypertension"
    }
  ]
}
```

## Fallback Behavior

If auto-detection fails, the system will:

1. Try to use the first two string fields found
2. If only one string field exists, use it for both front and back (not ideal)
3. Return an error if no valid fields are found

## Tips

1. **Use `_config` for complex formats** - It gives you full control
2. **Provide clear field names** - Use descriptive names like `question`/`answer` or `term`/`definition`
3. **Include examples** - Add example fields to make cards more useful
4. **Set defaults** - Use `defaults` to avoid repeating common values
5. **Test with a small sample** - Try with 2-3 cards first to verify the mapping

## Debugging

If your flashcards aren't loading:

1. Check the Debug Panel (Ctrl+Shift+D or Settings → Debug Gist)
2. Look for conversion errors in the logs
3. Verify your field names match the mapping
4. Ensure at least two string fields exist in each entry

The debug panel will show:

- Which format was detected
- Field mapping used
- Number of cards converted
- Any errors encountered
