export function modifyFlyerXML(name, generator, address, instructions) {
  const haiku = {};
  // return function that modify the XML file
  if (/^ppt\/slides\/slide\d+.xml$/.test(name)) {
    if (typeof(haiku?.[Symbol.asyncIterator]) !== 'function') {
      throw new Error(`Missing haiku generator`);
    }  
    return async (buffer) => {
      const text = buffer.toString();
      const vars = extractVariables(text);
      for (const varname of vars) {
        let m;
        if (m = /^tab_\d+_heading$/.exec(varname)) {
          variable[varname] = address;
        } else if (m = /^tab_(\d+)_line_(\d+)$/.exec(varname)) {
          const tag = m[1], line = m[2];
          let lines = haiku[tag];
          if (!lines) {
            // generate the haiku
            const { done, value } = await generator.next();          
            if (!done) {
              lines = haiku[tag] = value.lines.split('\n');
            }
          }
          if (lines) {
            variables[varname] = lines[line];
          }
        }
      }
      variables['body_instruction_text'] = instructions;
      return text.replace(/\$\{(.*?)\}/g, (placeholder, name) => {
        return variables.hasOwnProperty(name) ? variables[name] : placeholder;
      });
    };
  }
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