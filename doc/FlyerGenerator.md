# FlyerGenerator

## generate($options)

Create a stream outputting a flyer in PowerPoint format

## Syntax

```php
function create_download($db, $flyer_id) {
  $fetch = $db->prepare("SELECT address, name, instructions, options FROM flyer WHERE id = ?");
  $fetch->bindValue(1, $flyer_id);
  $result = $fetch->execute();
  $row = $result->fetchArray();
  $options = json_decode($row['options'], true);
  $options['haiku'] = get_access_haiku($db, $flyer_id, $options['locale']);
  $options['address'] = $row['address'];
  $options['instructions'] = $row['instructions'];
  return FlyerGenerator::generate($options);
}
```

## Parameters

`options` - `<Array>`

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