/**
 * FRADI Drip Planner — IndexedDB Storage Layer
 *
 * Offline-first persistent storage via idb library
 * Stores intake answers + generated designs locally on the device
 */

import { openDB } from 'https://esm.sh/idb';

const DB_NAME = 'FRADI_Drip_Planner';
const STORE_NAME = 'designs';
const DB_VERSION = 1;

let dbPromise = null;

async function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          // Index for reverse-chronological retrieval (newest first)
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      }
    });
  }
  return dbPromise;
}

/**
 * Save a complete design record: intake answers + generated design output
 * record = { id, timestamp, answers, design }
 * Returns: the saved record with id and timestamp
 */
export async function saveRecord(record) {
  if (!record.id) {
    record.id = crypto.randomUUID();
  }
  if (!record.timestamp) {
    record.timestamp = Date.now();
  }

  const db = await getDB();
  await db.put(STORE_NAME, record);
  return record;
}

/**
 * Load a single record by ID
 */
export async function loadRecord(id) {
  const db = await getDB();
  return db.get(STORE_NAME, id);
}

/**
 * List all records in reverse-chronological order (newest first)
 * Returns: array of { id, timestamp, answers, design }
 */
export async function listRecords() {
  const db = await getDB();
  const allRecords = await db.getAllFromIndex(STORE_NAME, 'timestamp');
  // Reverse to get newest first
  return allRecords.reverse();
}

/**
 * Delete a record by ID
 */
export async function deleteRecord(id) {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
}

/**
 * Clear all records (emergency only)
 */
export async function clearAllRecords() {
  const db = await getDB();
  await db.clear(STORE_NAME);
}

/**
 * Get a summary for the home screen: id, timestamp, gardener name, plot size
 */
export async function getRecordSummary(id) {
  const record = await loadRecord(id);
  if (!record) return null;
  return {
    id: record.id,
    timestamp: record.timestamp,
    gardenerName: record.answers.confirm.name,
    plotArea: record.design.plot.area_m2,
    cropCount: record.design.beds.length,
    dailyWater: record.design.daily_water_l
  };
}

/**
 * Get summaries for all records (for listing on home screen)
 */
export async function getAllRecordSummaries() {
  const records = await listRecords();
  return records.map(r => ({
    id: r.id,
    timestamp: r.timestamp,
    gardenerName: r.answers.confirm.name,
    plotArea: r.design.plot.area_m2,
    cropCount: r.design.beds.length,
    dailyWater: r.design.daily_water_l
  }));
}
