import './css/App.css';
import { useSequentialState } from 'react-seq';
import { generateHaiku } from '6bmk/browser';

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
      {list.map((haiku, i) => {
        return <pre key={i}>{haiku}</pre>;
      })}
    </div>
  );
}

export default App;
