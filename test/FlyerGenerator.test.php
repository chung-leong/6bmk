<?php

use PHPUnit\Framework\TestCase;
use cleong\sixbeermk\FlyerGenerator;

class FlyerGeneratorTest extends TestCase {
  function testGenerate() {
    // should throw if haiku is not a generator
    $error = catch_error(function() {
      $generator = new FlyerGenerator([]);
    });
    $this->assertInstanceOf(Exception::class, $error);    

    // should create a single-sided letter portrait flyer
    $paper = 'letter';
    $orientation = 'portrait';
    $mode = 'simplex';
    $count = 0;
    $finalized = false;
    $generator = new FlyerGenerator([ 
      'address' => 'https://6beer.mk/',
      'instructions' => 'Go to website and enter haiku',
      'paper' => $paper,
      'orientation' => $orientation,
      'mode' => $mode,
      'haiku' => (function() use(&$count, &$finalized) {
        try {
          for (;;) {
            $count++;  
            yield '[LINE 1]\n[LINE 2]\n[LINE 3]';
          }
        } finally {
          $finalized = true;
        }  
      })(),
    ]);
    $fileStream = $generator->generate();
    // need to check file manually
    $pptxPath = __DIR__ . ("/files/output/flyer-php-$paper-$orientation-$mode.pptx");
    $pptxFileStream = fopen($pptxPath, 'wb');
    stream_copy_to_stream($fileStream, $pptxFileStream);
    fclose($pptxFileStream);
    fclose($fileStream);
    $this->assertSame(10, $count);
    $generator = null;
    $this->assertSame(true, $finalized);
 
    // should create a single-sided letter landscape flyer
    $paper = 'letter';
    $orientation = 'landscape';
    $mode = 'simplex';
    $count = 0;
    $finalized = false;
    $generator = new FlyerGenerator([ 
      'address' => 'https://6beer.mk/',
      'instructions' => 'Go to website and enter haiku',
      'paper' => $paper,
      'orientation' => $orientation,
      'mode' => $mode,
      'haiku' => (function() use(&$count, &$finalized) {
        try {
          for (;;) {
            $count++;  
            yield '[LINE 1]\n[LINE 2]\n[LINE 3]';
          }
        } finally {
          $finalized = true;
        }  
      })(),
    ]);
    $fileStream = $generator->generate();
    // need to check file manually
    $pptxPath = __DIR__ . ("/files/output/flyer-php-$paper-$orientation-$mode.pptx");
    $pptxFileStream = fopen($pptxPath, 'wb');
    stream_copy_to_stream($fileStream, $pptxFileStream);
    fclose($pptxFileStream);
    fclose($fileStream);
    $this->assertSame(12, $count);
    $generator = null;
    $this->assertSame(true, $finalized);
 
    // should create a double-sided letter portrait flyer
    $paper = 'letter';
    $orientation = 'portrait';
    $mode = 'duplex';
    $count = 0;
    $finalized = false;
    $generator = new FlyerGenerator([ 
      'address' => 'https://6beer.mk/',
      'instructions' => 'Go to website and enter haiku',
      'paper' => $paper,
      'orientation' => $orientation,
      'mode' => $mode,
      'haiku' => (function() use(&$count, &$finalized) {
        try {
          for (;;) {
            $count++;  
            yield '[LINE 1]\n[LINE 2]\n[LINE 3]';
          }
        } finally {
          $finalized = true;
        }  
      })(),
    ]);
    $fileStream = $generator->generate();
    // need to check file manually
    $pptxPath = __DIR__ . "/files/output/flyer-php-$paper-$orientation-$mode.pptx";
    $pptxFileStream = fopen($pptxPath, 'wb');
    stream_copy_to_stream($fileStream, $pptxFileStream);
    fclose($pptxFileStream);
    fclose($fileStream);
    $this->assertSame(10, $count);
    $generator = null;
    $this->assertSame(true, $finalized);
 
    // should create a double-sided letter landscape flyer
    $paper = 'letter';
    $orientation = 'landscape';
    $mode = 'duplex';
    $count = 0;
    $finalized = false;
    $generator = new FlyerGenerator([ 
      'address' => 'https://6beer.mk/',
      'instructions' => 'Go to website and enter haiku',
      'paper' => $paper,
      'orientation' => $orientation,
      'mode' => $mode,
      'haiku' => (function() use(&$count, &$finalized) {
        try {
          for (;;) {
            $count++;  
            yield '[LINE 1]\n[LINE 2]\n[LINE 3]';
          }
        } finally {
          $finalized = true;
        }  
      })(),
    ]);
    $fileStream = $generator->generate();
    // need to check file manually
    $pptxPath = __DIR__ . "/files/output/flyer-php-$paper-$orientation-$mode.pptx";
    $pptxFileStream = fopen($pptxPath, 'wb');
    stream_copy_to_stream($fileStream, $pptxFileStream);
    fclose($pptxFileStream);
    fclose($fileStream);
    $this->assertSame(12, $count);
    $generator = null;
    $this->assertSame(true, $finalized);
 
    // should create a single-sided A4 portrait flyer
    $paper = 'a4';
    $orientation = 'portrait';
    $mode = 'simplex';
    $count = 0;
    $finalized = false;
    $generator = new FlyerGenerator([ 
      'address' => 'https://6beer.mk/',
      'instructions' => 'Go to website and enter haiku',
      'paper' => $paper,
      'orientation' => $orientation,
      'mode' => $mode,
      'haiku' => (function() use(&$count, &$finalized) {
        try {
          for (;;) {
            $count++;  
            yield '[LINE 1]\n[LINE 2]\n[LINE 3]';
          }
        } finally {
          $finalized = true;
        }  
      })(),
    ]);
    $fileStream = $generator->generate();
    // need to check file manually
    $pptxPath = __DIR__ . "/files/output/flyer-php-$paper-$orientation-$mode.pptx";
    $pptxFileStream = fopen($pptxPath, 'wb');
    stream_copy_to_stream($fileStream, $pptxFileStream);
    fclose($pptxFileStream);
    fclose($fileStream);
    $this->assertSame(10, $count);
    $generator = null;
    $this->assertSame(true, $finalized);
 
    // should create a single-sided A4 landscape flyer
    $paper = 'a4';
    $orientation = 'landscape';
    $mode = 'simplex';
    $count = 0;
    $finalized = false;
    $generator = new FlyerGenerator([ 
      'address' => 'https://6beer.mk/',
      'instructions' => 'Go to website and enter haiku',
      'paper' => $paper,
      'orientation' => $orientation,
      'mode' => $mode,
      'haiku' => (function() use(&$count, &$finalized) {
        try {
          for (;;) {
            $count++;  
            yield '[LINE 1]\n[LINE 2]\n[LINE 3]';
          }
        } finally {
          $finalized = true;
        }  
      })(),
    ]);
    $fileStream = $generator->generate();
    // need to check file manually
    $pptxPath = __DIR__ . "/files/output/flyer-php-$paper-$orientation-$mode.pptx";
    $pptxFileStream = fopen($pptxPath, 'wb');
    stream_copy_to_stream($fileStream, $pptxFileStream);
    fclose($pptxFileStream);
    fclose($fileStream);
    $this->assertSame(12, $count);
    $generator = null;
    $this->assertSame(true, $finalized);
 
    // should create a double-sided A4 portrait flyer
    $paper = 'a4';
    $orientation = 'portrait';
    $mode = 'duplex';
    $count = 0;
    $finalized = false;
    $generator = new FlyerGenerator([ 
      'address' => 'https://6beer.mk/',
      'instructions' => 'Go to website and enter haiku',
      'paper' => $paper,
      'orientation' => $orientation,
      'mode' => $mode,
      'haiku' => (function() use(&$count, &$finalized) {
        try {
          for (;;) {
            $count++;  
            yield '[LINE 1]\n[LINE 2]\n[LINE 3]';
          }
        } finally {
          $finalized = true;
        }  
      })(),
    ]);
    $fileStream = $generator->generate();
    // need to check file manually
    $pptxPath = __DIR__ . "/files/output/flyer-php-$paper-$orientation-$mode.pptx";
    $pptxFileStream = fopen($pptxPath, 'wb');
    stream_copy_to_stream($fileStream, $pptxFileStream);
    fclose($pptxFileStream);
    fclose($fileStream);
    $this->assertSame(10, $count);
    $generator = null;
    $this->assertSame(true, $finalized);
 
    // should create a double-sided A4 landscape flyer
    $paper = 'a4';
    $orientation = 'landscape';
    $mode = 'duplex';
    $count = 0;
    $finalized = false;
    $generator = new FlyerGenerator([ 
      'address' => 'https://6beer.mk/',
      'instructions' => 'Go to website and enter haiku',
      'paper' => $paper,
      'orientation' => $orientation,
      'mode' => $mode,
      'haiku' => (function() use(&$count, &$finalized) {
        try {
          for (;;) {
            $count++;  
            yield '[LINE 1]\n[LINE 2]\n[LINE 3]';
          }
        } finally {
          $finalized = true;
        }  
      })(),
    ]);
    $fileStream = $generator->generate();
    // need to check file manually
    $pptxPath = __DIR__ . "/files/output/flyer-php-$paper-$orientation-$mode.pptx";
    $pptxFileStream = fopen($pptxPath, 'wb');
    stream_copy_to_stream($fileStream, $pptxFileStream);
    fclose($pptxFileStream);
    fclose($fileStream);
    $this->assertSame(12, $count);
    $generator = null;
    $this->assertSame(true, $finalized);

    // should use custom template
    $file = __DIR__ . '/../pptx/flyer-letter-landscape-duplex.pptx';
    $count = 0;
    $finalized = false;
    $generator = new FlyerGenerator([ 
      'address' => 'https://6beer.mk/',
      'instructions' => 'Go to website and enter haiku',
      'file' => $file,
      'haiku' => (function() use(&$count, &$finalized) {
        try {
          for (;;) {
            $count++;  
            yield '[LINE 1]\n[LINE 2]\n[LINE 3]';
          }
        } finally {
          $finalized = true;
        }  
      })(),
    ]);
    $fileStream = $generator->generate();
    // need to check file manually
    $pptxPath = __DIR__ . "/files/output/flyer-php-custom.pptx";
    $pptxFileStream = fopen($pptxPath, 'wb');
    stream_copy_to_stream($fileStream, $pptxFileStream);
    fclose($pptxFileStream);
    fclose($fileStream);
    $this->assertSame(12, $count);
    $this->assertSame(true, $finalized);

    // should leave placeholders as is where generator does not yield anything
    $generator = new FlyerGenerator([ 
      'address' => 'https://6beer.mk/',
      'instructions' => 'Go to website and enter haiku',
      'haiku' => (function() {
        yield null;
       })(),
    ]);
    $fileStream = $generator->generate();
    // need to check file manually
    $pptxPath = __DIR__ . "/files/output/flyer-php-blank.pptx";
    $pptxFileStream = fopen($pptxPath, 'wb');
    stream_copy_to_stream($fileStream, $pptxFileStream);
    fclose($pptxFileStream);
    fclose($fileStream);
    $this->assertSame(12, $count);
    $this->assertSame(true, $finalized);

  }
}