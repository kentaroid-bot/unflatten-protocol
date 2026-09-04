# Unflatten Handoff Contract

## Purpose

Handoff Contractは、役割または担当が変わるときに、問いの重要な次元が失われたり、仮説の変更が暗黙に行われたりすることを防ぐための受け渡し仕様です。

Handoffは結論の要約ではありません。次の担当が、同じ問いを同じ解像度で受け取り、何を維持し、何を疑い、何を検証し、どの条件で転換できるかを判断するための状態記録です。

Unflattenの概念、反証およびPivotの意味は `docs/protocol.md` に従います。このファイルはHandoffの構造と運用だけを定義します。

## When a Handoff Is Required

次の場合にHandoffを作成または更新します。

- 思考モードまたは役割を切り替えるとき
- 別の担当またはエージェントへ作業を委任するとき
- 仮説を `Advance`、`Revise`、`Replace` または `Hold` と判断したとき
- 長い作業を中断し、後から再開するとき
- 複数の仮説を統合判断へ渡すとき

同じ役割のまま短い作業を継続し、評価対象にも判断にも変化がない場合は、毎回新しいHandoffを作成する必要はありません。

## Contract Principles

1. **Preserve Dimensions**: 要約によって、問いに固有の重要な次元を失わせない。
2. **Separate Fact from Hypothesis**: 観測された事実、推論、仮説および未検証事項を混同しない。
3. **Record Transformation**: 仮説を変更した場合、変更前後と根拠を記録する。
4. **Expose Falsifiers**: 仮説を棄却する条件を、評価前に可能な限り明示する。
5. **Allow Rejection**: 後続の担当へ、前工程の結論への同意や維持を要求しない。
6. **Prevent Regression**: 仮説を棄却しても、問いを一般論へ戻さない。
7. **Mark Unknowns**: 不足情報を推測で埋めず、未検証として残す。
8. **Preserve Residuals**: 証拠不足と現在のスキーマによる評価不能を区別し、後者を由来とともに保存する。

## Canonical Schema

```yaml
handoff:
  protocol_version: "0.1.0"
  from_role: "innovator | auditor | engineer | integrator | other"
  to_role: "innovator | auditor | engineer | integrator | other"
  reason: "役割または担当を切り替える理由"

  inquiry:
    problem_tension: "問いを生じさせている緊張、違和感または未説明の現象"
    current_question: "現在答えようとしている問い"
    distinct_dimensions:
      - dimension: "一般論へ還元すると失われる重要な次元"
        significance: "この次元が重要である理由"
    flattening_risks:
      - "この問いで起こりやすい平坦化"

  hypothesis:
    statement: "現在評価している尖った仮説"
    core_claims:
      - "仮説を別物にせず変更できない中核的主張"
    mechanism: "想定される作用機序"
    assumptions:
      - assumption: "仮説の成立に必要な前提"
        status: "supported | contradicted | unknown"
    scope:
      applies_to: []
      does_not_apply_to: []

  hypothetical_world:
    description: "仮説が広く成立した世界"
    consequences:
      primary: []
      secondary: []
      tertiary: []
    opportunities: []

  evaluation:
    falsifiers:
      - "観測された場合に中核的主張を棄却する条件"
    evidence:
      supporting: []
      contradicting: []
      unknown: []
    tests_completed: []
    tests_remaining: []

  decision:
    status: "advance | revise | replace | hold | not_evaluated"
    rationale: "判断と証拠を結びつける説明"
    preserved_dimensions: []
    rejected_claims: []
    revisions: []

  pivot:
    trigger: "Pivotを必要とした反証または発見"
    learned_structure: []
    pivot_seeds: []
    next_hypothesis: "形成済みの場合に記入する新しい尖った仮説"

  epistemic_remainder:
    residuals:
      - observation: "現在の評価スキーマでは意味を失わずに表現できない差異"
        schema_limit: "どの分類・前提・評価器が表現を妨げているか"
        provenance: "この残余が現れた観測、反証またはDissent"
        review_when: "再評価を開始する条件"
    dissent:
      - position: "統合せず保持する異論"
        holder: "異論の主体。不明または匿名の場合はその旨"
        unresolved_because: "合意へ統合しない理由"

  next_step:
    objective: "次の担当が達成する具体的な目的"
    constraints: []
    expected_output: []
    unresolved_questions: []
```

## Field Rules

### Inquiry

`inquiry`は、個々の仮説より長く維持される探索対象を記録します。

- `problem_tension`には、単なるテーマではなく、なぜ探索が必要なのかを記述します。
- `current_question`には、現在の作業で答えられる粒度の問いを記述します。
- `distinct_dimensions`には、一般論へ還元すると消える差異と、その重要性を対で記述します。
- `flattening_risks`には、この問いでAIが選びやすい無難な短絡を具体的に記述します。

`problem_tension: AIについて考える`のような一般的なテーマ名だけでは不十分です。

### Hypothesis

`hypothesis`は、現在評価している一つの尖った仮説を記録します。複数の独立した仮説がある場合は、Handoffを分けるか、仮説ごとに識別子を付けてください。

- `statement`は、正誤を判断できる主張として記述します。
- `core_claims`は、変更すると別の仮説になる境界を示します。
- `mechanism`は、結果だけでなく、なぜその結果が生じるのかを記述します。
- `assumptions`は、前提ごとに支持、矛盾または未検証を区別します。
- `scope`は、適用範囲の限定を隠れた後退ではなく、明示的な境界として記録します。

### Hypothetical World

`hypothetical_world`は、仮説の射程を検証前に縮小しないための記録です。

波及効果は次のように区別します。

- `primary`: 仮説の作用から直接生じる変化
- `secondary`: 一次変化に対する人、組織または市場の応答
- `tertiary`: 二次変化が制度、価値観または長期構造へ与える変化

### Evaluation

`evaluation`は、仮説を守るためではなく、正しく棄却できるように記録します。

- `falsifiers`は抽象的な懸念ではなく、中核的主張と両立しない観測を記述します。
- `supporting`と`contradicting`には、希望や印象ではなく、確認した論理、証拠または結果を記録します。
- 情報がない場合は`unknown`へ記録し、空欄を都合のよい推測で埋めません。
- 未実施の検証を`tests_completed`へ含めてはいけません。

### Decision

`decision.status`は次のいずれかです。

- `advance`: 中核的主張が維持され、次の設計、実装または展開へ進む
- `revise`: 中核を保ったまま、条件、範囲または作用機序を修正する
- `replace`: 中核的主張を棄却し、別の尖った仮説へ転換する
- `hold`: 証拠不足により、成立も棄却も確定しない
- `not_evaluated`: まだ評価フェーズへ入っていない

`rationale`には、判断を証拠または未検証状態と結びつけて記述します。「妥当そうである」のような印象だけでは不十分です。

### Pivot

`pivot`は、`replace`の場合に必須です。

- `trigger`には、元の仮説を棄却した具体的な理由を記録します。
- `learned_structure`には、反証によって新しく判明した制約、関係または異常を記録します。
- `pivot_seeds`には、一般論へ戻らず探索できる複数の方向を残します。
- `next_hypothesis`は、新しい仮説が十分に形成された場合だけ記入します。

元の仮説を弱く言い換えただけのものを`next_hypothesis`としてはいけません。

### Next Step

`next_step`は、後続の担当に期待する作業を限定します。

`objective`は役割名ではなく、完了を判断できる目的として記述します。`expected_output`には、後続の担当が返すべき具体的な成果物を記録します。

### Epistemic Remainder

`epistemic_remainder`は、既存の評価で回収できなかったものを失敗や空欄として消去しないための記録です。

- `residuals`は単なる証拠不足ではなく、現在の分類または評価方法では意味を保持できない差異に使用します。
- `schema_limit`には「よく分からない」ではなく、どの前提や分類が対象を表現できないかを記述します。
- `provenance`によってResidualを生んだ観測、反証または異論へ接続します。
- `review_when`には時刻だけでなく、新しい測定方法、概念、当事者の証言など再評価を可能にする条件を記述できます。
- `dissent`は多数意見へ吸収せず、誰のどの異論が残っているかを保存します。

## Completeness by Transition

すべてのフィールドが、すべての切り替えで必須なのではありません。遷移ごとの最低条件は次のとおりです。

### Innovator to Auditor

- `inquiry`の全項目
- `hypothesis`の全項目
- `hypothetical_world`の全項目
- `evaluation.falsifiers`
- `decision.status: not_evaluated`
- `next_step`

### Auditor to Engineer

- Innovatorから受け取った内容
- `evaluation`の全項目
- `decision.status: advance`または`revise`
- 修正がある場合は`decision.revisions`
- 実験または実装へ変換する`next_step`

### Auditor to Innovator

- `evaluation`の全項目
- `decision.status: replace`または`hold`
- `replace`の場合は`pivot`の全項目
- 再探索のための`next_step`

### Engineer to Integrator

- 実装または実験によって得た`evaluation.evidence`
- 完了した検証と残る検証
- 実装時に発見した制約
- 現在の`decision`
- 判断に必要な`next_step`

### Integrator to Any Role

- 採用、保留または棄却した内容
- 判断の根拠
- 維持する重要な次元
- 再評価条件
- 次の役割と具体的な目的

## Unknown and Not Applicable

値が不明な場合は、空文字や推測ではなく`unknown`または説明付きの未検証項目を使用します。

構造上適用されないフィールドは`not_applicable`とし、適用されない理由を近くに記述します。

不明であることと、存在しないことを混同してはいけません。

## Handoff Validation

Handoffを渡す前に、次を確認します。

- 問いの重要な次元が少なくとも一つ明示されている
- 仮説と観測事実が区別されている
- 中核的主張と成立条件が区別されている
- 評価済みの場合、判断が証拠へ接続されている
- `replace`の場合、棄却理由とPivotの種がある
- 未検証事項が推測で埋められていない
- 証拠不足と、現在のスキーマでは評価不能なResidualが区別されている
- 次の担当の目的と期待成果物が具体的である
- 受け渡しによって元の問いが一般論へ変わっていない

条件を満たさない場合、後続の担当が保守的な解釈で補ってはいけません。不足を明示し、必要な役割または作業へ戻してください。
