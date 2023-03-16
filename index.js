export {
  normalizeHaiku,
} from './src/haiku.js';
export {
  modifyZip,
  createZip,
  ZipFile,
} from './src/zip.js';

import { ZipFile } from './src/zip.js';
import { Dictionary } from './src/dictionary.js';
import { generateHaikuFromDictionary } from './src/haiku.js';

export async function *generateHaiku(options = {}) {
  const {
    locale = 'en-US',
    size = 'medium',
    file,
  } = options;
  const path = (file) ? file : new URL(`./dict/${locale}-${size}.zip`, import.meta.url).pathname;
  const zip = new ZipFile(path);
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



