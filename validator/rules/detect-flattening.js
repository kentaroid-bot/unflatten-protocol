'use strict';

const GENERIC_ESCAPE_PATTERNS = [
  { id: 'case-by-case', pattern: /ケースバイケース|一概には言えな(?:い|ません)/u },
  { id: 'generic-balance', pattern: /メリットとデメリット|利点とリスク(?:が|を)/u },
  { id: 'generic-appropriateness', pattern: /適切(?:な|に)(?:対応|検討|管理|運用)(?:が必要|する必要)/u },
  { id: 'premature-category', pattern: /つまり(?:既存の|一般的な).{0,40}(?:です|である)/u },
  { id: 'past-data-veto', pattern: /(?:前例|成功事例|実証データ)(?:が|は)(?:存在し)?ない.{0,30}(?:不可能|誤り|実現できない)/u },
  { id: 'implementation-veto', pattern: /実装方法(?:が|は)(?:まだ)?(?:不明|未定).{0,30}(?:不可能|誤り|価値がない)/u }
];

function detectFlattening(text) {
  if (typeof text !== 'string') {
    throw new TypeError('detectFlattening expects a string');
  }

  const findings = [];
  for (const rule of GENERIC_ESCAPE_PATTERNS) {
    const match = rule.pattern.exec(text);
    if (match) {
      findings.push({
        rule: rule.id,
        severity: 'warning',
        excerpt: match[0],
        message: '平坦化の可能性があります。文脈上必要な表現か、Distinct Dimensionsを消していないか確認してください。'
      });
    }
  }
  return findings;
}

module.exports = { detectFlattening, GENERIC_ESCAPE_PATTERNS };
