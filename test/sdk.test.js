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
