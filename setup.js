const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const Area = new Schema({
  name: String,
  geometry: Array,
});

mongoose.model('Area', Area);