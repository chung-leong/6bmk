<?php

require_once 'database.php';
require_once 'vendor/autoload.php';
use cleong\sixbeermk\HaikuGenerator;
use cleong\sixbeermk\FlyerGenerator;

function get_access_haiku($db, $flyer_id, $locale) {
  $select = $db->prepare("SELECT text FROM haiku WHERE flyer_id = ?");
  $select->bindValue(1, $flyer_id);
  $result = $select->execute();
  while($row = $result->fetchArray()) {
    yield $row[0];
  }
  $insert = $db->prepare("INSERT INTO haiku (flyer_id, text, hash) VALUES(?, ?, ?)");
  foreach(HaikuGenerator::generate([ 'locale' => $locale ]) as $text) {
    $hash = sha1($text);
    $insert->bindValue(1, $flyer_id);
    $insert->bindValue(2, $text);
    $insert->bindValue(3, $hash);
    if ($insert->execute()) {
      yield $text;
    }
  }
}

function create_download($db, $flyer_id) {
  $fetch = $db->prepare("SELECT address, name, instructions, options FROM flyer WHERE id = ?");
  $fetch->bindValue(1, $flyer_id);
  $result = $fetch->execute();
  $row = $result->fetchArray();
  $options = json_decode($row['options'], true);
  $options['haiku'] = get_access_haiku($db, $flyer_id, $options['locale']);
  $options['address'] = $row['address'];
  $options['instructions'] = $row['instructions'];
  $stream = FlyerGenerator::generate($options);
  return [ $row['name'], $stream ];
}

$db = open_database();
list($name, $stream) = create_download($db, (int) $_GET['id']);
header("Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation");
header("Content-Disposition: attachment; filename=\"$name.pptx\"");
fpassthru($stream);
