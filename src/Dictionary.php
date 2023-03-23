<?php namespace cleong\sixbeermk;

class Dictionary {
  protected $zip = null;
  protected $meta = null;
  protected $cache = [];

  function __construct($options = []) {
    extract($options + [ 
      'locale' => 'en-US', 
      'size' => 'medium', 
      'file' => ''
    ]);
    $path = $file ?:  __DIR__ . "/../dict/$locale-$size.zip";
    $this->zip = new ZipFile($path);
  }

  function __destruct() {
    $this->close();
  }

  public function open() {
    $this->zip->open();
    $this->meta = $this->zip->extractJSONFile('meta.json');
  }

  public function close() {
    $this->zip->close();
    $this->meta = null;
  }

  public function getWord($syllableCount, $index) {
    $perFile = 250;
    $offset = $index % $perFile;
    $start = $index - $offset;
    $filename = "$syllableCount-syllable/$start.txt";
    if (isset($this->cache[$filename])) {
      $list = $this->cache[$filename];
    } else {
      $text = $this->zip->extractTextFile($filename);
      $list = $this->cache[$filename] = explode("\n", $text);
    }
    return $list[$offset];
  }

  public function getWordCount($syllableCount) {
    $name = "$syllableCount-syllable";
    return $this->meta->words->$name;
  }
}
