import { expect, use } from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import { createServer } from 'http';
import { readFileSync } from 'fs';
import nodeFetch from 'node-fetch';
import { pipeline } from 'stream';
import { createWriteStream } from 'fs';

use(ChaiAsPromised);

import {
  createFlyer,
  modifyZip,
} from '../browser.js';

describe('Flyer creation (browser)', function() {
  const server = createServer((req, res) => {
    const { url } = req;
    const root = resolve(`..`);
    const path = root + url;
    let status = 404, headers = {}, body;
    try {
      const data = readFileSync(path);
      status = 200;
      body = data;
    } catch (err) {
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
  describe('#createFlyer', function() {
    it('should throw if haiku is not a generator', async function() {
      const promise = createFlyer();
      expect(promise).to.eventually.be.rejected;
    })
    it('should create a flyer', async function() {
      let count = 0, finalized = false;
      const haiku = (async function *(){
        try {
          for (;;) {
            count++;  
            yield '[line 1]\n[line 2]\n[line 3]';
          }
        } finally {
          finalized = true;
        }
      })();
      const address = 'https://6beer.mk/';
      const instructions = 'Go to website and enter haiku';
      const paper = 'letter';
      const orientation = 'portrait';
      const mode = 'simplex';
      const outStream1 = await createFlyer({ haiku, address, instructions, paper, orientation, mode });
      const outStream2 = modifyZip(outStream1, (name) => {
        if (/slide\d+.xml$/.test(name)) {
          return async (buffer) => {
            const decoder = new TextDecoder();
            const text = decoder.decode(buffer);
            return text;
          };
        }
      });
      const fileStream = createWriteStream(resolve('./files/output/browser-test.pptx'));
      await pipe(outStream2, fileStream);
      expect(count).to.equal(10);
      expect(finalized).to.be.true;
    })
    it('should use custom template', async function() {
      let count = 0, finalized = false;
      const haiku = (async function *(){
        try {
          for (;;) {
            count++;  
            yield '[line 1]\n[line 2]\n[line 3]';
          }
        } finally {
          finalized = true;
        }
      })();
      const address = 'https://6beer.mk/';
      const instructions = 'Go to website and enter haiku';
      const file = '/pptx/flyer-letter-landscape-duplex.pptx';
      const outStream = await createFlyer({ haiku, address, instructions, file });
      // need to check file manually
      const pptxPath = resolve('./files/output/flyer-browser-custom.pptx');
      const pptxFileStream = createWriteStream(pptxPath);
      await pipe(outStream, pptxFileStream);
      expect(count).to.equal(12);
      expect(finalized).to.be.true;
    })
    it('should leave placeholders as is where generator does not yield anything', async function() {
      const haiku = (async function *(){})();
      const address = 'https://6beer.mk/';
      const instructions = 'Go to website and enter haiku';
      const outStream = await createFlyer({ haiku, address, instructions });
      // need to check file manually
      const pptxPath = resolve('./files/output/flyer-browser-blank.pptx');
      const pptxFileStream = createWriteStream(pptxPath);
      await pipe(outStream, pptxFileStream);
    })
  })
})

async function pipe(source, dest) {
  await new Promise((resolve, reject) => {
    pipeline(source, dest, (err) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function resolve(path) {
  return (new URL(path, import.meta.url)).pathname;
}
