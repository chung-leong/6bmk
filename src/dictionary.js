export class Dictionary {
  constructor(zip) {
    this.zip = zip;
    this.meta = null;
    this.cache = {};
  }

  async open() {
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
