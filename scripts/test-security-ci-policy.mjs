import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

// Execute the actual reviewed inline program, rather than a second policy implementation.
const workflow = readFileSync(new URL('../.github/workflows/security-checks.yml', import.meta.url), 'utf8').replaceAll('\r', '');
function between(start, end) {
  const first = workflow.indexOf(start), last = workflow.indexOf(end);
  assert.ok(first >= 0 && last > first, 'required fixed policy block missing');
  return workflow.slice(first + start.length, last).replace(/^ {10}/gm, '').trim();
}
const program = between('// BEGIN PUBLIC_CI_ADMISSION', '// END PUBLIC_CI_ADMISSION');
const { admissionExit, REPOSITORY } = await import('data:text/javascript;base64,' + Buffer.from(program).toString('base64'));
const base = {
  CI_REPOSITORY: REPOSITORY, CI_REPOSITORY_OWNER: 'takaiba', CI_EVENT: 'pull_request',
  CI_REF: 'refs/pull/14/merge', CI_SHA: 'a'.repeat(40), CI_BASE_REF: 'main',
  CI_WORKFLOW_REF: REPOSITORY + '/.github/workflows/security-ci.yml@refs/pull/14/merge',
  CI_HEAD_REPOSITORY: REPOSITORY, CI_TRIGGERING_ACTOR: 'p0x0q', GH_TOKEN: 'unit-fixture-only',
};
function response(permission = 'write', login = 'p0x0q', status = 200) {
  return { status, json: async () => ({ permission, user: { login } }) };
}
test('live writer/admin permission admits original and other trusted collaborators', async () => {
  for (const actor of ['p0x0q', 'barabicu']) for (const permission of ['write', 'maintain', 'admin']) {
    let calls = 0;
    const result = await admissionExit({ ...base, CI_TRIGGERING_ACTOR: actor }, async (url, options) => {
      calls++;
      assert.equal(url, 'https://api.github.com/repos/' + REPOSITORY + '/collaborators/' + actor + '/permission');
      assert.equal(options.method, 'GET');
      assert.equal(options.redirect, 'error');
      return response(permission, actor);
    });
    assert.equal(result.code, 0); assert.equal(calls, 1);
  }
});
test('source/repository/event/head/ref/workflow mismatches fail before any API or source execution', async () => {
  for (const patch of [
    { CI_REPOSITORY: 'other/repo' }, { CI_REPOSITORY_OWNER: 'other' },
    { CI_EVENT: 'pull_request_target' }, { CI_EVENT: 'push' }, { CI_EVENT: 'schedule' },
    { CI_BASE_REF: 'release' }, { CI_HEAD_REPOSITORY: 'external/fork' },
    { CI_REF: 'refs/heads/main' }, { CI_REF: 'refs/pull/14/head' },
    { CI_SHA: 'not-a-sha' }, { CI_WORKFLOW_REF: REPOSITORY + '/.github/workflows/other.yml@refs/pull/14/merge' },
    { CI_WORKFLOW_REF: REPOSITORY + '/.github/workflows/security-ci.yml@refs/heads/main' },
    { CI_TRIGGERING_ACTOR: '../../arbitrary/path' }, { GH_TOKEN: '' },
  ]) {
    let calls = 0;
    const result = await admissionExit({ ...base, ...patch }, async () => { calls++; return response(); });
    assert.equal(result.code, 1, JSON.stringify(patch));
    assert.match(result.message, /Security verification blocked/);
    assert.equal(calls, 0);
  }
});
test('dispatch is restricted to reviewed main/setup branch, with the exact caller ref', async () => {
  for (const ref of ['refs/heads/main', 'refs/heads/codex/27978-selfhosted-linux', 'refs/heads/other', 'refs/tags/main']) {
    const result = await admissionExit({ ...base, CI_EVENT: 'workflow_dispatch', CI_REF: ref,
      CI_WORKFLOW_REF: REPOSITORY + '/.github/workflows/security-ci.yml@' + ref }, async () => response());
    assert.equal(result.code, ['refs/heads/main', 'refs/heads/codex/27978-selfhosted-linux'].includes(ref) ? 0 : 1);
  }
});
test('permission lookup is live and fails closed on revoked/read/unknown roles, mismatched actor, network and API errors', async () => {
  const requests = [
    async () => response('read'), async () => response('none'), async () => response('triage'),
    async () => response('arbitrary-custom-role'), async () => response('admin', 'different-user'),
    async () => response('admin', 'p0x0q', 403), async () => response('admin', 'p0x0q', 404),
    async () => response('admin', 'p0x0q', 500), async () => { throw new Error('network-secret-must-not-leak'); },
    async () => ({ status: 200, json: async () => { throw new Error('malformed'); } }),
  ];
  for (const request of requests) {
    const result = await admissionExit(base, request);
    assert.equal(result.code, 1); assert.match(result.message, /blocked/);
    assert.ok(!result.message.includes('network-secret'));
  }
  assert.equal((await admissionExit(base, async () => response('write'))).code, 0);
  assert.equal((await admissionExit(base, async () => response('read'))).code, 1, 'no cached prior permission');
});
test('aggregate requires all five successes; skipped, refused and cancelled security jobs never pass', () => {
  const script = between('# BEGIN SECURITY_RESULT', '# END SECURITY_RESULT');
  const good = Object.fromEntries(Array.from({ length: 5 }, (_, i) => ['RESULT_' + i, 'success']));
  assert.equal(spawnSync('bash', ['-c', script], { env: { ...process.env, ...good } }).status, 0);
  for (let i = 0; i < 5; i++) for (const state of ['skipped', 'failure', 'cancelled', '']) {
    const result = spawnSync('bash', ['-c', script], { env: { ...process.env, ...good, ['RESULT_' + i]: state } });
    assert.equal(result.status, 1);
  }
});
test('fixed reusable has no caller-controlled runner/source inputs and gates every checkout behind admission', () => {
  assert.ok(!workflow.includes('inputs:'));
  assert.equal((workflow.match(/runs-on: \{ group: public-ci-trusted, labels: \[linux-vm\] \}/g) ?? []).length, 6);
  assert.equal((workflow.match(/    needs: admission/g) ?? []).length, 4);
  assert.equal((workflow.match(/persist-credentials: false/g) ?? []).length, 4);
  const admissionJob = workflow.slice(workflow.indexOf('  admission:'), workflow.indexOf('  frontend:'));
  assert.ok(!admissionJob.includes('checkout@') && !admissionJob.includes('uses:'));
  assert.ok(!program.includes('${{'), 'GitHub metadata must enter through environment, never executable source');
  assert.ok(workflow.includes('    if: ${{ always() }}'));
});
