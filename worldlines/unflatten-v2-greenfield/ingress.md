# Greenfield Ingress Contract

## Purpose

Greenfield Ingressは、AIが完全に新しい生成作業の問題設定、勝利条件または成果形態を依頼者より先に決めることを防ぐ、role選択前の入口です。

これは一般的なproject intake formではありません。既存のMotive Record、Handoffまたは十分な依頼文がないまま、**新しいcanonical hypothesisまたはWorldlineを開始する場合**だけ適用します。既知の情報を再質問せず、動機が不足している場合は、もっともらしい仮説で穴を埋める代わりにMotive Queryを正規の一手として返します。

Unflattenの不変条件、反証およびPivotはStable Hostの `docs/protocol.md` と、このCapsuleの `protocol-overlay.md` に従います。Greenfield Ingressはroleではなく、roleを選ぶ前の状態機械です。Guest roleの存在に依存しません。

## Activation Boundary

次の二条件を両方満たす場合に起動します。

1. 作業が、新しいcanonical hypothesisまたは新しいWorldlineを生成する。
2. その生成系譜に十分なMotive Recordが、現在の依頼、既存artifactまたはHandoffから観測できない。

新しいrepositoryやdirectoryであることだけでは起動条件になりません。既存repository内でも新しい生成系譜なら対象になり得ます。反対に、新しいrepositoryでも、動機と仕様が既に十分に記録され、実装だけを行う場合は再質問しません。

軽微修正、既存仮説の監査、既に判断済み範囲の実装および通常の継続作業には適用しません。

## Two Independent Records

### Motive Record

問いを必要にした生成起点を保持します。

- `original_question`: 観測できる原問。存在しない場合は`unknown`。
- `generative_tension`: 背景にある違和感、未説明の現象または衝突。
- `source_fragments`: 経験、比喩、失敗、資料またはNoiseとその由来。
- `desired_difference`: 一般的な成果では得られない、望まれる変化。
- `basis`: `author_confirmed | direct_record | inferred | unknown`。
- `provenance`: claimをどこで誰がいつ記録したか。
- `disclosure`: `public | redacted | restricted_reference`。

複数の人または資料が異なる動機を持つ場合、単一の最大公約数へ統合しません。別々のMotive Claimとして保存します。

`author_confirmed`は、確認者がその時点でそのclaimを宣言した事実を表します。記憶以前の真の歴史的起源、他者の動機または因果的な唯一性を証明しません。確認には`confirmed_by`と`confirmed_at`を記録します。

### Outcome Envelope

成果を現在どのような形で世界へ出したいかを保持します。

- `purpose`: 現在の作業目的。
- `audience`: 利用者または読者。
- `artifact_forms`: code、document、repository、experimentなどの初期形態。
- `finish_level`: prototype、reviewable、production等の初期水準。
- `constraints`: 時間、互換性、安全、変更禁止範囲。
- `completion_evidence`: 何を観測したら一旦完了とするか。

Outcome EnvelopeはMotive Recordではありません。形態または仕上がり水準が変わっても、動機が維持される場合があります。`specified | partial | deferred | revised`を明示し、初期値を不変の勝利条件にしません。

`partial`または`deferred`では、まだ観測されていないfieldを省略できます。`partial`は少なくとも一つの観測済みfieldを持ち、何も決まっていない場合は`deferred`を使います。`unknown`、仮の一般論または推測で欄を埋めてはいけません。`specified`は全fieldを持ち、`revised`は全fieldに加えて変更理由を記録します。

## State Machine

```text
not_applicable
      |
      v
greenfield_detected
      |
      +--> ready ----------------------> role_selection
      |
      +--> query_required --answered--> ready ----------> role_selection
      |          |
      |          +--declined/unavailable--> hold
      |
      +--> safety_exception_logged ----> urgent_action
                                           |
                                           +--> follow_up_ingress
```

- `ready`: role選択に必要なMotive Recordが観測できる。record自体は`partial`または`redacted`でもよい。
- `query_required`: 動機の重要部分が不足し、具体的なMotive Queryが一つ提示されている。
- `hold`: 回答が拒否または取得不能で、canonical生成を開始しない。
- `safety_exception_logged`: 人身、安全、incident responseまたは期限付き危害防止を優先し、Ingressの不足と事後確認義務を記録する。

`safety_exception_logged`の`follow_up_required`は常に`true`です。緊急対応後にIngressが完了した場合は、例外を免除へ変えるのではなく、recordを別の通常stateへ更新します。

`partial`または`redacted`は自動的な失敗ではありません。何が分かり、何が伏せられ、何がunknownかを後続roleが判断できることが重要です。

## Query Policy

1. 依頼文、既存artifact、Handoffから既知情報を先に抽出する。
2. 不足を一括質問票にしない。
3. 最初は、生成力の高い自由回答の問いを一度に一つだけ尋ねる。
4. artifact形式や既存カテゴリの選択肢を、動機の自由回答より先に押し付けない。
5. 回答できない、まだ言葉にならない、開示したくない、を有効な応答として扱う。

最初の問いの例:

> この作業を始めたいと思った出来事、違和感、またはまだ解けていない緊張は何ですか？

質問数を満たすことが目的ではありません。role選択と最初の一手に必要な差異が既に観測できるなら、それ以上尋ねません。

## Role Selection

Ingress後のroleは、repositoryの新旧ではなく現在の作業フェーズから選びます。

- 未形成の問いや仮説を探索する: Innovator
- 既に形成された仮説を反証する: Auditor
- 判断済み仕様を構築する: Engineer
- 複数成果を接続判断する: Integrator

Greenfieldだから常にInnovatorとは限りません。外部仕様が既に完成しており、新しいrepositoryへ実装するだけならEngineerが適切な場合があります。

## Privacy and Safety Boundary

- rawな個人的経験、被害、政治的立場、医療情報、営業秘密または認証情報の公開をGate条件にしません。
- 必要に応じてredacted summary、restricted reference、digestまたは`unknown`を使います。
- `Human Confirmation`を要求するために、回答者へ自己暴露を強制しません。
- 緊急の危害停止やincident responseをMotive Query待ちで遅らせません。例外理由、欠落情報、follow-up requirementを記録します。

## Validation Boundary

`schema/ingress-record.schema.json`は、recordの形、列挙状態、queryまたは例外に必要な明示情報を検査します。次は証明しません。

- Motive Claimが真の歴史的起源であること
- 確認者の暗号学的本人性
- 記述が十分に尖っていること
- ヒアリングが実際に平坦化を減らしたこと
- Outcome Envelopeが依頼者の暗黙の期待をすべて含むこと

静的検証を意味的なGate通過認定として使ってはいけません。実効果は、lineage recovery、unknown-originの誤認、boilerplate/confabulation、query abandonment、人間の負荷を実runで観測して評価します。
