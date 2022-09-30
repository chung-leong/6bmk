import Chai, { expect } from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import { Readable, pipeline } from 'stream';
import { createReadStream, createWriteStream } from 'fs';

Chai.use(ChaiAsPromised);

import {
  Dictionary,
} from '../src/dictionary.js';

describe('Dictionary', function() {
  describe('#open()', function() {
    it('should open dictionary', async function() {
      const dict = new Dictionary({ locale: 'en-US', size: 'small' });
      await dict.open();
      expect(dict.meta.locale).to.equal('en-US');
      expect(dict.meta.size).to.equal('small');
    })
    it('should open en-US medium dictionary when no options is specified', async function() {
      const dict = new Dictionary;
      await dict.open();
      expect(dict.meta.locale).to.equal('en-US');
      expect(dict.meta.size).to.equal('medium');
    })
    it('should open a custom dictionary', async function() {
      const dict = new Dictionary({ file: resolve('./files/dict.zip' )});
      await dict.open();
      expect(dict.meta.custom).to.equal(true);
      const word = await dict.getWord(1, 0);
      expect(word).to.equal('June');
    })
  })
  describe('#getWordCount()', function() {
    it('should return the number of words with the given number of syllables', async function() {
      const dict = new Dictionary;
      await dict.open();
      const count = dict.getWordCount(3);
      expect(count).to.be.a('number').that.is.above(0);
    })
  })
  describe('#getWord()', function() {
    it('should return a word with the given number of syllables', async function() {
      const dict = new Dictionary({ locale: 'en-US', size: 'small' });
      await dict.open();
      const word = await dict.getWord(3, 501);
      expect(word).to.equal('approaching')
    })
  })
})

function resolve(path) {
  return (new URL(path, import.meta.url)).pathname;
}
