import { expect } from 'chai';
import { countSyllables } from './count-syllables.js';
import { Dictionary } from '../src/dictionary.js';
import { ZipFile } from '../src/zip.js';

import {
  createRandomSentence,
} from '../src/haiku.js';
import {
  generateHaiku,
  normalizeHaiku,
} from '../index.js';

describe('Haiku generation', function() {
  describe('#createRandomSentence', function() {
    it('should generate a random sentence of the correct length', async function() {
      const zip = new ZipFile(resolve('../dict/en-US-small.zip'));
      const dict = new Dictionary(zip);
      await dict.open();
      for (let i = 0; i < 10; i++) {
        const sentence = await createRandomSentence(dict, 7);
        expect(sentence).to.satisfy(() => {
          const count = countSyllables(sentence);
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
  describe('#generateHaiku', async function() {
    it('should generate multiple random haiku', async function() {
      const known = 'The west wind whispered,\nAnd touched the eyelids of spring:\nHer eyes, Primroses.';
      const control = isHaiku(known);
      expect(control).to.be.true;
      let count = 0;
      for await (const haiku of generateHaiku()) {
        const result = isHaiku(haiku);
        expect(result).to.be.true;
        count++;
        if (count === 10) {
          break;
        }
      }
    })
    it('should generate a haiku from a specified zip file', async function() {
      const file = resolve('./files/dict.zip')
      for await (const haiku of generateHaiku({ file })) {
        const result = isHaiku(haiku);
        expect(result).to.be.true;
        const words = [ 
          'January', 'February', 'March', 'April', 
          'May', 'June', 'July', 'August', 
          'September', 'October', 'November', 'December' 
        ];
        for (const word of haiku.split(/\s+/)) {
          expect(words).to.contain(word);
        };
        break;
      }
    })
  })
  describe('#normalizeHaiku', function() {
    const base = 'the west wind whispered\nand touched the eyelids of spring\nher eyes Primroses';
    it('should generate the same text regardless of cases', function() {
      const test = 'The west wind whispered\nAnd touched the eyelids of spring\nHer eyes Primroses'
      const text1 = normalizeHaiku(base);
      const text2 = normalizeHaiku(test);
      expect(text1).to.equal(text2);
    })
    it('should generate the same text regardless of punctuations', function() {
      const test = 'The west wind whispered,\nAnd touched the eyelids of spring:\nHer eyes, Primroses'
      const text1 = normalizeHaiku(base);
      const text2 = normalizeHaiku(test);
      expect(text1).to.equal(text2);
    })
    it('should generate the same text when there are extra linefeeds', function() {
      const test = 'The west wind whispered,\nAnd touched the eyelids of spring:\nHer eyes, Primroses\n\n\n'
      const text1 = normalizeHaiku(base);
      const text2 = normalizeHaiku(test);
      expect(text1).to.equal(text2);
    })
    it('should throw if argument is not a string', function() {
      expect(() => normalizeHaiku()).to.throw();
    })
  })
})

function isHaiku(haiku) {
  const filtered = haiku.toLowerCase().replace(/[^\s\w]+/g, '');
  const [ l1, l2, l3 ] = filtered.split(/[\r\n]+/).map(countSyllables);
  return l1 === 5 && l2 === 7 && l3 === 5;
}

function resolve(path) {
  return (new URL(path, import.meta.url)).pathname;
}