const path = require('path');

module.exports = {
  input: `./index.js`,
  output: {
    file: `./index.cjs`,
    format: 'cjs',
    exports: 'named',
  },
  external: [ 
    'fs', 
    'fs/promises',
    'stream',
    'zlib',
  ],
  plugins: [{
    resolveImportMeta(prop, {moduleId}) {
      const url = `new URL('${path.resolve(__filename, moduleId)}', 'file:///').href`;
      if (prop === 'url') {
        return url;
      }
      if (prop === null) {
        return `{url}`;
      }
      return null;
    }
  }]
};