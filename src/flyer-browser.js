import { modifyZip } from './zip-browser.js';

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
  const url = (file) ? file : await getTemplatePath(paper, orientation, mode);
  const res = await fetch(url);
  const stream = res.body;
  return modifyZip(stream, (name) => {
    const haikuHash = {};
    // return function that modify the XML file
    if (/^ppt\/slides\/slide\d+.xml$/.test(name)) {
      return async (buffer) => {
        const decoder = new TextDecoder();
        const text = decoder.decode(buffer);
        const vars = extractVariables(text);
        const variables = {};
        for (const varname of vars) {
          let m;
          if (m = /^tab_\d+_heading$/.exec(varname)) {
            variables[varname] = address;
          } else if (m = /^tab_(\d+)_line_(\d+)$/.exec(varname)) {
            const tag = m[1], line = m[2];
            let lines = haikuHash[tag];
            if (!lines) {
              // generate the haiku
              const { done, value } = await haiku.next();          
              if (!done) {
                lines = haikuHash[tag] = value.split('\n');
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
  return names.sort();
}

async function getTemplatePath(paper, orientation, mode) {
  if (process.env.NODE_ENV !== 'production') {
    // ditto
    if (typeof global === 'object' && global.global === global) {
      return `/pptx/flyer-${paper}-${orientation}-${mode}.pptx`;
    }
  }
  /* c8 ignore next 2 */
  const m = await import(/* webpackMode: "eager" */ `./pptx/flyer-${paper}-${orientation}-${mode}.pptx`);
  return m.default;  
}