const { randomBytes, randomUUID } = require('crypto');

function formatUuid(bytes, version) {
  bytes[6] = (bytes[6] & 0x0f) | (version << 4);
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Buffer.from(bytes).toString('hex');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function v1() {
  return formatUuid(randomBytes(16), 1);
}

function v4() {
  return typeof randomUUID === 'function' ? randomUUID() : formatUuid(randomBytes(16), 4);
}

module.exports = {
  NIL: '00000000-0000-0000-0000-000000000000',
  v1,
  v4,
};
