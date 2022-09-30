#!/usr/bin/env node

import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { phonesForWord, syllableCount } from 'pronouncing';
import { ZipFile, createZip } from '../src/zip.js';

// SCOWL word lists divided by size and dialect
const englishSmall = [
  'english-words.10',
  'english-words.20',
  'english-words.35',
  'english-upper.10',
  'english-upper.35',
  'english-proper-names.35',
];
const englishMedium = [
  ...englishSmall,
  'english-words.40',
  'english-words.50',
  'english-upper.40',
  'english-upper.50',
  'english-proper-names.40',
  'english-proper-names.50',
];
const englishLarge = [
  ...englishMedium,
  'english-words.55',
  'english-words.60',
  'english-words.70',
  'english-upper.60',
  'english-upper.70',
  'english-proper-names.60',
  'english-proper-names.70',
];
const englishHuge = [
  ...englishLarge,
  'english-words.80',
  'english-upper.80',
  'english-proper-names.80',
];
const englishInsane = [
  ...englishHuge,
  'english-words.95',
  'english-upper.95',
  'english-proper-names.95',
];

const americanSmall = [
  'american-words.10',
  'american-words.20',
  'american-words.35',
];
const americanMedium = [
  ...americanSmall,
  'american-words.40',
  'american-words.50',
  'american-upper.50',
  'american-proper-names.50',
];
const americanLarge = [
  ...americanMedium,
  'american-words.55',
  'american-words.60',
  'american-words.70',
  'american-upper.60',
  'american-upper.70',
];
const americanHuge = [
  ...americanLarge,
  'american-words.80',
  'american-upper.80',
  'american-proper-names.80',
];
const americanInsane = [
  ...americanHuge,
  'american-words.95',
  'american-upper.95',
  'american-proper-names.95',
];

const australianSmall = [
  'australian-words.10',
  'australian-words.20',
  'australian-words.35',
  'australian-upper.35',
  'australian-proper-names.35',
];
const australianMedium = [
  ...australianSmall,
  'australian-words.40',
  'australian-words.50',
  'australian-upper.50',
  'australian-proper-names.50',
];
const australianLarge = [
  ...australianMedium,
  'australian-words.55',
  'australian-words.60',
  'australian-words.70',
  'australian-upper.60',
  'australian-upper.70',
];
const australianHuge = [
  ...australianLarge,
  'australian-words.80',
  'australian-upper.80',
  'australian-proper-names.80',
];
const australianInsane = [
  ...australianHuge,
  'australian-words.95',
  'australian-upper.95',
  'australian-proper-names.95',
];

const britishSmall = [
  'british-words.10',
  'british-words.20',
  'british-words.35',
  'british-upper.35',
];
const britishMedium = [
  ...britishSmall,
  'british-words.40',
  'british-words.50',
  'british-upper.50',
];
const britishLarge = [
  ...britishMedium,
  'british-words.55',
  'british-words.60',
  'british-words.70',
  'british-upper.60',
  'british-upper.70',
];
const britishHuge = [
  ...britishLarge,
  'british-words.80',
  'british-upper.80',
  'british-proper-names.80',
];
const britishInsane = [
  ...britishHuge,
  'british-words.95',
  'british-upper.95',
  'british-proper-names.95',
];

const canadianSmall = [
  'canadian-words.10',
  'canadian-words.20',
  'canadian-words.35',
  'canadian-upper.35',
];
const canadianMedium = [
  ...canadianSmall,
  'canadian-words.40',
  'canadian-words.50',
  'canadian-upper.50',
];
const canadianLarge = [
  ...canadianMedium,
  'canadian-words.55',
  'canadian-words.60',
  'canadian-words.70',
  'canadian-upper.60',
  'canadian-upper.70',
];
const canadianHuge = [
  ...canadianLarge,
  'canadian-words.80',
  'canadian-upper.80',
  'canadian-proper-names.80',
];
const canadianInsane = [
  ...canadianHuge,
  'canadian-words.95',
  'canadian-upper.95',
  'canadian-proper-names.95',
];

const wordLists = {
  'en-US': {
    small: [ ...englishSmall, ...americanSmall ],
    medium: [ ...englishMedium, ...americanMedium ],
    large: [ ...englishLarge, ...americanLarge ],
    huge: [ ...englishHuge, ...americanHuge ],
    insane: [ ...englishInsane, ...americanInsane ],
  },
  'en-AU': {
    small: [ ...englishSmall, ...australianSmall ],
    medium: [ ...englishMedium, ...australianMedium ],
    large: [ ...englishLarge, ...australianLarge ],
    huge: [ ...englishHuge, ...australianHuge ],
    insane: [ ...englishInsane, ...australianInsane ],
  },
  'en-GB': {
    small: [ ...englishSmall, ...britishSmall ],
    medium: [ ...englishMedium, ...britishMedium ],
    large: [ ...englishLarge, ...britishLarge ],
    huge: [ ...englishHuge, ...britishHuge ],
    insane: [ ...englishInsane, ...britishInsane ],
  },
  'en-CA': {
    small: [ ...englishSmall, ...canadianSmall ],
    medium: [ ...englishMedium, ...canadianMedium ],
    large: [ ...englishLarge, ...canadianLarge ],
    huge: [ ...englishHuge, ...canadianHuge ],
    insane: [ ...englishInsane, ...canadianInsane ],
  },
};

export async function createDictionary(words, targetPath, description, meta) {
  const generateLists = async function*() {
    const lists = {
      '1': [],
      '2': [],
      '3': [],
      '4': [],
      '5': [],
      '6': [],
      '7': [],
    };
    for await (const word of words) {
      const count = countSyllable(word);
      if (count >= 1 && count <= 7) {
        const list = lists[count];
        list.push(word);
      }
    }
    for (let count = 1; count <= 7; count++) {
      const list = lists[count];
      list.sort();
      if (list.length > 0) {
        const dirName = `${count}-syllable/`;
        const perFile = 250;
        yield { name: dirName, isFile: false };
        for (let i = 0; i < list.length; i += perFile) {
          const slice = list.slice(i, i + perFile);
          const name = dirName + `${i}.txt`;
          const data = Buffer.from(slice.join('\n'));
          yield { name, data, isText: true };
        }
      }
    }
    console.log(``);
    console.log(`Word-lists for ${description}:`);
    console.log(``);
    const counts = {};
    let total = 0;
    for (let count = 1; count <= 7; count++) {
      const list = lists[count];
      counts[`${count}-syllable`] = list.length;
      total += list.length;
      console.log(`${count}-syllable words: ${list.length}`);
    }
    console.log(`Total: ${total}`);
    console.log(``);

    const name = `meta.json`;
    const data = Buffer.from(JSON.stringify({ ...meta, words: counts }, undefined, 2));
    yield { name, data, isText: true };
  };
  const zipStream = createZip(generateLists());
  const zipFileStream = createWriteStream(targetPath);
  await pipe(zipStream, zipFileStream);
  console.log(`Dictionary saved to ${targetPath}`);
  console.log(``);
}

function countSyllable(word) {
  const lowercase = word.toLowerCase();
  const phonemes = phonesForWord(lowercase)[0];
  if (phonemes) {
    return syllableCount(phonemes);
  }
}

async function *extractWords(zip, locale, size) {
  const filenames = wordLists[locale][size];
  for (const filename of filenames) {
    console.log(`Processing ${filename}`);
    const text = await zip.extractTextFile(`final/${filename}`, 'ascii');
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const word = line.trim();
      if (/^[a-z]+$/i.test(word)) {
        yield word;
      }
    }
  }
}

async function pipe(source, dest) {
  await new Promise((resolve, reject) => {
    pipeline(source, dest, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function resolve(path) {
  return (new URL(path, import.meta.url)).pathname;
}

async function createDictionaries(locales, sizes) {
  const zipPath = resolve('./scowl-2020.12.07.zip');
  const zip = new ZipFile(zipPath);
  await zip.open();
  for (const locale of locales) {
    for (const size of sizes) {
      const targetPath = resolve(`../dict/${locale}-${size}.zip`);
      const words = extractWords(zip, locale, size);
      await createDictionary(words, targetPath, `${locale}, ${size}`, { locale, size });
    }
  }
  await zip.close();
}

export const availableLocales = [ 'en-US', 'en-AU', 'en-GB', 'en-CA' ];
export const availableSizes = [ 'small', 'medium', 'large', 'huge', 'insane' ];

const [ script, localeReq, sizeReq ] = process.argv.slice(1);
if (script == resolve('')) {
  const locales = availableLocales.filter((locale) => {
    const l1 = (localeReq || '').toLowerCase();
    const l2 = locale.toLowerCase();
    return l1 === 'all' || l1 === l2;
  });
  const sizes = availableSizes.filter((size) => {
    const s1 = (sizeReq || '').toLowerCase();
    const s2 = size.toLowerCase();
    return s1 === 'all' || s1 === s2;
  });
  if (locales.length === 0 || sizes.length === 0) {
    console.log(`create-dict.js <locale> <size>`);
    console.log(``);
    console.log(`Available locales: ${availableLocales.join(', ')}`);
    console.log(`Available sizes: ${availableSizes.join(', ')}`);
    console.log(``)
    console.log(`Use "all" to select all locales or sizes`);
    process.exit(0);
  }
  createDictionaries(locales, sizes).catch((err) => {
    console.error(err);
  });
}
