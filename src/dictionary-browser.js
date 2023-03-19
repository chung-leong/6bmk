import { ZipFile } from './zip-browser.js';

export class Dictionary {
  constructor(options = {}) {
    this.options = options;
    this.zip = null;
    this.meta = null;
    this.cache = {};
  }

  async open() {
    const {
      locale = 'en-US',
      size = 'medium',
      file,
    } = this.options;
    const path = (file) ? file : await getDictionaryPath(locale, size);
    this.zip = new ZipFile(path);
    await this.zip.open();
    this.meta = await this.zip.extractJSONFile('meta.json');
  }

  async close() {
    await this.zip.close();
  }

  async getWord(syllableCount, index) {
    const perFile = 250;
    const offset = index % perFile;
    const start = index - offset;
    const filename = `${syllableCount}-syllable/${start}.txt`;
    let list = this.cache[filename];
    if (!list) {
      const text = await this.zip.extractTextFile(filename);
      list = this.cache[filename] = text.split('\n');
    }
    return list[offset];
  }

  getWordCount(syllableCount) {
    return this.meta.words[`${syllableCount}-syllable`];
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
  const m = await import(/* webpackMode: "eager" */ `../dict/${locale}-${size}.zip`);
  return m.default;  
}
