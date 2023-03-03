import Chai, { expect } from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import { Readable, pipeline } from 'stream';
import { createReadStream, createWriteStream } from 'fs';

Chai.use(ChaiAsPromised);

import {
  decompressData,
  compressData,
  modifyZip,
  createZip,
  ZipFile,
} from '../src/zip.js';

describe('Zip functions', function() {
  describe('#decompressData', function() {
    it('should throw if the data is invalid', async function() {
      const promise = decompressData([ Buffer.alloc(3) ], 8);
      await expect(promise).to.eventually.be.rejected;
    })
  })
  describe('#compressData', function() {
    it('should throw if the data is invalid', async function() {
      const promise = compressData(false, 8);
      await expect(promise).to.eventually.be.rejected;
    })
  })
  describe('#modifyZip', function() {
    it('should find files inside archive', async function() {
      const names = [];
      const path = resolve('./files/three-files.zip');
      const fileStream = createReadStream(path);
      const chunkedStream = createChunkyStream(fileStream, 1024);
      const outStream = modifyZip(chunkedStream, name => names.push(name));
      for await (const chunk of outStream) {}
      expect(names).to.contains('three-files/');
      expect(names).to.contains('three-files/LICENSE.txt');
      expect(names).to.contains('three-files/donut.txt');
      expect(names).to.contains('three-files/malgorzata-socha.jpg');
    })
    it('should work when chunk size is small', async function() {
      const names = [];
      const path = resolve('./files/three-files.zip');
      const fileStream = createReadStream(path);
      const chunkedStream = createChunkyStream(fileStream, 3);
      const outStream = modifyZip(chunkedStream, name => names.push(name));
      for await (const chunk of outStream) {}
      expect(names).to.contains('three-files/');
      expect(names).to.contains('three-files/LICENSE.txt');
      expect(names).to.contains('three-files/donut.txt');
      expect(names).to.contains('three-files/malgorzata-socha.jpg');
    })
    it('should extract contents from small uncompressed file', async function() {
      const path = resolve('./files/three-files.zip');
      const fileStream = createReadStream(path);
      const chunkedStream = createChunkyStream(fileStream, 1024);
      let text = '';
      const outStream = modifyZip(chunkedStream, (name) => {
        if (name === 'three-files/donut.txt') {
          return async (buffer) => {
            text = buffer.toString();
            return buffer;
          };
        }
      });
      for await (const chunk of outStream) {}
      expect(text).to.contains('${placeholder}');
    })
    it('should remove file when transform function return null', async function() {
      const path = resolve('./files/three-files.zip');
      const fileStream = createReadStream(path);
      const chunkedStream = createChunkyStream(fileStream, 1024);
      const outStream1 = modifyZip(chunkedStream, (name) => {
        if (name === 'three-files/malgorzata-socha.jpg') {
          return async (buffer) => {
            return null;
          };
        }
      });
      const names = [];
      const outStream2 = modifyZip(outStream1, name => names.push(name));
      for await (const chunk of outStream2) {}
      expect(names).to.contains('three-files/');
      expect(names).to.contains('three-files/LICENSE.txt');
      expect(names).to.contains('three-files/donut.txt');
      expect(names).to.not.contains('three-files/malgorzata-socha.jpg');
    })
    it('should replace file contents', async function() {
      const path = resolve('./files/three-files.zip');
      const fileStream = createReadStream(path);
      const chunkedStream = createChunkyStream(fileStream, 1024);
      const replacement = 'wasabi donut';
      const outStream1 = modifyZip(chunkedStream, (name) => {
        if (name === 'three-files/donut.txt') {
          return async (buffer) => {
            const text = buffer.toString();
            return text.replace('${placeholder}', replacement);
          };
        }
      });
      let text = '';
      const outStream2 = modifyZip(outStream1, (name) => {
        if (name === 'three-files/donut.txt') {
          return async (buffer) => {
            text = buffer.toString();
            return buffer;
          };
        }
      });
      for await (const chunk of outStream2) {}
      expect(text).to.contains(replacement);
    })
    it('should work with zip files with data descriptor', async function() {
      const path = resolve('./files/two-files-with-dd.zip');
      const fileStream = createReadStream(path);
      const chunkedStream = createChunkyStream(fileStream, 1);
      const replacement = 'wasabi donut';
      const outStream1 = modifyZip(chunkedStream, (name) => {
        if (name === 'three-files/donut.txt') {
          return async (buffer) => {
            const text = buffer.toString();
            return text.replace('${placeholder}', replacement);
          };
        }
      });
      let text = '';
      const outStream2 = modifyZip(outStream1, (name) => {
        if (name === 'three-files/donut.txt') {
          return async (buffer) => {
            text = buffer.toString();
            return buffer;
          };
        }
      });
      for await (const chunk of outStream2) {}
      expect(text).to.contains(replacement);
    })
    it('should replace contents of larger compressed file', async function() {
      const path = resolve('./files/three-files.zip');
      const fileStream = createReadStream(path);
      const chunkedStream = createChunkyStream(fileStream, 1024);
      const replacement = 'Road to Serfdom';
      const outStream1 = modifyZip(chunkedStream, (name) => {
        if (name === 'three-files/LICENSE.txt') {
          return async (buffer) => {
            const text = buffer.toString();
            const newText = text.replace('General Public License', replacement);
            return Buffer.from(newText);
          };
        }
      });
      let text = '';
      const outStream2 = modifyZip(outStream1, (name) => {
        if (name === 'three-files/LICENSE.txt') {
          return async (buffer) => {
            text = buffer.toString();
            return buffer;
          };
        }
      });
      for await (const chunk of outStream2) {}
      expect(text).to.contains(replacement);
    })
    it('should find file with unicode name', async function() {
      const names = [];
      const path = resolve('./files/unicode.zip');
      const fileStream = createReadStream(path);
      const chunkedStream = createChunkyStream(fileStream, 1024);
      const outStream = modifyZip(chunkedStream, name => names.push(name));
      for await (const chunk of outStream) {}
      expect(names).to.contains('szczęście.txt');
    })
    it('should produce valid PowerPoint file', async function() {
      const site = 'https://6beer.mk';
      const haiku = [
        [ 'Harass explosives', 'Otherworldly paul playoff', 'Stalks polje weeny' ],
        [ 'Grouping sandstorm soon', 'Tine doorway bookmark agile', 'Verbatim coldly' ],
        [ 'Polymorphism baas', 'Accompli shoved murine jo', 'Fruitlessly speaker' ],
        [ 'Whet berth suspender', 'Disproportionate sadness', 'Tiptoe sympathized' ],
        [ 'Morgana mantra', 'Ais inhabiting umpteen', 'Disestablishment' ],
        [ 'Upstate brock nighttimes', 'Hartmann condone enterprise', 'Disrupted abie' ],
        [ 'Outlook prettiest', 'Defies program hitchhiker', 'Demote cistercian' ],
        [ 'Acquittal luau', 'Drafting mirabel parrot', 'Hognose dunked cellar' ],
        [ 'Hakes encourages', 'Handsome yew dowd bove starchy', 'Swelling curmudgeons' ],
        [ 'Chugging importer', 'Squabble finalists sputters', 'Fillers vibrant penned' ],
      ];
      const instructions = `Instructions: Go to ${site} and type in one of the following infinite-monkey haiku`;
      const variables = [];
      for (const [ index, lines ] of haiku.entries()) {
        variables[`tab_${index + 1}_heading`] = site;
        for (const [ lineIndex, line ] of lines.entries()) {
          variables[`tab_${index + 1}_line_${lineIndex + 1}`] = line;
        }
      }
      variables['body_instruction_text'] = instructions;
      const path = resolve('../pptx/flyer-a4-portrait.pptx');
      const fileStream = createReadStream(path);
      const outStream = modifyZip(fileStream, (name) => {
        if (name === 'ppt/slides/slide1.xml') {
          return async (buffer) => {
            const text = buffer.toString();
            return text.replace(/\$\{(.*?)\}/g, (placeholder, varname) => {
              return variables[varname] || '';
            });
          };
        }
      });
      // need to check file manually
      const pptxPath = resolve('./files/output/flyer.pptx');
      const pptxFileStream = createWriteStream(pptxPath);
      await pipe(outStream, pptxFileStream);
    })
    it('should throw when EOCD record is corrupted', async function() {
      const names = [];
      const path = resolve('./files/three-files-bad-eocd.zip');
      const fileStream = createReadStream(path);
      const chunkedStream = createChunkyStream(fileStream, 1024);
      const outStream = modifyZip(chunkedStream, name => names.push(name));
      const promise = (async () => {
        for await (const chunk of outStream) {}
      })();
      await expect(promise).to.eventually.be.rejected;
    })
    it('should throw when CD record is corrupted', async function() {
      const names = [];
      const path = resolve('./files/three-files-bad-cdh.zip');
      const fileStream = createReadStream(path);
      const chunkedStream = createChunkyStream(fileStream, 1024);
      const outStream = modifyZip(chunkedStream, name => names.push(name));
      const promise = (async () => {
        for await (const chunk of outStream) {}
      })();
      await expect(promise).to.eventually.be.rejected;
    })
  })
  describe('#createZip', function() {
    it('should create a valid zip file', async function() {
      const inText1 = 'Hello world\n';
      const inText2 = inText1.repeat(300);
      const zipStream = createZip([
        { name: 'hello1.txt', data: Buffer.from(inText1) },
        { name: 'hello2.txt', data: Buffer.from(inText2), isText: true },
        { name: 'world/', isFile: false },
      ]);
      let outText;
      const outStream = modifyZip(zipStream, (name) => {
        if (name === 'hello2.txt') {
          return async (buffer) => {
            outText = buffer.toString();
            return buffer;
          };
        }
      });
      // need to check file manually
      const zipPath = resolve('./files/output/test1.zip');
      const zipFileStream = createWriteStream(zipPath);
      await pipe(outStream, zipFileStream);
      expect(outText).to.equal(inText2);
    })
    it('should accept an async generator as input', async function() {
      const inText1 = 'Hello world\n';
      const inText2 = inText1.repeat(300);
      const f = async function*() {
        await delay(30);
        yield { name: 'hello1.txt', data: Buffer.from(inText1) };
        await delay(30);
        yield { name: 'hello2.txt', data: Buffer.from(inText2), isText: true };
        await delay(30);
        yield { name: 'world/', isFile: false };
      };
      const zipStream = createZip(f());
      let outText;
      const outStream = modifyZip(zipStream, (name) => {
        if (name === 'hello2.txt') {
          return async (buffer) => {
            outText = buffer.toString();
            return buffer;
          };
        }
      });
      // need to check file manually
      const zipPath = resolve('./files/output/test2.zip');
      const zipFileStream = createWriteStream(zipPath);
      await pipe(outStream, zipFileStream);
      expect(outText).to.equal(inText2);
    })
    it('should create zip file with per file comment', async function() {
      const inText1 = 'Hello world\n';
      const inText2 = inText1.repeat(300);
      const zipStream = createZip([
        { name: 'hello1.txt', data: Buffer.from(inText1), comment: 'File #1' },
        { name: 'hello2.txt', data: Buffer.from(inText2), isText: true, comment: 'File #2' },
        { name: 'world/', isFile: false, comment: 'File #3' },
      ]);
      let outText;
      const outStream = modifyZip(zipStream, (name) => {
        if (name === 'hello2.txt') {
          return async (buffer) => {
            outText = buffer.toString();
            return buffer;
          };
        }
      });
      // need to check file manually
      const zipPath = resolve('./files/output/test3.zip');
      const zipFileStream = createWriteStream(zipPath);
      await pipe(outStream, zipFileStream);
      expect(outText).to.equal(inText2);
    })
  })
  describe('ZipFile', function() {
    describe('#open()', function() {
      it('should load the central directory', async function() {
        const path = resolve('./files/three-files.zip');
        const zip = new ZipFile(path);
        await zip.open();
        const cd = zip.centralDirectory;
        await zip.close();
        expect(cd[3]).to.have.property('name', 'three-files/malgorzata-socha.jpg');
        expect(cd[1]).to.have.property('uncompressedSize', 32474);
      })
      it('should find the central directory when there is 1 extra byte', async function() {
        const path = resolve('./files/three-files-x1.zip');
        const zip = new ZipFile(path);
        await zip.open();
        const cd = zip.centralDirectory;
        await zip.close();
        expect(cd[3]).to.have.property('name', 'three-files/malgorzata-socha.jpg');
        expect(cd[1]).to.have.property('uncompressedSize', 32474);
      })
      it('should find the central directory when there is 2 extra bytes', async function() {
        const path = resolve('./files/three-files-x2.zip');
        const zip = new ZipFile(path);
        await zip.open();
        const cd = zip.centralDirectory;
        await zip.close();
        expect(cd[3]).to.have.property('name', 'three-files/malgorzata-socha.jpg');
        expect(cd[1]).to.have.property('uncompressedSize', 32474);
      })
      it('should find the central directory when there is 3 extra bytes', async function() {
        const path = resolve('./files/three-files-x3.zip');
        const zip = new ZipFile(path);
        await zip.open();
        const cd = zip.centralDirectory;
        await zip.close();
        expect(cd[3]).to.have.property('name', 'three-files/malgorzata-socha.jpg');
        expect(cd[1]).to.have.property('uncompressedSize', 32474);
      })
      it('should find the central directory when there is 5 extra bytes', async function() {
        const path = resolve('./files/three-files-x5.zip');
        const zip = new ZipFile(path);
        await zip.open();
        const cd = zip.centralDirectory;
        await zip.close();
        expect(cd[3]).to.have.property('name', 'three-files/malgorzata-socha.jpg');
        expect(cd[1]).to.have.property('uncompressedSize', 32474);
      })
      it('should throw when eof-of-central-directory record cannot be found', async function() {
        const path = resolve('./files/three-files-bad-eocd.zip');
        const zip = new ZipFile(path);
        const promise = zip.open();
        await expect(promise).to.eventually.be.rejected;
      })
      it('should throw when central-directory record is corrupted', async function() {
        const path = resolve('./files/three-files-bad-cdh.zip');
        const zip = new ZipFile(path);
        const promise = zip.open();
        await expect(promise).to.eventually.be.rejected;
      })
    })
    describe('#extractFile', function() {
      it('should throw if a file has not been opened yet', async function() {
        const path = resolve('./files/three-files.zip');
        const zip = new ZipFile(path);
        const promise = zip.extractFile('three-files/LICENSE.txt');
        await expect(promise).to.eventually.be.rejected;
      })
      it('should throw if a local header is corrupted', async function() {
        const path = resolve('./files/three-files-bad-lh.zip');
        const zip = new ZipFile(path);
        await zip.open();
        const promise = zip.extractFile('three-files/LICENSE.txt');
        await expect(promise).to.eventually.be.rejected;
        await zip.close();
      })
      it('should throw if a compressed size in CD is corrupted', async function() {
        const path = resolve('./files/three-files-bad-size.zip');
        const zip = new ZipFile(path);
        await zip.open();
        const promise = zip.extractFile('three-files/LICENSE.txt');
        await expect(promise).to.eventually.be.rejected;
        await zip.close();
      })
    })
    describe('#extractTextFile', function() {
      it('should extract a text file', async function() {
        const path = resolve('./files/three-files.zip');
        const zip = new ZipFile(path);
        await zip.open();
        const text = await zip.extractTextFile('three-files/LICENSE.txt');
        await zip.close();
        expect(text).to.include('GNU');
      })
      it('should extract a text file with Unicode name', async function() {
        const path = resolve('./files/unicode.zip');
        const zip = new ZipFile(path);
        await zip.open();
        const text = await zip.extractTextFile('szczęście.txt');
        await zip.close();
        expect(text).to.include('szczęście');
      })
      it('should throw when file is not in archive', async function() {
        const path = resolve('./files/unicode.zip');
        const zip = new ZipFile(path);
        await zip.open();
        await expect(zip.extractTextFile('cześć.txt')).to.eventually.be.rejected;
        await zip.close();
      })
    })
  })
})

function createChunkyStream(stream, size) {
  const process = async function*() {
    for await (const chunk of stream) {
      for (let i = 0; i < chunk.length; i += size) {
        yield chunk.subarray(i, i + size);
      }
    }
  };
  return Readable.from(process());
}

async function pipe(source, dest) {
  await new Promise((resolve, reject) => {
    pipeline(source, dest, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resolve(path) {
  return (new URL(path, import.meta.url)).pathname;
}
