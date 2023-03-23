<?php

function open_database() {
  $path = './database.sqlite3';
  try {
    return new Sqlite3($path, SQLITE3_OPEN_READWRITE);
  } catch (Exception $err) {
    $db = new Sqlite3($path);
    $db->exec("
      CREATE TABLE haiku (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,    
        flyer_id INTEGER NOT NULL,
        hash TEXT NOT NULL UNIQUE,
        text TEXT NOT NULL,
        used INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE flyer (
        id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT UNIQUE,    
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        instructions TEXT NOT NULL,
        options TEXT NOT NULL
      );
    ");
    return $db;
  }
}
