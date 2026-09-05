'use strict';

const fs = require('node:fs');
const path = require('node:path');

const REQUIRED_GENERATION_ROLES = ['innovator', 'auditor', 'integrator'];
const TERMINAL_OUTCOMES = ['promote', 'spin_out', 'archive', 'terminate'];
const OUTCOME_STATUS = {
  promote: 'promoted',
  spin_out: 'spun_out',
  archive: 'archived',
  terminate: 'terminated'
};

function safeResolve(base, relativePath) {
  if (!relativePath || path.isAbsolute(relativePath)) {
    throw new Error('Worldline asset path must be a non-empty relative path');
  }
  const resolvedBase = path.resolve(base);
  const resolved = path.resolve(resolvedBase, relativePath);
  if (resolved === resolvedBase || !resolved.startsWith(resolvedBase + path.sep)) {
    throw new Error('Worldline asset escapes its namespace: ' + relativePath);
  }
  return resolved;
}

function sameMembers(left, right) {
  const sortedLeft = [...left].sort();
  const sortedRight = [...right].sort();
  return sortedLeft.length === sortedRight.length
    && sortedLeft.every((value, index) => value === sortedRight[index]);
}

function checkWorldlineInvariants(value) {
  const findings = [];
  const records = value?.generation_records;
  if (!Array.isArray(records)) return findings;

  if (records.length !== value.lineage_generation) {
    findings.push({
      severity: 'error',
      rule: 'worldline-generation-count',
      message: 'generation_records length must equal lineage_generation'
    });
  }

  records.forEach((record, index) => {
    if (record.generation !== index + 1) {
      findings.push({
        severity: 'error',
        rule: 'worldline-generation-sequence',
        message: 'generation_records must be contiguous and start at generation 1'
      });
    }
    if (record.status === 'completed' && !sameMembers(record.roles_completed, REQUIRED_GENERATION_ROLES)) {
      findings.push({
        severity: 'error',
        rule: 'worldline-complete-cycle',
        message: 'a completed generation requires innovator, auditor, and integrator'
      });
    }
  });

  const extensionPending = Boolean(value?.review?.extension_pending);
  const decisions = Array.isArray(value?.review?.decisions) ? value.review.decisions : [];
  const extensionDecisions = decisions.filter((decision) => decision.outcome === 'extend_once');
  const terminalDecisions = decisions.filter((decision) => TERMINAL_OUTCOMES.includes(decision.outcome));
  const lastDecision = decisions.at(-1);

  if (extensionDecisions.length !== value?.review?.extensions_used) {
    findings.push({
      severity: 'error',
      rule: 'worldline-extension-decision-count',
      message: 'extensions_used must equal the number of extend_once decisions'
    });
  }
  if (terminalDecisions.length > 1 || (terminalDecisions.length === 1 && lastDecision !== terminalDecisions[0])) {
    findings.push({
      severity: 'error',
      rule: 'worldline-terminal-decision-order',
      message: 'a worldline may have one terminal decision and it must be last'
    });
  }
  if (value.status === 'active' && value.lineage_generation === value.generation_limit && !extensionPending) {
    findings.push({
      severity: 'error',
      rule: 'worldline-review-boundary',
      message: 'generation-limit worldlines must require review unless the single extension is active'
    });
  }
  if (extensionPending && value?.review?.extensions_used !== 1) {
    findings.push({
      severity: 'error',
      rule: 'worldline-extension-boundary',
      message: 'an active extension requires extensions_used=1'
    });
  }
  if (extensionPending && (value.status !== 'active' || value.lineage_generation !== value.generation_limit)) {
    findings.push({
      severity: 'error',
      rule: 'worldline-extension-state',
      message: 'an extension can only be active at the generation limit'
    });
  }
  if (extensionPending && lastDecision?.outcome !== 'extend_once') {
    findings.push({
      severity: 'error',
      rule: 'worldline-extension-decision',
      message: 'an active extension requires extend_once as the latest decision'
    });
  }
  if (
    value?.review?.extensions_used === 1
    && !extensionPending
    && !Array.isArray(value?.review?.extension_evidence)
  ) {
    findings.push({
      severity: 'error',
      rule: 'worldline-extension-evidence',
      message: 'a completed extension requires evidence'
    });
  }
  const expectedTerminalStatus = lastDecision && OUTCOME_STATUS[lastDecision.outcome];
  if (TERMINAL_OUTCOMES.some((outcome) => OUTCOME_STATUS[outcome] === value.status)) {
    if (expectedTerminalStatus !== value.status) {
      findings.push({
        severity: 'error',
        rule: 'worldline-terminal-decision',
        message: 'terminal status requires a matching latest Integrator decision'
      });
    }
  } else if (expectedTerminalStatus) {
    findings.push({
      severity: 'error',
      rule: 'worldline-terminal-status',
      message: 'a terminal Integrator decision requires its matching terminal status'
    });
  }
  return findings;
}

function createIntegratorDecision(outcome, details) {
  if (details?.authority !== 'operational_decision' || details?.decided_by !== 'integrator') {
    throw new Error('Worldline review requires an Integrator operational_decision');
  }
  if (typeof details.rationale !== 'string' || details.rationale.trim() === '') {
    throw new Error('Worldline review requires a rationale');
  }
  if (!Array.isArray(details.evidence) || details.evidence.length === 0) {
    throw new Error('Worldline review requires evidence');
  }
  return {
    outcome,
    authority: 'operational_decision',
    decided_by: 'integrator',
    rationale: details.rationale,
    evidence: [...details.evidence]
  };
}

function createWorldlineTools(dependencies) {
  const { root, manifest, validate, parseInput, loadProtocol } = dependencies;

  function loadRegistry() {
    if (!manifest.worldlines) throw new Error('This host has no worldline registry');
    const registryPath = safeResolve(root, manifest.worldlines);
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    const result = validate('worldline-registry', registry);
    if (!result.valid) {
      const error = new Error('Invalid worldline registry');
      error.validation = result;
      throw error;
    }
    if (
      registry.host.protocol_id !== manifest.id
      || registry.host.protocol_version !== manifest.version
    ) {
      throw new Error('Worldline registry host does not match the loaded stable protocol');
    }
    return registry;
  }

  function resolveWorldline(id) {
    const normalized = String(id || '').trim();
    const registry = loadRegistry();
    const entry = registry.worldlines[normalized];
    if (!entry) throw new Error('Unknown worldline: ' + normalized);
    const manifestPath = safeResolve(root, entry.manifest);
    const guestRoot = path.dirname(manifestPath);
    const guest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const result = validate('worldline', guest);
    if (!result.valid) {
      const error = new Error('Invalid worldline manifest: ' + normalized);
      error.validation = result;
      throw error;
    }
    if (guest.id !== normalized) throw new Error('Worldline id mismatch: ' + normalized);
    return { ...guest, manifest: entry.manifest, root: path.relative(root, guestRoot) };
  }

  function listWorldlines() {
    const registry = loadRegistry();
    return Object.keys(registry.worldlines).map((id) => {
      const worldline = resolveWorldline(id);
      return {
        id,
        status: worldline.status,
        lineage_generation: worldline.lineage_generation,
        generation_limit: worldline.generation_limit,
        manifest: worldline.manifest
      };
    });
  }

  function resolveWorldlineRole(worldlineId, nameOrAlias) {
    const worldline = resolveWorldline(worldlineId);
    const normalized = String(nameOrAlias || '').trim();
    for (const [name, role] of Object.entries(worldline.roles)) {
      if (name === normalized || role.alias === normalized) {
        return { worldline, name, ...role };
      }
    }
    throw new Error('Unknown role in worldline ' + worldlineId + ': ' + normalized);
  }

  function loadWorldlineRole(worldlineId, nameOrAlias) {
    const resolved = resolveWorldlineRole(worldlineId, nameOrAlias);
    const guestRoot = safeResolve(root, resolved.worldline.root);
    const templatePath = safeResolve(guestRoot, resolved.template);
    return fs.readFileSync(templatePath, 'utf8');
  }

  function composeWorldlineRolePrompt(worldlineId, nameOrAlias, task, options = {}) {
    const role = resolveWorldlineRole(worldlineId, nameOrAlias);
    const boundary = [
      'Worldline: ' + role.worldline.id,
      'Status: ' + role.worldline.status,
      'Generation: ' + role.worldline.lineage_generation + '/' + role.worldline.generation_limit,
      'Authority: ' + role.authority
    ].join('\n');
    const parts = [
      '# Stable Host Protocol',
      loadProtocol(),
      '# Guest Worldline Boundary',
      boundary,
      '# Guest Role',
      loadWorldlineRole(worldlineId, role.name)
    ];
    if (options.handoff) {
      parts.push('# Handoff', typeof options.handoff === 'string' ? options.handoff : JSON.stringify(options.handoff, null, 2));
    }
    if (options.context) parts.push('# Project Context', String(options.context));
    parts.push('# Current Task', String(task || ''));
    return parts.join('\n\n');
  }

  function assertValidWorldline(input) {
    const value = parseInput(input);
    const result = validate('worldline', value);
    if (!result.valid) {
      const error = new Error('Invalid worldline');
      error.validation = result;
      throw error;
    }
    return structuredClone(value);
  }

  function advanceWorldline(input, cycle) {
    const worldline = assertValidWorldline(input);
    if (!['active', 'runnable'].includes(worldline.status)) {
      throw new Error('Worldline status ' + worldline.status + ' cannot advance');
    }
    if (worldline.lineage_generation >= worldline.generation_limit) {
      throw new Error('Worldline reached its generation limit and requires review');
    }
    const roles = cycle?.roles_completed || [];
    if (!sameMembers(roles, REQUIRED_GENERATION_ROLES)) {
      throw new Error('A generation requires innovator, auditor, and integrator');
    }
    if (!Array.isArray(cycle?.evidence) || cycle.evidence.length === 0) {
      throw new Error('A generation requires evidence');
    }

    const generation = worldline.lineage_generation + 1;
    worldline.lineage_generation = generation;
    worldline.generation_records.push({
      generation,
      status: 'completed',
      roles_completed: REQUIRED_GENERATION_ROLES,
      evidence: [...cycle.evidence]
    });
    worldline.status = generation === worldline.generation_limit ? 'review_required' : 'active';
    return assertValidWorldline(worldline);
  }

  function decideWorldline(input, outcome, details = {}) {
    const worldline = assertValidWorldline(input);
    if (worldline.status !== 'review_required') {
      throw new Error('Worldline decisions require status=review_required');
    }

    if (outcome === 'extend_once') {
      if (worldline.review.extensions_used >= worldline.review.max_extensions) {
        throw new Error('Worldline extension limit reached');
      }
      worldline.review.decisions.push(createIntegratorDecision(outcome, details));
      worldline.status = 'active';
      worldline.review.extensions_used += 1;
      worldline.review.extension_pending = true;
      return assertValidWorldline(worldline);
    }

    if (!TERMINAL_OUTCOMES.includes(outcome)) {
      throw new Error('Unknown worldline outcome: ' + outcome);
    }
    worldline.review.decisions.push(createIntegratorDecision(outcome, details));
    if (outcome === 'promote') worldline.status = 'promoted';
    if (outcome === 'archive') worldline.status = 'archived';
    if (outcome === 'terminate') worldline.status = 'terminated';
    if (outcome === 'spin_out') {
      worldline.status = 'spun_out';
      worldline.spin_out = {
        repository: details.repository,
        parent_repository: worldline.parent.repository,
        parent_commit: worldline.parent.commit,
        parent_worldline: worldline.id,
        divergence_reason: details.divergence_reason
      };
    }
    return assertValidWorldline(worldline);
  }

  function completeWorldlineExtension(input, evidence) {
    const worldline = assertValidWorldline(input);
    if (
      worldline.status !== 'active'
      || worldline.lineage_generation !== worldline.generation_limit
      || !worldline.review.extension_pending
    ) {
      throw new Error('No bounded worldline extension is active');
    }
    if (!Array.isArray(evidence) || evidence.length === 0) {
      throw new Error('An extension requires evidence');
    }
    worldline.status = 'review_required';
    worldline.review.extension_pending = false;
    worldline.review.extension_evidence = [...evidence];
    return assertValidWorldline(worldline);
  }

  return {
    loadRegistry,
    listWorldlines,
    resolveWorldline,
    resolveWorldlineRole,
    loadWorldlineRole,
    composeWorldlineRolePrompt,
    advanceWorldline,
    decideWorldline,
    completeWorldlineExtension
  };
}

module.exports = {
  REQUIRED_GENERATION_ROLES,
  safeResolve,
  checkWorldlineInvariants,
  createWorldlineTools
};
