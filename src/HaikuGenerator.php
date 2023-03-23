<?php namespace cleong\sixbeermk;

use \Exception;

class HaikuGenerator {
  protected $dict = null;

  public static function generate($options = []) {
    $instance = new static($options);
    return $instance->__generate();
  }

  public static function normalize($haiku) {
    if (gettype($haiku) !== 'string') {
      throw new Exception('Haiku must be a string');
    }
    // replace sequence of non-alphanumeric characters (including whitespace) with a single space
    return trim(preg_replace('/\W+/', ' ', strtolower($haiku)));
  }

  protected function __construct($options) {
    $this->dict = new Dictionary($options);
  }

  protected function __generate() {
    $this->dict->open();
    try {
      for (;;) {
        $sentences = [];
        for ($i = 0; $i < 3; $i++) {
          // a haiku has 5-7-5 structure
          $sentence = $this->createRandomSentence(($i === 1) ? 7 : 5);
          $sentences[] = ucfirst($sentence);
        }
        yield implode("\n", $sentences);    
      }
    } finally {
      $this->dict->close();
    }
  }

  protected function createRandomSentence($syllableCount) {
    $remaining = $syllableCount;
    $words = [];
    $sorting = [];
    while ($remaining > 0) {
      // pick a random word of a length up to what the sentence has remaining
      extract($this->pickRandomWord($remaining));
      $words[] = $word;
      $sorting[$word] = rand();
      $remaining -= $syllables;
    }
    // randomize the order of the words
    usort($words, function($a, $b) use($sorting) {
      return $sorting[$a] - $sorting[$b];
    });
    return implode(' ', $words);
  }

  protected function pickRandomWord($maxSyllableCount) {
    // see how many words in total we're considering
    $total = 0;
    for ($syllables = 1; $syllables <= $maxSyllableCount; $syllables++) {
      $total += $this->dict->getWordCount($syllables);
    }
    // generate random index
    $index = rand(0, $total - 1);
    // get the item from the right list
    for ($syllables = 1; $syllables <= $maxSyllableCount; $syllables++) {
      $count = $this->dict->getWordCount($syllables);
      if ($index < $count) {
        $word = $this->dict->getWord($syllables, $index);
        return compact('word', 'syllables');
      } else {
        $index -= $count;
      }
    }   
  } // @codeCoverageIgnore
}
