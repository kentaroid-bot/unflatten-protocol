'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const sdk = require('../validator');
const YAML = require('yaml');

const ROOT = path.resolve(__dirname, '..');

test('loads every registered role', () => {
  const roles = sdk.listRoles();
  assert.ok(roles.length >= 9);
  for (const role of roles) {
    const prompt = sdk.loadRole(role.alias);
    assert.match(prompt, /Purpose/u);
  }
});

test('resolves canonical and alternate aliases', () => {
  assert.equal(sdk.resolveRole('@ino').name, 'innovator');
  assert.equal(sdk.resolveRole('@out').name, 'exit-designer');
  assert.throws(() => sdk.resolveRole('@lin'), /Unknown role/u);
});

test('loads lineage steward only through its guest worldline', () => {
  const worldlines = sdk.listWorldlines();
  assert.deepEqual(worldlines.map((entry) => entry.id), ['epistemic-lineage-v2']);
  const role = sdk.resolveWorldlineRole('epistemic-lineage-v2', '@lin');
  assert.equal(role.authority, 'advisory_observation');
  const prompt = sdk.loadWorldlineRole('epistemic-lineage-v2', '@lin');
  assert.match(prompt, /Generative Equivalence Is Not Semantic Equivalence/u);
  assert.match(prompt, /Origin Boundary/u);
  assert.match(prompt, /basis.*author_confirmed.*direct_record.*inferred.*unknown/u);
  assert.match(prompt, /pre_ingress_status.*observed.*compressed.*unknown.*not_applicable/u);
  assert.match(prompt, /decision\.authority.*advisory_observation/u);
  assert.match(prompt, /Parallel Runを開始、延長、終了する権限/u);
});

test('composes a guest prompt without replacing the stable host protocol', () => {
  const prompt = sdk.composeWorldlineRolePrompt(
    'epistemic-lineage-v2',
    '@lin',
    '動機系譜を追跡する。'
  );
  assert.match(prompt, /# Stable Host Protocol/u);
  assert.match(prompt, /# Guest Worldline Boundary/u);
  assert.match(prompt, /Generation: 1\/3/u);
  assert.match(prompt, /Authority: advisory_observation/u);
});

test('advances only complete generations and requires review at generation three', () => {
  const initial = sdk.resolveWorldline('epistemic-lineage-v2');
  delete initial.manifest;
  delete initial.root;
  assert.throws(
    () => sdk.advanceWorldline(initial, { roles_completed: ['innovator'], evidence: ['partial'] }),
    /requires innovator, auditor, and integrator/u
  );
  const second = sdk.advanceWorldline(initial, {
    roles_completed: ['innovator', 'auditor', 'integrator'],
    evidence: ['generation-2']
  });
  assert.equal(second.lineage_generation, 2);
  assert.equal(second.status, 'active');
  const third = sdk.advanceWorldline(second, {
    roles_completed: ['innovator', 'auditor', 'integrator'],
    evidence: ['generation-3']
  });
  assert.equal(third.lineage_generation, 3);
  assert.equal(third.status, 'review_required');
  assert.throws(
    () => sdk.advanceWorldline(third, {
      roles_completed: ['innovator', 'auditor', 'integrator'],
      evidence: ['generation-4']
    }),
    /cannot advance|generation limit/u
  );
});

test('spin-out preserves immutable parent provenance', () => {
  const initial = sdk.resolveWorldline('epistemic-lineage-v2');
  delete initial.manifest;
  delete initial.root;
  const second = sdk.advanceWorldline(initial, {
    roles_completed: ['innovator', 'auditor', 'integrator'],
    evidence: ['generation-2']
  });
  const third = sdk.advanceWorldline(second, {
    roles_completed: ['innovator', 'auditor', 'integrator'],
    evidence: ['generation-3']
  });
  assert.throws(
    () => sdk.decideWorldline(third, 'spin_out', {}),
    /Integrator operational_decision/u
  );
  const spunOut = sdk.decideWorldline(third, 'spin_out', {
    authority: 'operational_decision',
    decided_by: 'integrator',
    rationale: '評価文法がstableと非通約なため独立させる。',
    evidence: ['integrator-generation-3.yaml'],
    repository: 'https://github.com/kentaroid-bot/epistemic-lineage-protocol',
    divergence_reason: '評価文法がstableと非通約である。'
  });
  assert.equal(spunOut.status, 'spun_out');
  assert.equal(spunOut.spin_out.parent_commit, initial.parent.commit);
  assert.equal(spunOut.review.decisions.at(-1).outcome, 'spin_out');
  assert.equal(sdk.validate('worldline', spunOut).valid, true);
});

test('allows one bounded review extension without creating generation four', () => {
  const initial = sdk.resolveWorldline('epistemic-lineage-v2');
  delete initial.manifest;
  delete initial.root;
  const second = sdk.advanceWorldline(initial, {
    roles_completed: ['innovator', 'auditor', 'integrator'],
    evidence: ['generation-2']
  });
  const third = sdk.advanceWorldline(second, {
    roles_completed: ['innovator', 'auditor', 'integrator'],
    evidence: ['generation-3']
  });
  assert.throws(() => sdk.decideWorldline(third, 'extend_once', {
    authority: 'advisory_observation',
    decided_by: 'epistemic-lineage-steward',
    rationale: 'もっと観測したい。',
    evidence: ['lineage-request.md']
  }), /Integrator operational_decision/u);
  const extended = sdk.decideWorldline(third, 'extend_once', {
    authority: 'operational_decision',
    decided_by: 'integrator',
    rationale: '第三世代内で追加観測を一回だけ行う。',
    evidence: ['integrator-extension.yaml']
  });
  assert.equal(extended.lineage_generation, 3);
  assert.equal(extended.status, 'active');
  assert.equal(extended.review.extensions_used, 1);
  assert.throws(() => sdk.advanceWorldline(extended, {
    roles_completed: ['innovator', 'auditor', 'integrator'],
    evidence: ['not-generation-4']
  }), /generation limit/u);
  const reviewed = sdk.completeWorldlineExtension(extended, ['extended-observation']);
  assert.equal(reviewed.status, 'review_required');
  assert.equal(reviewed.lineage_generation, 3);
  assert.equal(reviewed.review.decisions.length, 1);
  assert.equal(reviewed.review.decisions[0].outcome, 'extend_once');
  const archived = sdk.decideWorldline(reviewed, 'archive', {
    authority: 'operational_decision',
    decided_by: 'integrator',
    rationale: '追加観測後も昇格条件を満たさないが、系譜価値を残す。',
    evidence: ['integrator-final.yaml']
  });
  assert.deepEqual(archived.review.decisions.map((decision) => decision.outcome), ['extend_once', 'archive']);
  assert.throws(() => sdk.decideWorldline(reviewed, 'extend_once', {
    authority: 'operational_decision',
    decided_by: 'integrator',
    rationale: '二回目の延長。',
    evidence: ['not-allowed.yaml']
  }), /extension limit/u);
});

test('worldline schemas reject namespace escape and incomplete cycles', () => {
  const registry = JSON.parse(fs.readFileSync(path.join(ROOT, 'worldlines/registry.json'), 'utf8'));
  registry.worldlines.hostile = { manifest: '../outside.json' };
  assert.equal(sdk.validate('worldline-registry', registry).valid, false);

  const guest = sdk.resolveWorldline('epistemic-lineage-v2');
  delete guest.manifest;
  delete guest.root;
  guest.roles['epistemic-lineage-steward'].template = '../auditor.md';
  assert.equal(sdk.validate('worldline', guest).valid, false);
  guest.roles['epistemic-lineage-steward'].template = 'epistemic-lineage-steward.md';
  guest.generation_records[0].roles_completed = ['innovator', 'auditor'];
  assert.equal(sdk.validate('worldline', guest).valid, false);

  const premature = sdk.resolveWorldline('epistemic-lineage-v2');
  delete premature.manifest;
  delete premature.root;
  premature.status = 'promoted';
  assert.equal(sdk.validate('worldline', premature).valid, false);

  const validGuest = sdk.resolveWorldline('epistemic-lineage-v2');
  delete validGuest.manifest;
  delete validGuest.root;
  const third = sdk.advanceWorldline(sdk.advanceWorldline(validGuest, {
    roles_completed: ['innovator', 'auditor', 'integrator'],
    evidence: ['generation-2']
  }), {
    roles_completed: ['innovator', 'auditor', 'integrator'],
    evidence: ['generation-3']
  });
  third.status = 'promoted';
  assert.equal(sdk.validate('worldline', third).valid, false);
});

test('validates the canonical YAML handoff fixture', () => {
  const source = fs.readFileSync(path.join(ROOT, 'fixtures/handoff.valid.yaml'), 'utf8');
  const result = sdk.validate('handoff', source);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(result.findings, []);
});

test('loads and composes the pre-role Greenfield Ingress contract', () => {
  const contract = sdk.loadIngressContract();
  assert.match(contract, /Greenfield Ingress/u);
  assert.match(contract, /role選択前/u);

  const prompt = sdk.composeIngressPrompt('入口状態を判定する。', {
    context: '既知のproject context',
    record: { ingress: { state: 'query_required' } }
  });
  assert.match(prompt, /# Loaded Protocol/u);
  assert.match(prompt, /# Greenfield Ingress Contract/u);
  assert.match(prompt, /# Machine-readable Ingress Schema/u);
  assert.match(prompt, /ingress-record\.schema/u);
  assert.match(prompt, /# Existing Ingress Record/u);
  assert.match(prompt, /# Known Context/u);
  assert.match(prompt, /# Current Task/u);
  assert.doesNotMatch(prompt, /# Loaded Role/u);
  assert.ok(prompt.indexOf('# Greenfield Ingress Contract') < prompt.indexOf('# Machine-readable Ingress Schema'));
  assert.ok(prompt.indexOf('# Machine-readable Ingress Schema') < prompt.indexOf('# Known Context'));
});

test('validates Greenfield Ingress states without claiming motive authenticity', () => {
  const source = fs.readFileSync(path.join(ROOT, 'fixtures/ingress.valid.yaml'), 'utf8');
  const valid = sdk.validate('ingress-record', source);
  assert.equal(valid.valid, true, JSON.stringify(valid.errors));

  const readyWithoutMotive = structuredClone(valid.value);
  readyWithoutMotive.ingress.motive_record.status = 'unknown';
  readyWithoutMotive.ingress.motive_record.claims = [];
  assert.equal(sdk.validate('ingress-record', readyWithoutMotive).valid, false);

  const readyWithUnknownBasis = structuredClone(valid.value);
  readyWithUnknownBasis.ingress.motive_record.claims[0].basis = 'unknown';
  delete readyWithUnknownBasis.ingress.motive_record.claims[0].confirmed_by;
  delete readyWithUnknownBasis.ingress.motive_record.claims[0].confirmed_at;
  assert.equal(sdk.validate('ingress-record', readyWithUnknownBasis).valid, false);

  const deferredOutcome = structuredClone(valid.value);
  deferredOutcome.ingress.outcome_envelope = { status: 'deferred' };
  assert.equal(sdk.validate('ingress-record', deferredOutcome).valid, true);

  const emptyPartialOutcome = structuredClone(valid.value);
  emptyPartialOutcome.ingress.outcome_envelope = { status: 'partial' };
  assert.equal(sdk.validate('ingress-record', emptyPartialOutcome).valid, false);
  emptyPartialOutcome.ingress.outcome_envelope.purpose = '観測済みの目的だけを保持する。';
  assert.equal(sdk.validate('ingress-record', emptyPartialOutcome).valid, true);

  const incompleteSpecifiedOutcome = structuredClone(valid.value);
  incompleteSpecifiedOutcome.ingress.outcome_envelope = { status: 'specified' };
  assert.equal(sdk.validate('ingress-record', incompleteSpecifiedOutcome).valid, false);

  const incompleteQuery = structuredClone(valid.value);
  incompleteQuery.ingress.state = 'query_required';
  incompleteQuery.ingress.motive_record.status = 'unknown';
  incompleteQuery.ingress.motive_record.claims = [];
  incompleteQuery.ingress.query = { status: 'pending', missing_fields: [] };
  assert.equal(sdk.validate('ingress-record', incompleteQuery).valid, false);

  const incompleteException = structuredClone(valid.value);
  incompleteException.ingress.state = 'safety_exception_logged';
  incompleteException.ingress.motive_record.status = 'unknown';
  incompleteException.ingress.motive_record.claims = [];
  incompleteException.ingress.query = { status: 'unavailable', missing_fields: ['generative_tension'] };
  assert.equal(sdk.validate('ingress-record', incompleteException).valid, false);

  const unsafeNoFollowUp = structuredClone(incompleteException);
  unsafeNoFollowUp.ingress.exception = {
    reason: '緊急の危害停止を優先する。',
    recorded_at: '2026-09-06T00:00:00Z',
    follow_up_required: false
  };
  assert.equal(sdk.validate('ingress-record', unsafeNoFollowUp).valid, false);
  unsafeNoFollowUp.ingress.exception.follow_up_required = true;
  assert.equal(sdk.validate('ingress-record', unsafeNoFollowUp).valid, true);

  const pluralRecord = structuredClone(valid.value);
  pluralRecord.ingress.motive_record.status = 'redacted';
  pluralRecord.ingress.motive_record.claims.push({
    id: 'restricted-origin',
    original_question: '非公開資料にある別の生成起点をどう保持するか。',
    generative_tension: '公開可能性と系譜保存が衝突する。',
    source_fragments: [{
      reference: 'restricted://motive/second-origin',
      disclosure: 'restricted_reference',
      provenance: 'private archive index'
    }],
    desired_difference: '異なる動機を平均化せず、非公開のまま並置する。',
    basis: 'direct_record',
    disclosure: 'restricted_reference',
    provenance: 'private archive index'
  });
  assert.equal(sdk.validate('ingress-record', pluralRecord).valid, true);
});

test('validates the protocol manifest and every registered path exists', () => {
  const result = sdk.validate('protocol-manifest', sdk.manifest);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  const paths = [
    sdk.manifest.protocol,
    sdk.manifest.ingress,
    sdk.manifest.handoff,
    ...Object.values(sdk.manifest.roles).map((role) => role.template),
    ...Object.values(sdk.manifest.engines),
    ...Object.values(sdk.manifest.schemas),
    sdk.manifest.worldlines
  ];
  for (const relativePath of paths) {
    assert.equal(fs.existsSync(path.join(ROOT, relativePath)), true, relativePath);
  }
});

test('rejects replace without learned structure and pivot seeds', () => {
  const source = fs.readFileSync(path.join(ROOT, 'fixtures/handoff.valid.yaml'), 'utf8');
  const parsed = sdk.validate('handoff', source).value;
  parsed.handoff.decision.status = 'replace';
  const result = sdk.validate('handoff', parsed);
  assert.equal(result.valid, false);
  assert.ok(result.findings.some((finding) => finding.rule === 'pivot-without-regression'));
});

test('composes protocol, role, context, handoff and task', () => {
  const prompt = sdk.composeRolePrompt('@aud', '成果物を監査する。', {
    context: 'Project boundary',
    handoff: { id: 'handoff-1' }
  });
  assert.match(prompt, /# Loaded Protocol/u);
  assert.match(prompt, /Metasystemic Auditor/u);
  assert.match(prompt, /Project boundary/u);
  assert.match(prompt, /成果物を監査する/u);
});

test('audit prompt embeds the machine-readable result schema', () => {
  const prompt = sdk.createAuditPrompt('仮説と作用機序を含む成果物');
  assert.match(prompt, /Machine-readable Output Schema/u);
  assert.match(prompt, /audit_target/u);
  assert.match(prompt, /Artifact Under Audit/u);
});

test('audit-report validation also validates its embedded handoff', () => {
  const handoffSource = fs.readFileSync(path.join(ROOT, 'fixtures/handoff.valid.yaml'), 'utf8');
  const handoff = YAML.parse(handoffSource).handoff;
  const report = {
    audit_target: {
      hypothesis: '静的検証と意味的監査を分離する。',
      core_premises: ['静的検証へ意味的拒否権を与えない。'],
      mechanism: 'SchemaとAuditorを異なる層として接続する。',
      distinct_dimensions: ['検証器自身のCaptureを防ぐ。']
    },
    steelman_setup: ['任意のLLMアダプターが利用できる。'],
    dual_stress: {
      logical_systemic: [{ test: 'Capture', result: '分離されている。', falsifier: '静的スコアが最終判断になる。' }],
      cognitive_physical: [{ test: '認知負荷', result: '未検証。', falsifier: '監査入力が人間の認知帯域を恒常的に超える。' }]
    },
    evidence_and_noise: { supporting: [], contradicting: [], unknown: ['実運用'], noise_signals: [] },
    findings: [{ classification: 'unresolved_uncertainty', finding: '実運用が未検証。', rationale: '現在はfixture検証のみ。' }],
    repair_boundary: [],
    pivot_seeds: [],
    final_verdict: 'hold',
    handoff
  };
  const result = sdk.validate('audit-report', report);
  assert.equal(result.valid, true, JSON.stringify(result));
  report.handoff.inquiry.distinct_dimensions = [];
  assert.equal(sdk.validate('audit-report', report).valid, false);
});

test('static inspection declares its semantic limitation', () => {
  const result = sdk.inspectArtifact('仮説 重要な次元 作用機序 適用範囲 反証条件 Residual Pivot');
  assert.equal(result.pass, true);
  assert.match(result.limitation, /意味的/u);
});

test('static flattening signals request review without becoming a veto', () => {
  const result = sdk.inspectArtifact('ケースバイケースで、適切に対応する必要があります。');
  assert.equal(result.pass, true);
  assert.equal(result.status, 'review');
  assert.ok(result.flattening.length > 0);
});

test('validates role-specific handoff authority without making a semantic verdict', () => {
  const source = fs.readFileSync(path.join(ROOT, 'fixtures/handoff.valid.yaml'), 'utf8');
  assert.equal(sdk.validateTransitionHandoff(source).valid, true);

  const handoff = YAML.parse(source);
  handoff.handoff.decision.authority = 'operational_decision';
  const result = sdk.validateTransitionHandoff(handoff);
  assert.equal(result.valid, false);
  assert.match(result.errors[0].message, /not_evaluated/u);

  handoff.handoff.decision.authority = 'not_evaluated';
  handoff.handoff.decision.status = 'advance';
  const statusResult = sdk.validateTransitionHandoff(handoff);
  assert.equal(statusResult.valid, false);
  assert.match(statusResult.errors[0].message, /cannot emit/u);
});

test('runs the self-audit route with provenance digests', () => {
  const first = fs.readFileSync(path.join(ROOT, 'self-audit/001/01-innovator-to-auditor.yaml'), 'utf8');
  const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'self-audit/001/02-audit-report.json'), 'utf8'));
  const integration = fs.readFileSync(path.join(ROOT, 'self-audit/001/04-integrator-to-engineer.yaml'), 'utf8');

  let run = sdk.createWorkflowRun({ runId: 'self-audit-001', handoff: first, at: '2026-09-04T00:00:00.000Z' });
  assert.equal(run.current_role, 'auditor');
  run = sdk.transitionWorkflow(run, { handoff: { handoff: audit.handoff }, at: '2026-09-04T00:01:00.000Z' });
  assert.equal(run.current_role, 'integrator');
  run = sdk.transitionWorkflow(run, { handoff: integration, at: '2026-09-04T00:02:00.000Z' });
  assert.equal(run.current_role, 'engineer');
  assert.equal(run.history.length, 3);
  assert.ok(run.history.every((entry) => /^sha256:[a-f0-9]{64}$/u.test(entry.protocol_digest)));
  assert.deepEqual(run.history.map((entry) => entry.authority), [
    'not_evaluated',
    'epistemic_recommendation',
    'operational_decision'
  ]);
  assert.equal(sdk.validate('workflow-run', run).valid, true);
});

test('handoff patch preserves omitted epistemic remainder and replaces explicit arrays', () => {
  const base = fs.readFileSync(path.join(ROOT, 'self-audit/001/04-integrator-to-engineer.yaml'), 'utf8');
  const next = sdk.mergeHandoff(base, {
    from_role: 'engineer',
    to_role: 'auditor',
    reason: '実装結果を再監査するため。',
    decision: {
      status: 'advance',
      authority: 'implementation_report',
      decided_by: 'engineer',
      rationale: '実装と自動テストが完了した。',
      revisions: ['Workflow APIを実装した。']
    },
    evaluation: {
      tests_completed: ['npm test'],
      tests_remaining: ['実プロジェクトでの検証']
    },
    next_step: {
      objective: '実装が採択範囲と停止条件を守るか再監査する。'
    }
  });

  assert.deepEqual(
    next.handoff.epistemic_remainder,
    YAML.parse(base).handoff.epistemic_remainder
  );
  assert.deepEqual(next.handoff.evaluation.tests_completed, ['npm test']);
  assert.equal(sdk.validateTransitionHandoff(next).valid, true);
});

test('handoff patch rejects prototype mutation keys', () => {
  const base = fs.readFileSync(path.join(ROOT, 'fixtures/handoff.valid.yaml'), 'utf8');
  const hostile = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.throws(() => sdk.mergeHandoff(base, hostile), /Unsafe handoff patch key/u);
  assert.equal({}.polluted, undefined);
});

test('off-route transitions require and record an explicit deviation reason', () => {
  const first = fs.readFileSync(path.join(ROOT, 'fixtures/handoff.valid.yaml'), 'utf8');
  const parsed = YAML.parse(first);
  parsed.handoff.to_role = 'engineer';
  assert.throws(
    () => sdk.createWorkflowRun({ runId: 'deviation', handoff: parsed }),
    /deviationReason/u
  );
  const run = sdk.createWorkflowRun({
    runId: 'deviation',
    handoff: parsed,
    deviationReason: '観測装置を先に構築する必要がある。'
  });
  assert.equal(run.history[0].route, 'deviation');
  assert.equal(run.history[0].reason, '観測装置を先に構築する必要がある。');
});

test('workflow prompt reloads protocol, current role, and current handoff', () => {
  const first = fs.readFileSync(path.join(ROOT, 'fixtures/handoff.valid.yaml'), 'utf8');
  const run = sdk.createWorkflowRun({ runId: 'prompt', handoff: first });
  const prompt = sdk.composeWorkflowPrompt(run, '再監査する。');
  assert.match(prompt, /# Loaded Protocol/u);
  assert.match(prompt, /Metasystemic Auditor/u);
  assert.match(prompt, /# Handoff/u);
  assert.match(prompt, /再監査する。/u);
});

test('extension roles have advisory authority and cannot claim operational decisions', () => {
  const source = YAML.parse(fs.readFileSync(path.join(ROOT, 'fixtures/handoff.valid.yaml'), 'utf8'));
  source.handoff.from_role = 'exit-designer';
  source.handoff.decision.authority = 'advisory_observation';
  source.handoff.decision.decided_by = 'exit-designer';
  assert.equal(sdk.validateTransitionHandoff(source).valid, true);

  source.handoff.decision.authority = 'operational_decision';
  const result = sdk.validateTransitionHandoff(source);
  assert.equal(result.valid, false);
  assert.match(result.errors[0].message, /advisory_observation/u);
});

test('verifies the run hash chain, current snapshot, and current assets', () => {
  const first = fs.readFileSync(path.join(ROOT, 'fixtures/handoff.valid.yaml'), 'utf8');
  const run = sdk.createWorkflowRun({ runId: 'verify', handoff: first, at: '2026-09-04T00:00:00.000Z' });
  assert.equal(sdk.verifyWorkflowRun(run).valid, true);

  const tampered = structuredClone(run);
  tampered.history[0].reason = 'rewritten';
  assert.ok(sdk.verifyWorkflowRun(tampered).errors.some((error) => error.code === 'entry-digest'));

  const staleAsset = structuredClone(run);
  staleAsset.history[0].protocol_digest = sdk.digest('different protocol');
  const { entry_digest, ...unsigned } = staleAsset.history[0];
  staleAsset.history[0].entry_digest = sdk.digest(unsigned);
  assert.ok(sdk.verifyWorkflowRun(staleAsset).errors.some((error) => error.code === 'protocol-digest'));

  const snapshot = structuredClone(run);
  snapshot.current_handoff.reason = 'changed after transition';
  assert.ok(sdk.verifyWorkflowRun(snapshot).errors.some((error) => error.code === 'current-handoff'));
});
