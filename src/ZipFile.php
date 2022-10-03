<?php namespace cleong\sixbeermk;

use \Exception;

class ZipFile {
  protected $path;
  protected $file = null;
  protected $centralDirectory = null;

  function __construct($path) {
    $this->path = $path;
  }

  public function open() {
    $this->file = fopen($this->path, 'rb');
    $this->centralDirectory = $this->loadCentralDirectory();
  }

  public function close() {
    fclose($this->file);
  }

  public function extractFile($name) {
    if (!$this->centralDirectory) {
      throw new Exception('File has not been opened yet');
    }
    $record = null;
    foreach($this->centralDirectory as $r) {
      if($r['name'] === $name) {
        $record = $r;
        break;
      }
    }
    if (!$record) {
      throw new Exception("Cannot find file in archive: $name");
    }
    extract($record);
    fseek($this->file, $localHeaderOffset, SEEK_SET);
    $header = fread($this->file, 30);
    extract(unpack('Vsignature', $header, 0));
    if ($signature !== 0x04034b50) {
      throw new Exception('Invalid file header');
    }
    extract(unpack('vnameLength/vextraLength', $header, 26));
    $dataOffset = $localHeaderOffset + 30 + $nameLength + $extraLength;
    fseek($this->file, $dataOffset, SEEK_SET);
    $data = fread($this->file, $compressedSize);
    if (strlen($data) !== $compressedSize) {
      throw new Exception('Cannot read the correct number of bytes');
    }
    $uncompressedData = ($compression === 8) ? gzinflate($data) : $data;
    return $uncompressedData;
  }

  public function extractTextFile($name) {
    return $this->extractFile($name);
  }

  public function extractJSONFile($name) {
    $text = $this->extractTextFile($name);
    return json_decode($text);
  }

  protected function findCentralDirectory() {
    fseek($this->file, 0, SEEK_END);
    $size = ftell($this->file);
    $headerSize = 22;
    $maxCommentLength = 65535;
    $offsetLimit = max(0, $size - $headerSize - $maxCommentLength);
    $offset = $size - $headerSize;
    $found = false;
    while (!$found && $offset >= $offsetLimit) {
      fseek($this->file, $offset, SEEK_SET);
      $header = fread($this->file, $headerSize);
      extract(unpack('Vsignature', $header, 0));
      if ($signature === 0x06054b50) {
        $found = true;
      } else {
        // the byte sequence is 0x50 0x4b 0x05 0x06
        $firstByte = $signature & 0x000000FF;
        switch ($firstByte) {
          case 0x06: $offset -= 3; break;
          case 0x05: $offset -= 2; break;
          case 0x4b: $offset -= 1; break;
          default: $offset -= 4;
        }
      }
    }
    if ($found) {
      return unpack('vcount/Vsize/Voffset', $header, 10);
    } else {
      throw new Exception('Unable to find EOCD record');
    }
  }

  protected function loadCentralDirectory() {
    $records = [];
    extract($this->findCentralDirectory());
    fseek($this->file, $offset, SEEK_SET);
    $buffer = fread($this->file, $size);
    $index = 0;
    while ($index < $size) {
      extract(unpack('Vsignature', $buffer));
      if ($signature !== 0x02014b50) {
        throw new Exception('Invalid CD record');
      }
      extract(unpack('vnameLength/vextraLength/vcommentLength', $buffer, $index + 28));
      $headerSize = 46 + $nameLength + $extraLength + $commentLength;
      $header = substr($buffer, $index, $headerSize);
      extract(unpack('vflags/vcompression', $header, 8));
      extract(unpack('VcompressedSize/VuncompressedSize', $header, 20));
      $name = substr($header, 46, $nameLength);
      extract(unpack('VlocalHeaderOffset', $header, 42));
      $records[] = compact('name', 'compression', 'compressedSize', 'uncompressedSize', 'localHeaderOffset');
      $index += $headerSize;
    }
    return $records;
  }

}
