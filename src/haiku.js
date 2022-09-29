import { readFile } from 'fs/promises';
import { createHash } from 'crypto';

export async function generateRandomHaiku() {
  // load dictionary, where words are categorized by syllable count
  const dict = await loadDictionary();
  const sentences = [];
  for (let i = 0; i < 3; i++) {
    // a haiku has 5-7-5 structure
    const sentence = createRandomSentence(dict, (i === 1) ? 7 : 5);
    sentences.push(capitalize(sentence));
  }
  return sentences.join('\n');
}

let dictionary = null;
let dictionaryGCT = 0;

async function loadDictionary() {
  if (!dictionary) {
    const path = (new URL('./word-list.json', import.meta.url)).pathname;
    const json = await readFile(path);
    dictionary = JSON.parse(json);
  }
  // let the dictionary be garbage collected after a while
  clearTimeout(dictionaryGCT);
  dictionaryGCT = setTimeout(() => {
    dictionary = null;
  }, 5000);
  return dictionary;
}

export function createRandomSentence(dict, length) {
  let remaining = length;
  const words = [];
  const sorting = {};
  while (remaining > 0) {
    // pick a random word of a length up to what the sentence has remaining
    const { word, length } = pickRandomWord(dict, remaining);
    words.push(word);
    sorting[word] = Math.random();
    remaining -= length;
  }
  // randomize the order of the words
  words.sort((a, b) => sorting[a] - sorting[b]);
  return words.join(' ');
}

export function pickRandomWord(dict, maxLength) {
  // see how many words in total we're considering
  let count = 0;
  for (let i = 1; i <= maxLength; i++) {
    const list = dict[i];
    count += list.length;
  }
  // generate random index
  let index = Math.floor(count * Math.random());
  // get the item from the right list
  for (let i = 1; i <= maxLength; i++) {
    const list = dict[i];
    if (index < list.length) {
      return { word: list[index], length: i };
    } else {
      index -= list.length;
    }
  }
}

export function getHaikuHash(haiku) {
  if (typeof(haiku) !== 'string') {
    throw new Error('Haiku must be a string');
  }
  // replace sequence of non-alphanumeric characters (including whitespace) with a single space
  const filtered = haiku.toLowerCase().replace(/\W+/g, ' ').trim();
  const shasum = createHash('sha1')
  shasum.update(filtered);
  return shasum.digest('hex');
}

function capitalize(sentence) {
  const fc = sentence.charAt(0);
  return fc.toUpperCase() + sentence.substr(1);
}
