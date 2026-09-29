const test = require('node:test');
const assert = require('node:assert/strict');
const Calculation = require('../Calculation.js');

test('preparePackets creates a canonical packet header', () => {
  Calculation.config.gridSize = 2;
  Calculation.config.protocol = 'qr';
  Calculation.resetReceiver();

  const packets = Calculation.preparePackets('Hello');

  assert.equal(packets.length, 1);
  assert.equal(packets[0].protocol, 'QR');
  assert.equal(packets[0].gridSize, '2x2');
  assert.equal(packets[0].headerText.startsWith('QR|2x2|1/1|'), true);
  assert.match(packets[0].headerText, /\|[0-9a-fA-F]{8}$/);
});

test('processReceivedPacket ignores checksum metadata while keeping payload text', () => {
  Calculation.resetReceiver();

  const packet = Calculation.preparePackets('Hello')[0];
  const result = Calculation.processReceivedPacket(packet.headerText);

  assert.equal(result.protocol, 'QR');
  assert.equal(result.currentIdx, 1);
  assert.equal(result.totalChunks, 1);
  assert.equal(result.payload, 'Hello');
  assert.equal(result.checksum, packet.checksum);
});

test('processReceivedPacket rejects invalid checksum payloads', () => {
  Calculation.resetReceiver();

  const result = Calculation.processReceivedPacket('QR|2x2|1/1|Hello|deadbeef');
  assert.equal(result, null);
});
