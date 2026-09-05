'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');

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

function calculateCapsuleDigest(base, assets) {
  const hash = crypto.createHash('sha256');
  for (const relativePath of [...assets].sort()) {
    hash.update(relativePath);
    hash.update('\0');
    hash.update(fs.readFileSync(safeResolve(base, relativePath)));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function checkWorldlineRegistryInvariants(value) {
  const findings = [];
  const mounts = value?.mounts;
  if (!Array.isArray(mounts)) return findings;
  const prefixes = mounts.map((mount) => mount.prefix);
  if (new Set(prefixes).size !== prefixes.length) {
    findings.push({ severity: 'error', rule: 'worldline-mount-prefix-unique', message: 'mount prefixes must be unique' });
  }
  const rootMounts = mounts.filter((mount) => mount.prefix === '~/');
  if (rootMounts.length !== 1 || rootMounts[0].target !== 'host') {
    findings.push({ severity: 'error', rule: 'worldline-host-root-mount', message: '~/ must be owned by exactly one Host mount' });
  }
  for (const mount of mounts) {
    if (mount.target === 'worldline' && !value?.worldlines?.[mount.worldline]) {
      findings.push({ severity: 'error', rule: 'worldline-mount-target-exists', message: 'mount references an unknown worldline: ' + mount.worldline });
    }
  }
  return findings;
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

  if (value?.emulation) {
    const experiences = records.map((record) => record.experience_id);
    if (new Set(experiences).size !== experiences.length) {
      findings.push({
        severity: 'error',
        rule: 'worldline-distinct-generation-experience',
        message: 'emulated generations require distinct experience_id values'
      });
    }
    const evidence = records.flatMap((record) => record.evidence || []);
    if (new Set(evidence).size !== evidence.length) {
      findings.push({
        severity: 'error',
        rule: 'worldline-generation-evidence-reuse',
        message: 'emulated generations must not reuse the same evidence locator'
      });
    }
    if (value.emulation.base.commit !== value?.parent?.commit) {
      findings.push({
        severity: 'error',
        rule: 'worldline-emulator-base-pin',
        message: 'emulation base commit must match the immutable parent commit'
      });
    }
    const latest = records.at(-1);
    if (latest?.candidate_digest !== value.emulation.capsule.digest.value) {
      findings.push({
        severity: 'error',
        rule: 'worldline-latest-capsule-digest',
        message: 'latest generation candidate_digest must match the current capsule digest'
      });
    }
  }

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
  const { root, manifest, validate, parseInput, loadProtocol, loadRole, resolveRole } = dependencies;

  function assertEmulationIntegrity(worldline, guestRoot) {
    if (!worldline.emulation) return;
    const actualHost = calculateCapsuleDigest(root, worldline.emulation.base.assets);
    const expectedHost = worldline.emulation.base.digest.value;
    if (actualHost !== expectedHost) {
      throw new Error('Worldline host asset digest mismatch: expected ' + expectedHost + ', got ' + actualHost);
    }
    const actual = calculateCapsuleDigest(guestRoot, worldline.emulation.capsule.assets);
    const expected = worldline.emulation.capsule.digest.value;
    if (actual !== expected) {
      throw new Error('Worldline capsule digest mismatch: expected ' + expected + ', got ' + actual);
    }
  }

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
    const findings = checkWorldlineRegistryInvariants(registry);
    if (findings.some((finding) => finding.severity === 'error')) {
      const error = new Error('Invalid worldline mount registry');
      error.findings = findings;
      throw error;
    }
    return registry;
  }

  function hostResourcePaths() {
    return new Set([
      'manifest.json',
      manifest.protocol,
      manifest.handoff,
      ...Object.values(manifest.roles).map((role) => role.template),
      ...Object.values(manifest.engines || {}),
      ...Object.values(manifest.schemas || {})
    ]);
  }

  function normalizeLogicalPath(input) {
    const logicalPath = String(input || '').trim();
    if (!logicalPath.startsWith('~/')) throw new Error('Protocol path must start with ~/');
    if (!/^~\/[A-Za-z0-9._/-]+$/u.test(logicalPath) || logicalPath.includes('//')) {
      throw new Error('Invalid logical protocol path: ' + logicalPath);
    }
    const segments = logicalPath.slice(2).split('/');
    if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
      throw new Error('Logical protocol path traversal is not allowed: ' + logicalPath);
    }
    return logicalPath;
  }

  function loadSemanticMount(worldline, guestRoot) {
    const mountPath = worldline.emulation?.virtual_mount;
    if (!mountPath || !declaredEmulationAssets(worldline).has(mountPath)) {
      throw new Error('Worldline virtual mount must be a declared Capsule asset');
    }
    const table = JSON.parse(fs.readFileSync(safeResolve(guestRoot, mountPath), 'utf8'));
    const result = validate('semantic-mount', table);
    if (!result.valid) {
      const error = new Error('Invalid semantic mount table for ' + worldline.id);
      error.validation = result;
      throw error;
    }
    return table;
  }

  function resolveProtocolPath(input) {
    const logicalPath = normalizeLogicalPath(input);
    const registry = loadRegistry();
    const mount = [...registry.mounts]
      .sort((left, right) => right.prefix.length - left.prefix.length)
      .find((candidate) => logicalPath.startsWith(candidate.prefix));
    if (!mount) throw new Error('No protocol mount for path: ' + logicalPath);
    const resourcePath = logicalPath.slice(mount.prefix.length);
    if (!resourcePath) throw new Error('Protocol path must name a resource: ' + logicalPath);

    if (mount.target === 'host') {
      if (!hostResourcePaths().has(resourcePath)) throw new Error('Unknown Host protocol resource: ' + resourcePath);
      return {
        logical_path: logicalPath,
        logical_only: true,
        mount: mount.prefix,
        target: 'host',
        protocol_version: manifest.version,
        resource_path: resourcePath,
        source: 'host',
        content: fs.readFileSync(safeResolve(root, resourcePath), 'utf8')
      };
    }

    const worldline = resolveWorldline(mount.worldline);
    if (!worldline.emulation) throw new Error('Mounted worldline has no emulator: ' + mount.worldline);
    const guestRoot = safeResolve(root, worldline.root);
    const table = loadSemanticMount(worldline, guestRoot);
    const route = table.routes[resourcePath];
    let content;
    let source;
    if (route?.kind === 'asset') {
      if (!declaredEmulationAssets(worldline).has(route.asset)) throw new Error('Mounted asset is not declared by the Capsule: ' + route.asset);
      content = fs.readFileSync(safeResolve(guestRoot, route.asset), 'utf8');
      source = 'candidate_asset';
    } else if (route?.kind === 'compose') {
      if (!worldline.emulation.base.assets.includes(route.base)) throw new Error('Mounted base is not pinned by the Host digest: ' + route.base);
      for (const overlay of route.overlays) {
        if (!declaredEmulationAssets(worldline).has(overlay)) throw new Error('Mounted overlay is not declared by the Capsule: ' + overlay);
      }
      const parts = ['# Host Resource: ' + route.base, fs.readFileSync(safeResolve(root, route.base), 'utf8')];
      for (const overlay of route.overlays) {
        parts.push('# Worldline Overlay: ' + overlay, fs.readFileSync(safeResolve(guestRoot, overlay), 'utf8'));
      }
      content = parts.join('\n\n');
      source = 'composed';
    } else {
      if (!worldline.emulation.base.assets.includes(resourcePath)) throw new Error('Unknown or unpinned Worldline resource: ' + resourcePath);
      content = fs.readFileSync(safeResolve(root, resourcePath), 'utf8');
      source = 'inherited_host';
    }
    return {
      logical_path: logicalPath,
      logical_only: true,
      mount: mount.prefix,
      target: 'worldline',
      worldline: worldline.id,
      generation: worldline.lineage_generation,
      internal_status: worldline.emulation.internal_status,
      upstream_status: worldline.emulation.upstream_status,
      resource_path: resourcePath,
      source,
      base_commit: worldline.emulation.base.commit,
      host_digest: worldline.emulation.base.digest.value,
      capsule_digest: worldline.emulation.capsule.digest.value,
      content
    };
  }

  function loadProtocolPath(input) {
    return resolveProtocolPath(input).content;
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
    assertEmulationIntegrity(guest, guestRoot);
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

  function declaredEmulationAssets(worldline) {
    return new Set(worldline.emulation?.capsule?.assets || []);
  }

  function loadWorldlineAsset(worldlineId, relativePath) {
    const worldline = resolveWorldline(worldlineId);
    if (!worldline.emulation) throw new Error('Worldline has no emulator capsule: ' + worldlineId);
    if (!declaredEmulationAssets(worldline).has(relativePath)) {
      throw new Error('Asset is not declared by the emulator capsule: ' + relativePath);
    }
    const guestRoot = safeResolve(root, worldline.root);
    return fs.readFileSync(safeResolve(guestRoot, relativePath), 'utf8');
  }

  function describeWorldlineEmulation(worldlineId) {
    const worldline = resolveWorldline(worldlineId);
    if (!worldline.emulation) throw new Error('Worldline has no emulator capsule: ' + worldlineId);
    return {
      id: worldline.id,
      generation: worldline.lineage_generation,
      generation_limit: worldline.generation_limit,
      internal_status: worldline.emulation.internal_status,
      upstream_status: worldline.emulation.upstream_status,
      channel: worldline.emulation.channel,
      base_commit: worldline.emulation.base.commit,
      host_digest: worldline.emulation.base.digest.value,
      capsule_digest: worldline.emulation.capsule.digest.value
    };
  }

  function composeWorldlineEmulationPrompt(worldlineId, entrypointOrRole, task, options = {}) {
    const worldline = resolveWorldline(worldlineId);
    const emulation = worldline.emulation;
    if (!emulation) throw new Error('Worldline has no emulator capsule: ' + worldlineId);
    const normalized = String(entrypointOrRole || '').trim();
    const guestRoot = safeResolve(root, worldline.root);
    const boundary = [
      'Worldline: ' + worldline.id,
      'Internal status: ' + emulation.internal_status,
      'Upstream status: ' + emulation.upstream_status,
      'Channel: ' + emulation.channel,
      'Generation: ' + worldline.lineage_generation + '/' + worldline.generation_limit,
      'Resolved base commit: ' + emulation.base.commit,
      'Host asset digest (sha256): ' + emulation.base.digest.value,
      'Capsule digest (sha256): ' + emulation.capsule.digest.value,
      'Internal authority: ' + emulation.authority_projection.internal,
      'Upstream projection: ' + emulation.authority_projection.upstream,
      'Internal decisions do not promote or mutate the Stable Host.'
    ].join('\n');
    const parts = [
      '# Stable Host Protocol',
      loadProtocol(),
      '# Internal-Stable Emulator Boundary',
      boundary,
      '# Candidate Protocol Overlay',
      loadWorldlineAsset(worldlineId, emulation.protocol_overlay)
    ];

    const entrypoint = emulation.entrypoints[normalized];
    if (entrypoint) {
      parts.push('# Candidate Entrypoint: ' + normalized, loadWorldlineAsset(worldlineId, entrypoint.document));
      parts.push('# Machine-readable Candidate Schema: ' + entrypoint.schema, loadWorldlineAsset(worldlineId, emulation.schemas[entrypoint.schema]));
    } else {
      const role = resolveRole(normalized);
      parts.push('# Stable Host Role: ' + role.name, loadRole(role.name));
      const overlay = emulation.role_overlays[role.name];
      if (overlay) parts.push('# Candidate Role Overlay: ' + role.name, loadWorldlineAsset(worldlineId, overlay));
    }
    if (options.record) parts.push('# Existing Candidate Record', typeof options.record === 'string' ? options.record : JSON.stringify(options.record, null, 2));
    if (options.handoff) parts.push('# Handoff', typeof options.handoff === 'string' ? options.handoff : JSON.stringify(options.handoff, null, 2));
    if (options.context) parts.push('# Project Context', String(options.context));
    parts.push('# Current Task', String(task || ''));
    return parts.join('\n\n');
  }

  function validateWorldlineArtifact(worldlineId, schemaName, input) {
    const worldline = resolveWorldline(worldlineId);
    const schemaPath = worldline.emulation?.schemas?.[schemaName];
    if (!schemaPath) throw new Error('Unknown schema in worldline ' + worldlineId + ': ' + schemaName);
    let value;
    try {
      value = parseInput(input);
    } catch (error) {
      return { valid: false, errors: [{ message: error.message }], value: null };
    }
    const schema = JSON.parse(loadWorldlineAsset(worldlineId, schemaPath));
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    const validator = ajv.compile(schema);
    return { valid: Boolean(validator(value)), errors: validator.errors || [], value };
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
    if (worldline.emulation && (typeof cycle?.experience_id !== 'string' || cycle.experience_id.trim() === '')) {
      throw new Error('An emulated generation requires a distinct experience_id');
    }
    if (worldline.emulation && cycle?.candidate_digest !== worldline.emulation.capsule.digest.value) {
      throw new Error('An emulated generation requires the current capsule digest');
    }

    const generation = worldline.lineage_generation + 1;
    worldline.lineage_generation = generation;
    const record = {
      generation,
      status: 'completed',
      roles_completed: REQUIRED_GENERATION_ROLES,
      evidence: [...cycle.evidence]
    };
    if (worldline.emulation) {
      record.experience_id = cycle.experience_id;
      record.candidate_digest = cycle.candidate_digest;
    }
    worldline.generation_records.push(record);
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
    resolveProtocolPath,
    loadProtocolPath,
    listWorldlines,
    resolveWorldline,
    resolveWorldlineRole,
    loadWorldlineRole,
    composeWorldlineRolePrompt,
    loadWorldlineAsset,
    describeWorldlineEmulation,
    composeWorldlineEmulationPrompt,
    validateWorldlineArtifact,
    advanceWorldline,
    decideWorldline,
    completeWorldlineExtension
  };
}

module.exports = {
  REQUIRED_GENERATION_ROLES,
  safeResolve,
  calculateCapsuleDigest,
  checkWorldlineRegistryInvariants,
  checkWorldlineInvariants,
  createWorldlineTools
};
