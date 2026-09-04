#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const {
  listRoles,
  loadRole,
  composeRolePrompt,
  validate,
  inspectArtifact,
  createAuditPrompt,
  mergeHandoff,
  createWorkflowRun,
  transitionWorkflow,
  verifyWorkflowRun,
  composeWorkflowPrompt
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
    case 'handoff-patch':
      process.stdout.write(`${JSON.stringify(mergeHandoff(readFile(args[0]), readFile(args[1])), null, 2)}\n`);
      break;
    case 'run-start': {
      const run = createWorkflowRun({
        runId: args[0],
        handoff: readFile(args[1]),
        ...(args[2] ? { deviationReason: args[2] } : {})
      });
      process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
      break;
    }
    case 'run-transition': {
      const run = transitionWorkflow(readFile(args[0]), {
        handoff: readFile(args[1]),
        ...(args[2] ? { deviationReason: args[2] } : {})
      });
      process.stdout.write(`${JSON.stringify(run, null, 2)}\n`);
      break;
    }
    case 'run-prompt':
      process.stdout.write(composeWorkflowPrompt(readFile(args[0]), readFile(args[1]), {
        ...(args[2] ? { context: readFile(args[2]) } : {})
      }));
      break;
    case 'run-verify': {
      const result = verifyWorkflowRun(readFile(args[0]));
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (!result.valid) process.exitCode = 1;
      break;
    }
    default:
      fail('Usage: unflatten <roles | role ROLE | prompt ROLE TASK_FILE | validate SCHEMA FILE | inspect FILE | audit-prompt ARTIFACT [CONTEXT] | handoff-patch BASE PATCH | run-start RUN_ID HANDOFF [DEVIATION_REASON] | run-transition RUN HANDOFF [DEVIATION_REASON] | run-prompt RUN TASK [CONTEXT] | run-verify RUN>');
  }
} catch (error) {
  fail(error.stack || error.message);
}
