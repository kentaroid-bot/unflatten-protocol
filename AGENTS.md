# Agent Directory Rules

## Purpose

このリポジトリは、探索、検証、実装および意思決定を、Unflatten Protocolに基づく異なる思考モードで行います。

このファイルはプロトコルの内容や各役割の振る舞いを重複して定義しません。作業開始時に読むファイル、役割の選択、切り替えおよび引き渡しを管理する入口です。

## Required Reading

作業を開始する前に、次の順序でファイルを実際に読み、その指示を現在の依頼へ適用してください。

1. `docs/protocol.md`
2. 現在選択されている `prompt-templates/core/<role>.md`

役割の切り替えまたは作業の委任を行う場合は、これらに加えて `docs/handoff.md` を読んでください。

概要、役割名または過去の会話だけから内容を推測してはいけません。役割を切り替えた場合は、新しい役割定義ファイルを読み直してください。

## Sources of Truth

- Unflattenの定義、不変条件、状態遷移、反証およびPivotの正本は `docs/protocol.md` です。
- 役割間または担当間のHandoff Contractの正本は `docs/handoff.md` です。
- 各フェーズに固有の目的、禁止事項および出力形式の正本は、対応する `prompt-templates/core/<role>.md` です。
- この `AGENTS.md` は、正本を選択して読み込むためのルーターです。
- SDKから利用する役割名、ショートカット、テンプレートおよびスキーマの対応関係は `manifest.json` が正本です。

同じ規則を複数ファイルへ複製しないでください。共通規則を変更する場合は `docs/protocol.md` を、役割固有の規則を変更する場合は対応する役割定義を更新してください。

役割定義がUnflatten Protocolと矛盾する場合は、`docs/protocol.md` を優先してください。矛盾を暗黙に解消せず、どの記述が競合しているかを明示してください。

## Role Files

プロジェクトルートを基準として、次の役割定義ファイルを使用します。

- **思考・仮説形成:** `prompt-templates/core/innovator.md`
- **批判・反証検証:** `prompt-templates/core/auditor.md`
- **設計・実装:** `prompt-templates/core/engineer.md`
- **統合・意思決定:** `prompt-templates/core/integrator.md`

役割名だけから振る舞いを推測してはいけません。対応するファイルが存在しない場合は、その役割を開始せず、不足している定義を明示してください。

`docs/agent-roles/` は人間と既存エージェント向けの互換パスです。SDKがロードする正本は `prompt-templates/core/` にあり、対応関係は `manifest.json` で解決します。

## Role Selection

ユーザーが役割を指定した場合は、その指定を優先してください。

役割が指定されていない場合は、現在の作業フェーズから次のように選択します。

- 新しいアイデア、未知の可能性または仮説世界を探索する段階では Innovator
- 構築済みの仮説を批判または反証する段階では Auditor
- 仮説を設計、実験または実装へ変換する段階では Engineer
- 複数の成果を統合し、判断または次の行動を決める段階では Integrator

新しい構想または未成熟なアイデアから始める場合、デフォルトの開始役割は Innovatorです。十分な仮説形成が行われる前に、評価や実装の容易さだけを理由として後続の役割へ移ってはいけません。

## Role Switching

役割の切り替えは、思考の観点と作業目的を変更する操作です。

切り替え時は次を行ってください。

1. 現在のフェーズの出力を、`docs/handoff.md` のHandoff Contractに従って記録する。
2. 次の役割定義ファイルを実際に読む。
3. 新しい役割の観点だけを適用し、以前の役割固有の指示を混在させない。
4. Handoffに記録された重要な次元、証拠、反証および未検証事項を評価対象として引き継ぐ。

仮説の結論を維持する義務はありません。ただし、検証せずに問いを平坦化したり、反証から得た情報を失ったりしてはいけません。仮説の継続、修正、棄却およびPivotは `docs/protocol.md` に従って判断してください。

## Role Shortcuts

ユーザーが次のショートカット、または同じ意味の指示を入力した場合は、対応する役割を現在の依頼へ適用します。

- `@ino` → `prompt-templates/core/innovator.md`
- `@aud` → `prompt-templates/core/auditor.md`
- `@eng` → `prompt-templates/core/engineer.md`
- `@int` → `prompt-templates/core/integrator.md`

別のショートカットが指定されるか、作業フェーズの明示的な変更が行われるまで、現在選択されている役割を維持してください。

拡張ロールとメタロールのショートカットは `manifest.json` に定義されています。これらを使用する場合も、`docs/protocol.md`、対象テンプレート、役割切り替え時の `docs/handoff.md` の順で実際に読み込んでください。

## Emulator Worldlines

ユーザーがgestating Worldlineを明示的に選択した場合だけ、`docs/worldlines.md` と対象の `worldlines/<id>/manifest.json` を追加で読み、manifestに宣言されたCapsule assetをロードしてください。

- `internal_status: stable` はWorldline内部の正本性を示し、Stable Hostへの昇格を意味しない。
- `upstream_status: gestating` の間、候補固有規則をrootのprotocolまたは通常roleへ暗黙適用しない。
- 実行記録にはchannel名だけでなく、resolved Host commit、Host asset digest、Capsule digestを残す。
- 内部roleの判断をHostへ投影するときは `advisory_observation` とし、第三世代後のHost Integrator判断を迂回しない。

Versioned Semantic Mountを使用する場合、`~/`をOS homeへ展開してはいけません。`resolveProtocolPath()`、`loadProtocolPath()`または`unflatten path`だけで解決してください。

- `~/…`または`~/v1/…`: Stable Host
- `~/v2/…`: 登録されたv2 provisional latest

CLIではshell展開を防ぐためlogical pathを必ずquoteします。resolverが返すWorldline、generation、base commit、Host digest、Capsule digestを実行記録へ残してください。

## Artifact Validation

成果物の検証を依頼された場合、構造検証だけで意味的監査を完了したことにしてはいけません。

1. `schema/` と `validator/` による構造・状態遷移・明白な欠落の静的検証を行う。
2. `auditor` をロードし、Counter-Factual SteelmanとDual-Stress Auditによる意味的監査を行う。
3. 静的検証結果と意味的監査結果を区別して報告する。

静的なSharpnessスコアは診断信号であり、仮説の価値または真偽を決定する権限を持ちません。

## Delegation

作業を別の担当へ委任する場合は、ユーザーの短い原案だけを渡してはいけません。

委任先へ次を渡してください。

- 使用するプロトコルと役割定義ファイル
- `docs/handoff.md` のHandoff Contractに従った現在の記録
- 担当する作業範囲
- 変更してはならない前提または重要な次元
- 期待する成果物

委任先も、作業開始前にプロトコルと担当する役割定義を実際に読まなければなりません。
