import { expect } from 'chai';
import { countSyllables } from './count-syllables.js';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import nodeFetch from 'node-fetch';

import {
  generateMultipleHaiku,
  generateHaiku,
  setDictionaryFolder,
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
    server.listen(0, () => {
      const { port } = server.address();
      const url = new URL(`http://localhost:${port}/dict/`);
      setDictionaryFolder(url);
      done();
    });
    global.fetch = nodeFetch;   
  })
  after(function(done) {
    server.close(done);
  })
  describe('#generateMultipleHaiku', async function() {
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
  describe('#generateHaiku', async function() {
    it('should generate a single haiku', async function() {
      const haiku = await generateHaiku(10);
      const result = isHaiku(haiku);
      expect(result).to.be.true;
    })

    it('should generate a haiku from a specified zip file', async function() {
      const { port } = server.address();
      const url = new URL(`http://localhost:${port}/test/files/dict.zip`);
      const haiku = await generateHaiku({ file: url });
      const result = isHaiku(haiku);
      expect(result).to.be.true;
      const words = [ 'January', 'Febuary', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December' ];
      for (const word of haiku.split(/\s+/)) {
        expect(words).to.contain(word);
      };
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
