import './css/App.css';
import { useState, useEffect, useRef } from 'react';
import { useSequentialState } from 'react-seq';
import { generateHaiku, createFlyer } from '6bmk/browser';

function App() {
  const list = useSequentialState(async function*({ initial }) {
    let list = [];
    initial(list);
    for await (const haiku of generateHaiku()) {
      list = [ ...list, haiku ];
      yield list;
      if (list.length >= 10) {
        break;
      }
    }
  }, []);
  return (
    <div className="App">
      <HaikuList list={list} />
      <FlyerDownload list={list} />
    </div>
  );
}

function HaikuList({ list }) {
  return (
    <ul className="HaikuList">
      {list.map((haiku, i) => {
        return <li key={i}>{haiku}</li>
      })}
    </ul>    
  );
}

function FlyerDownload({ list }) {
  const address = "https://6beer.mk";
  const instructions = "Visit the website and type in the haiku";
  const [ paper, setPaper ] = useState('letter');
  const [ orientation, setOrientation ] = useState('portrait');
  const [ mode, setMode ] = useState('simplex');
  const blob = useSequentialState(async function*() {
    if (list.length < 10) {
      return;
    }
    const haiku = (async function*() {
      // use the ones shown
      for (const haiku of list) {
        yield haiku;
      }
      // generate extra ones if the template requires more
      for await (const haiku of generateHaiku()) {
        list.push(haiku);
        yield haiku;
      }
    })();
    const stream = await createFlyer({ paper, orientation, mode, address, instructions, haiku })
    const chunks = [];
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read()
      if (done) {
        break;
      } else {
        chunks.push(value);
      }
    }
    const type = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    yield new Blob(chunks, { type });
  }, [ list, paper, orientation, mode, address, instructions ]);
  const [ url, setURL ] = useState() ;
  const link = useRef();
  useEffect(() => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      setURL(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setURL();
    }
  }, [ blob ]);
  if (list.length < 10) {
    return;
  }
  const papers = [ 'letter', 'a4' ];
  const orientations = [ 'portrait', 'landscape'];
  const modes = [ 'simplex', 'duplex' ];
  const filename = `flyer-${paper}-${orientation}-${mode}.pptx`
  return (
    <div className="FlyerDownload">
      <div>
        <button disabled={!url} onClick={() => link.current.click()}>Download</button>
        <a ref={link} href={url} download={filename}>{'\n'}</a>
      </div>
      <label>
        Paper: <Dropdown list={papers} value={paper} onChange={e => setPaper(e.target.value)} />
      </label>
      <label>
        Orientations: <Dropdown list={orientations} value={orientation} onChange={e => setOrientation(e.target.value)} />
      </label>
      <label>
        Mode: <Dropdown list={modes} value={mode} onChange={e => setMode(e.target.value)} />
      </label>
    </div>
  );
}

function Dropdown({ list, value, onChange }) {
  return (
    <select value={value} onChange={onChange}>
      {list.map((value, i) => {
        return <option key={i} value={value}>{value}</option>;
      })}
    </select>
  );
}

export default App;
