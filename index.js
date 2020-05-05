#!/usr/bin/env node

require('dotenv').config()
const fs = require('fs');
const mongoose = require('mongoose');
require('./setup');

const ArgumentParser = require('argparse').ArgumentParser;

const parser = new ArgumentParser({
  version: '0.1.0',
  addHelp: true,
  description: 'Update the database with areas from ONS GeoJSON'
});

parser.addArgument('boundaries', {
  help: 'The ONS area boundaries GeoJSON file'
});

parser.addArgument(['-a', '--host'], {
  help: 'The database host',
  required: false,
});

parser.addArgument(['-d', '--database'], {
  help: 'The database name',
  required: false,
});

parser.addArgument(['-n', '--dry-run'], {
  help: 'Don\'t update the database, just output what would be done.',
  action: 'storeConst',
  defaultValue: false,
  constant: true,
  required: false,
});

const Area = mongoose.model('Area');

function loadJSON(filename) {
  return new Promise((resolve, reject) => {
    fs.readFile(filename, 'utf-8', (error, res) => {
      if (error) {
        return reject(error);
      }
      const geo = JSON.parse(res);
      return resolve(geo);
    });
  });
}

function finish() {
  console.log('Exiting...');
  process.exit(0);
}

async function run() {
  const args = parser.parseArgs();

  const host = args.host || process.env.HOST;
  const database = args.database || process.env.DATABASE;

  const dbAddr = `mongodb://${host}/${database}`;
  console.log(`Connecting to ${dbAddr}`);
  await mongoose.connect(dbAddr, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const filename = args.boundaries;
  const dryrun = args.dry_run;

  console.log('Loading GeoJSON file...');
  const bounds = await loadJSON(filename);
  console.log(`Loaded: ${bounds.name}`);

  let count = 0;
  let saved = 0;
  bounds.features.forEach((feature) => {
    const name = feature.properties.lad19nm;
    const geometry = feature.geometry;

    const newArea = new Area();
    newArea.name = name;
    newArea.geometry = geometry;

    if (dryrun) {
      console.log(`Would save area ${name}`);
    } else {
      newArea.save((err) => {
        if (err) {
          console.error(`Error saving area: ${err}`);
          process.exit(1);
        }
        saved += 1;
        if (saved == count) {
          console.log('Saved all areas');
          finish();
        }
      });
    }
    count += 1;
  });

  if (dryrun) {
    console.log(`Would have added ${count} areas`);
    finish();
  } else {
    console.log(`Parsed ${count} areas, saving...`);
  }
}

run();