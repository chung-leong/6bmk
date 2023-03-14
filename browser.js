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

let dictionaryURL = '/dict';

export function setDictionaryFolder(url) {
  dictionaryURL = url;
}

export async function generateHaiku(options = {}) {
  const [ haiku ] = await generateMultipleHaiku(1, options);
  return haiku;
}

export async function generateMultipleHaiku(count, options = {}) {
  const {
    locale = 'en-US',
    size = 'medium',
    file,
  } = options;
  const url = (file) ? file : new URL(`${locale}-${size}.zip`, dictionaryURL);
  const zip = new ZipFile(url);
  const dict = new Dictionary(zip);
  await dict.open();
  const haiku = await generateHaikuFromDictionary(count, dict);
  await dict.close();
  return haiku;
}
