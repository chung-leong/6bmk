import Chai, { expect } from 'chai';

import {
  Dictionary,
} from '../src/dictionary.js';

describe('Dictionary', function() {
  describe('#open', function() {
    it('should open dictionary', async function() {
      const dict = new Dictionary({ locale: 'en-GB', size: 'small' });
      await dict.open();
      expect(dict.meta.locale).to.equal('en-GB');
      expect(dict.meta.size).to.equal('small');
      await dict.close();
    })
  })
  describe('#getWordCount', function() {
    it('should return the number of words with the given number of syllables', async function() {
      const dict = new Dictionary();
      await dict.open();
      const count = dict.getWordCount(3);
      expect(count).to.be.a('number').that.is.above(0);
      await dict.close();
    })
  })
  describe('#getWord', function() {
    it('should return a word with the given number of syllables', async function() {
      const dict = new Dictionary({ locale: 'en-US', size: 'small' });
      await dict.open();
      const word = await dict.getWord(3, 501);
      expect(word).to.equal('approaching')
      await dict.close();
    })
  })
})

function resolve(path) {
  return (new URL(path, import.meta.url)).pathname;
}
