import { basename } from 'path';
import { Dictionary } from '../src/dictionary.js';
import { availableLocales, availableSizes } from './create-dict.js';

function findCombinations(n) {
  const list = [];
  const find = (arr, index, num, reducedNum) => {
    if (reducedNum < 0) {
      return;
    }
    if (reducedNum == 0) {
      list.push(arr.slice(0, index).join(''));
      return;
    }
    const prev = (index == 0) ? 1 : arr[index - 1];
    for (let k = prev; k <= num; k++) {
      arr[index] = k;
      find(arr, index + 1, num, reducedNum - k);
    }
  }
  const arr = [];
  find(arr, 0, n, n);
  return list;
}

function findPermutations(string) {
  if (string.length === 1) {
    return string
  }
  const list = []
  for (let i = 0; i < string.length; i++){
    const char = string[i]
    if (string.indexOf(char) != i)
      continue
    const remainingChars = string.slice(0, i) + string.slice(i + 1, string.length);
    for (const permutation of findPermutations(remainingChars)) {
      list.push(char + permutation);
    }
  }
  return list;
}

function findSentenceCount(syllables, dict) {
  const combos = findCombinations(syllables);
  let total = 0;
  for (const combo of combos) {
    const perms = findPermutations(combo);
    for (const perm of perms) {
      let count = 1;
      for (const key of perm.split('')) {
        count *= dict.getWordCount(key);
      }
      total += count;
    }
  }
  return total;
}

async function describeDictionary(options, description) {
  const dict = new Dictionary(options);
  await dict.open();
  console.log(``);
  console.log(`Word-lists for ${description}:`);
  console.log(``);
  let total = 0;
  for (let count = 1; count <= 7; count++) {
    const wordCount = dict.getWordCount(count);
    total += wordCount;
    console.log(`${count}-syllable words: ${wordCount}`);
  }
  console.log(`Total: ${total}`);
  let haikuTotal = 1;
  for (const syllables of [ 5, 7, 5 ]) {
    haikuTotal *= findSentenceCount(syllables, dict);
  }
  console.log(`Possible haiku: ${haikuTotal}`);
  console.log(``);
  await dict.close();
}

async function showAll() {
  for (const locale of availableLocales) {
    for (const size of availableSizes) {
      await describeDictionary({ locale, size }, `${locale}, ${size}`);
    }
  }
}

async function showFiles(files) {
  for (const file of files) {
    const name = basename(file);
    await describeDictionary({ file }, name);
  }
}

const files = process.argv.slice(2);
(files.length > 0 ? showFiles(files) : showAll()).catch((err) => {
  console.error(err);
});
