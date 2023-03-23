<?php

require_once 'database.php';

$db = open_database();
if ($_POST) {
  list(
    'name' => $name,
    'address' => $address,
    'instructions' => $instructions,
  ) = $_POST;
  $options = json_encode(array_intersect_key($_POST, array_flip([ 'paper', 'orientation', 'mode', 'locale' ])));
  $insert = $db->prepare("INSERT INTO flyer (address, name, instructions, options) VALUES(?, ?, ?, ?)");
  $insert->bindValue(1, $address);
  $insert->bindValue(2, $name);
  $insert->bindValue(3, $instructions);
  $insert->bindValue(4, $options);
  $result = $insert->execute();
  header('Location: /');
  exit;
}

$fetch = $db->prepare("SELECT id, name, options FROM flyer ORDER BY id");
$result = $fetch->execute();
$rows = [];
while($row = $result->fetchArray()) {
  $rows[] = $row;
}
$papers = [ 'letter', 'a4' ];
$orientations = [ 'portrait', 'landscape'];
$modes = [ 'simplex', 'duplex' ];
$locales = [ 'en-US', 'en-GB', 'en-CA', 'en-AU' ];

?>
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
        <?php
          foreach($rows as $row) {
            list('id' => $id, 'name' => $name) = $row;
            echo "<li><a href=\"/flyer.php?id=$id\">$name</a></li>";
          }
        ?>
      </ul>
    <hr>
    <h3>Create New</h3>
    <form method="POST">
      <p>
        <label>
          <div>Name:</div>
          <div><input name="name" type="text" value="Flyer-<?php echo count($rows) + 1 ?>" size="60"></div>
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
            <?php 
              foreach($papers as $paper) {
                echo "<option>$paper</option>\n";
              }
            ?>
          </select>
        </label>
        <label>
          Orientations:
          <select name="orientation">
            <?php 
              foreach($orientations as $orientation) {
                echo "<option>$orientation</option>\n";
              }
            ?>
          </select>
        </label>
        <label>
          Mode:
          <select name="mode">
            <?php 
              foreach($modes as $mode) {
                echo "<option>$mode</option>\n";
              }
            ?>
          </select>
        </label>
        <label>
          Locale:
          <select name="locale">
            <?php 
              foreach($locales as $locale) {
                echo "<option>$locale</option>\n";
              }
            ?>
          </select>
        </label>
      </p>
      <p>
        <input type="submit" value="Create">
      </p>
    </form>
  </body>
</html>

