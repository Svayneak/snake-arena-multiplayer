import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const LATEST_LOG_PATH = path.join(DATA_DIR, 'telemetry_latest.json');
const FLIGHT_LOG_PATH = path.join(DATA_DIR, 'telemetry_flight_log.json');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

let writeQueue: Promise<void> = Promise.resolve();

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    writeQueue = writeQueue.then(
      () => task().then(resolve, reject),
      () => task().then(resolve, reject)
    );
  });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    await ensureDataDir();

    await enqueueWrite(async () => {
      // 1. Write the latest snapshot to telemetry_latest.json
      await fs.writeFile(
        LATEST_LOG_PATH,
        JSON.stringify(
          {
            lastUpdated: new Date().toISOString(),
            ...payload
          },
          null,
          2
        ),
        'utf-8'
      );

      // 2. Append to telemetry_flight_log.json
      let existingLog: Array<Record<string, unknown>> = [];
      try {
        const currentContent = await fs.readFile(FLIGHT_LOG_PATH, 'utf-8');
        existingLog = JSON.parse(currentContent);
        if (!Array.isArray(existingLog)) {
          existingLog = [];
        }
      } catch {
        existingLog = [];
      }

      const logEntry = {
        timestamp: payload.timestamp || new Date().toISOString(),
        matchActive: payload.matchActive,
        stats: payload.stats,
        latestSample: payload.latestSample,
        eventsBatch: payload.eventsBatch || [],
        samplesCount: payload.samplesBatch ? payload.samplesBatch.length : 0,
        anomalies: payload.anomaliesBatch || []
      };

      existingLog.push(logEntry);

      // Keep the log manageable (last 300 batches / events)
      if (existingLog.length > 300) {
        existingLog = existingLog.slice(-300);
      }

      await fs.writeFile(FLIGHT_LOG_PATH, JSON.stringify(existingLog, null, 2), 'utf-8');
    });

    return NextResponse.json({
      success: true,
      loggedAt: new Date().toISOString(),
      samplesRecorded: payload.samplesBatch ? payload.samplesBatch.length : 0
    });
  } catch (error: unknown) {
    console.error('Telemetry logger error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureDataDir();
    let latestData = null;
    let logCount = 0;

    try {
      const rawLatest = await fs.readFile(LATEST_LOG_PATH, 'utf-8');
      latestData = JSON.parse(rawLatest);
    } catch {}

    try {
      const rawLog = await fs.readFile(FLIGHT_LOG_PATH, 'utf-8');
      const parsedLog = JSON.parse(rawLog);
      logCount = Array.isArray(parsedLog) ? parsedLog.length : 0;
    } catch {}

    return NextResponse.json({
      status: 'active',
      latest: latestData,
      totalLogEntries: logCount,
      diskPaths: {
        latest: LATEST_LOG_PATH,
        flightLog: FLIGHT_LOG_PATH
      }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
