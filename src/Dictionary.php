<?php namespace cleong\sixbeermk;

class Dictionary {
  protected $path;
  protected $zip = null;
  protected $meta = null;
  protected $cache = [];

  function __construct($options = []) {
    extract($options + [ 
      'locale' => 'en-US', 
      'size' => 'medium', 
      'file' => ''
    ]);
    if ($file) {
      $this->path = $file;
    } else {
      $this->path = __DIR__ . "/../dict/$locale-$size.zip";
    }
  }

  function __destruct() {
    if ($this->zip) {
      $this->zip->close();
    }
  }

  public function open() {
    $this->zip = new ZipFile($this->path);
    $this->zip->open();
    $this->meta = $this->zip->extractJSONFile('meta.json');
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
