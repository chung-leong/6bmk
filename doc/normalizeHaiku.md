# normalizeHaiku(text)

Remove punctuations, normalize whitespaces, and convert characters to lowercase

## Syntax

```js
  for await (const text of generateHaiku({ locale })) {
    const sha1 = createHash('sha1');
    sha1.update(normalizeHaiku(text));
    const hash = sha1.digest('hex');
    /* ... */
  }
```

## Parameters

`text` - `<string>` Text of the haiku
