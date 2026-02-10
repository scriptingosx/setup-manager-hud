/**
 * send-dummy-events.js
 *
 * Generates dummy Setup Manager webhook events and POSTs them to your
 * Setup Manager HUD instance. Useful for verifying the dashboard works
 * after a fresh deploy or for demo purposes.
 *
 * Usage:
 *   WORKER_URL=https://your-worker.your-subdomain.workers.dev node scripts/send-dummy-events.js
 *
 * If WEBHOOK_SECRET is set on your Worker, pass it as an env variable:
 *   WORKER_URL=https://your-worker.your-subdomain.workers.dev \
 *   WEBHOOK_SECRET=your-secret-here \
 *   node scripts/send-dummy-events.js
 *
 * What it does:
 *   - Creates 10 dummy devices with random Mac models and macOS versions
 *   - Sends 70 started events and 70 matching finished events (7 per device)
 *   - Events are spread over the last 3 days so charts have data to display
 *   - ~5% of enrollment actions are randomly marked as "failed"
 */

const WORKER_URL = process.env.WORKER_URL;
if (!WORKER_URL) {
  console.error('Error: WORKER_URL environment variable is required.\n');
  console.error('Usage:');
  console.error('  WORKER_URL=https://your-worker.your-subdomain.workers.dev node scripts/send-dummy-events.js\n');
  process.exit(1);
}
const WEBHOOK_URL = `${WORKER_URL}/webhook`;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || '';

const MODELS = [
  { name: 'MacBook Air', identifier: 'Mac14,2' },
  { name: 'MacBook Pro', identifier: 'Mac15,7' },
  { name: 'iMac', identifier: 'iMac24,1' },
  { name: 'Mac mini', identifier: 'Mac14,3' },
  { name: 'Mac Studio', identifier: 'Mac14,13' }
];

const MACOS = [
  { version: '15.2.0', build: '24C101' },
  { version: '15.1.1', build: '24B91' },
  { version: '15.0.1', build: '24A348' }
];

const ACTION_LABELS = ['Dropbox', 'Jamf Protect', 'Microsoft Defender', 'ChatGPT'];

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function makeSerial(index) {
  return `DUMMY${String(index + 1).padStart(6, '0')}`;
}

function isoAtOffset(minutesAgo) {
  const date = new Date(Date.now() - minutesAgo * 60 * 1000);
  return date.toISOString();
}

function buildStartedPayload(device, timestamp) {
  return {
    name: 'Started',
    event: 'com.jamf.setupmanager.started',
    timestamp,
    started: timestamp,
    modelName: device.modelName,
    modelIdentifier: device.modelIdentifier,
    macOSBuild: device.macOSBuild,
    macOSVersion: device.macOSVersion,
    serialNumber: device.serialNumber,
    setupManagerVersion: '1.2',
    jamfProVersion: device.jamfProVersion
  };
}

function randomThroughput(type) {
  // Returns throughput in bits per second
  // Download: 5-150 Mbps range, Upload: 2-50 Mbps range
  if (type === 'download') {
    return Math.floor((5 + Math.random() * 145) * 1000000);
  } else {
    return Math.floor((2 + Math.random() * 48) * 1000000);
  }
}

function buildFinishedPayload(device, startedTime, durationSeconds) {
  const finishedTime = new Date(new Date(startedTime).getTime() + durationSeconds * 1000).toISOString();
  const actions = ACTION_LABELS.map(label => ({
    label,
    status: Math.random() < 0.05 ? 'failed' : 'finished'
  }));

  return {
    name: 'Finished',
    event: 'com.jamf.setupmanager.finished',
    timestamp: finishedTime,
    started: startedTime,
    finished: finishedTime,
    duration: durationSeconds,
    modelName: device.modelName,
    modelIdentifier: device.modelIdentifier,
    macOSBuild: device.macOSBuild,
    macOSVersion: device.macOSVersion,
    serialNumber: device.serialNumber,
    setupManagerVersion: '1.2',
    jamfProVersion: device.jamfProVersion,
    computerName: `Mac-${device.serialNumber.slice(-4)}`,
    enrollmentActions: actions,
    uploadThroughput: randomThroughput('upload'),
    downloadThroughput: randomThroughput('download')
  };
}

async function sendPayload(payload) {
  const headers = { 'Content-Type': 'application/json' };
  if (WEBHOOK_SECRET) {
    headers['Authorization'] = `Bearer ${WEBHOOK_SECRET}`;
  }

  const response = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed ${payload.event}: ${response.status} ${text}`);
  }
}

async function main() {
  const devices = Array.from({ length: 10 }, (_, index) => {
    const model = randomItem(MODELS);
    const os = randomItem(MACOS);
    return {
      serialNumber: makeSerial(index),
      modelName: model.name,
      modelIdentifier: model.identifier,
      macOSVersion: os.version,
      macOSBuild: os.build,
      jamfProVersion: Math.random() > 0.5 ? '11.13.0' : undefined
    };
  });

  const startedEvents = [];
  const minutesSpan = 3 * 24 * 60;
  const totalStarted = devices.length * 7;
  for (let i = 0; i < totalStarted; i++) {
    const device = devices[i % devices.length];
    const minutesAgo = Math.floor(Math.random() * minutesSpan);
    const timestamp = isoAtOffset(minutesAgo);
    startedEvents.push({ device, timestamp });
  }

  const finishedEvents = startedEvents.map((started, index) => {
    const duration = 45 + (index % 7) * 12;
    return { device: started.device, startedTime: started.timestamp, duration };
  });

  for (const started of startedEvents) {
    const payload = buildStartedPayload(started.device, started.timestamp);
    await sendPayload(payload);
  }

  for (const finished of finishedEvents) {
    const payload = buildFinishedPayload(finished.device, finished.startedTime, finished.duration);
    await sendPayload(payload);
  }

  console.log(`Sent ${startedEvents.length} started and ${finishedEvents.length} finished events to ${WEBHOOK_URL}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
