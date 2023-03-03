<?php namespace cleong\sixbeermk;

use \php_user_filter;
use \Exception;
use \OutOfRangeException;

class ZipModifier extends php_user_filter {
  public static $name = 'zip.modify';
  public static $registered = false;

  public static function register() {
    if (!self::$registered) {
      stream_filter_register(self::$name, get_called_class());
      self::$registered = true;
    }
    return self::$name;
  }

  protected $callback;
  protected $leftOver = '';
  protected $extraction;
  protected $dataRead = 0;
  protected $dataRemaining = 0;
  protected $currentOffset = 0;
  protected $localHeaderOffsets = [];
  protected $centralDirectoryOffset = 0;
  protected $centralDirectorySize = 0;
  protected $centralDirectoryRecordCount = 0;
  protected $transformedFileAttributes = [];
  protected $omitDataDescriptor = false;

  public function filter($in, $out, &$consumed, $closing) {
    $dataDescriptorSignature = "\x50\x4b\x07\x08";
    while ($bucket = stream_bucket_make_writeable($in)) {
      $output = [];
      $chunk = $bucket->data;
      $consumed += $bucket->datalen;
      if ($this->leftOver) {
        $chunk = $this->leftOver . $chunk;
        $this->leftOver = '';
      }
      $index = 0;
      $len = strlen($chunk);
      while ($index < $len) {
        if ($this->dataRemaining === 0) {
          // expecting a header of some sort
          try {
            extract(unpack_or_throw('Vsignature', $chunk, $index, 4));
            if ($signature === 0x04034b50) {
              extract(unpack_or_throw('vnameLength/vextraLength', $chunk, $index + 26, 4));
              $headerSize = 30 + $nameLength + $extraLength;
              $header = substr_or_throw($chunk, $index, $headerSize);
              extract(unpack_or_throw('vflags/vcompression', $header, 6, 4));
              extract(unpack_or_throw('VcompressedSize', $header, 18, 4));
              $name = substr_or_throw($header, 30, $nameLength);
              $transform = call_user_func($this->callback, $name);
              if (is_callable($transform)) {
                // callback wants a look at the data
                $data = [];
                $this->extraction = compact('header', 'flags', 'name', 'compression', 'transform', 'extraLength', 'data');
                $this->omitDataDescriptor = true;
              } else {
                // just output the header
                $this->localHeaderOffsets[$name] = $this->currentOffset;
                $this->currentOffset += $headerSize;
                $this->omitDataDescriptor = false;
                $output[] = $header;
              }
              $index += $headerSize;
              if ($flags & 0x0008) {
                $this->dataRemaining = INF;
              } else {
                $this->dataRemaining = $compressedSize;
              }
              $this->dataRead = 0;
            } else if ($signature === 0x08074b50) {
              // data descriptor
              $descriptor = substr_or_throw($chunk, $index, 16);
              if (!$this->omitDataDescriptor) {
                $this->currentOffset += strlen($descriptor);
                $output[] = $descriptor;
              }
              $index += 16;
            } else if ($signature === 0x02014b50) {
              // central directory record
              extract(unpack_or_throw('vnameLength/vextraLength/vcommentLength', $chunk, $index + 28, 6));
              $headerSize = 46 + $nameLength + $extraLength + $commentLength;
              $header = substr_or_throw($chunk, $index, $headerSize);
              extract(unpack_or_throw('vflags', $header, 8, 2));
              $name = substr_or_throw($header, 46, $nameLength);
              if (isset($this->localHeaderOffsets[$name])) {
                $localHeaderOffset = $this->localHeaderOffsets[$name];
                // update local header position
                pack_into($header, 42, 'V', $localHeaderOffset);
                if (isset($this->transformedFileAttributes[$name])) {
                  extract($this->transformedFileAttributes[$name]);
                  // update these as well
                  pack_into($header, 8, 'v', $flags & ~0x0008);
                  pack_into($header, 16, 'VVV', $crc32, $compressedSize, $uncompressedSize);
                }
                if ($this->centralDirectoryOffset === 0) {
                  $this->centralDirectoryOffset = $this->currentOffset;
                }
                $this->centralDirectoryRecordCount++;
                $this->centralDirectorySize += $headerSize;
                $this->currentOffset += $headerSize;
                $output[] = $header;
              }
              $index += $headerSize;
            } else if ($signature === 0x06054b50) {
              // end of central directory record
              extract(unpack_or_throw('vcommentLength', $chunk, $index + 20, 2));
              $headerSize = 22 + $commentLength;
              $header = substr_or_throw($chunk, $index, $headerSize);
              // update record
              pack_into($header, 8, 'vvVV',
                $this->centralDirectoryRecordCount, $this->centralDirectoryRecordCount,
                $this->centralDirectorySize, $this->centralDirectoryOffset);
              $this->currentOffset += $headerSize;
              $output[] = $header;
              $index += $headerSize;
            } else {
              throw new Exception(sprintf('Unknown signature %04x', $signature));
            }
          } catch (OutOfRangeException $err) {
            // need more data before we can process the header
            $this->leftOver = substr($chunk, $index);
            $index = $len;
          }
        } else {
          // processing the data contents
          // get up to the number of bytes remaining from the chunk
          $fragment = substr($chunk, $index, min(PHP_INT_MAX, $this->dataRemaining));
          $needMore = false;
          if ($this->dataRemaining === INF) {            
            $ddIndex = strpos($fragment, $dataDescriptorSignature);
            if ($ddIndex !== false) {
              if ($ddIndex + 16 < strlen($fragment)) {
                $header = substr($fragment, $ddIndex, 16);
                extract(unpack('VcompressedSize', $header, 8));
                if ($this->dataRead + $ddIndex === $compressedSize) {
                  $fragment = substr($fragment, 0, $ddIndex);
                  $this->dataRemaining = strlen($fragment);
                }
              } else {
                $needMore = true;
              }
            } else {
              // in case the chunk ends in the middle of the data descriptor's signature
              if (substr($fragment, -3) === substr($dataDescriptorSignature, 0, -1)) {
                $needMore = true;
              } else if (substr($fragment, -2) === substr($dataDescriptorSignature, 0, -2)) {
                $needMore = true;
              } else if (substr($fragment, -1) === substr($dataDescriptorSignature, 0, -3)) {
                $needMore = true;
              }
            }
            if ($needMore) {
              $this->leftOver = $fragment;
              break;
            }
          }
          $fragmentLen = strlen($fragment);
          if ($this->extraction) {
            // keep the data
            $this->extraction['data'][] = $fragment;
          } else {
            // send the data to the output stream
            $this->currentOffset += $fragmentLen;
            $output[] = $fragment;
          }
          $index += $fragmentLen;
          $this->dataRemaining -= $fragmentLen;
          $this->dataRead += $fragmentLen;
          if ($this->dataRemaining === 0 && $this->extraction) {
            extract($this->extraction);
            $data = implode($data);
            $uncompressedData = ($compression === 8) ? gzinflate($data) : $data;
            $transformedData = call_user_func($transform, $uncompressedData);
            if (gettype($transformedData) !== 'string' && $transformedData !== null) {
              $transformedData = "$transformedData";
            }
            if (gettype($transformedData) === 'string') {
              $crc32 = crc32($transformedData);
              $compressedData = ($compression === 8) ? gzdeflate($transformedData) : $transformedData;
              $compressedSize = strlen($compressedData);
              $uncompressedSize = strlen($transformedData);
              // remember these for the central directory
              $this->transformedFileAttributes[$name] = compact('crc32', 'compressedSize', 'uncompressedSize');
              $this->localHeaderOffsets[$name] = $this->currentOffset;
              // update header
              pack_into($header, 6, 'v', $flags & ~0x0008);
              pack_into($header, 14, 'VVV', $crc32, $compressedSize, $uncompressedSize);
              // output the header and transformed data
              $this->currentOffset += strlen($header);
              $output[] = $header;
              $this->currentOffset += $compressedSize;
              $output[] = $compressedData;
            }
            $this->extraction = null;
          }
        }
      }
      $bucket->data = implode($output);
      $bucket->datalen = strlen($bucket->data);
      stream_bucket_append($out, $bucket);
    }
    return PSFS_PASS_ON;
  }

  public function onCreate() {
    if (!is_callable($this->params)) {
      throw new Exception(__CLASS__ . ' expects a callback function as a parameter');
    }
    $this->callback = $this->params;
  }
}

function unpack_or_throw($pattern, $subject, $index, $len) {
  if ($index + $len <= strlen($subject)) {
    return unpack($pattern, $subject, $index);
  } else {
    throw new OutOfRangeException;
  }
}

function substr_or_throw($subject, $index, $len) {
  if ($index + $len <= strlen($subject)) {
    return substr($subject, $index, $len);
  } else {
    throw new OutOfRangeException;
  }
}

function pack_into(&$subject, $index, $pattern, ...$args) {
  $replacement = pack($pattern, ...$args);
  $len = strlen($replacement);
  $subject = substr($subject, 0, $index) . $replacement . substr($subject, $index + $len);
}
