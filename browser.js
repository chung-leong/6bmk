export {
  normalizeHaiku,
} from './src/haiku.js';
export {
  modifyZip,
  createZip,
  ZipFile,
} from './src/zip-browser.js';

import { ZipFile, modifyZip } from './src/zip-browser.js';
import { Dictionary } from './src/dictionary.js';
import { generateHaikuFromDictionary } from './src/haiku.js';
import { modifyFlyerXML } from './src/flyer.js';

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

export async function createFlyer(options = {}) {
  const {
    paper = 'letter',
    orientation = 'portrait',
    mode = 'simplex',
    file,
    haiku,
    address = '',
    instructions = '',
  } = options;
  const url = (file) ? file : await getTemplatePath(paper, orientation, mode);
  const res = await fetch(url)
  const stream = res.body;
  // TODO: shutdown generator
  return modifyZip(stream, name => modifyFlyerXML(name, haiku, address, instructions));
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

async function getTemplatePath(paper, orientation, mode) {
  if (process.env.NODE_ENV !== 'production') {
    // ditto
    if (typeof global === 'object' && global.global === global) {
      return `/pptx/flyer-${paper}-${orientation}-${mode}.pptx`;
    }
  }
  /* c8 ignore next 2 */
  const m = await import(/* webpackMode: "eager" */ `./pptx/flyer-${paper}-${orientation}-${mode}.pptx`);
  return m.default;  
}