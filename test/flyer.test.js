import { expect, use } from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import { pipeline } from 'stream';
import { createWriteStream } from 'fs';

use(ChaiAsPromised);

import {
  createFlyer,
} from '../index.js';

describe('Flyer creation', function() {
  describe('#createFlyer', function() {
    it('should throw if haiku is not a generator', async function() {
      const promise = createFlyer();
      expect(promise).to.eventually.be.rejected;
    })
    it('should create a single-sided letter portrait flyer', async function() {
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
      const outStream = await createFlyer({ haiku, address, instructions, paper, orientation, mode });
      // need to check file manually
      const pptxPath = resolve(`./files/output/flyer-test-${paper}-${orientation}-${mode}.pptx`);
      const pptxFileStream = createWriteStream(pptxPath);
      await pipe(outStream, pptxFileStream);
      expect(count).to.equal(10);
      expect(finalized).to.be.true;
    })
    it('should create a single-sided letter landscape flyer', async function() {
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
      const orientation = 'landscape';
      const mode = 'simplex';
      const outStream = await createFlyer({ haiku, address, instructions, paper, orientation, mode });
      // need to check file manually
      const pptxPath = resolve(`./files/output/flyer-test-${paper}-${orientation}-${mode}.pptx`);
      const pptxFileStream = createWriteStream(pptxPath);
      await pipe(outStream, pptxFileStream);
      expect(count).to.equal(12);
      expect(finalized).to.be.true;
    })
    it('should create a double-sided letter portrait flyer', async function() {
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
      const mode = 'duplex';
      const outStream = await createFlyer({ haiku, address, instructions, paper, orientation, mode });
      // need to check file manually
      const pptxPath = resolve(`./files/output/flyer-test-${paper}-${orientation}-${mode}.pptx`);
      const pptxFileStream = createWriteStream(pptxPath);
      await pipe(outStream, pptxFileStream);
      expect(count).to.equal(10);
      expect(finalized).to.be.true;
    })
    it('should create a double-sided letter landscape flyer', async function() {
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
      const orientation = 'landscape';
      const mode = 'duplex';
      const outStream = await createFlyer({ haiku, address, instructions, paper, orientation, mode });
      // need to check file manually
      const pptxPath = resolve(`./files/output/flyer-test-${paper}-${orientation}-${mode}.pptx`);
      const pptxFileStream = createWriteStream(pptxPath);
      await pipe(outStream, pptxFileStream);
      expect(count).to.equal(12);
      expect(finalized).to.be.true;
    })
    it('should create a single-sided A4 portrait flyer', async function() {
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
      const paper = 'a4';
      const orientation = 'portrait';
      const mode = 'simplex';
      const outStream = await createFlyer({ haiku, address, instructions, paper, orientation, mode });
      // need to check file manually
      const pptxPath = resolve(`./files/output/flyer-test-${paper}-${orientation}-${mode}.pptx`);
      const pptxFileStream = createWriteStream(pptxPath);
      await pipe(outStream, pptxFileStream);
      expect(count).to.equal(10);
      expect(finalized).to.be.true;
    })
    it('should create a single-sided A4 landscape flyer', async function() {
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
      const paper = 'a4';
      const orientation = 'landscape';
      const mode = 'simplex';
      const outStream = await createFlyer({ haiku, address, instructions, paper, orientation, mode });
      // need to check file manually
      const pptxPath = resolve(`./files/output/flyer-test-${paper}-${orientation}-${mode}.pptx`);
      const pptxFileStream = createWriteStream(pptxPath);
      await pipe(outStream, pptxFileStream);
      expect(count).to.equal(12);
      expect(finalized).to.be.true;
    })
    it('should create a double-sided A4 portrait flyer', async function() {
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
      const paper = 'a4';
      const orientation = 'portrait';
      const mode = 'duplex';
      const outStream = await createFlyer({ haiku, address, instructions, paper, orientation, mode });
      // need to check file manually
      const pptxPath = resolve(`./files/output/flyer-test-${paper}-${orientation}-${mode}.pptx`);
      const pptxFileStream = createWriteStream(pptxPath);
      await pipe(outStream, pptxFileStream);
      expect(count).to.equal(10);
      expect(finalized).to.be.true;
    })
    it('should create a double-sided A4 landscape flyer', async function() {
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
      const paper = 'a4';
      const orientation = 'landscape';
      const mode = 'duplex';
      const outStream = await createFlyer({ haiku, address, instructions, paper, orientation, mode });
      // need to check file manually
      const pptxPath = resolve(`./files/output/flyer-test-${paper}-${orientation}-${mode}.pptx`);
      const pptxFileStream = createWriteStream(pptxPath);
      await pipe(outStream, pptxFileStream);
      expect(count).to.equal(12);
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
      const file = resolve('../pptx/flyer-letter-landscape-duplex.pptx');
      const outStream = await createFlyer({ haiku, address, instructions, file });
      // need to check file manually
      const pptxPath = resolve('./files/output/flyer-test-custom.pptx');
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
      const pptxPath = resolve('./files/output/flyer-test-blank.pptx');
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
