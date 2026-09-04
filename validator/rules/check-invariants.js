'use strict';

function getHandoff(value) {
  return value && typeof value === 'object' && value.handoff ? value.handoff : value;
}

function checkInvariants(value) {
  const handoff = getHandoff(value);
  const findings = [];
  if (!handoff || typeof handoff !== 'object') {
    return [{ rule: 'handoff-object', severity: 'error', message: 'Handoffオブジェクトがありません。' }];
  }

  const dimensions = handoff.inquiry?.distinct_dimensions;
  if (!Array.isArray(dimensions) || dimensions.length === 0) {
    findings.push({ rule: 'preserve-dimensions', severity: 'error', message: 'Distinct Dimensionsが一つも保存されていません。' });
  }

  const status = handoff.decision?.status;
  if (status === 'replace') {
    if (!handoff.pivot?.trigger) {
      findings.push({ rule: 'trace-replacement', severity: 'error', message: 'replaceには具体的なpivot.triggerが必要です。' });
    }
    if (!Array.isArray(handoff.pivot?.learned_structure) || handoff.pivot.learned_structure.length === 0) {
      findings.push({ rule: 'preserve-learning', severity: 'error', message: 'replaceには反証から得たlearned_structureが必要です。' });
    }
    if (!Array.isArray(handoff.pivot?.pivot_seeds) || handoff.pivot.pivot_seeds.length === 0) {
      findings.push({ rule: 'pivot-without-regression', severity: 'error', message: 'replaceには一般論へ戻らないpivot_seedsが必要です。' });
    }
  }

  if (status === 'revise' && (!Array.isArray(handoff.decision?.revisions) || handoff.decision.revisions.length === 0)) {
    findings.push({ rule: 'trace-revision', severity: 'error', message: 'reviseには変更内容の記録が必要です。' });
  }

  if (status === 'hold') {
    const unknown = handoff.evaluation?.evidence?.unknown;
    const remaining = handoff.evaluation?.tests_remaining;
    if ((!Array.isArray(unknown) || unknown.length === 0) && (!Array.isArray(remaining) || remaining.length === 0)) {
      findings.push({ rule: 'explain-hold', severity: 'warning', message: 'holdの原因となる未知または未実施テストが記録されていません。' });
    }
  }

  return findings;
}

module.exports = { checkInvariants };
