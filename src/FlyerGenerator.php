<?php namespace cleong\sixbeermk;

use \Exception;

class FlyerGenerator {
  protected $path;
  protected $haiku;
  protected $address;
  protected $instructions;

  function __construct($options = []) {
    extract($options + [ 
      'paper' => 'letter', 
      'orientation' => 'portrait', 
      'mode' => 'simplex',
      'file' => '',
      'haiku' => null,
      'address' => '',
      'instructions' => '',
    ]);
    if ($file) {
      $this->path = $file;
    } else {
      $this->path = __DIR__ . "/../pptx/flyer-$paper-$orientation-$mode.pptx";
    }
    if (!is_iterable($haiku)) {
      throw new Exception('Missing haiku generator');
    }
    $this->haiku = $haiku;
    $this->haikuHash = [];
    $this->haikuUsed = false;
    $this->address = $address;
    $this->instructions = $instructions;
  }

  function generate() {
    $filter = ZipModifier::register();
    $fileStream = fopen($this->path, 'rb');
    stream_filter_append($fileStream, $filter, 0, function($name) {
      if (preg_match('/ppt\\/slides\\/slide\\d+\\.xml/', $name)) {
        return function ($data) {
          $vars = extract_variables($data);
          $variables = [];
          foreach ($vars as $varname) {
            if (preg_match('/^tab_\\d+_heading$/', $varname)) {
              $variables[$varname] = $this->address;
            } else if (preg_match('/^tab_(\\d+)_line_(\\d+)$/', $varname, $matches)) {
              $tab = $matches[1];
              $line = $matches[2];
              $lines =& $this->haikuHash[$tab];
              if (!$lines) {
                // generate the haiku
                if ($this->haikuUsed) {
                  $this->haiku->next();
                }
                $value = $this->haiku->current();
                $this->haikuUsed = true;
                if ($value) {
                  $lines = explode('\n', $value);
                }
              }
              if ($lines) {
                $variables[$varname] = $lines[$line - 1];
              }
            }
          }
          $variables['body_instruction_text'] = $this->instructions;          
          return preg_replace_callback('/\$\{(.*?)\}/', function($m) use($variables) {
            return isset($variables[$m[1]]) ? $variables[$m[1]] : $m[0];
          }, $data);
        };
      } else if ($name == null) {
        // shutdown generator by allowing it to be gc'ed
        $this->haiku = null;
      }
    });
    return $fileStream;
  }
}

function extract_variables($data) {
  preg_match_all('/\$\{(.*?)\}/', $data, $matches);
  return $matches[1];
}