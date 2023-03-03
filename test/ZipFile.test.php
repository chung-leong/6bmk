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

    // should find the central directory when there is 1 extra byte
    $path = __DIR__ . '/files/three-files-x1.zip';
    $zip = new ZipFile($path);
    $zip->open();
    $cd = access_protected($zip, 'centralDirectory');
    $this->assertSame('three-files/malgorzata-socha.jpg', $cd[3]['name']);
    $this->assertSame(32474, $cd[1]['uncompressedSize']);

    // should find the central directory when there is 2 extra bytes
    $path = __DIR__ . '/files/three-files-x2.zip';
    $zip = new ZipFile($path);
    $zip->open();
    $cd = access_protected($zip, 'centralDirectory');
    $this->assertSame('three-files/malgorzata-socha.jpg', $cd[3]['name']);
    $this->assertSame(32474, $cd[1]['uncompressedSize']);

    // should find the central directory when there is 3 extra bytes
    $path = __DIR__ . '/files/three-files-x3.zip';
    $zip = new ZipFile($path);
    $zip->open();
    $cd = access_protected($zip, 'centralDirectory');
    $this->assertSame('three-files/malgorzata-socha.jpg', $cd[3]['name']);
    $this->assertSame(32474, $cd[1]['uncompressedSize']);

    // should find the central directory when there is 5 extra bytes
    $path = __DIR__ . '/files/three-files-x5.zip';
    $zip = new ZipFile($path);
    $zip->open();
    $cd = access_protected($zip, 'centralDirectory');
    $this->assertSame('three-files/malgorzata-socha.jpg', $cd[3]['name']);
    $this->assertSame(32474, $cd[1]['uncompressedSize']);

    // should throw when eof-of-central-directory record cannot be found
    $error = catch_error(function() {
      $path = __DIR__ . '/files/three-files-bad-eocd.zip';
      $zip = new ZipFile($path);
      $zip->open();  
    });
    $this->assertInstanceOf(Exception::class, $error);

    // should throw when central-directory record is corrupted
    $error = catch_error(function() {
      $path = __DIR__ . '/files/three-files-bad-cdh.zip';
      $zip = new ZipFile($path);
      $zip->open();
    });
    $this->assertInstanceOf(Exception::class, $error);
  }

  function testExtractFile() {
    // should throw if a file has not been opened yet
    $error = catch_error(function() {
      $path = __DIR__ . '/files/three-files.zip';
      $zip = new ZipFile($path);
      $zip->extractFile('three-files/LICENSE.txt');
    });
    $this->assertInstanceOf(Exception::class, $error);

    // should throw if a local header is corrupted
    $error = catch_error(function() {
      $path = __DIR__ . '/files/three-files-bad-lh.zip';
      $zip = new ZipFile($path);
      $zip->open();
      $zip->extractFile('three-files/LICENSE.txt');
    });
    $this->assertInstanceOf(Exception::class, $error);

    // should throw if a compressed size in CD is corrupted
    $error = catch_error(function() {
      $path = __DIR__ . '/files/three-files-bad-size.zip';
      $zip = new ZipFile($path);
      $zip->open();
      $zip->extractFile('three-files/LICENSE.txt');
    });
    $this->assertInstanceOf(Exception::class, $error);
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
    $error = catch_error(function() {
      $path = __DIR__ . '/files/unicode.zip';
      $zip = new ZipFile($path);
      $zip->open();
      $text = $zip->extractTextFile('cześć.txt'); 
    });
    $this->assertInstanceOf(Exception::class, $error);
  }
}
