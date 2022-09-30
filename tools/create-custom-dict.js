#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { createDictionary } from './create-dict.js';

function resolve(path) {
  return (new URL(path, import.meta.url)).pathname;
}

async function *loadList(path) {
  const text = await readFile(path, 'utf8');
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const word = line.trim();
    if (/^[a-z]+$/i.test(word)) {
      yield word;
    }
  }
}

const [ script, sourcePath, targetPath ] = process.argv.slice(1);
if (script == resolve('')) {
  if (!sourcePath || !targetPath) {
    console.log(`create-custom-dict.js <source-file> <dest-file>`);
    console.log(``);
    process.exit(0);
  }
  const words = loadList(sourcePath);
  createDictionary(words, targetPath, `custom dictionary`, { custom: true }).catch((err) => {
    console.error(err);
  });
}
