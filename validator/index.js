'use strict';

const fs = require('node:fs');
const path = require('node:path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const YAML = require('yaml');
const { detectFlattening } = require('./rules/detect-flattening');
const { measureSharpness } = require('./rules/measure-sharpness');
const { checkInvariants } = require('./rules/check-invariants');

const ROOT = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function listRoles() {
  return Object.entries(manifest.roles).map(([name, role]) => ({ name, ...role }));
}

function resolveRole(nameOrAlias) {
  const normalized = String(nameOrAlias || '').trim();
  const direct = manifest.roles[normalized];
  if (direct) return { name: normalized, ...direct };

  for (const [name, role] of Object.entries(manifest.roles)) {
    if (role.alias === normalized || role.aliases?.includes(normalized)) {
      return { name, ...role };
    }
  }
  throw new Error(`Unknown role: ${normalized}`);
}

function loadRole(nameOrAlias) {
  return read(resolveRole(nameOrAlias).template);
}

function loadProtocol() {
  return read(manifest.protocol);
}

function loadHandoffContract() {
  return read(manifest.handoff);
}

function composeRolePrompt(nameOrAlias, task, options = {}) {
  const role = resolveRole(nameOrAlias);
  const parts = [
    '# Loaded Protocol',
    loadProtocol(),
    '# Loaded Role',
    loadRole(role.name)
  ];
  if (options.handoff) parts.push('# Handoff', stringifyInput(options.handoff));
  if (options.context) parts.push('# Project Context', stringifyInput(options.context));
  parts.push('# Current Task', String(task || ''));
  return parts.join('\n\n');
}

function parseInput(input) {
  if (input && typeof input === 'object') return input;
  if (typeof input !== 'string') throw new TypeError('Input must be an object, JSON, or YAML string');
  return YAML.parse(input);
}

function stringifyInput(input) {
  return typeof input === 'string' ? input : YAML.stringify(input);
}

function buildValidator(schemaName) {
  const schemaPath = manifest.schemas[schemaName];
  if (!schemaPath) throw new Error(`Unknown schema: ${schemaName}`);
  const schema = JSON.parse(read(schemaPath));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

function validate(schemaName, input) {
  let value;
  try {
    value = parseInput(input);
  } catch (error) {
    return { valid: false, errors: [{ message: error.message }], findings: [] };
  }

  const validator = buildValidator(schemaName);
  const schemaValid = validator(value);
  const findings = schemaName === 'handoff' ? checkInvariants(value) : [];
  const nestedValidation = schemaName === 'audit-report' && schemaValid && value?.handoff
    ? validate('handoff', { handoff: value.handoff })
    : null;
  const hasErrors = findings.some((finding) => finding.severity === 'error');
  return {
    valid: Boolean(schemaValid) && !hasErrors && (!nestedValidation || nestedValidation.valid),
    errors: validator.errors || [],
    findings,
    nestedValidation,
    value
  };
}

function inspectArtifact(input) {
  const text = stringifyInput(input);
  const flattening = detectFlattening(text);
  const sharpness = measureSharpness(text);
  const needsReview = flattening.length > 0 || sharpness.missing.length > 0;
  return {
    pass: true,
    status: needsReview ? 'review' : 'ready',
    flattening,
    sharpness,
    limitation: '静的検査は兆候を検出するだけです。意味的な合否にはMetasystemic Auditorをロードしてください。'
  };
}

function createAuditPrompt(artifact, options = {}) {
  const outputContract = [
    '監査結果は説明用Markdownではなく、schema/audit-report.schema.jsonに適合するJSONだけで返してください。',
    '現在のデータ不足や実装経路の不在だけを反証として使用してはいけません。',
    '論理・システム経路と認知・身体経路を両方実行してください。'
  ].join('\n');
  return composeRolePrompt('auditor', [
    outputContract,
    '# Machine-readable Output Schema',
    read(manifest.schemas['audit-report']),
    '# Artifact Under Audit',
    stringifyInput(artifact)
  ].join('\n\n'), options);
}

async function auditArtifact(artifact, run, options = {}) {
  if (typeof run !== 'function') {
    throw new TypeError('auditArtifact requires a provider adapter: async run(prompt) => JSON or YAML');
  }
  const prompt = createAuditPrompt(artifact, options);
  const raw = await run(prompt);
  const result = validate('audit-report', raw);
  return {
    ...result,
    handoffValidation: result.nestedValidation,
    raw,
    prompt
  };
}

module.exports = {
  manifest,
  listRoles,
  resolveRole,
  loadRole,
  loadProtocol,
  loadHandoffContract,
  composeRolePrompt,
  validate,
  inspectArtifact,
  createAuditPrompt,
  auditArtifact
};
