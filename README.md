# Area to Database

## Installation

1. `yarn`

## Usage

Either:

`yarn start [options]`

or

`./index.js [options]`

```txt
usage: index.js [-h] [-v] [-a HOST] [-d DATABASE] [-n] boundaries

Update the database with areas from ONS GeoJSON

Positional arguments:
  boundaries            The ONS area boundaries GeoJSON file

Optional arguments:
  -h, --help            Show this help message and exit.
  -v, --version         Show program's version number and exit.
  -a HOST, --host HOST  The database host
  -d DATABASE, --database DATABASE
                        The database name
  -n, --dry-run         Don't update the database, just output what would be
                        done.
```