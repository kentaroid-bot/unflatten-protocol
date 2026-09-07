'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');
const sdk = require('../validator');
const ROOT = path.resolve(__dirname, '..');
function walk(dir) {
  return fs.readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
}

test('all historical self-audit JSON/YAML artifacts satisfy their declared structure and invariants', () => {
  const files = walk(path.join(ROOT, 'self-audit')).filter(file => /\.(yaml|yml|json)$/.test(file));
  assert.ok(files.length >= 52, 'historical corpus unexpectedly reduced');
  for (const file of files) {
    const artifact = YAML.parse(fs.readFileSync(file, 'utf8'));
    const schema = artifact.audit_target ? 'audit-report' : artifact.handoff ? 'handoff' : null;
    assert.ok(schema, 'Unclassified historical record: ' + file);
    const result = sdk.validate(schema, artifact);
    assert.equal(result.valid, true, path.relative(ROOT, file) + ': ' + JSON.stringify({
      errors: result.errors, findings: result.findings, nested: result.nestedValidation?.errors
    }));
  }
});

test('all local self-audit references in registered worldline generations exist', () => {
  let references = 0;
  for (const entry of sdk.listWorldlines()) {
    const worldline = sdk.resolveWorldline(entry.id);
    for (const generation of worldline.generation_records || []) {
      for (const evidence of generation.evidence || []) {
        if (evidence.startsWith('self-audit/')) {
          references++;
          assert.ok(fs.existsSync(path.join(ROOT, evidence)), entry.id + ': ' + evidence);
        }
      }
    }
  }
  assert.ok(references >= 6, 'generation references unexpectedly removed');
});
