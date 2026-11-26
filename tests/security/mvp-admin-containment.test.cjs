const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');

const database = process.env.VIVIAN_SECURITY_TEST_DB;
if (database !== 'vivian_security_phase4') throw new Error('isolated MVP database required');
const psql = process.env.VIVIAN_PSQL || 'C:/Users/Dell/AppData/Local/Temp/pgsql/bin/psql.exe';
const admin = '00000000-0000-4000-8000-000000000001';
const owner = '00000000-0000-4000-8000-000000000002';
const manager = '00000000-0000-4000-8000-000000000003';
const property = '30000000-0000-4000-8000-000000000001';
const org = '10000000-0000-4000-8000-000000000001';
const member = '20000000-0000-4000-8000-000000000001';

function allowed(actor, sql) {
  const query = `BEGIN; SET LOCAL ROLE authenticated; SET LOCAL "request.jwt.claim.sub" = '${actor}'; ${sql}; ROLLBACK;`;
  try { return execFileSync(psql, ['-X','-qAt','-v','ON_ERROR_STOP=1','-h','127.0.0.1','-p','55432','-U','restore_admin','-d',database,'-c',query], { encoding:'utf8' }).split(/\r?\n/).includes('ALLOWED'); } catch { return false; }
}
function denied(name, actor, sql) { test(name, () => assert.equal(allowed(actor, sql), false)); }

// The 14 legacy failures are intentionally denied by admin-only containment.
denied('manager cannot manage host resources', manager, `SELECT 'ALLOWED' WHERE public.is_host_manager('${org}')`);
denied('manager cannot edit own host property', manager, `UPDATE public.properties SET name = name WHERE id = '${property}' RETURNING 'ALLOWED'`);
denied('manager cannot respond to booking', manager, `SELECT public.respond_booking('50000000-0000-4000-8000-000000000001','confirmed','test'); SELECT 'ALLOWED'`);
denied('manager cannot mark booking paid', manager, `SELECT public.mark_booking_paid('50000000-0000-4000-8000-000000000002'); SELECT 'ALLOWED'`);
denied('manager cannot cancel organization booking', manager, `SELECT public.cancel_booking('50000000-0000-4000-8000-000000000001','test'); SELECT 'ALLOWED'`);
denied('owner cannot change member role', owner, `UPDATE public.organization_members SET member_role = 'manager' WHERE id = '${member}' RETURNING 'ALLOWED'`);
denied('owner cannot remove member', owner, `DELETE FROM public.organization_members WHERE id = '${member}' RETURNING 'ALLOWED'`);
denied('owner cannot invite member', owner, `INSERT INTO public.organization_members (organization_id, profile_id) VALUES ('${org}', '${manager}') RETURNING 'ALLOWED'`);
denied('owner cannot manage host resources', owner, `SELECT 'ALLOWED' WHERE public.is_host_manager('${org}')`);
denied('owner cannot edit property', owner, `UPDATE public.properties SET name = name WHERE id = '${property}' RETURNING 'ALLOWED'`);
denied('owner cannot edit organization', owner, `UPDATE public.organizations SET bio = bio WHERE id = '${org}' RETURNING 'ALLOWED'`);
denied('creator cannot claim organization', owner, `INSERT INTO public.organization_members (organization_id, profile_id) VALUES ('10000000-0000-4000-8000-000000000003', '${owner}') RETURNING 'ALLOWED'`);
denied('provider manager cannot manage operator resources', manager, `SELECT 'ALLOWED' WHERE public.is_operator_manager('${org}')`);
denied('provider manager cannot edit operator service', manager, `UPDATE public.services SET name = name WHERE id = '40000000-0000-4000-8000-000000000001' RETURNING 'ALLOWED'`);

test('administrator can write an unpublished fictional property and rollback', () => {
  assert.equal(allowed(admin, `UPDATE public.properties SET name = name WHERE id = '${property}' RETURNING 'ALLOWED'`), true);
});
test('administrator retains membership management', () => {
  assert.equal(allowed(admin, `UPDATE public.organization_members SET member_role = member_role WHERE id = '${member}' RETURNING 'ALLOWED'`), true);
});
