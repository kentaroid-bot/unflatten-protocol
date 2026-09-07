'use strict';

// Deterministic, fictional example. No model call, external action or real consent.
const fs = require('node:fs');
const path = require('node:path');
const sdk = require('../../validator');

function demo() {
  let record = sdk.createInquiry(fs.readFileSync(path.join(__dirname, 'seed.yaml'), 'utf8'));
  const evidence = [{kind: 'simulation', source: '架空の制作条件', note: '各人の提供範囲を設定した思考実験'}];
  const move = (kind, note, data = {}, extra = {}) => {
    record = sdk.recordInquiryMove(record, {kind, actor: 'example-author', note, data, ...extra});
  };
  move('explore', '公開と保留を異なる未来として保持する。', {alternatives: [
    {id: 'publish', claim: '全員の素材を一つの作品として公開する', mechanism: '編集と公開判断を集約する',
      falsifiers: ['素材の公開が委任範囲を越える'], evaluation_frame: '作品全体の成立と提供者の委任境界'},
    {id: 'hold', claim: '追加同意まで公開を保留する', mechanism: '不可逆な公開を延期する',
      falsifiers: ['公開期限そのものが作品の成立条件である'], evaluation_frame: '将来の実践可能性と制作の成立'}
  ]});
  move('dissent', '少数の異論を平均化しない。', {holder: '乙（架空）', position: '相談の提供を草稿公開へ広げないでほしい',
    source: '例の設定', revisit_when: '本人が提供条件の変更を望んだとき'});
  move('reframe', '共同制作という動機を保ち、目的から材料を集める方向と、提供から構成を作る方向を往復する。',
    {question: '各人が提供できるものから、全体として成立する作品の構成を発見できるか。'});
  move('explore', '未提供の素材を使わず、相談を制作過程に接続する案を試す。まだ成立は未確認。', {alternatives: [
    {id: 'compose', claim: '公開可能な素材で全体を作り、非公開相談は制作過程で接続する',
      mechanism: '公開物への参加と制作への貢献を分け、作品の構成自体を試作する',
      falsifiers: ['非公開素材がなければ作品が成立しない', '相談内容の利用も委任されていない'],
      evaluation_frame: '参加形態の違いを保った全体の成立', derived_from: ['publish', 'hold']}
  ]});
  for (const [id, verdict, whole, agency, reason] of [
    ['publish', 'rejected', 'preserved', 'lost', '設定上、乙の草稿公開は委任されていない'],
    ['hold', 'held', 'unknown', 'preserved', '公開期限と作品成立の関係は未設定'],
    ['compose', 'open', 'unknown', 'unknown', '作品の成立と相談利用の条件を本人と確認する必要がある']
  ]) {
    move('assess', reason, {alternative_id: id, verdict, criterion: '各候補の評価文法を作品と提供条件に照らす',
      effects: [{dimension_id: 'whole', outcome: whole, reason}, {dimension_id: 'agency', outcome: agency, reason}]}, {evidence});
  }
  move('mode', '次の試作の範囲を提案として渡す。', {mode: 'decision'});
  move('commit', '第三案の試作を提案する。元の目的を達成したとは判定しない。', {
    selected: ['compose'], decision_maker: '架空の制作チーム',
    authority: {status: 'pending', basis: 'この例では試作・相談利用の委任は未確認'},
    scope: '公開前の構成試作。実際の公開判断は含まない', affected_parties: ['甲（架空）', '乙（架空）'],
    accepted_tradeoffs: ['whole', 'agency'].map(dimension_id => ({alternative_id: 'compose', dimension_id,
      reason: '不確実性として提案に残す。実行前に確認する'})),
    stop_when: '提供条件を越える、または本人が中止を求める', review_when: '試作の成立と提供条件を確認できたとき'
  }, {evidence});
  return record;
}

if (require.main === module) process.stdout.write(JSON.stringify({fictional_example: true, record: demo()}, null, 2) + '\n');
module.exports = {demo};
