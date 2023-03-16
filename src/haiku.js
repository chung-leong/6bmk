import { Dictionary } from './dictionary.js';

export async function generateHaikuFromDictionary(dict) {
  // load dictionary, where words are categorized by syllable count
  const sentences = [];
  for (let i = 0; i < 3; i++) {
    // a haiku has 5-7-5 structure
    const sentence = await createRandomSentence(dict, (i === 1) ? 7 : 5);
    sentences.push(capitalize(sentence));
  }
  return sentences.join('\n');
}

export async function createRandomSentence(dict, syllableCount) {
  let remaining = syllableCount;
  const words = [];
  const sorting = {};
  while (remaining > 0) {
    // pick a random word of a length up to what the sentence has remaining
    const { word, syllables } = await pickRandomWord(dict, remaining);
    words.push(word);
    sorting[word] = Math.random();
    remaining -= syllables;
  }
  // randomize the order of the words
  words.sort((a, b) => sorting[a] - sorting[b]);
  return words.join(' ');
}

async function pickRandomWord(dict, maxSyllableCount) {
  // see how many words in total we're considering
  let total = 0;
  for (let syllables = 1; syllables <= maxSyllableCount; syllables++) {
    total += dict.getWordCount(syllables);
  }
  // generate random index
  let index = Math.floor(total * Math.random());
  // get the item from the right list
  for (let syllables = 1; syllables <= maxSyllableCount; syllables++) {
    const count = dict.getWordCount(syllables);
    if (index < count) {
      const word = await dict.getWord(syllables, index);
      return { word, syllables };
    } else {
      index -= count;
    }
  }
  /* c8 ignore next */
}

export function normalizeHaiku(haiku) {
  if (typeof(haiku) !== 'string') {
    throw new Error('Haiku must be a string');
  }
  // replace sequence of non-alphanumeric characters (including whitespace) with a single space
  return haiku.toLowerCase().replace(/\W+/g, ' ').trim();
}

function capitalize(sentence) {
  const fc = sentence.charAt(0);
  return fc.toUpperCase() + sentence.substr(1);
}
