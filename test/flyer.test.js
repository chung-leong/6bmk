import { expect } from 'chai';
import { pipeline } from 'stream';
import { createWriteStream } from 'fs';

import {
  modifyFlyerXML,
} from '../src/flyer.js';
import {
  createFlyer,
} from '../index.js';

describe('Flyer creation', function() {
  describe('#modifyFlyerXML', function() {
    it('should ignore files that is not slide#.xml', function() {
      const result1 = modifyFlyerXML('docProps/core.xml');
      const result2 = modifyFlyerXML('ppt/slideLayouts/slideLayout8.xml');
      expect(result1).to.be.undefined;
      expect(result2).to.be.undefined;
    })
    it('should throw when not haiku generator is given', function() {
      const f = () => {
        modifyFlyerXML('ppt/slides/slide1.xml', {}, '', '');
      };
      expect(f).to.throw();
    })
    it('should return a function when the correct file name is given', function() {
      const generator = (async function *(){
        yield '';
      })();
      const f = modifyFlyerXML('ppt/slides/slide1.xml', generator, '', '');
      expect(f).to.be.a('function');
    })
    it('should insert instruction', async function() {
      const generator = (async function *(){
        yield '';
      })();
      const f = modifyFlyerXML('ppt/slides/slide1.xml', generator, '', '[instructions]');
      const buffer = Buffer.from('This is a test: ${body_instruction_text}');
      const result = await f(buffer);
      expect(result).to.contain('[instructions]');
    })
    it('should insert site address', async function() {
      const generator = (async function *(){
        yield '';
      })();
      const f = modifyFlyerXML('ppt/slides/slide1.xml', generator, '[address]', '');
      const buffer = Buffer.from('This is a test: ${tab_1_heading}');
      const result = await f(buffer);
      expect(result).to.contain('[address]');
    })
    it('should insert haiku lines', async function() {
      let count = 0;
      const generator = (async function *(){
        count++;
        yield '[line 1]\n[line 2]\n[line 3]';
        count++;
        yield '[line 1]\n[line 2]*\n[line 3]';
        count++;
        yield '[line 1]\n[line 2]\n[line 3]';
        count++;
        yield '[line 1]\n[line 2]\n[line 3]';
      })();
      const f = modifyFlyerXML('ppt/slides/slide1.xml', generator, '[address]', '');
      const buffer = Buffer.from('This is a test: ${tab_1_line_1} ${tab_2_line_2}');
      const result = await f(buffer);
      expect(result).to.contain('[line 1] [line 2]*');
      expect(count).to.equal(2);
    })
  })
  describe('#createFlyer', function() {
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
