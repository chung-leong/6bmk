# HaikuGenerator

## generate($options)

Return an async generator outputting random haiku

### Syntax

```php
  foreach(HaikuGenerator::generate($options) as $text) {
    /* ... */
  }
```

### Parameters

`options` - `<Array>`

### Options

`paper` - `"letter"` or `"a4"` (default `"letter"`)
`orientation` - `"portrait"` or `"landscape"` (default `"portrait"`)
`mode` - `"simplex"` or `"duplex"` (default `"simplex"`)
`file` - `<string>` Complete file path to custom template
`haiku` - `<AsyncGenerator>` An async generator outputting haiku
`address` - `<string>` Website address that will appear in the flyer tabs
`instructions` - `<string>` Instruction text that gets inserted into the flyer

## normalize($text)

Remove punctuations, normalize whitespaces, and convert characters to lowercase

### Syntax

```php
  foreach(HaikuGenerator::generate([ 'locale' => $locale ]) as $text) {
    $hash = sha1(HaikuGenerator::normalize($text));
    /* ... */
  }
```

### Parameters

`$text` - `<string>`
