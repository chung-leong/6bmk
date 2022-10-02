<?php

use PHPUnit\Framework\TestCase;
use cleong\sixbeermk\HaikuGenerator;

class HaikuGeneratorTest extends TestCase {
  function testCreateRandomSentence() {
    // should generate a random sentence of the correct length
    $gen = new HaikuGenerator;
    for ($i = 0; $i < 10; $i++) {
      $sentence = invoke_protected($gen, 'createRandomSentence', 7);
      $count = countSyllables($sentence);
      $this->assertSame(7, $count);
    }
  }

  function testGenerate() {
    // should generate random haiku
    $known = "The west wind whispered,\nAnd touched the eyelids of spring:\nHer eyes, Primroses.";
    $control = isHaiku($known);
    $this->assertTrue($control);

    $gen = new HaikuGenerator;
    for ($i = 0; $i < 10; $i++) {
      $haiku = $gen->generate();
      $result = isHaiku($haiku);
      $this->assertTrue($result);
    }
  }

  function testHash() {
    // should generate a string with 40 characters
    $base = "the west wind whispered\nand touched the eyelids of spring\nher eyes Primroses";
    $hash = HaikuGenerator::hash($base);
    $this->assertSame(40, strlen($hash));

    // should generate the same hash regardless of cases
    $test = "The west wind whispered\nAnd touched the eyelids of spring\nHer eyes Primroses";
    $hash1 = HaikuGenerator::hash($base);
    $hash2 = HaikuGenerator::hash($test);
    $this->assertSame($hash1, $hash2);

    // should generate the same hash regardless of punctuations
    $test = "The west wind whispered,\nAnd touched the eyelids of spring:\nHer eyes, Primroses";
    $hash1 = HaikuGenerator::hash($base);
    $hash2 = HaikuGenerator::hash($test);
    $this->assertSame($hash1, $hash2);

    // should generate the same hash when there are extra linefeeds
    $test = "The west wind whispered,\nAnd touched the eyelids of spring:\nHer eyes, Primroses\n\n\n";
    $hash1 = HaikuGenerator::hash($base);
    $hash2 = HaikuGenerator::hash($test);
    $this->assertSame($hash1, $hash2);
  }
}

function isHaiku($haiku) {
  $filtered = preg_replace('/[^\s\w]+/', '', strtolower($haiku));
  list($l1, $l2, $l3) = array_map('countSyllables', preg_split('/[\r\n]+/', $filtered));
  return $l1 === 5 && $l2 === 7 && $l3 === 5;
}

$nodeJS = null;

function countSyllables($sentence) {
  // need help from Node.js
  global $nodeJS;
  if (!$nodeJS) {
    $nodeJS = new NodeJS;
  }
  return $nodeJS->countSyllables($sentence);
}

class NodeJS {
  protected $handle;
  protected $pipes;

  function __construct() {
    // need help from Node.js
    $script = __DIR__ . '/count-syllables.js';
    $spec = [ 0 => [ 'pipe', 'r' ], 1 => [ 'pipe', 'w' ], 2 => STDERR ];
    $this->handle = proc_open("node '$script'", $spec, $this->pipes);
  }

  function __destruct() {
    proc_close($this->handle);
  }

  public function countSyllables($sentence) {
    fwrite($this->pipes[0], "$sentence\n");
    fflush($this->pipes[0]);
    fscanf($this->pipes[1], '%d\n', $count);
    return $count;
  }
}
