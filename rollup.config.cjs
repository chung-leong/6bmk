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
    'url',
  ],
  plugins: [{
    resolveImportMeta(prop, { moduleId }) {
      const relPath = path.relative(__dirname, moduleId);
      const url = `new URL(${JSON.stringify(relPath)}, require('url').pathToFileURL(__filename)).href`;
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