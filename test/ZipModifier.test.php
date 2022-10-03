<?php

use PHPUnit\Framework\TestCase;
use cleong\sixbeermk\ZipModifier;

class ZipModifierTest extends TestCase {
  function testRegister() {
    // should register the stream filter
    $filter = ZipModifier::register();
    $filters = stream_get_filters();
    $this->assertContains($filter, $filters);

    // should not produces an error or warning when called a second time
    $filter = ZipModifier::register();
    $filters = stream_get_filters();
    $this->assertContains($filter, $filters);
  }

  function testOnCreate() {
    // should throw when function is not passed as parameter
    $this->expectException(Exception::class);
    $filter = ZipModifier::register();
    $path = __DIR__ . '/files/three-files.zip';
    $fileStream = fopen($path, 'rb');
    stream_filter_append($fileStream, $filter);
  }

  function testFilter() {
    // should find files inside archive
    $filter = ZipModifier::register();
    $path = __DIR__ . '/files/three-files.zip';
    $fileStream = fopen($path, 'rb');
    stream_set_chunk_size($fileStream, rand(10, 1024));
    $names = [];
    stream_filter_append($fileStream, $filter, 0, function($name) use(&$names) {
      $names[] = $name;
    });
    while (fread($fileStream, 1024));
    fclose($fileStream);
    $this->assertContains('three-files/', $names);
    $this->assertContains('three-files/LICENSE.txt', $names);
    $this->assertContains('three-files/donut.txt', $names);
    $this->assertContains('three-files/malgorzata-socha.jpg', $names);

    // should find extract contents from small uncompressed file
    $path = __DIR__ . '/files/three-files.zip';
    $fileStream = fopen($path, 'rb');
    stream_set_chunk_size($fileStream, rand(10, 1024));
    $text = '';
    stream_filter_append($fileStream, $filter, 0, function($name) use(&$text) {
      if ($name === 'three-files/donut.txt') {
        return function($data) use(&$text) {
          $text = $data;
          return $data;
        };
      }
    });
    while (fread($fileStream, 1024));
    fclose($fileStream);
    $this->assertStringContainsString('${placeholder}', $text);

    // should remove file when transform function return false
    $path = __DIR__ . '/files/three-files.zip';
    $fileStream = fopen($path, 'rb');
    stream_set_chunk_size($fileStream, rand(10, 1024));
    stream_filter_append($fileStream, $filter, 0, function($name) {
      if ($name === 'three-files/malgorzata-socha.jpg') {
        return function($data) { return null; };
      }
    });
    $names = [];
    stream_filter_append($fileStream, $filter, 0, function($name) use(&$names) {
      $names[] = $name;
    });
    while (fread($fileStream, 1024));
    fclose($fileStream);
    $this->assertContains('three-files/', $names);
    $this->assertContains('three-files/LICENSE.txt', $names);
    $this->assertContains('three-files/donut.txt', $names);
    $this->assertNotContains('three-files/malgorzata-socha.jpg', $names);

    // should replace file contents
    $path = __DIR__ . '/files/three-files.zip';
    $fileStream = fopen($path, 'rb');
    stream_set_chunk_size($fileStream, rand(10, 1024));
    $replacement = 'wasabi donut';
    stream_filter_append($fileStream, $filter, 0, function($name) use($replacement) {
      if ($name === 'three-files/donut.txt') {
        return function($data) use($replacement) {
          return str_replace('${placeholder}', $replacement, $data);
        };
      }
    });
    $text = '';
    stream_filter_append($fileStream, $filter, 0, function($name) use(&$text) {
      if ($name === 'three-files/donut.txt') {
        return function($data) use(&$text) {
          $text = $data;
          return $data;
        };
      }
    });
    while (fread($fileStream, 1024));
    fclose($fileStream);
    $this->assertStringContainsString($replacement, $text);

    // should replace contents of larger compressed file
    $path = __DIR__ . '/files/three-files.zip';
    $fileStream = fopen($path, 'rb');
    $replacement = 'Road to Serfdom';
    stream_filter_append($fileStream, $filter, 0, function($name) use($replacement) {
      if ($name === 'three-files/LICENSE.txt') {
        return function($data) use($replacement) {
          return str_replace('General Public License', $replacement, $data);
        };
      }
    });
    $text = '';
    stream_filter_append($fileStream, $filter, 0, function($name) use(&$text) {
      if ($name === 'three-files/LICENSE.txt') {
        return function($data) use(&$text) {
          $text = $data;
          return $data;
        };
      }
    });
    while (fread($fileStream, 1024));
    fclose($fileStream);
    $this->assertStringContainsString($replacement, $text);

    // should find file with unicode name
    $path = __DIR__ . '/files/unicode.zip';
    $fileStream = fopen($path, 'rb');
    stream_set_chunk_size($fileStream, rand(10, 1024));
    $names = [];
    stream_filter_append($fileStream, $filter, 0, function($name) use(&$names) {
      $names[] = $name;
    });
    while (fread($fileStream, 1024));
    fclose($fileStream);
    $this->assertContains('szczęście.txt', $names);

    // should produce valid PowerPoint file
    $site = 'https://6beer.mk';
    $haiku = [
      [ 'Harass explosives', 'Otherworldly paul playoff', 'Stalks polje weeny' ],
      [ 'Grouping sandstorm soon', 'Tine doorway bookmark agile', 'Verbatim coldly' ],
      [ 'Polymorphism baas', 'Accompli shoved murine jo', 'Fruitlessly speaker' ],
      [ 'Whet berth suspender', 'Disproportionate sadness', 'Tiptoe sympathized' ],
      [ 'Morgana mantra', 'Ais inhabiting umpteen', 'Disestablishment' ],
      [ 'Upstate brock nighttimes', 'Hartmann condone enterprise', 'Disrupted abie' ],
      [ 'Outlook prettiest', 'Defies program hitchhiker', 'Demote cistercian' ],
      [ 'Acquittal luau', 'Drafting mirabel parrot', 'Hognose dunked cellar' ],
      [ 'Hakes encourages', 'Handsome yew dowd bove starchy', 'Swelling curmudgeons' ],
      [ 'Chugging importer', 'Squabble finalists sputters', 'Fillers vibrant penned' ],
    ];
    $instructions = "Instructions: Go to $site and type in one of the following infinite-monkey haiku";
    $variables = [];
    foreach ($haiku as $index => $lines) {
      $number = $index + 1;
      $variables["tab_{$number}_heading"] = $site;
      foreach ($lines as $lineIndex => $line) {
        $lineNumber = $lineIndex + 1;
        $variables["tab_{$number}_line_{$lineNumber}"] = $line;
      }
    }
    $variables['body_instruction_text'] = $instructions;
    $path = __DIR__ . '/../pptx/flyer-a4-portrait.pptx';
    $fileStream = fopen($path, 'rb');
    stream_set_chunk_size($fileStream, rand(10, 1024));
    stream_filter_append($fileStream, $filter, 0, function($name) use($variables) {
      if ($name === 'ppt/slides/slide1.xml') {
        return function ($data) use($variables) {
          return preg_replace_callback('/\$\{(.*?)\}/', function($m) use($variables) {
            return isset($variables[$m[1]]) ? $variables[$m[1]] : '';
          }, $data);
        };
      }
    });
    // need to check file manually
    $pptxPath = __DIR__ . ('/files/output/flyer-php.pptx');
    $pptxFileStream = fopen($pptxPath, 'wb');
    stream_copy_to_stream($fileStream, $pptxFileStream);
    fclose($fileStream);
    fclose($pptxFileStream);
  }
}
