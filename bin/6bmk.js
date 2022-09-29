


function findCombinations(n) {
  const list = [];
  const find = (arr, index, num, reducedNum) => {
    if (reducedNum < 0) {
      return;
    }
    if (reducedNum == 0) {
      list.push(arr.slice(0, index).join(''));
      return;
    }
    const prev = (index == 0) ? 1 : arr[index - 1];
    for (let k = prev; k <= num; k++) {
      arr[index] = k;
      find(arr, index + 1, num, reducedNum - k);
    }
  }
  const arr = [];
  find(arr, 0, n, n);
  return list;
}

function findPermutations(string) {
  if (string.length === 1) {
    return string
  }
  const list = []
  for (let i = 0; i < string.length; i++){
    const char = string[i]
    if (string.indexOf(char) != i)
      continue
    const remainingChars = string.slice(0, i) + string.slice(i + 1, string.length);
    for (const permutation of findPermutations(remainingChars)) {
      list.push(char + permutation);
    }
  }
  return list;
}

function findSentenceCount(syllables, dict) {
  const combos = findCombinations(syllables);
  let total = 0;
  for (const combo of combos) {
    const perms = findPermutations(combo);
    for (const perm of perms) {
      let count = 1;
      for (const key of perm.split('')) {
        const list = dict[key];
        count *= list.length;
      }
      total += count;
    }
  }
  return total;
}

const path = (new URL('../lib/word-list.json', import.meta.url)).pathname;
const dict = JSON.parse(readFileSync(path));
const total = [ 5, 7, 5 ].reduce((count, syllables) => count * findSentenceCount(syllables, dict), 1);
console.log(total);
