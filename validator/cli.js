#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {
  listRoles,
  loadRole,
  composeRolePrompt,
  validate,
  inspectArtifact,
  createAuditPrompt
} = require('./index');

function fail(message, code = 1) {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function readFile(file) {
  if (!file) fail('A file path is required.');
  return fs.readFileSync(file, 'utf8');
}

const [, , command, ...args] = process.argv;

try {
  switch (command) {
    case 'roles':
      process.stdout.write(`${JSON.stringify(listRoles(), null, 2)}\n`);
      break;
    case 'role':
      process.stdout.write(loadRole(args[0]));
      break;
    case 'prompt':
      process.stdout.write(composeRolePrompt(args[0], readFile(args[1])));
      break;
    case 'validate': {
      const result = validate(args[0], readFile(args[1]));
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (!result.valid) process.exitCode = 1;
      break;
    }
    case 'inspect': {
      const result = inspectArtifact(readFile(args[0]));
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      break;
    }
    case 'audit-prompt':
      process.stdout.write(createAuditPrompt(readFile(args[0]), args[1] ? { context: readFile(args[1]) } : {}));
      break;
    default:
      fail('Usage: unflatten <roles | role ROLE | prompt ROLE TASK_FILE | validate SCHEMA FILE | inspect FILE | audit-prompt ARTIFACT [CONTEXT]>');
  }
} catch (error) {
  fail(error.stack || error.message);
}
