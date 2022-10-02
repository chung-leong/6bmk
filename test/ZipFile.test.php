<?php

use PHPUnit\Framework\TestCase;
use cleong\sixbeermk\ZipFile;

class ZipTest extends TestCase {
  function testOpen() {
    // should load the central directory
    $path = __DIR__ . '/files/three-files.zip';
    $zip = new ZipFile($path);
    $zip->open();
    $cd = access_protected($zip, 'centralDirectory');
    $this->assertSame('three-files/malgorzata-socha.jpg', $cd[3]['name']);
    $this->assertSame(32474, $cd[1]['uncompressedSize']);
  }

  function testExtractTextFile() {
    // should extract a text file
    $path = __DIR__ . '/files/three-files.zip';
    $zip = new ZipFile($path);
    $zip->open();
    $text = $zip->extractTextFile('three-files/LICENSE.txt');
    $this->assertStringContainsString('GNU', $text);

    // should extract a text file with Unicode name
    $path = __DIR__ . '/files/unicode.zip';
    $zip = new ZipFile($path);
    $zip->open();
    $text = $zip->extractTextFile('szczęście.txt');
    $this->assertStringContainsString('szczęście', $text);

    // should throw when file is not in archive
    $this->expectException(Exception::class);
    $path = __DIR__ . '/files/unicode.zip';
    $zip = new ZipFile($path);
    $zip->open();
    $text = $zip->extractTextFile('cześć.txt');
  }
}
