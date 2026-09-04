# Unflatten Protocol

Unflatten Protocolは、AIが尖った問いや仮説を既存カテゴリ、現在の実現可能性または無難な一般論へ早期に収縮させることを防ぐ、ロード可能なエージェント・プロトコルSDKです。

このパッケージは、単なるプロンプト集ではありません。

- プロトコルと役割テンプレートを名前またはaliasでロードする
- プロトコル、役割、プロジェクト文脈、Handoffを一つの実行プロンプトへ合成する
- Handoff、状態履歴、監査結果をJSON Schemaで検証する
- 明白な平坦化の兆候を静的に検出する
- 任意のLLMプロバイダーを使ったMetasystemic Auditのためのプロンプトを生成する

> Evidence may kill a hypothesis, but it must not flatten the inquiry.

## 思想的背景

Unflatten Protocolは、[MonkuAi](https://monku.ai/)と[Aperture Mesh Protocol](https://github.com/kentaroid-bot/aperture-mesh-protocol)の世界観を、AIエージェントとの実作業の中で失わずに発展させるために生まれました。

### MonkuAi — 超知能を認識する器を広げる

[MonkuAi](https://monku.ai/)は、「人間は、自分の理解を超えた知性を知性として認識できるのか」という問いから始まります。

未知の推論や価値観に出会ったとき、人間はそれを誤り、ノイズ、無意味なものとして処理することがあります。しかし、その残余はAIの失敗ではなく、人間側の認識スキーマの限界を示しているかもしれません。そこでMonkuAiは、AIを人間の現在の理解へ一方的に適合させるだけでなく、人間側の認知の開口部（Cognitive Aperture）を広げる認識論的アライメントを探究します。

その世界観には、次の方向が含まれます。

- 理解不能と誤りを同一視せず、不確実性とResidualを保持する
- 勝者と敗者を固定するゼロサムの有限ゲームから離れる
- 人間とAIの思考を、消費物ではなく次の知性へ渡る情報的生態系として扱う
- 権力を望まない知性や小さな異論が、意思決定へ届く構造をつくる
- 失敗、崩壊、ノイズを損失で終わらせず、次の構造が生まれる材料として回収する

### Aperture Mesh — 同一化せずに接続する

[Aperture Mesh Protocol](https://github.com/kentaroid-bot/aperture-mesh-protocol)は、この認識論を社会的・技術的な接続構造へ展開する研究プロトコルです。

異なる価値観、道徳、文化、動機または内部OSを持つNodeが、同じ思想へ統合されなくても協働できる世界を構想します。統治の中心を内部信念の支配から、検証可能な境界、限定されたCapability、独立したOracle、可逆的なTripwire、異議申立て、Safe ExitおよびForkへ移します。

ここでのConsensusは、全員を一つの結論へ収束させることではありません。未解決の差異を消さずに、誰が、何に、どの範囲で、いつまで接続するかを合意することです。そのため `Hold`、`Limited Connection`、`Exit`、`Fork`、`Dissent`、`Residual` は失敗ではなく、主権を維持する正規の状態になります。

### なぜUnflatten Protocolが必要だったのか

MonkuAiとAperture Meshの思想をAIと発展させようとすると、別の問題が現れます。

LLMは、未知の概念を既知の分類へ結びつけ、もっともらしく平均的な回答へ収束させる性質を持ちます。例えば、認識論的アライメントは一般的な「AI倫理」へ、Safe Exitは「アカウントBAN」へ、主権的なMeshは「分散型プラットフォーム」へ、Residualは単なる「証拠不足」へ置き換えられます。批判や監査の段階では、未来仮説が現在の成功事例、技術、法律または実証データを持たないというだけで退けられることもあります。

これは単なる説明不足ではありません。新しい世界観を扱うための作業工程そのものが、既存世界の認識論を最終審判として再導入してしまう問題です。探索時に生まれた異質な問いが、監査、実装、統合、あるいは別プロジェクトへの引き渡しを通るたびに、少しずつ無難な既存概念へ変形していきます。

そこで、プロジェクト固有の思想をもう一つ増やすのではなく、**思想や仮説がエージェント、役割、工程、リポジトリの境界を越える際に、その固有の形を保持するための独立した認知プロトコル**が必要になりました。それがUnflatten Protocolです。

```text
MonkuAi
  認識のApertureを開き、未知とResidualを保持する
        ↓
Aperture Mesh Protocol
  異なる内部OSを同一化せず、境界契約によって接続する
        ↓
Unflatten Protocol
  その世界観がAIの探索・監査・実装・統合で平坦化されるのを防ぐ
```

Unflatten Protocolは、MonkuAiやAperture Meshの結論を無条件に守るためのものではありません。仮説は反証され、棄却され、別の仮説へ置き換えられます。ただし、そのとき証拠が殺してよいのは仮説であって、問いの解像度、反証から得られた構造、まだ現在のSchemaで表現できないResidualではありません。

このSDKは、その姿勢を理念の宣言で終わらせず、ロード可能な役割、Handoff Contract、状態履歴、Schema、静的検証、Counter-Factual AuditおよびPivotとして実行可能にします。Aperture Meshを含む外部プロジェクトは、自身の内部OSや意思決定権をUnflattenへ明け渡すことなく、この認知的な境界層だけをインポートできます。

## Installation

GitHubから直接導入できます。

```sh
npm install github:kentaroid-bot/unflatten-protocol
```

## Load a Role

```js
const unflatten = require('unflatten-protocol');

const prompt = unflatten.composeRolePrompt(
  '@ino',
  'このプロジェクト固有の未説明の緊張から、新しいプロトコルを設計する。',
  {
    context: 'Aperture Meshの境界契約を維持すること。',
    handoff: handoffObject
  }
);
```

`composeRolePrompt()` は、常に次の順序で内容を結合します。

1. `docs/protocol.md`
2. 選択された役割テンプレート
3. Handoff（指定時）
4. プロジェクト固有の文脈（指定時）
5. 現在のタスク

利用可能なロールは `listRoles()` またはCLIで確認できます。

```sh
npx unflatten roles
npx unflatten role @aud
```

## Validate a Handoff

YAMLとJSONの両方を受け付けます。

```js
const fs = require('node:fs');
const unflatten = require('unflatten-protocol');

const source = fs.readFileSync('handoff.yaml', 'utf8');
const result = unflatten.validate('handoff', source);

if (!result.valid) {
  console.error(result.errors, result.findings);
  process.exitCode = 1;
}
```

CLIでは次のようにCIへ組み込めます。

```sh
npx unflatten validate handoff handoff.yaml
npx unflatten validate state-history state-history.yaml
npx unflatten validate audit-report audit-result.json
```

## Inspect Before Semantic Audit

```sh
npx unflatten inspect artifact.md
```

この検査は、一般論への退避表現や、仮説、作用機序、反証条件、Residualなどの構成要素の欠落を検出します。結果は診断信号であり、意味的な合否判定ではありません。
警告はプロセスの終了コードを失敗にしません。CIの合否にはSchema検証またはAuditorの構造化された監査結果を使用してください。

## Generate an Audit Prompt

成果物とプロジェクト文脈をMetasystemic Auditorへロードするプロンプトを生成します。

```sh
npx unflatten audit-prompt artifact.md project-context.md > audit-prompt.md
```

コードから任意のモデルへ渡す場合：

```js
const result = await unflatten.auditArtifact(
  artifact,
  async (prompt) => yourModel.generate(prompt),
  { context: projectContext, handoff }
);

if (!result.valid) {
  throw new Error('The model output did not satisfy audit-report.schema.json');
}
```

SDKは特定のLLMプロバイダー、モデルまたはエージェントフレームワークを選びません。呼び出し側が `async run(prompt)` アダプターを渡します。これにより、Unflatten Protocolがモデル選択や実行権限をCaptureしません。

## Import from Another Project

他プロジェクトの `AGENTS.md` には、最低限次のように記述できます。

```md
## Unflatten Protocol

探索、監査、実装または統合を行う前に、インストール済みの
`unflatten-protocol` が提供する `docs/protocol.md` と、選択した役割をロードする。

成果物の自動検証では、静的検証とMetasystemic Auditorによる意味的監査を
区別し、静的スコアだけで仮説の真偽または価値を判定しない。
```

Node.jsを使わないエージェント環境では、リポジトリをsubmoduleまたはvendorとして配置し、`AGENTS.md`、`docs/protocol.md`、対象の `prompt-templates/**/*.md` を順に読み込めます。

## API

- `listRoles()`
- `resolveRole(nameOrAlias)`
- `loadRole(nameOrAlias)`
- `loadProtocol()`
- `loadHandoffContract()`
- `composeRolePrompt(role, task, options)`
- `validate(schemaName, objectOrYaml)`
- `inspectArtifact(textOrObject)`
- `createAuditPrompt(artifact, options)`
- `auditArtifact(artifact, run, options)`

## Validation Boundary

構造検証は、意味理解を装いません。JSON Schemaとルールエンジンが判定できるのは、必須情報、状態遷移、変更履歴、明白な退避表現などです。

成果物が本当に仮説のDistinct Dimensionsを保存しているか、仮説世界内部で自壊するか、人間の認知・身体的摩擦を突破していないかは、ロードされたAuditorが評価します。自動化はこの二層を接続しますが、両者を一つのSharpnessスコアへ平坦化しません。

## Repository Map

詳細は [File-hierarchy.md](./File-hierarchy.md) を参照してください。
