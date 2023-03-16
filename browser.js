export {
  normalizeHaiku,
} from './src/haiku.js';
export {
  modifyZip,
  createZip,
  ZipFile,
} from './src/zip-browser.js';

import { ZipFile } from './src/zip-browser.js';
import { Dictionary } from './src/dictionary.js';
import { generateHaikuFromDictionary } from './src/haiku.js';

export async function *generateHaiku(options = {}) {
  const {
    locale = 'en-US',
    size = 'medium',
    file,
  } = options;
  const url = (file) ? file : await getDictionaryPath(locale, size);
  const zip = new ZipFile(url);
  const dict = new Dictionary(zip);
  await dict.open();
  try {
    for (;;) {
      yield generateHaikuFromDictionary(dict);
    }
  } finally {
    await dict.close();
  }
}

async function getDictionaryPath(locale, size) {
  if (process.env.NODE_ENV !== 'production') {
    // accommodate loading in Node.js for unit testing purpose
    if (typeof global === 'object' && global.global === global) {
      return `/dict/${locale}-${size}.zip`;
    }
  }
  /* c8 ignore next 2 */
  const m = await import(/* webpackMode: "eager" */ `./dict/${locale}-${size}.zip`);
  return m.default;  
}