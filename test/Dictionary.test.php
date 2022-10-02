<?php

use PHPUnit\Framework\TestCase;
use SixBeerMK\Dictionary;

class DictionaryTest extends TestCase {
  function testOpen() {
    // should open dictionary
    $dict = new Dictionary([ 'locale' => 'en-US', 'size' => 'small' ]);
    $dict->open();
    $meta = access_protected($dict, 'meta');
    $this->assertSame('en-US', $meta->locale);
    $this->assertSame('small', $meta->size);

    // should open en-US medium dictionary when no options is specified
    $dict = new Dictionary;
    $dict->open();
    $meta = access_protected($dict, 'meta');
    $this->assertSame('en-US', $meta->locale);
    $this->assertSame('medium', $meta->size);

    // should open a custom dictionary
    $dict = new Dictionary([ 'file' => __DIR__ . '/files/dict.zip' ]);
    $dict->open();
    $meta = access_protected($dict, 'meta');
    $count = $dict->getWordCount(3);
    $this->assertTrue($meta->custom);
    $this->assertGreaterThan(3, $count);
  }

  function testGetWordCount() {
    // should return the number of words with the given number of syllables
    $dict = new Dictionary;
    $dict->open();
    $count = $dict->getWordCount(3);
    $this->assertGreaterThan(0, $count);
  }
}
