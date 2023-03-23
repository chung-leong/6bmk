import Fastify from 'fastify';
import FormBody from '@fastify/formbody';
import Sqlite3, { SqliteError } from 'better-sqlite3';
import { generateHaiku, normalizeHaiku } from '6bmk';
import { createFlyer } from '6bmk';
import { createHash } from 'crypto';

async function openDatabase() {
  const path = './database.sqlite3';
  try {
    return new Sqlite3(path, { fileMustExist: true });
  } catch (err) {
    if (err instanceof SqliteError && err.code === 'SQLITE_CANTOPEN') {
      const db = new Sqlite3(path, {})
      db.exec(`
        CREATE TABLE haiku (
          id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,    
          flyer_id INTEGER NOT NULL,
          hash TEXT NOT NULL UNIQUE,
          text TEXT NOT NULL,
          used INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE flyer (
          id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,    
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          instructions TEXT NOT NULL,
          options TEXT NOT NULL
        );
      `);
      return db; 
    } else {
      throw err;
    }
  }
}

async function *getAccessHaiku(db, flyerId, locale) {
  const select = db.prepare(`SELECT text FROM haiku WHERE flyer_id = ?`);
  const rows = select.all(flyerId);
  for (const { text } of rows) {
    yield text;
  }
  const insert = db.prepare(`INSERT INTO haiku (flyer_id, text, hash) VALUES(?, ?, ?)`);
  for await (const text of generateHaiku({ locale })) {
    try {
      const sha1 = createHash('sha1');
      sha1.update(normalizeHaiku(text));
      const hash = sha1.digest('hex');
      insert.run(flyerId, text, hash);
      yield text;
    } catch (err) {
      if (err instanceof SqliteError && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        continue;
      } else {
        throw err;
      }
    }
  }
}

async function createDownload(db, flyerId) {
  const fetch = db.prepare(`SELECT address, name, instructions, options FROM flyer WHERE id = ?`);
  const row = fetch.get(flyerId);
  const { address, instructions, name, options } = row;
  const { paper, orientation, mode, locale } = JSON.parse(options);
  const haiku = getAccessHaiku(db, flyerId, locale);
  const stream = await createFlyer({ paper, orientation, mode, address, instructions, haiku });
  stream.name = name;
  return stream;
}

(async () => {
  const db = await openDatabase();
  const fastify = Fastify({ ignoreTrailingSlash: true, trustProxy: true });
  fastify.register(FormBody);
  fastify.get('/flyer/', async (req, reply) => {
    const stream = await createDownload(db, req.query.id);
    reply.headers({ 
      'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'Content-Disposition': `attachment; filename="${stream.name}.pptx"`,
    });
    return stream;
  });
  fastify.get('/', async (req, reply) => {
    const fetch = db.prepare(`SELECT id, name, options FROM flyer ORDER BY id`);
    const rows = fetch.all();
    const papers = [ 'letter', 'a4' ];
    const orientations = [ 'portrait', 'landscape'];
    const modes = [ 'simplex', 'duplex' ];
    const locales = [ 'en-US', 'en-GB', 'en-CA', 'en-AU' ];
    reply.type('html');
    return `
      <html>
        <head>
          <style>
            body {
              font-family: sans-serif;
            }
          </style>
        </head>
        <body>
          <h3>Existing flyers</h3>
            <ul>
              ${rows.map(({ id, name }) => {
                return `<li><a href="/flyer/?id=${id}">${name}</a></li>`;
              }).join('\n')}
            </ul>
          <hr>
          <h3>Create New</h3>
          <form method="POST">
            <p>
              <label>
                <div>Name:</div>
                <div><input name="name" type="text" value="Flyer-${rows.length + 1}" size="60"></div>
              </label>
            </p>
            <p>
              <label>
                <div>Address:</div>
                <div><input name="address" type="text" value="https://6beer.mk" size="60"></div>
              </label>
            </p>
            <p>
              <label>
                <div>Instructions:</div>
                <div><input name="instructions" type="text" value="Go to website and enter haiku" size="60"></div>
              </label>
            </p>
            <p>
              <label>
                Paper: 
                <select name="paper">
                  ${papers.map(p => `<option>${p}</option>`).join('\n')}
                </select>
              </label>
              <label>
                Orientations:
                <select name="orientation">
                  ${orientations.map(o => `<option>${o}</option>`).join('\n')}
                </select>
              </label>
              <label>
                Mode:
                <select name="mode">
                  ${modes.map(m => `<option>${m}</option>`).join('\n')}
                </select>
              </label>
              <label>
                Locale:
                <select name="locale">
                  ${locales.map(l => `<option>${l}</option>`).join('\n')}
                </select>
              </label>
            </p>
            <p>
              <input type="submit" value="Create">
            </p>
          </form>
        </body>
      </html>
    `;
  });
  fastify.post('/', async (req, reply) => {
    const { address, name, instructions, paper, orientation, mode, locale } = req.body;
    const options = JSON.stringify({ paper, orientation, mode, locale });
    const insert = db.prepare(`INSERT INTO flyer (address, name, instructions, options) VALUES(?, ?, ?, ?)`);
    insert.run(address, name, instructions, options);
    reply.redirect('/');
  });
  await fastify.listen({ host: 'localhost', port: 8080 });
})();
