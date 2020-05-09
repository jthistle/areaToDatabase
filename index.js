#!/usr/bin/env node

const config = require('./config.json');
const fs = require('fs');
const mongoose = require('mongoose');
require('./setup');

const ArgumentParser = require('argparse').ArgumentParser;

const parser = new ArgumentParser({
  version: '0.1.0',
  addHelp: true,
  description: 'Update the database with areas from ONS GeoJSON'
});

parser.addArgument(['-n', '--dry-run'], {
  help: 'Don\'t update the database, just output what would be done.',
  action: 'storeConst',
  defaultValue: false,
  constant: true,
  required: false,
});

const Area = mongoose.model('Area');

/**
 * Loads a json file which doesn't have .json as a file extension.
 */
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

/**
 * Do any cleanup and exit the programme.
 */
function finish() {
  console.log('Exiting...');
  process.exit(0);
}

/**
 * Mmmm, curry.
 */
function datasetLogger(dataset) {
  return (...args) => {
    console.log(`${dataset.id}:`, ...args);
  }
}

/**
 * Update the database from a dataset-format object.
 */
function updateDataset(dataset, dryrun) {
  return new Promise(async (doneUpdating) => {
    const log = datasetLogger(dataset);

    log(`Loading GeoJSON file ${dataset.src}...`);
    const bounds = await loadJSON(dataset.src);
    log(`Loaded: ${bounds.name}`);

    // Do some preliminary checks
    if (dryrun) {
      log(`Would delete old areas with id==${dataset.id}, version!=${dataset.version}`);
    } else {
      log('Searching for non-stale area data in database...');
      const nonStale = await new Promise((resolve) => {
        Area.findOne({
          version: {
            $eq: dataset.version,
          }
        }, (err, res) => {
          return resolve(res);
        });
      });

      if (nonStale != null) {
        log(`WARNING: Type ${dataset.type} has non-stale entries in the database. This means you probably need to increment the version number, not changing anything for this dataset.`);
        return doneUpdating(false);
      }

      // Get rid of stale data
      log('Deleting stale data...');
      await new Promise((resolve) =>
        Area.deleteMany({
          datasetId: {
            $eq: dataset.id,
          }
        }, (err, res) => {
          if (err) {
            log('Error deleting:', err);
            return doneUpdating(false);
          }
          return resolve();
        })
      );
      log('Deleted successfully, now writing new area data...');
    }

    // Actually write the areas to the database
    let count = bounds.features.length;
    let saved = 0;
    bounds.features.forEach((feature) => {
      const name = feature.properties.lad19nm;
      const geometry = feature.geometry;

      const newArea = new Area();
      newArea.name = name;
      newArea.geometry = geometry;
      newArea.datasetId = dataset.id;
      newArea.priority = dataset.priority;
      newArea.version = dataset.version;
      newArea.type = dataset.type;

      if (dryrun) {
        log(`Would save area ${name}`);
      } else {
        newArea.save((err) => {
          if (err) {
            console.error(`${dataset.id}: Error saving area: ${err}`);
            process.exit(1);
          }
          saved += 1;
          if (saved === count) {
            log('Successfully written new areas for this dataset');
            return doneUpdating(true);
          }
        });
      }
    });
  });
}

function sanityCheck(datasets) {
  const ids = [];

  datasets.forEach((dataset) => {
    if (ids.includes(dataset.id)) {
      console.log('Config is insane! You cannot have two datasets with the same id.');
      return false;
    }
    ids.push(dataset.id);
  });
  return true;
}

/**
 * Entry point.
 */
async function run() {
  const args = parser.parseArgs();
  const dryrun = args.dry_run;

  if (!sanityCheck(config.datasets)) {
    console.log('Sanity check failed');
    return finish();
  }

  const dbAddr = `mongodb://${config.host}/${config.database}`;
  if (!dryrun) {
    console.log(`Connecting to ${dbAddr}`);
    await mongoose.connect(dbAddr, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }

  let count = config.datasets.length;
  let saved = 0;
  let success = 0;
  config.datasets.forEach(async (dataset) => {
    const res = await updateDataset(dataset, dryrun);
    saved += 1;
    success += res ? 1 : 0;
    if (saved === count) {
      console.log(`Saved all saveable areas, ${success} successes`);
      finish();
    }
  });

  if (dryrun) {
    console.log(`Would have added ${count} areas`);
  } else {
    console.log(`Parsed ${count} areas, please wait while saving...`);
  }
}

run();