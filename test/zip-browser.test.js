import Chai, { expect } from 'chai';
import ChaiAsPromised from 'chai-as-promised';
import { Readable, pipeline } from 'stream';
import { createServer } from 'http';
import { readFileSync, statSync, createWriteStream } from 'fs';
import nodeFetch from 'node-fetch';
import { calculateCRC32 } from '../src/utils.js';

Chai.use(ChaiAsPromised);

import {  
  decompressData,
  compressData,
  findArray,
  readUInt16LE,
  readUInt32LE,
  writeUInt16LE,
  writeUInt32LE,
} from '../src/zip-browser.js';
import {  
  modifyZip,
  createZip,
  ZipFile,
} from '../browser.js';

describe('Zip functions (browser)', function() {
  const response = {}; 
  const server = createServer((req, res) => {
    const { url } = req;
    const root = url.endsWith('pptx') ? resolve(`../pptx`) : resolve(`./files`);
    const path = root + url;
    let status = 404, headers = {}, body;
    try {
      const data = readFileSync(path);
      const { mtime } = statSync(path);
      const range = req.headers.range;
      const etag = calculateCRC32(data) + (response.etagSuffix ?? '');
      const m = /bytes=(\d+)-(\d+)/.exec(range) ?? /bytes=-(\d+)/.exec(range);
      if (!response.omitEtag) {
        headers['etag'] = etag;
      }
      const lastModified = new Date(response.lastModifiedOverride ?? mtime).toString();
      if (!response.omitLastModified) {
        headers['last-modified'] = lastModified;
      }
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
      body = err.message;
    }
    if (response.truncateBody) {
      body = body.subarray(0, response.truncateBody);
    }
    res.writeHead(status, headers);
    res.end(body);
  });
  before(function(done) {
    server.listen(0, done);
    global.fetch = async (url, options) => {
      const res = await nodeFetch(url, options);
      // polyfill getReader()
      attachGetReader(res.body);
      return res;
    };   
  })
  after(function(done) {
    server.close(done);
  })
  afterEach(function() {
    for (const key in response) {
      delete response[key]
    }
  })
  describe('#findArray', function() {
    it('should find sequence', function() {
      const a = new Uint8Array([ 1, 2, 3, 1, 2, 3, 4, 5 ]);
      const b = new Uint8Array([ 2, 3, 4 ]);
      const index = findArray(a, b);
      expect(index).to.equal(4);
    })
    it('should return -1 when sequence is not found', function() {
      const a = new Uint8Array([ 1, 2, 3, 1, 2, 3, 4, 5 ]);
      const b = new Uint8Array([ 2, 3, 4, 5, 6 ]);
      const c = new Uint8Array([ 88 ]);
      const index1 = findArray(a, b);
      expect(index1).to.equal(-1);
      const index2 = findArray(a, c);
      expect(index2).to.equal(-1);
    })
  })
  describe('#readUInt16LE', function() {
    it('should throw if index lies outside of array', function() {
      const a = new Uint8Array([ 1, 2, 3 ]);
      expect(() => readUInt16LE(a, 2)).to.throw();
    })
  })
  describe('#readUInt32LE', function() {
    it('should throw if index lies outside of array', function() {
      const a = new Uint8Array([ 1, 2, 3 ]);
      expect(() => readUInt32LE(a, 2)).to.throw();
    })
  })
  describe('#writeUInt16LE', function() {
    it('should throw if index lies outside of array', function() {
      const a = new Uint8Array([ 1, 2, 3 ]);
      expect(() => writeUInt16LE(a, 2, 2)).to.throw();
    })    
  })
  describe('#writeUInt32LE', function() {
    it('should throw if index lies outside of array', function() {
      const a = new Uint8Array([ 1, 2, 3 ]);
      expect(() => writeUInt32LE(a, 2, 2)).to.throw();
    })        
  })
  describe('#decompressData', function() {
    it('should throw if the input is invalid', async function() {
      const promise = decompressData(false, 8);
      await expect(promise).to.eventually.be.rejected;
    })
    it('should throw if the data is invalid', async function() {
      const promise = decompressData([ new Uint8Array(0) ], 8);
      await expect(promise).to.eventually.be.rejected;
    })
    it('should throw if the data is corrupted', async function() {
      const data = new Uint8Array([ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
      const promise = decompressData(data, 8);
      await expect(promise).to.eventually.be.rejected;
    })
  })
  describe('#compressData', function() {
    it('should throw if the input is invalid', async function() {
      const promise = compressData(false, 8);
      await expect(promise).to.eventually.be.rejected;
    })
  })
  describe('#modifyZip', function() {
    it('should find files inside archive', async function() {
      const names = [];
      const fileStream = await createHTTPStream(server, 'three-files.zip');
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
      const fileStream = await createHTTPStream(server, 'three-files.zip');
      const chunkedStream = createChunkyStream(fileStream, 3);
      const outStream = modifyZip(chunkedStream, name => names.push(name));
      for await (const chunk of outStream) {}
      expect(names).to.contains('three-files/');
      expect(names).to.contains('three-files/LICENSE.txt');
      expect(names).to.contains('three-files/donut.txt');
      expect(names).to.contains('three-files/malgorzata-socha.jpg');
    })
    it('should extract contents from small uncompressed file', async function() {
      const fileStream = await createHTTPStream(server, 'three-files.zip');
      const chunkedStream = createChunkyStream(fileStream, 1024);
      let text = '';
      const outStream = modifyZip(chunkedStream, (name) => {
        if (name === 'three-files/donut.txt') {
          return async (buffer) => {
            const decoder = new TextDecoder();
            text = decoder.decode(buffer);
            return buffer;
          };
        }
      });
      for await (const chunk of outStream) {}
      expect(text).to.contains('${placeholder}');
    })
    it('should remove file when transform function return null', async function() {
      const fileStream = await createHTTPStream(server, 'three-files.zip');
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
      const fileStream = await createHTTPStream(server, 'three-files.zip');
      const chunkedStream = createChunkyStream(fileStream, 1024);
      const replacement = 'wasabi donut';
      const outStream1 = modifyZip(chunkedStream, (name) => {
        if (name === 'three-files/donut.txt') {
          return async (buffer) => {
            const decoder = new TextDecoder();
            const text = decoder.decode(buffer);
            return text.replace('${placeholder}', replacement);
          };
        }
      });
      let text = '';
      const outStream2 = modifyZip(outStream1, (name) => {
        if (name === 'three-files/donut.txt') {
          return async (buffer) => {
            const decoder = new TextDecoder();
            text = decoder.decode(buffer);
            return buffer;
          };
        }
      });
      for await (const chunk of outStream2) {}
      expect(text).to.contains(replacement);
    })
    it('should work with zip files with data descriptor', async function() {
      const fileStream = await createHTTPStream(server, 'two-files-with-dd.zip');
      const chunkedStream = createChunkyStream(fileStream, 1);
      const replacement = 'wasabi donut';
      const outStream1 = modifyZip(chunkedStream, (name) => {
        if (name === 'three-files/donut.txt') {
          return async (buffer) => {
            const decoder = new TextDecoder();
            text = decoder.decode(buffer);
            return text.replace('${placeholder}', replacement);
          };
        }
      });
      let text = '';
      const outStream2 = modifyZip(outStream1, (name) => {
        if (name === 'three-files/donut.txt') {
          return async (buffer) => {
            const decoder = new TextDecoder();
            text = decoder.decode(buffer);
            return buffer;
          };
        }
      });
      for await (const chunk of outStream2) {}
      expect(text).to.contains(replacement);
    })
    it('should replace contents of larger compressed file', async function() {
      const fileStream = await createHTTPStream(server, 'three-files.zip');
      const chunkedStream = createChunkyStream(fileStream, 1024);
      const replacement = 'Road to Serfdom';
      const outStream1 = modifyZip(chunkedStream, (name) => {
        if (name === 'three-files/LICENSE.txt') {
          return async (buffer) => {
            const decoder = new TextDecoder();
            text = decoder.decode(buffer);
            const newText = text.replace('General Public License', replacement);
            return Buffer.from(newText);
          };
        }
      });
      let text = '';
      const outStream2 = modifyZip(outStream1, (name) => {
        if (name === 'three-files/LICENSE.txt') {
          return async (buffer) => {
            const decoder = new TextDecoder();
            text = decoder.decode(buffer);
            return buffer;
          };
        }
      });
      for await (const chunk of outStream2) {}
      expect(text).to.contains(replacement);
    })
    it('should find file with unicode name', async function() {
      const names = [];
      const fileStream = await createHTTPStream(server, 'unicode.zip');
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
      const fileStream = await createHTTPStream(server, 'flyer-a4-portrait-simplex.pptx');
      const outStream = modifyZip(fileStream, (name) => {
        if (name === 'ppt/slides/slide1.xml') {
          return async (buffer) => {
            const decoder = new TextDecoder();
            const text = decoder.decode(buffer);
            return text.replace(/\$\{(.*?)\}/g, (placeholder, varname) => {
              return variables[varname] || '';
            });
          };
        }
      });
      // need to check file manually
      const pptxPath = resolve('./files/output/flyer-browser.pptx');
      const pptxFileStream = createWriteStream(pptxPath);
      await pipe(outStream, pptxFileStream);
    })
    it('should throw when EOCD record is corrupted', async function() {
      const names = [];
      const fileStream = await createHTTPStream(server, 'three-files-bad-eocd.zip');
      const chunkedStream = createChunkyStream(fileStream, 1024);
      const outStream = modifyZip(chunkedStream, name => names.push(name));
      const promise = (async () => {
        for await (const chunk of outStream) {}
      })();
      await expect(promise).to.eventually.be.rejected;
    })
    it('should throw when CD record is corrupted', async function() {
      const names = [];
      const fileStream = await createHTTPStream(server, 'three-files-bad-cdh.zip');
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
      const encoder = new TextEncoder();
      const zipStream = createZip([
        { name: 'hello1.txt', data: encoder.encode(inText1) },
        { name: 'hello2.txt', data: encoder.encode(inText2), isText: true },
        { name: 'world/', isFile: false },
      ]);
      let outText;
      const outStream = modifyZip(zipStream, (name) => {
        if (name === 'hello2.txt') {
          return async (buffer) => {
            const decoder = new TextDecoder();
            outText = decoder.decode(buffer);
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
      const encoder = new TextEncoder();
      const f = async function*() {
        await delay(30);
        yield { name: 'hello1.txt', data: encoder.encode(inText1) };
        await delay(30);
        yield { name: 'hello2.txt', data: encoder.encode(inText2), isText: true };
        await delay(30);
        yield { name: 'world/', isFile: false };
      };
      const zipStream = createZip(f());
      let outText;
      const outStream = modifyZip(zipStream, (name) => {
        if (name === 'hello2.txt') {
          return async (buffer) => {
            const decoder = new TextDecoder();
            outText = decoder.decode(buffer);
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
      const encoder = new TextEncoder();
      const zipStream = createZip([
        { name: 'hello1.txt', data: encoder.encode(inText1), comment: 'File #1' },
        { name: 'hello2.txt', data: encoder.encode(inText2), isText: true, comment: 'File #2' },
        { name: 'world/', isFile: false, comment: 'File #3' },
      ]);
      let outText;
      const outStream = modifyZip(zipStream, (name) => {
        if (name === 'hello2.txt') {
          return async (buffer) => {
            const decoder = new TextDecoder();
            outText = decoder.decode(buffer);
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
    describe('#open', function() {
      it('should load the central directory', async function() {
        const url = createURL(server, 'three-files.zip');
        const zip = new ZipFile(url);
        await zip.open();
        const cd = zip.centralDirectory;
        await zip.close();
        expect(cd[3]).to.have.property('name', 'three-files/malgorzata-socha.jpg');
        expect(cd[1]).to.have.property('uncompressedSize', 32474);
      })
      it('should find the central directory when there is 1 extra byte', async function() {
        const url = createURL(server, 'three-files-x1.zip');
        const zip = new ZipFile(url);
        await zip.open();
        const cd = zip.centralDirectory;
        await zip.close();
        expect(cd[3]).to.have.property('name', 'three-files/malgorzata-socha.jpg');
        expect(cd[1]).to.have.property('uncompressedSize', 32474);
      })
      it('should find the central directory when there is 2 extra bytes', async function() {
        const url = createURL(server, 'three-files-x2.zip');
        const zip = new ZipFile(url);
        await zip.open();
        const cd = zip.centralDirectory;
        await zip.close();
        expect(cd[3]).to.have.property('name', 'three-files/malgorzata-socha.jpg');
        expect(cd[1]).to.have.property('uncompressedSize', 32474);
      })
      it('should find the central directory when there is 3 extra bytes', async function() {
        const url = createURL(server, 'three-files-x3.zip');
        const zip = new ZipFile(url);
        await zip.open();
        const cd = zip.centralDirectory;
        await zip.close();
        expect(cd[3]).to.have.property('name', 'three-files/malgorzata-socha.jpg');
        expect(cd[1]).to.have.property('uncompressedSize', 32474);
      })
      it('should find the central directory when there is 5 extra bytes', async function() {
        const url = createURL(server, 'three-files-x5.zip');
        const zip = new ZipFile(url);
        await zip.open();
        const cd = zip.centralDirectory;
        await zip.close();
        expect(cd[3]).to.have.property('name', 'three-files/malgorzata-socha.jpg');
        expect(cd[1]).to.have.property('uncompressedSize', 32474);
      })
      it('should throw when eof-of-central-directory record cannot be found', async function() {
        const url = createURL(server, 'three-files-bad-eocd.zip');
        const zip = new ZipFile(url);
        const promise = zip.open();
        await expect(promise).to.eventually.be.rejected;
      })
      it('should throw when central-directory record is corrupted', async function() {
        const url = createURL(server, 'three-files-bad-cdh.zip');
        const zip = new ZipFile(url);
        const promise = zip.open();
        await expect(promise).to.eventually.be.rejected;
      })
    })
    describe('#extractFile', function() {
      it('should throw if a file has not been opened yet', async function() {
        const url = createURL(server, 'three-files.zip');
        const zip = new ZipFile(url);
        const promise = zip.extractFile('three-files/LICENSE.txt');
        await expect(promise).to.eventually.be.rejected;
      })
      it('should throw if a local header is corrupted', async function() {
        const url = createURL(server, 'three-files-bad-lh.zip');
        const zip = new ZipFile(url);
        await zip.open();
        const promise = zip.extractFile('three-files/LICENSE.txt');
        await expect(promise).to.eventually.be.rejected;
        await zip.close();
      })
      it('should throw if a compressed size in CD is corrupted', async function() {
        const url = createURL(server, 'three-files-bad-size.zip');
        const zip = new ZipFile(url);
        await zip.open();
        const promise = zip.extractFile('three-files/LICENSE.txt');
        await expect(promise).to.eventually.be.rejected;
        await zip.close();
      })
    })
    describe('#extractTextFile', function() {
      it('should extract a text file', async function() {
        const url = createURL(server, 'three-files.zip');
        const zip = new ZipFile(url);
        await zip.open();
        const text = await zip.extractTextFile('three-files/LICENSE.txt');
        await zip.close();
        expect(text).to.include('GNU');
      })
      it('should be able to retrieve file after modification', async function() {
        const url = createURL(server, 'three-files.zip');
        const zip = new ZipFile(url);
        await zip.open();
        // force etag change
        response.etagSuffix = '/123';
        const text = await zip.extractTextFile('three-files/LICENSE.txt');
        await zip.close();
        expect(text).to.include('GNU');
      })
      it('should work when server does not return etag', async function() {
        const url = createURL(server, 'three-files.zip');
        const zip = new ZipFile(url);
        response.omitEtag = true;
        await zip.open();
        const text = await zip.extractTextFile('three-files/LICENSE.txt');
        await zip.close();
        expect(text).to.include('GNU');
      })
      it('should throw when there is a size mismatch', async function() {
        const url = createURL(server, 'three-files.zip');
        const zip = new ZipFile(url);
        await zip.open();
        response.truncateBody = -100;
        const promise = zip.extractTextFile('three-files/LICENSE.txt');
        await zip.close();
        await expect(promise).to.be.eventually.rejected;
      })
      it('should extract a text file with Unicode name', async function() {
        const url = createURL(server, 'unicode.zip');
        const zip = new ZipFile(url);
        await zip.open();
        const text = await zip.extractTextFile('szczęście.txt');
        await zip.close();
        expect(text).to.include('szczęście');
      })
      it('should throw when file is not in archive', async function() {
        const url = createURL(server, 'unicode.zip');
        const zip = new ZipFile(url);
        await zip.open();
        await expect(zip.extractTextFile('cześć.txt')).to.eventually.be.rejected;
        await zip.close();
      })
    })
  })
})

function createURL(server, filename) {
  const { port } = server.address();
  return `http://localhost:${port}/${filename}`;
}

async function createHTTPStream(server, filename) {
  const url = createURL(server, filename);
  const res = await fetch(url);
  const { status } = res;
  if (status === 200) {
    return res.body;
  } else {
    const message = await res.text();
    throw new Error(message);
  }
}

function attachGetReader(stream) {
  stream.getReader = function() {
    const f = this[Symbol.asyncIterator];
    const iterator = f.call(this);
    return {
      read: () => iterator.next(),
    };
  };
}

function createChunkyStream(stream, size) {
  const process = async function*() {
    for await (const chunk of stream) {
      for (let i = 0; i < chunk.length; i += size) {
        yield chunk.subarray(i, i + size);
      }
    }
  };
  const chunky = Readable.from(process());
  attachGetReader(chunky);
  return chunky;
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
