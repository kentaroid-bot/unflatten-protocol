'use strict';

const crypto = require('node:crypto');

const STATUS_BY_AUTHORITY = {
  not_evaluated: ['not_evaluated'],
  epistemic_recommendation: ['advance', 'revise', 'replace', 'hold'],
  operational_decision: ['advance', 'revise', 'replace', 'hold'],
  implementation_report: ['advance', 'revise', 'replace', 'hold'],
  advisory_observation: ['not_evaluated']
};

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])])
    );
  }
  return value;
}

function digest(value) {
  const source = typeof value === 'string' ? value : JSON.stringify(stableValue(value));
  return `sha256:${crypto.createHash('sha256').update(source).digest('hex')}`;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function mergePatch(base, patch) {
  if (patch === undefined) return clone(base);
  if (Array.isArray(patch) || patch === null || typeof patch !== 'object') return clone(patch);

  const output = base && typeof base === 'object' && !Array.isArray(base) ? clone(base) : {};
  for (const [key, value] of Object.entries(patch)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
      throw new Error(`Unsafe handoff patch key: ${key}`);
    }
    output[key] = mergePatch(output[key], value);
  }
  return output;
}

function unwrapHandoff(value) {
  return value?.handoff || value;
}

function assertAuthority(manifest, handoff) {
  const expected = manifest.roles[handoff.from_role]?.authority;
  if (!expected) throw new Error(`No authority profile registered for role: ${handoff.from_role}`);
  if (handoff.decision?.authority !== expected) {
    throw new Error(
      `${handoff.from_role} must emit decision.authority=${expected}; received ${handoff.decision?.authority}`
    );
  }
  const statuses = STATUS_BY_AUTHORITY[expected] || [];
  if (!statuses.includes(handoff.decision?.status)) {
    throw new Error(`${expected} cannot emit decision.status=${handoff.decision?.status}`);
  }
  if (handoff.decision?.decided_by !== handoff.from_role) {
    throw new Error('decision.decided_by must match handoff.from_role');
  }
}

function routeFor(manifest, fromRole, toRole, deviationReason) {
  const recommended = manifest.workflow?.routes?.[fromRole] || [];
  if (recommended.includes(toRole)) return 'advisory';
  if (!deviationReason || !String(deviationReason).trim()) {
    throw new Error(`Transition ${fromRole} -> ${toRole} is outside the advisory route; deviationReason is required`);
  }
  return 'deviation';
}

function createWorkflowTools(dependencies) {
  const {
    manifest,
    loadProtocol,
    loadRole,
    resolveRole,
    validate,
    composeRolePrompt,
    parseInput
  } = dependencies;

  function normalizeHandoff(input) {
    return unwrapHandoff(parseInput(input));
  }

  function assertValidHandoff(handoff) {
    const result = validate('handoff', { handoff });
    if (!result.valid) {
      const error = new Error('Invalid Handoff Contract');
      error.validation = result;
      throw error;
    }
    assertAuthority(manifest, handoff);
  }

  function validateTransitionHandoff(input) {
    let handoff;
    try {
      handoff = normalizeHandoff(input);
      assertValidHandoff(handoff);
      resolveRole(handoff.from_role);
      resolveRole(handoff.to_role);
      return { valid: true, errors: [], value: { handoff } };
    } catch (error) {
      return {
        valid: false,
        errors: error.validation?.errors || [{ message: error.message }],
        findings: error.validation?.findings || []
      };
    }
  }

  function makeHistoryEntry(handoff, options, index, previousEntryDigest) {
    const toRole = resolveRole(handoff.to_role).name;
    const fromRole = resolveRole(handoff.from_role).name;
    const route = routeFor(manifest, fromRole, toRole, options.deviationReason);
    const entry = {
      id: options.entryId || `transition-${index}`,
      at: options.at || new Date().toISOString(),
      from_role: fromRole,
      to_role: toRole,
      route,
      reason: options.deviationReason || handoff.reason,
      authority: handoff.decision.authority,
      protocol_digest: digest(loadProtocol()),
      role_digest: digest(loadRole(toRole)),
      handoff_digest: digest(handoff),
      previous_entry_digest: previousEntryDigest,
      ...(options.artifactRef ? { artifact_ref: options.artifactRef } : {})
    };
    return { ...entry, entry_digest: digest(entry) };
  }

  function createWorkflowRun(options) {
    const handoff = normalizeHandoff(options.handoff);
    assertValidHandoff(handoff);
    const currentRole = resolveRole(handoff.to_role).name;
    const entry = makeHistoryEntry(handoff, options, 1, 'genesis');
    const run = {
      run_id: options.runId,
      protocol_version: manifest.version,
      current_role: currentRole,
      current_handoff: handoff,
      status: options.status || 'active',
      history: [entry]
    };
    const result = validate('workflow-run', run);
    if (!result.valid) {
      const error = new Error('Invalid workflow run');
      error.validation = result;
      throw error;
    }
    return run;
  }

  function transitionWorkflow(runInput, options) {
    const run = parseInput(runInput);
    const runValidation = validate('workflow-run', run);
    if (!runValidation.valid) {
      const error = new Error('Invalid workflow run');
      error.validation = runValidation;
      throw error;
    }

    if (!options.handoff && options.patch === undefined) {
      throw new Error('Either options.handoff or options.patch is required');
    }

    const previous = run.current_handoff;
    const supplied = options.handoff
      ? normalizeHandoff(options.handoff)
      : mergePatch(previous, unwrapHandoff(parseInput(options.patch)));
    assertValidHandoff(supplied);

    if (supplied.from_role !== run.current_role) {
      throw new Error(`Handoff from_role=${supplied.from_role} does not match current_role=${run.current_role}`);
    }

    const entry = makeHistoryEntry(
      supplied,
      options,
      run.history.length + 1,
      run.history.at(-1).entry_digest
    );
    const next = {
      ...clone(run),
      protocol_version: manifest.version,
      current_role: entry.to_role,
      current_handoff: supplied,
      status: options.status || 'active',
      history: [...run.history, entry]
    };
    const validation = validate('workflow-run', next);
    if (!validation.valid) {
      const error = new Error('Invalid workflow transition result');
      error.validation = validation;
      throw error;
    }
    return next;
  }

  function composeWorkflowPrompt(runInput, task, options = {}) {
    const run = parseInput(runInput);
    const validation = validate('workflow-run', run);
    if (!validation.valid) {
      const error = new Error('Invalid workflow run');
      error.validation = validation;
      throw error;
    }
    return composeRolePrompt(run.current_role, task || run.current_handoff.next_step?.objective, {
      handoff: { handoff: run.current_handoff },
      context: options.context
    });
  }

  function verifyWorkflowRun(runInput, options = {}) {
    const run = parseInput(runInput);
    const structural = validate('workflow-run', run);
    const errors = [];
    if (!structural.valid) return { valid: false, errors: structural.errors, findings: structural.findings || [] };

    let previous = 'genesis';
    for (const entry of run.history) {
      if (entry.previous_entry_digest !== previous) {
        errors.push({ code: 'history-chain', entry: entry.id, message: 'previous_entry_digest does not match the preceding entry' });
      }
      const { entry_digest: recorded, ...unsigned } = entry;
      const calculated = digest(unsigned);
      if (recorded !== calculated) {
        errors.push({ code: 'entry-digest', entry: entry.id, message: 'entry_digest does not match entry content' });
      }
      previous = recorded;
    }

    const last = run.history.at(-1);
    if (last.to_role !== run.current_role) {
      errors.push({ code: 'current-role', message: 'current_role does not match the final transition' });
    }
    if (last.handoff_digest !== digest(run.current_handoff)) {
      errors.push({ code: 'current-handoff', message: 'current_handoff does not match the final handoff digest' });
    }
    const handoffValidation = validateTransitionHandoff({ handoff: run.current_handoff });
    if (!handoffValidation.valid) {
      errors.push({ code: 'current-handoff-authority', message: 'current_handoff authority profile is invalid' });
    }

    if (options.currentAssets !== false) {
      const protocolDigest = digest(loadProtocol());
      for (const entry of run.history) {
        if (entry.protocol_digest !== protocolDigest) {
          errors.push({ code: 'protocol-digest', entry: entry.id, message: 'protocol asset has changed since this transition' });
        }
        if (entry.role_digest !== digest(loadRole(entry.to_role))) {
          errors.push({ code: 'role-digest', entry: entry.id, message: `role asset ${entry.to_role} has changed since this transition` });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      limitation: 'Hash-chain verification detects local inconsistency and current asset changes; it is not a signature and cannot authenticate an actor.'
    };
  }

  return {
    digest,
    mergeHandoff: (base, patch) => ({ handoff: mergePatch(normalizeHandoff(base), unwrapHandoff(parseInput(patch))) }),
    validateTransitionHandoff,
    createWorkflowRun,
    transitionWorkflow,
    verifyWorkflowRun,
    composeWorkflowPrompt
  };
}

module.exports = { STATUS_BY_AUTHORITY, digest, mergePatch, createWorkflowTools };
