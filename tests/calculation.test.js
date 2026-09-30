const test = require('node:test');
const assert = require('node:assert/strict');
const Calculation = require('../Calculation.js');

test('preparePackets creates a canonical packet header with escaped payload', () => {
  Calculation.config.gridSize = 2;
  Calculation.config.protocol = 'qr';
  Calculation.resetReceiver();

  const packets = Calculation.preparePackets('Hello|World');

  assert.equal(packets.length, 1);
  assert.equal(packets[0].protocol, 'QR');
  assert.equal(packets[0].gridSize, '2x2');
  assert.equal(packets[0].headerText.startsWith('QR|2x2|1/1|'), true);
  assert.ok(!packets[0].headerText.includes('|Hello|World|'));
  assert.match(packets[0].headerText, /\|[0-9a-fA-F]{8}$/);
});

test('processReceivedPacket restores escaped payload text', () => {
  Calculation.resetReceiver();

  const packet = Calculation.preparePackets('Hello|World')[0];
  const result = Calculation.processReceivedPacket(packet.headerText);

  assert.equal(result.protocol, 'QR');
  assert.equal(result.currentIdx, 1);
  assert.equal(result.totalChunks, 1);
  assert.equal(result.payload, 'Hello|World');
  assert.equal(result.checksum, packet.checksum);
});

test('processReceivedPacket rejects invalid checksum payloads', () => {
  Calculation.resetReceiver();

  const result = Calculation.processReceivedPacket('QR|2x2|1/1|Hello%7CWorld|deadbeef');
  assert.equal(result, null);
});

test('processReceivedPacket ignores duplicate chunks from repeated reads', () => {
  Calculation.resetReceiver();

  const packet = Calculation.preparePackets('Hello World')[0];
  const first = Calculation.processReceivedPacket(packet.headerText);
  const second = Calculation.processReceivedPacket(packet.headerText);

  assert.equal(first.isNew, true);
  assert.equal(second.isNew, false);
  assert.equal(second.reason, 'duplicate');
});

test('getProgressSummary reports missing chunks for retry-oriented recovery', () => {
  Calculation.config.chunkSize = 2;
  Calculation.config.gridSize = 2;
  Calculation.config.protocol = 'qr';
  Calculation.resetReceiver();

  const packets = Calculation.preparePackets('ABCDEF');
  Calculation.processReceivedPacket(packets[0].headerText);
  Calculation.processReceivedPacket(packets[2].headerText);

  const summary = Calculation.getProgressSummary();

  assert.equal(summary.receivedCount, 2);
  assert.equal(summary.totalChunks, 3);
  assert.equal(summary.missingCount, 1);
  assert.deepEqual(summary.missingIndexes, [2]);
});

test('buildRetryQueue prioritizes missing chunks and duplicates are skipped', () => {
  Calculation.config.chunkSize = 2;
  Calculation.config.gridSize = 2;
  Calculation.config.protocol = 'qr';
  Calculation.resetReceiver();

  const packets = Calculation.preparePackets('ABCDEF');
  Calculation.processReceivedPacket(packets[0].headerText);
  Calculation.processReceivedPacket(packets[2].headerText);

  const retryQueue = Calculation.buildRetryQueue();

  assert.deepEqual(retryQueue, [2]);
});

test('getRetryStatus identifies the next retry target', () => {
  Calculation.config.chunkSize = 2;
  Calculation.config.gridSize = 2;
  Calculation.config.protocol = 'qr';
  Calculation.resetReceiver();

  const packets = Calculation.preparePackets('ABCDEF');
  Calculation.processReceivedPacket(packets[0].headerText);
  Calculation.processReceivedPacket(packets[2].headerText);

  const status = Calculation.getRetryStatus();

  assert.equal(status.isRetryRequired, true);
  assert.equal(status.nextRetryIndex, 2);
  assert.deepEqual(status.retryQueue, [2]);
});
