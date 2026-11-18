const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
}).outputText, filename);
const { parseICS } = require('../src/lib/ical.ts');
const { normalizeCalendarUrl } = require('../src/lib/calendar-url.ts');
const { fetchCalendar } = require('../src/lib/calendar-fetch.ts');
const feed = body => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\n${body}\r\nEND:VCALENDAR`;
const event = body => `BEGIN:VEVENT\r\n${body}\r\nEND:VEVENT`;

test('webcal is normalized and unsafe URL formats rejected', () => {
  assert.equal(normalizeCalendarUrl(' webcal://example.com/test.ics '), 'https://example.com/test.ics');
  for (const url of ['http://example.com', 'https://user:pass@example.com', 'https://example.com:8080', 'bad']) {
    assert.throws(() => normalizeCalendarUrl(url));
  }
});
test('all-day events retain exclusive checkout and stable identities', () => {
  const raw = feed(event('DTSTART;VALUE=DATE:20261120\r\nDTEND;VALUE=DATE:20261123\r\nSUMMARY:Reserva'));
  const [a] = parseICS(raw), [b] = parseICS(raw);
  assert.equal(a.start.toISOString(), '2026-11-20T12:00:00.000Z');
  assert.equal(a.end.toISOString(), '2026-11-23T12:00:00.000Z');
  assert.equal(a.uid, b.uid);
});
test('cancelled and transparent events do not block availability', () => {
  const body = 'UID:x\r\nDTSTART;VALUE=DATE:20261120\r\nDTEND;VALUE=DATE:20261123\r\n';
  assert.deepEqual(parseICS(feed(event(body + 'STATUS:CANCELLED') + '\r\n' + event(body + 'TRANSP:TRANSPARENT'))), []);
  assert.deepEqual(parseICS(feed('')), []);
});
test('UTC, floating Brazil time and TZID are interpreted correctly', () => {
  for (const [start, expected] of [
    ['DTSTART:20261120T140000Z', '2026-11-20T14:00:00.000Z'],
    ['DTSTART:20261120T140000', '2026-11-20T17:00:00.000Z'],
    ['DTSTART;TZID=America/New_York:20261120T140000', '2026-11-20T19:00:00.000Z'],
  ]) assert.equal(parseICS(feed(event(start)))[0].start.toISOString(), expected);
});
test('invalid or unsupported feeds fail instead of clearing previous blocks', () => {
  for (const raw of ['<html>Login</html>', 'BEGIN:VCALENDAR', feed('BEGIN:VEVENT'),
    feed(event('DTSTART;VALUE=DATE:20260231')),
    feed(event('UID:x')),
    feed(event('DTSTART;VALUE=DATE:20261123\r\nDTEND;VALUE=DATE:20261120')),
    feed(event('DTSTART;VALUE=DATE:20261120\r\nRRULE:FREQ=DAILY')),
  ]) assert.throws(() => parseICS(raw));
});
test('server fetch blocks private network destinations', async () => {
  for (const url of ['https://127.0.0.1/feed', 'https://10.0.0.1/feed', 'https://169.254.169.254/feed']) {
    await assert.rejects(fetchCalendar(url), /público/);
  }
});
