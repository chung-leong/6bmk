import { expect } from 'chai';
import { phonesForWord, syllableCount } from 'pronouncing';
import { Dictionary } from '../src/dictionary.js';

import {
  createRandomSentence,
  generateMultipleHaiku,
  getHaikuHash,
} from '../src/haiku.js';

describe('Haiku generation', function() {
  describe('#createRandomSentence()', function() {
    it('should generate a random sentence of the correct length', async function() {
      const dict = new Dictionary();
      await dict.open();
      for (let i = 0; i < 10; i++) {
        const sentence = await createRandomSentence(dict, 7);
        expect(sentence).to.satisfy(() => {
          let count = 0;
          for (const word of sentence.split(' ')) {
            count += countSyllables(word);
          }
          if (count !== 7) {
            for (const word of sentence.split(' ')) {
              const count = countSyllables(word);
              console.log(`${word} -> ${count} syllable(s)`);
            }
          }
          return count === 7;
        });
      }
      await dict.close();
    })
  })
  describe('#generateMultipleHaiku()', async function() {
    function isHaiku(haiku) {
      const filtered = haiku.toLowerCase().replace(/[^\s\w]+/g, '');
      const [ l1, l2, l3 ] = filtered.split(/[\r\n]+/).map((line) => {
        const words = line.split(/\s+/);
        let count = 0;
        for (const word of words) {
          count += countSyllables(word);
        }
        return count;
      });
      return l1 === 5 && l2 === 7 && l3 === 5;
    }
    it('should generate multiple random haiku', async function() {
      const known = 'The west wind whispered,\nAnd touched the eyelids of spring:\nHer eyes, Primroses.';
      const control = isHaiku(known);
      expect(control).to.be.true;
      const haikuList = await generateMultipleHaiku(10);
      expect(haikuList).to.have.lengthOf(10);
      for (const haiku of haikuList) {
        const result = isHaiku(haiku);
        expect(result).to.be.true;
      }
    })
  })
  describe('#getHaikuHash()', function() {
    const base = 'the west wind whispered\nand touched the eyelids of spring\nher eyes Primroses';
    it('should generate a string with 40 characters', function() {
      const hash = getHaikuHash(base);
      expect(hash).to.have.lengthOf(40);
    })
    it('should generate the same hash regardless of cases', function() {
      const test = 'The west wind whispered\nAnd touched the eyelids of spring\nHer eyes Primroses'
      const hash1 = getHaikuHash(base);
      const hash2 = getHaikuHash(test);
      expect(hash1).to.equal(hash2);
    })
    it('should generate the same hash regardless of punctuations', function() {
      const test = 'The west wind whispered,\nAnd touched the eyelids of spring:\nHer eyes, Primroses'
      const hash1 = getHaikuHash(base);
      const hash2 = getHaikuHash(test);
      expect(hash1).to.equal(hash2);
    })
    it('should generate the same hash when there are extra linefeeds', function() {
      const test = 'The west wind whispered,\nAnd touched the eyelids of spring:\nHer eyes, Primroses\n\n\n'
      const hash1 = getHaikuHash(base);
      const hash2 = getHaikuHash(test);
      expect(hash1).to.equal(hash2);
    })
  })
})

function countSyllables(word) {
  const phonemes = phonesForWord(word.toLowerCase())[0];
  if (phonemes) {
    return syllableCount(phonemes);
  }
  return 0;
}
