// migrate-mongo configuration.
// Doc: https://github.com/seppevs/migrate-mongo
require("dotenv").config({ path: ".env.local" });
require("dotenv").config({ path: ".env" });

module.exports = {
  mongodb: {
    url:
      process.env.MONGODB_URI ??
      "mongodb://noghost:noghost@127.0.0.1:27018/noghost?authSource=admin",
    databaseName: undefined,
    options: {},
  },
  migrationsDir: "server/db/migrations",
  changelogCollectionName: "_migrations",
  migrationFileExtension: ".js",
  useFileHash: false,
  moduleSystem: "commonjs",
};
