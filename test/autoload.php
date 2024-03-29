<?php

include_once __DIR__.'/../vendor/autoload.php';

$classLoader = new \Composer\Autoload\ClassLoader();
$classLoader->addPsr4('cleong\\sixbeermk\\', __DIR__ . '/../src', true);
$classLoader->register();

function access_protected($obj, $name) {
  $reflection = new ReflectionClass($obj);
  $property = $reflection->getProperty($name);
  $property->setAccessible(true);
  return $property->getValue($obj);
}

function invoke_protected($obj, $name, ...$args) {
  $reflection = new ReflectionClass($obj);
  $method = $reflection->getMethod($name);
  $method->setAccessible(true);
  return $method->invoke($obj, ...$args);
}

function catch_error($f) {
  try {
    $f();
  } catch (Exception $e) {
    return $e;
  }
}
