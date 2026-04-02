import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import { fileURLToPath } from "url";

const DEFAULT_TARGET_URI = "mongodb://127.0.0.1:27017";
const DEFAULT_DB_NAME = "apicompany";
const DEFAULT_BATCH_SIZE = 1000;

const args = process.argv.slice(2);

const getArgValue = (name) => {
  const direct = args.find((arg) => arg.startsWith(`${name}=`));
  if (direct) {
    return direct.slice(name.length + 1);
  }

  const index = args.indexOf(name);
  if (index >= 0 && index < args.length - 1) {
    return args[index + 1];
  }

  return null;
};

const hasFlag = (name) => args.includes(name);

const loadEnvIfPresent = (filePath) => {
  if (fs.existsSync(filePath)) {
    return dotenv.parse(fs.readFileSync(filePath));
  }
  return {};
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const atlasBackupEnv = path.join(repoRoot, ".env.atlas.backup");
const atlasEnv = loadEnvIfPresent(atlasBackupEnv);
const currentEnv = loadEnvIfPresent(path.join(repoRoot, ".env"));

const parseDbNameFromUri = (uri) => {
  try {
    const parsed = new URL(uri);
    return parsed.pathname?.replace(/^\//, "") || DEFAULT_DB_NAME;
  } catch {
    return DEFAULT_DB_NAME;
  }
};

const sourceUri = getArgValue("--source-uri")
  || process.env.SOURCE_MONGODB_URI
  || atlasEnv.MONGODB_URI
  || currentEnv.MONGODB_URI;
const targetUri = getArgValue("--target-uri")
  || process.env.TARGET_MONGODB_URI
  || currentEnv.MONGODB_URI
  || DEFAULT_TARGET_URI;
const sourceDbName = getArgValue("--source-db")
  || process.env.SOURCE_MONGODB_DB
  || atlasEnv.MONGODB_DB
  || parseDbNameFromUri(sourceUri);
const targetDbName = getArgValue("--target-db")
  || process.env.TARGET_MONGODB_DB
  || currentEnv.MONGODB_DB
  || DEFAULT_DB_NAME;
const batchSize = Number(getArgValue("--batch-size") || process.env.MONGO_CLONE_BATCH_SIZE || DEFAULT_BATCH_SIZE);
const dropTarget = !hasFlag("--keep-target");

if (!sourceUri) {
  throw new Error("Missing source MongoDB URI. Set SOURCE_MONGODB_URI or pass --source-uri.");
}

const sourceClient = new MongoClient(sourceUri);
const targetClient = new MongoClient(targetUri);

const buildIndexDefinition = (index) => {
  let key = index.key;
  const isTextIndex = key && Object.prototype.hasOwnProperty.call(key, "_fts");

  if (isTextIndex) {
    const weightedFields = Object.keys(index.weights || {});
    if (weightedFields.length === 0) {
      return null;
    }
    key = Object.fromEntries(weightedFields.map((field) => [field, "text"]));
  }

  const options = {
    name: index.name,
  };

  [
    "unique",
    "sparse",
    "expireAfterSeconds",
    "partialFilterExpression",
    "collation",
    "wildcardProjection",
    "default_language",
    "language_override",
    "textIndexVersion",
    "weights",
  ].forEach((optionName) => {
    if (index[optionName] !== undefined) {
      options[optionName] = index[optionName];
    }
  });

  return { key, options };
};

const cloneCollection = async ({ sourceDb, targetDb, collectionName }) => {
  const sourceCollection = sourceDb.collection(collectionName);
  const targetCollection = targetDb.collection(collectionName);
  const indexes = await sourceCollection.indexes();

  if (dropTarget) {
    await targetCollection.drop().catch((error) => {
      if (!`${error.message || ""}`.toLowerCase().includes("ns not found")) {
        throw error;
      }
    });
  }

  let inserted = 0;
  let batch = [];
  const cursor = sourceCollection.find({}, { batchSize });

  while (await cursor.hasNext()) {
    batch.push(await cursor.next());
    if (batch.length >= batchSize) {
      await targetCollection.insertMany(batch, { ordered: false });
      inserted += batch.length;
      batch = [];
    }
  }

  if (batch.length > 0) {
    await targetCollection.insertMany(batch, { ordered: false });
    inserted += batch.length;
  }

  const nonDefaultIndexes = indexes.filter((index) => index.name !== "_id_");
  if (nonDefaultIndexes.length > 0) {
    for (const index of nonDefaultIndexes) {
      const definition = buildIndexDefinition(index);
      if (!definition) {
        console.warn(`[clone-mongo] ${collectionName}: skipped unsupported index ${index.name}`);
        continue;
      }
      try {
        await targetCollection.createIndex(definition.key, definition.options);
      } catch (error) {
        console.warn(`[clone-mongo] ${collectionName}: failed to recreate index ${index.name}: ${error.message}`);
      }
    }
  }

  return inserted;
};

try {
  console.log(`[clone-mongo] Source: ${sourceUri}`);
  console.log(`[clone-mongo] Target: ${targetUri}`);
  console.log(`[clone-mongo] DB: ${sourceDbName} -> ${targetDbName}`);

  await sourceClient.connect();
  await targetClient.connect();

  const sourceDb = sourceClient.db(sourceDbName);
  const targetDb = targetClient.db(targetDbName);
  const collections = await sourceDb.listCollections({}, { nameOnly: true }).toArray();
  const userCollections = collections
    .map((collection) => collection.name)
    .filter((name) => !name.startsWith("system."));

  for (const name of userCollections) {
    const inserted = await cloneCollection({
      sourceDb,
      targetDb,
      collectionName: name,
    });
    console.log(`[clone-mongo] ${name}: ${inserted} documents`);
  }

  console.log("[clone-mongo] Completed successfully.");
} finally {
  await sourceClient.close().catch(() => {});
  await targetClient.close().catch(() => {});
}
