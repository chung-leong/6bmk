# generateHaiku(options)

Return an async generator outputting random haiku

## Syntax

```js
  for await (const text of generateHaiku({ locale })) {
    /* ... */
  }
```

## Options

`locale` - `"en-US"` or `"en-GB"` or `"en-CA"` or `"en-AU"` (default `"en-us"`)
`size` - `"small"` or `"middle"` or `"large"` or `"huge"` or `"insane"` (default `"small"`)

## Notes

Choosing a larger dictionary leads to rarer words being employed.