const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
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
  ]) assert.throws(() => parseICS(raw));
});

const now = new Date('2026-11-18T12:00:00Z');
test('timezone recurrence rules alone do not make a calendar unsupported', () => {
  const timezone = 'BEGIN:VTIMEZONE\r\nTZID:America/New_York\r\nBEGIN:STANDARD\r\nDTSTART:19701101T020000\r\nTZOFFSETFROM:-0400\r\nTZOFFSETTO:-0500\r\nRRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU\r\nEND:STANDARD\r\nEND:VTIMEZONE';
  const result = parseICS(feed(timezone + '\r\n' + event('UID:single\r\nDTSTART;VALUE=DATE:20261120\r\nDTEND;VALUE=DATE:20261123')), now);
  assert.equal(result.length, 1);
  assert.equal(result[0].uid, 'single');
});
test('weekly recurrence honors exclusions, additions, and exclusive checkout', () => {
  const raw = feed(event('UID:weekly\r\nDTSTART;VALUE=DATE:20261120\r\nDTEND;VALUE=DATE:20261122\r\nRRULE:FREQ=WEEKLY;COUNT=3\r\nEXDATE;VALUE=DATE:20261127\r\nRDATE;VALUE=DATE:20261205'));
  const result = parseICS(raw, now);
  assert.deepEqual(result.map(e => e.start.toISOString().slice(0, 10)), ['2026-11-20', '2026-12-04', '2026-12-05']);
  assert.equal(result[0].end.toISOString(), '2026-11-22T12:00:00.000Z');
  assert.deepEqual(result.map(e => e.uid), parseICS(raw, now).map(e => e.uid));
});
test('moved and cancelled instances replace their original occurrences', () => {
  const master = event('UID:series\r\nDTSTART;VALUE=DATE:20261120\r\nDTEND;VALUE=DATE:20261122\r\nRRULE:FREQ=WEEKLY;COUNT=3');
  const moved = event('UID:series\r\nRECURRENCE-ID;VALUE=DATE:20261127\r\nDTSTART;VALUE=DATE:20261128\r\nDTEND;VALUE=DATE:20261130');
  const cancelled = event('UID:series\r\nRECURRENCE-ID;VALUE=DATE:20261204\r\nDTSTART;VALUE=DATE:20261204\r\nDTEND;VALUE=DATE:20261206\r\nSTATUS:CANCELLED');
  const result = parseICS(feed([master, moved, cancelled].join('\r\n')), now);
  assert.deepEqual(result.map(e => e.start.toISOString().slice(0, 10)), ['2026-11-20', '2026-11-28']);
  assert.equal(new Set(result.map(e => e.uid)).size, 2);
  assert.match(result[1].uid, /2026-11-27/);
});
test('timed recurrences preserve local clock through daylight saving', () => {
  const result = parseICS(feed(event('UID:dst\r\nDTSTART;TZID=America/New_York:20261025T140000\r\nDTEND;TZID=America/New_York:20261025T160000\r\nRRULE:FREQ=WEEKLY;COUNT=3')), now);
  assert.deepEqual(result.map(e => e.start.toISOString()), ['2026-10-25T18:00:00.000Z', '2026-11-01T19:00:00.000Z', '2026-11-08T19:00:00.000Z']);
});
test('unbounded recurrences stop at the rolling three-year horizon', () => {
  const result = parseICS(feed(event('UID:infinite\r\nDTSTART;VALUE=DATE:20261120\r\nDTEND;VALUE=DATE:20261121\r\nRRULE:FREQ=DAILY')), now);
  assert.ok(result.length > 1000 && result.length < 1100);
  assert.ok(result.every(e => e.start < new Date('2029-11-18T12:00:00Z')));
});
test('cancelled exceptions may omit DTSTART and DTEND', () => {
  const master = event('UID:cancel\r\nDTSTART;VALUE=DATE:20261120\r\nDTEND;VALUE=DATE:20261121\r\nRRULE:FREQ=DAILY;COUNT=2');
  const cancelled = event('UID:cancel\r\nRECURRENCE-ID;VALUE=DATE:20261121\r\nSTATUS:CANCELLED');
  assert.equal(parseICS(feed(master + '\r\n' + cancelled), now).length, 1);
});
test('UTC exception identities match a series using a named timezone', () => {
  const master = event('UID:utc-exception\r\nDTSTART;TZID=America/Sao_Paulo:20261120T140000\r\nDTEND;TZID=America/Sao_Paulo:20261120T160000\r\nRRULE:FREQ=DAILY;COUNT=2');
  const moved = event('UID:utc-exception\r\nRECURRENCE-ID:20261121T170000Z\r\nDTSTART:20261121T180000Z\r\nDTEND:20261121T200000Z');
  const result = parseICS(feed(master + '\r\n' + moved), now);
  assert.equal(result.length, 2);
  assert.equal(result[1].start.toISOString(), '2026-11-21T18:00:00.000Z');
});
test('server fetch blocks private network destinations', async () => {
  for (const url of ['https://127.0.0.1/feed', 'https://10.0.0.1/feed', 'https://169.254.169.254/feed']) {
    await assert.rejects(fetchCalendar(url), /público/);
  }
});
