import { ZipFile } from './zip.js';

export class Dictionary {
  constructor(options = {}) {
    const {
      locale = 'en-US',
      size = 'medium',
      file,
    } = options;
    if (file) {
      this.path = file;
    } else {
      this.path = (new URL(`../dict/${locale}-${size}.zip`, import.meta.url)).pathname;
    }
    this.zip = null;
    this.meta = null;
    this.cache = {};
  }

  async open() {
    this.zip = new ZipFile(this.path);
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
