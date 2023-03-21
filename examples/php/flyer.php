<?php

require 'vendor/autoload.php';
use cleong\sixbeermk\HaikuGenerator;
use cleong\sixbeermk\FlyerGenerator;

$options = array_intersect_key($_GET, array_flip([ 'paper', 'orientation', 'mode' ]));
$haiku = HaikuGenerator::generate();
$stream = FlyerGenerator::generate([ 
  'haiku' => $haiku,
  'address' => 'https://6beer.mk',
  'instructions' => 'Go to the website and enter the haiku',
] + $options);
header('Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation');
header('Content-Disposition: attachment; filename="flyer.pptx"');
fpassthru($stream);
