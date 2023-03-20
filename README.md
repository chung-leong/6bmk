# 6bmk ![ci](https://img.shields.io/github/actions/workflow/status/chung-leong/6bmk/node.js.yml?branch=main&label=Node.js%20CI&logo=github) ![nycrc config on GitHub](https://img.shields.io/nycrc/chung-leong/6bmk) ![ci](https://img.shields.io/github/actions/workflow/status/chung-leong/6bmk/php.yml?branch=main&label=PHP%20CI&logo=github)

![Monkey](./doc/images/infinite-monkey.svg)

6bmk is an access control mechanism for Internet discussion boards. It consists of two parts:
a random haiku generator and a PowerPoint flyer generator. The haiku serve as a form of 
one-time code. Only people possessing a strip of paper torn from the flyer can join the 
group.

![Flyer](./doc/images/photo-1.jpg)

![Strip](./doc/images/photo-2.jpg)

This project is inspired by bulletin board systems (BBSes) of yesteryears. Users of such 
systems generally all live in the same area code. This geographic proximity meant people
could easily meet up in the real world. And they did frequently, either at group events 
or visiting each other's homes. "Like a family" is not an uncommon description when 
people speak of their BBS experience. It's hope that by imposing a geographic limit on 
membership, we could recreate the old social dynamic on the Internet.

## Installation 

Node.js:
```sh
npm install 6bmk
```

PHP
```sh
composer install cleong/sixbeermk
```

## Usage - Node.js

### Generating haiku

```js
import { generateHaiku, normalizeHaiku } from '6bmk';
import { createHash } from 'crypto';

async function *getAccessHaiku(db, flyerId) {
  const locale = 'en-US';
  // load existing haiku first
  const rows = await db.query(`SELECT text FROM haiku WHERE flyer_id = ?`, [ flyerId ]);
  for (const { text } of rows) {
    yield text;
  }
  // generate new ones if there aren't enough
  for await (const text of generateHaiku({ locale })) {
    // generate hash
    const sha1 = createHash('sha1');
    sha1.update(normalizeHaiku(text));
    const hash = sha1.digest('hex');
    // save to database
    db.query(`INSERT INTO haiku (flyer_id, text, hash) VALUES(?, ?, ?)`, [ flyerId, text, hash ]);
    yield text;
  }
}
```

### Generating flyer

```js

```

## Usage - PHP

### Generating haiku

```php
<?php

?>
```

### Generating flyer

```php
<?php

?>
```
