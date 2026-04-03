const mongoose = require("mongoose");
const {
  MONGODB_DB_NAME,
  MONGODB_URI,
} = require("../config");

let connectPromise = null;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (connectPromise) {
    return connectPromise;
  }

  connectPromise = mongoose
    .connect(MONGODB_URI, {
      dbName: MONGODB_DB_NAME,
    })
    .then(() => {
      console.log(`MongoDB connected (${MONGODB_DB_NAME})`);
      return mongoose.connection;
    })
    .catch((error) => {
      connectPromise = null;
      throw error;
    });

  return connectPromise;
}

module.exports = { connectToDatabase };
