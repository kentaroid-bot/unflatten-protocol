'use strict';

const DIMENSIONS = [
  { id: 'hypothesis', patterns: [/仮説/u, /hypothesis/i] },
  { id: 'distinct_dimensions', patterns: [/重要な次元|Distinct Dimensions?/iu] },
  { id: 'mechanism', patterns: [/作用機序|因果(?:経路|機序)|mechanism/i] },
  { id: 'scope', patterns: [/適用範囲|適用外|scope/i] },
  { id: 'falsifier', patterns: [/反証条件|falsif(?:y|ier|ication)/i] },
  { id: 'residual', patterns: [/残余|Residual/i] },
  { id: 'pivot', patterns: [/Pivot(?: Seed)?/i, /ピボット|転換/u] }
];

function measureSharpness(text) {
  if (typeof text !== 'string') {
    throw new TypeError('measureSharpness expects a string');
  }

  const present = [];
  const missing = [];
  for (const dimension of DIMENSIONS) {
    const found = dimension.patterns.some((pattern) => pattern.test(text));
    (found ? present : missing).push(dimension.id);
  }

  return {
    score: present.length / DIMENSIONS.length,
    present,
    missing,
    interpretation: '語彙上の事前検査であり、成果物の意味的な尖りを証明するスコアではありません。'
  };
}

module.exports = { measureSharpness, DIMENSIONS };
