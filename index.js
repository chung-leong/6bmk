export {
  normalizeHaiku,
} from './src/haiku.js';
export {
  modifyZip,
  createZip,
  ZipFile,
} from './src/zip.js';

import { createReadStream } from 'fs';
import { ZipFile, modifyZip } from './src/zip.js';
import { Dictionary } from './src/dictionary.js';
import { generateHaikuFromDictionary } from './src/haiku.js';
import { modifyFlyerXML } from './src/flyer.js';

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
  const path = (file) ? file : new URL(`./pptx/flyer-${paper}-${orientation}-${mode}.pptx`, import.meta.url).pathname;
  const stream = createReadStream(path);
  stream.on('end', () => haiku?.return());
  return modifyZip(stream, name => modifyFlyerXML(name, haiku, address, instructions));
}
