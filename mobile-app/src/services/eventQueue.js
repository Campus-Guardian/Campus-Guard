import * as SQLite from 'expo-sqlite';
import { mApi } from '../config/api';

let databasePromise;

async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('campusguard.db').then(async (database) => {
      await database.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS sensor_event_queue (
          event_id TEXT PRIMARY KEY NOT NULL,
          device_id TEXT NOT NULL,
          measured_at TEXT NOT NULL,
          payload TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          next_retry_at INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS sensor_event_queue_retry_idx
          ON sensor_event_queue(next_retry_at, created_at);
      `);
      return database;
    });
  }
  return databasePromise;
}

export async function enqueueEvent(event) {
  const database = await getDatabase();
  const createdAt = Date.now();
  await database.runAsync(
    `INSERT OR IGNORE INTO sensor_event_queue
      (event_id, device_id, measured_at, payload, created_at)
      VALUES (?, ?, ?, ?, ?)`,
    event.event_id,
    event.device_id,
    event.measured_at,
    JSON.stringify(event),
    createdAt,
  );
  await database.runAsync(
    'DELETE FROM sensor_event_queue WHERE created_at < ?',
    createdAt - 24 * 60 * 60 * 1000,
  );
  await database.runAsync(`
    DELETE FROM sensor_event_queue
    WHERE event_id IN (
      SELECT event_id FROM sensor_event_queue
      ORDER BY created_at DESC
      LIMIT -1 OFFSET 10000
    )
  `);
}

export async function getQueueSize() {
  const database = await getDatabase();
  const row = await database.getFirstAsync('SELECT COUNT(*) AS count FROM sensor_event_queue');
  return Number(row?.count || 0);
}

export async function flushQueue() {
  const database = await getDatabase();
  const rows = await database.getAllAsync(
    `SELECT event_id, device_id, payload, attempts
     FROM sensor_event_queue
     WHERE next_retry_at <= ?
     ORDER BY created_at ASC
     LIMIT 100`,
    Date.now(),
  );
  if (!rows.length) return { sent: 0 };

  const deviceId = rows[0].device_id;
  const selected = rows.filter((row) => row.device_id === deviceId);
  try {
    await mApi('/v1/sensor-events/batch', {
      method: 'POST',
      body: JSON.stringify({
        device_id: deviceId,
        events: selected.map((row) => {
          const event = JSON.parse(row.payload);
          delete event.device_id;
          return event;
        }),
      }),
    });
    const placeholders = selected.map(() => '?').join(',');
    await database.runAsync(
      `DELETE FROM sensor_event_queue WHERE event_id IN (${placeholders})`,
      ...selected.map((row) => row.event_id),
    );
    return { sent: selected.length };
  } catch (error) {
    await database.withTransactionAsync(async () => {
      for (const row of selected) {
        const attempts = Number(row.attempts || 0) + 1;
        const delay = Math.min(15 * 60 * 1000, 5000 * (2 ** Math.min(attempts, 8)));
        await database.runAsync(
          `UPDATE sensor_event_queue
           SET attempts = ?, next_retry_at = ?
           WHERE event_id = ?`,
          attempts,
          Date.now() + delay,
          row.event_id,
        );
      }
    });
    throw error;
  }
}
