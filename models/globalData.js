const mongoose = require("mongoose");
const uniqueValidator = require("mongoose-unique-validator");

const Schema = mongoose.Schema;

const globalDataSchema = new Schema(
  {
    vatRate: { type: String },
    active: {
      type: Boolean,
      default: true,
    },
    modifiedOn: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

globalDataSchema.plugin(uniqueValidator);

module.exports = mongoose.model("Global", globalDataSchema);
