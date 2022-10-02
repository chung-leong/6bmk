import { phonesForWord, syllableCount } from 'pronouncing';

export function countSyllables(sentence) {
  const words = sentence.split(/\s+/);
  let count = 0;
  for (const word of words) {
    const phonemes = phonesForWord(word.toLowerCase())[0];
    if (phonemes) {
      count += syllableCount(phonemes);
    }
  }
  return count;
}

const [ script, ...args ] = process.argv.slice(1);
if (script == (new URL(import.meta.url)).pathname) {
  async function run() {
    const { createInterface } = await import('readline');
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
    rl.on('line', (line) => {
      process.stdout.write(`${countSyllables(line)}\n`);
    });
  }
  run();
}
