# createFlyer(options)

Create a stream outputting a flyer in PowerPoint format

## Syntax

```js
async function createDownload(db, flyerId) {
  const fetch = db.prepare(`SELECT address, name, instructions, options FROM flyer WHERE id = ?`);
  const row = fetch.get(flyerId);
  const { address, instructions, name, options } = row;
  const { paper, orientation, mode, locale } = JSON.parse(options);
  const haiku = getAccessHaiku(db, flyerId, locale);
  return createFlyer({ paper, orientation, mode, address, instructions, haiku });
}
```

## Parameters

`options` - `<Object>`

## Options

`paper` - `"letter"` or `"a4"` (default `"letter"`)
`orientation` - `"portrait"` or `"landscape"` (default `"portrait"`)
`mode` - `"simplex"` or `"duplex"` (default `"simplex"`)
`file` - `<string>` Complete file path to custom template
`haiku` - `<AsyncGenerator>` An async generator outputting haiku
`address` - `<string>` Website address that will appear in the flyer tabs
`instructions` - `<string>` Instruction text that gets inserted into the flyer

## Notes

Templates designed for duplex printing place the haiku in the back of the sheet, 
preventing someone from photographing them.
