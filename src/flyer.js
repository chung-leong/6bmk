import { createReadStream } from 'fs';
import { modifyZip } from './zip.js';

export async function createFlyer(options = {}) {
  const {
    paper = 'letter',
    orientation = 'portrait',
    mode = 'simplex',
    file,
    haiku,
    address = '',
    instructions = '',
  } = options;
  if (typeof(haiku?.[Symbol.asyncIterator]) !== 'function') {
    throw new Error(`Missing haiku generator`);
  }  
  const path = (file) ? file : new URL(`../pptx/flyer-${paper}-${orientation}-${mode}.pptx`, import.meta.url).pathname;
  const stream = createReadStream(path);
  const haikuHash = {};
  return modifyZip(stream, (name) => {
    // return function that modify the XML file
    if (/^ppt\/slides\/slide\d+.xml$/.test(name)) {
      return async (buffer) => {
        const text = buffer.toString();
        const vars = extractVariables(text);
        const variables = {};
        for (const varname of vars) {
          let m;
          if (m = /^tab_\d+_heading$/.exec(varname)) {
            variables[varname] = address;
          } else if (m = /^tab_(\d+)_line_(\d+)$/.exec(varname)) {
            const tab = m[1], line = m[2];
            let lines = haikuHash[tab];
            if (!lines) {
              // generate the haiku
              const { done, value } = await haiku.next();          
              if (!done) {
                lines = haikuHash[tab] = value.split('\n');
              }
            }
            if (lines) {
              variables[varname] = lines[line - 1];
            }
          }
        }
        variables['body_instruction_text'] = instructions;
        return text.replace(/\$\{(.*?)\}/g, (placeholder, name) => {
          return variables.hasOwnProperty(name) ? variables[name] : placeholder;
        });
      };
    } else if (name === null) {
      return () => haiku?.return();
    }
  });
}

function extractVariables(text) {
  const re = /\$\{(.*?)\}/g;
  const names = [];
  let m;
  while (m = re.exec(text)) {
    names.push(m[1]);
  }
  const number = (s) => {
    const m = /\d+/.exec(s);
    return (m) ? parseInt(m[0]) : 0;
  };
  return names.sort((a, b) => number(a) - number(b));
}