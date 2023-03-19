import { expect } from 'chai';
import { createServer } from 'http';
import { readFileSync, statSync } from 'fs';
import { createHash } from 'crypto';
import nodeFetch from 'node-fetch';

import {
  Dictionary,
} from '../src/dictionary-browser.js';

describe('Dictionary', function() {
  const server = createServer((req, res) => {
    const { url } = req;
    const root = resolve(`..`);
    const path = root + url;
    let status = 404, headers = {}, body;
    try {
      const data = readFileSync(path);
      const { mtime } = statSync(path);
      const range = req.headers.range;
      const hash = createHash('sha1');
      hash.update(data);
      const etag = hash.digest('hex');
      const m = /bytes=(\d+)-(\d+)/.exec(range) ?? /bytes=-(\d+)/.exec(range);
      const lastModified = mtime.toString();
      if(m) {
        const ifMatch = req.headers['if-match'];
        if (ifMatch && ifMatch !== etag) {
          status = 412;
          throw new Error(`ETag mismatch: ${ifMatch} !== ${etag}`);
        }
        const ifModifiedSince = req.headers['if-modified-since'];
        if (ifModifiedSince && ifModifiedSince !== lastModified) {
          status = 412;
          throw new Error(`File modified: ${lastModified}`);
        }
        status = 206;
        if (m.length === 3) {
          const offset = parseInt(m[1]), last = parseInt(m[2]) + 1;
          body = data.subarray(offset, last);
        } else if (m.length === 2) {
          const offset = -parseInt(m[1]);
          body = data.subarray(offset);  
        }
      } else {
        status = 200;
        body = data;  
      }
    } catch (err) {
      console.error(err);
      body = err.message;
    }
    res.writeHead(status, headers);
    res.end(body);
  });
  before(function(done) {
    server.listen(0, done);
    global.fetch = async (path, options) => {
      const { port } = server.address();
      const url = new URL(path, `http://localhost:${port}`);
      const res = await nodeFetch(url, options);
      return res;
    };   
  })
  after(function(done) {
    server.close(done);
  })
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
