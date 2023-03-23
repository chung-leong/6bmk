import { expect } from 'chai';
import { countSyllables } from './count-syllables.js';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import nodeFetch from 'node-fetch';

import {
  generateHaiku,
  normalizeHaiku,
} from '../browser.js';

describe('Haiku generation (browser)', function() {
  const server = createServer((req, res) => {
    const { url } = req;
    const path = resolve(`..${url}`);
    try {
      const data = readFileSync(path);
      const range = req.headers.range;
      const m = /bytes=(\d+)-(\d+)/.exec(range) ?? /bytes=-(\d+)/.exec(range);
      if (m?.length === 3) {
        const offset = parseInt(m[1]), last = parseInt(m[2]) + 1;
        res.writeHead(206);
        res.end(data.subarray(offset, last));
      } else if (m?.length === 2) {
        const offset = -parseInt(m[1]);
        res.writeHead(206);
        res.end(data.subarray(offset));  
      } else {
        res.writeHead(200);
        res.end(data);  
      }
    } catch (err) {
      res.writeHead(404);
      res.end(err.message);
    }
  });
  before(function(done) {
    server.listen(0, done);
    global.fetch = (path, options) => {
      const { port } = server.address();
      const base = `http://localhost:${port}/`;
      const url = new URL(path, base);
      return nodeFetch(url, options);
    };
  })
  after(function(done) {
    server.close(done);
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
      const file = `/test/files/dict.zip`;
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
