# Area to Database

## Installation

`yarn`

## Config

`cp config.example.json config.json`

Then adjust it to suit your needs.

Notes on config fields:

- `host`: the database host. Should include username and password in `uname:pwd@example.com` format.
- `database`: the Mongo database to use
- `datasets`: an array of objects with the form:
  - `id`: a unique identifier for this dataset, which must be kept the same if you want any changes to _update_ the database rather than simply append to it.
  - `src`: the location of the source GeoJSON file
  - `version`: the version of this dataset. Increment this whenever the source file or anything to do with this dataset changes.
  - `priority`: if a loo lands within multiple areas, the one with the highest priority will be the one to which it is assigned.
  - `type`: the name of this type of area, e.g. 'Local Authority'

## Usage

Either:

`yarn start [options]`

or

`./index.js [options]`

```txt
usage: index.js [-h] [-v] [-n]

Update the database with areas from ONS GeoJSON

Optional arguments:
  -h, --help     Show this help message and exit.
  -v, --version  Show program's version number and exit.
  -n, --dry-run  Don't update the database, just output what would be done.
```