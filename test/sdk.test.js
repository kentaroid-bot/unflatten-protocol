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
});

test('validates the canonical YAML handoff fixture', () => {
  const source = fs.readFileSync(path.join(ROOT, 'fixtures/handoff.valid.yaml'), 'utf8');
  const result = sdk.validate('handoff', source);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.deepEqual(result.findings, []);
});

test('validates the protocol manifest and every registered path exists', () => {
  const result = sdk.validate('protocol-manifest', sdk.manifest);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  const paths = [
    sdk.manifest.protocol,
    sdk.manifest.handoff,
    ...Object.values(sdk.manifest.roles).map((role) => role.template),
    ...Object.values(sdk.manifest.engines),
    ...Object.values(sdk.manifest.schemas)
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
