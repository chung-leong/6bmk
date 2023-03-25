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
};