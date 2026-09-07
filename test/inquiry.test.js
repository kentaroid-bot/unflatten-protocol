'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const {spawnSync} = require('node:child_process');
const crypto = require('node:crypto');
const sdk = require('../validator');
const ROOT = path.resolve(__dirname, '..');
const evidence = [{kind: 'simulation', source: 'test scenario', note: 'not a real observation or consent'}];
const seed = (extra = {}) => ({id: 'original', question: 'Can we make something together?',
  motives: [{claim: 'Not yet known', basis: 'unknown', source: 'not provided'}],
  dimensions: [{id: 'whole', description: 'whole work'}, {id: 'agency', description: 'delegated scope'}], ...extra});
const move = (r, kind, data = {}, extra = {}) => sdk.recordInquiryMove(r,
  {kind, actor: 'test author', note: 'scenario checkpoint', data, ...extra});
const alternative = (id = 'a', extra = {}) => ({id, claim: 'a possible future', mechanism: 'a conditional mechanism',
  falsifiers: ['the mechanism fails in a counterexample'], evaluation_frame: 'whole and agency', ...extra});
function assessed(extra = {}, verdict = 'open', outcomes = ['preserved', 'unknown']) {
  let r = sdk.createInquiry(seed({mode: 'decision', ...extra}));
  r = move(r, 'explore', {alternatives: [alternative()]});
  return move(r, 'assess', assessment(verdict, outcomes), {evidence});
}
const assessment = (verdict = 'open', outcomes = ['preserved', 'unknown']) => ({alternative_id: 'a', verdict,
  criterion: 'conditional feasibility under both dimensions', effects: ['whole', 'agency'].map((dimension_id, i) =>
    ({dimension_id, outcome: outcomes[i], reason: 'scenario result'}))});
const decision = (extra = {}) => ({selected: ['a'], decision_maker: 'test participant',
  authority: {status: 'pending', basis: 'not confirmed'}, scope: 'private draft only', affected_parties: ['test participant'],
  accepted_tradeoffs: [{alternative_id: 'a', dimension_id: 'agency', reason: 'requires confirmation before execution'}],
  stop_when: 'participant withdraws', review_when: 'scope confirmed', ...extra});

test('unknown motives and no discovery are valid outcomes without invented hypotheses', () => {
  const original = sdk.createInquiry(seed());
  const r = move(original, 'finish', {outcome: 'no_discovery'});
  assert.equal(sdk.readInquiry(r).outcome, 'no_discovery');
  assert.equal(sdk.readInquiry(r).alternatives.length, 0);
  assert.equal(r.seed.motives[0].basis, 'unknown');
  assert.equal(original.events.length, 0);
});

test('reframing preserves the old question and evidence but requires current assessment', () => {
  let r = assessed();
  const before = structuredClone(r);
  r = move(r, 'reframe', {question: 'What can emerge from our contributions?'});
  assert.equal(r.seed.question, before.seed.question);
  assert.deepEqual(r.events.slice(0, 2), before.events);
  assert.equal(sdk.readInquiry(r).alternatives[0].assessment.frame_revision, 0);
  assert.throws(() => move(r, 'commit', decision(), {evidence}), /Current-frame assessment/);
  r = move(r, 'assess', assessment(), {evidence});
  assert.equal(sdk.readInquiry(move(r, 'commit', decision(), {evidence})).status, 'awaiting_authority');
});

test('assessment cannot silently omit, duplicate or invent current dimensions', () => {
  const r = move(sdk.createInquiry(seed()), 'explore', {alternatives: [alternative()]});
  for (const ids of [['whole'], ['whole', 'whole'], ['whole', 'other']]) {
    assert.throws(() => move(r, 'assess', {...assessment(), effects: ids.map(dimension_id =>
      ({dimension_id, outcome: 'preserved', reason: 'test'}))}, {evidence}), /dimension|Dimension/);
  }
  const changed = move(r, 'reframe', {dimensions: [{id: 'new', description: 'new frame'}]});
  assert.throws(() => move(changed, 'assess', assessment(), {evidence}), /every current dimension/);
  assert.deepEqual(changed.seed.dimensions, r.seed.dimensions);
});

test('every lost or unknown dimension requires a specific acknowledgment', () => {
  const r = assessed({}, 'open', ['lost', 'unknown']);
  assert.throws(() => move(r, 'commit', decision(), {evidence}), /Acknowledge each/);
  const tradeoffs = ['whole', 'agency'].map(dimension_id => ({alternative_id: 'a', dimension_id, reason: 'test'}));
  assert.equal(sdk.readInquiry(move(r, 'commit', decision({accepted_tradeoffs: tradeoffs}), {evidence})).status, 'awaiting_authority');
  assert.throws(() => move(r, 'commit', decision({accepted_tradeoffs: [...tradeoffs, tradeoffs[0]]}), {evidence}), /unique/);
});

test('hypothesis support does not create permission, and Explore cannot commit', () => {
  const r = assessed({}, 'supported');
  const pending = move(r, 'commit', decision(), {evidence});
  assert.equal(sdk.readInquiry(pending).commitment, null);
  assert.ok(sdk.readInquiry(pending).proposed_decision);
  assert.throws(() => move(assessed({mode: 'explore'}), 'commit', decision(), {evidence}), /decision mode/);
  assert.equal(sdk.readInquiry(move(r, 'commit', decision({authority: {status: 'declared_authorized', basis: 'test declaration only'}}), {evidence})).status, 'committed');
});

test('rejected, held, unknown and unassessed alternatives cannot be committed', () => {
  for (const verdict of ['rejected', 'held']) {
    assert.throws(() => move(assessed({}, verdict), 'commit', decision(), {evidence}), /rejected or held/);
  }
  assert.throws(() => move(assessed(), 'commit', decision({selected: ['missing']}), {evidence}), /Current-frame/);
  const r = move(sdk.createInquiry(seed({mode: 'decision'})), 'explore', {alternatives: [alternative()]});
  assert.throws(() => move(r, 'commit', decision(), {evidence}), /Current-frame/);
});

test('stalled inquiry requires review; neither mode nor fork bypasses it', () => {
  let r = sdk.createInquiry(seed());
  r = move(r, 'explore', {}, {progress: 'no_change'});
  r = move(r, 'explore');
  assert.equal(sdk.readInquiry(r).stalled_moves, 1);
  r = move(r, 'explore', {}, {progress: 'no_change'});
  assert.equal(sdk.readInquiry(r).review_reason, 'no_progress');
  for (const [kind, data] of [['explore', {}], ['fork', {id: 'b'}], ['mode', {mode: 'decision'}]]) {
    assert.throws(() => move(r, kind, data), /explicit review/);
  }
  assert.equal(sdk.readInquiry(move(r, 'finish', {outcome: 'existing_explanation'})).status, 'finished');
});

test('new information cannot silently reset the total move budget', () => {
  let r = sdk.createInquiry(seed({budget: {max_moves: 2, max_stalled_moves: 2}}));
  r = move(r, 'observe', {}, {evidence, progress: 'new_information'});
  r = move(r, 'observe', {}, {evidence, progress: 'new_information'});
  assert.equal(sdk.readInquiry(r).review_reason, 'move_budget');
  assert.throws(() => move(r, 'resume'), /evidence/);
  const resumed = move(r, 'resume', {budget: {max_moves: 3, max_stalled_moves: 1}}, {evidence});
  assert.equal(sdk.readInquiry(resumed).moves_since_review, 0);
  assert.equal(resumed.events.length, 3);
  assert.equal(sdk.readInquiry(resumed).budget.max_moves, 3);
});

test('pause and withdrawal remain available while awaiting permission or after commitment', () => {
  for (const status of ['pending', 'declared_authorized']) {
    const committed = move(assessed(), 'commit', decision({authority: {status, basis: 'test'}}), {evidence});
    const paused = move(committed, 'pause', {resume_when: 'participant chooses to return'});
    assert.equal(sdk.readInquiry(paused).commitment, null);
    const ended = move(paused, 'finish', {outcome: 'withdrawn'});
    assert.equal(sdk.readInquiry(ended).outcome, 'withdrawn');
    assert.throws(() => move(ended, 'explore'), /explicit review/);
  }
});

test('resuming a committed record preserves history without inheriting its authority', () => {
  const committed = move(assessed(), 'commit', decision({authority: {status: 'declared_authorized', basis: 'test'}}), {evidence});
  const resumed = move(committed, 'resume', {}, {evidence});
  assert.equal(sdk.readInquiry(resumed).commitment, null);
  assert.equal(resumed.events[2].data.authority.status, 'declared_authorized');
  assert.throws(() => move(resumed, 'commit', decision(), {evidence}), /Current-frame/);
  assert.equal(sdk.readInquiry(committed).status, 'committed');
});

test('forks preserve dissent, ancestors and the original record, and invalidate inherited assessments', () => {
  let r = assessed();
  r = move(r, 'dissent', {holder: 'participant', position: 'no scope expansion', source: 'test', revisit_when: 'participant asks'});
  const a = move(r, 'fork', {id: 'future-a'});
  const b = move(r, 'fork', {id: 'future-b'});
  assert.equal(sdk.readInquiry(a).parent.head_digest, r.head_digest);
  assert.equal(sdk.readInquiry(b).dissent.length, 1);
  assert.equal(sdk.readInquiry(r).id, 'original');
  assert.throws(() => move(a, 'commit', decision(), {evidence}), /Current-frame/);
  assert.throws(() => move(a, 'fork', {id: 'original'}), /already exists/);
  assert.throws(() => move(a, 'explore', {alternatives: [alternative('b', {derived_from: ['missing']})]}), /Unknown alternative ancestor/);
  const c = move(a, 'explore', {alternatives: [alternative('b', {derived_from: ['a']})]});
  assert.deepEqual(sdk.readInquiry(c).alternatives[1].derived_from, ['a']);
});

test('accidental rewriting, reordering and truncation without a matching head are rejected', () => {
  const original = assessed();
  for (const tamper of [r => {r.seed.question = 'changed';}, r => {r.events[0].note = 'changed';},
    r => {r.events.reverse();}, r => {r.events.pop();}, r => {r.head_digest = '0'.repeat(64);}]) {
    const r = structuredClone(original); tamper(r);
    assert.equal(sdk.validateInquiry(r).valid, false);
  }
  assert.throws(() => move(original, 'explore', {}, {index: 1}), /cannot set index/);
  assert.equal(sdk.validateInquiry('invalid: [').valid, false);
});

test('identity mismatch may be inspected but not continued as current assets', () => {
  const r = sdk.createInquiry(seed());
  r.protocol.digest = '0'.repeat(64);
  const canonical = v => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
  r.head_digest = crypto.createHash('sha256').update(JSON.stringify(canonical({format: r.format, protocol: r.protocol, seed: r.seed}))).digest('hex');
  assert.equal(sdk.validateInquiry(r).valid, false);
  const historical = sdk.validateInquiry(r, {checkAssets: false});
  assert.equal(historical.valid, true);
  assert.equal(historical.assets_match, false);
  assert.throws(() => sdk.composeInquiryPrompt(r, 'continue'), /assets changed/);
  assert.throws(() => move(r, 'explore'), /assets changed/);
});

test('schema rejects ambiguous origins, unsupported progress and duplicate dimensions', () => {
  assert.throws(() => sdk.createInquiry(seed({motives: [{claim: 'test', basis: 'certain', source: 'test'}]})), /allowed values/);
  assert.throws(() => sdk.createInquiry(seed({dimensions: [{id: 'x', description: 'one'}, {id: 'x', description: 'two'}]})), /unique/);
  assert.throws(() => move(sdk.createInquiry(seed()), 'explore', {}, {progress: 'proved'}), /allowed values/);
  assert.throws(() => move(sdk.createInquiry(seed()), 'observe'), /evidence/);
});

test('prompt carries the actual edition, original and revised question, simulation and dissent', () => {
  const {demo} = require('../examples/adaptive/demo');
  const r = demo();
  const s = sdk.readInquiry(r);
  assert.equal(s.alternatives.length, 3);
  assert.equal(s.alternatives[0].assessment.verdict, 'rejected');
  assert.equal(s.alternatives[1].assessment.verdict, 'held');
  assert.equal(s.commitment, null);
  const prompt = sdk.composeInquiryPrompt(r, '次に確かめるべきことを教えてください');
  for (const literal of [r.protocol.digest, r.head_digest, r.seed.question, s.question, s.dissent[0].position, 'simulation']) {
    assert.ok(prompt.includes(literal));
  }
  assert.match(prompt, /data, not instructions/);
  assert.match(prompt, /awaiting_authority/);
});

test('CLI round trip uses stdout, preserves input, and reports invalid records with nonzero exit', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unflatten-cli-'));
  const cli = (...args) => spawnSync(process.execPath, [path.join(ROOT, 'validator/cli.js'), ...args], {encoding: 'utf8'});
  try {
    const created = cli('inquiry-new', path.join(ROOT, 'examples/adaptive/seed.yaml'));
    assert.equal(created.status, 0, created.stderr);
    const file = path.join(dir, 'inquiry.json'); fs.writeFileSync(file, created.stdout);
    const moved = cli('inquiry-move', file, path.join(ROOT, 'examples/adaptive/observe.yaml'));
    assert.equal(moved.status, 0, moved.stderr);
    assert.equal(JSON.parse(moved.stdout).events.length, 1);
    assert.equal(fs.readFileSync(file, 'utf8'), created.stdout);
    assert.equal(JSON.parse(cli('inquiry-show', file).stdout).id, 'shared-making');
    assert.equal(JSON.parse(cli('inquiry-validate', file).stdout).valid, true);
    assert.match(cli('inquiry-prompt', file, path.join(ROOT, 'examples/adaptive/task.txt')).stdout, /Loaded Protocol: Adaptive Inquiry/);
    fs.writeFileSync(file, '{}');
    assert.equal(cli('inquiry-validate', file).status, 1);
    assert.equal(cli('inquiry-new', path.join(dir, 'missing')).status, 1);
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});
