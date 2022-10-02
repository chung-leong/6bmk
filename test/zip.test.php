<?php
use PHPUnit\Framework\TestCase;
require(__DIR__ . '/../src/zip.php');

class ZipTest extends TestCase {
  function testZipFileOpen() {
    // it should load the central directory
    $path = __DIR__ . '/files/three-files.zip';
    $zip = new ZipFile($path);
    $zip->open();
    $cd = access_protected($zip, 'centralDirectory');
    $zip->close();

    $this->assertSame($cd[3]['name'], 'three-files/malgorzata-socha.jpg');
    $this->assertSame($cd[1]['uncompressedSize'], 32474);
  }

  function testZipFileExtractTextFile() {
    // should extract a text file
    $path = __DIR__ . '/files/three-files.zip';
    $zip = new ZipFile($path);
    $zip->open();
    $text = $zip->extractTextFile('three-files/LICENSE.txt');
    $zip->close();
    $this->assertStringContainsString('GNU', $text);

    // should extract a text file with Unicode name
    $path = __DIR__ . '/files/unicode.zip';
    $zip = new ZipFile($path);
    $zip->open();
    $text = $zip->extractTextFile('szczęście.txt');
    $zip->close();
    $this->assertStringContainsString('szczęście', $text);

    // should throw when file is not in archive
    $this->expectException(Exception::class);
    $path = __DIR__ . '/files/unicode.zip';
    $zip = new ZipFile($path);
    $zip->open();
    $text = $zip->extractTextFile('cześć.txt');
    $zip->close();
  }
}

function access_protected($obj, $prop) {
  $reflection = new ReflectionClass($obj);
  $property = $reflection->getProperty($prop);
  $property->setAccessible(true);
  return $property->getValue($obj);
}

?>
