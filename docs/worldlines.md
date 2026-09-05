# Protocol Worldlines

## Purpose

Protocol Worldlineは、未批准の仮説、役割または評価文法を、Stable Hostの正本へ直ちに混入させず、実行可能な状態で育てるための境界です。

これは単なるGit branchやfeature flagではありません。Worldlineは、固有の前提、評価文法、成功・失敗信号、世代記録および親系譜を持つ、検証中の認識体系です。

## Epistemic Board

`docs/protocol.md`のNo Gray Stonesは、対立を平均化された一つの文章ではなく、盤上の異なる位置として表現します。この盤面を **Epistemic Board** と呼びます。

- 石は、その時点で引き受けた明確な仮説、反証または判断です。
- 黒と白は真偽や固定陣営ではありません。
- 取られた石も、何が反証され次の形を生んだかという系譜を残します。
- 盤面の価値は、単一の石、勝率または共通KPIだけでは決まりません。
- 非通約な対局は、無理に同じ盤へ統合せず別Worldlineとして続行できます。

`@ino`と`@aud`は互いの主張を弱めて合意するのではなく、それぞれ明確な手を返します。ただし両者は固定された賛成・反対陣営ではありません。証拠や発見に応じて、自分の以前の手を変更または棄却できます。`@int`は灰色の石を作る役ではなく、どの接続を続け、どこでreviewし、どの系譜をforkまたはspin-outするかを決めます。

## Host, Guest and Gestation

- **Stable Host**: 現在共有されるprotocol、権限境界および安全境界を保持する母体。
- **Guest Worldline**: Host内部で正本化されずに実行される候補系譜。
- **Generation**: 単なる修正回数ではなく、Innovator、Auditor、Integratorの完全サイクルと証拠を持つ経験単位。
- **Gestation Window**: 最大三世代の有限な孵化期間。成熟度スコアではなく、判断を必ず発生させる割込み境界。
- **Birth / Spin-out**: 親repository、親commit、親Worldlineおよび分岐理由を持って新しいrepositoryへ独立すること。

第三世代では自動昇格しません。Integratorは、理由と証拠を持つ`operational_decision`として次を選びます。

- `promote`: Stable側へ統合する候補とする。
- `spin_out`: 独立repositoryとして出生させる。
- `archive`: 再開可能な休眠・記録として残す。
- `terminate`: 明示した理由とともに終了する。
- `extend_once`: 第四世代を作らず、第三世代review内で一回だけ追加観測する。

`extend_once`と、その後の最終判断は別々のdecisionとして残ります。後の判断で前の判断理由を上書きしません。

## Distributed Cultivation

repositoryのpull、cloneまたはforkは、完成品の複製だけでなく、新しい**生育環境**の開始になり得ます。同じ祖先を持つWorldlineでも、利用者、プロジェクト、モデル、反証および経験が異なれば、別の形へ成長できます。

複数性は次の三層で発生します。

1. 一つのcloneが複数のGuest Worldlineを保持する。
2. 同じGuestの子孫が、異なるcloneやforkで別々に成長する。
3. 成熟した複数の子孫が、それぞれ親系譜を保持した新repositoryへspin-outする。

upstreamは唯一の真理ではなく、共有しやすいStable Hostまたは共通祖先です。子孫はupstreamへ還流しても、独立しても、休眠してもよく、非通約であることだけを理由に一つへmergeされません。

この構造が目指すのは、**局所的には明示的で、全体としては多元的なLLM出力**です。明示的とは確定的に断言することではなく、前提、作用機序、証拠状態、`unknown`および反証条件を曖昧にしないことです。折り合わない案を一つの曖昧な回答へ押し込めず、それぞれを最後まで検証可能な形で走らせます。

## Internal-Stable Emulator Capsules

Guest Worldlineは、Stable Hostの一部を直接変更する差分ではなく、Hostを基底に候補規則を重ねる **Emulator Capsule** として動かせます。このときStableという語は観測世界を伴います。

- **Internal Stable**: Capsule内部では、overlay、entrypoint、schemaおよびrole overrideを一貫した正本として使う。
- **Upstream Gestating**: Hostから見れば未批准であり、rootの正本、通常roleおよび通常APIを変更しない。
- **Provisional Latest**: 利用を勧められる暫定最新版。ただし暗黙適用せず、利用者がWorldline IDを明示してopt-inする。

起動順序は固定します。

1. `parent.commit`でStable Hostの基底を解決する。
2. Stable Host Protocolをロードする。
3. Capsuleのprotocol overlayを重ねる。
4. entrypoint、またはStable Host roleをロードする。
5. 対応するrole overlayを重ねる。
6. resolved Host commit、Host asset digest、Capsule digestをrunへ記録する。

`provisional_latest`のようなchannel名は発見用locatorであり、再現性のpinではありません。同じ名前の内容が進んでも過去のrunを再現できるよう、実行時点の40桁commit、Host asset digest、Capsule digestを併記します。Host digestはroot manifest、protocol、load可能role群を、Capsule digestはmanifest自身を除く候補asset集合を固定します。両方を宣言path順に依存しない決定的算法で計算し、baseとoverlayの片面だけがdriftするのを拒否します。

### Dual Authority Projection

Capsule内部のAuditorやIntegratorは、その局所世界ではrole定義どおりに判断できます。しかしその判断をStable Hostへ持ち出すとき、権限は `advisory_observation` へ投影されます。候補自身が自分をHost Stableへ昇格させることはできません。第三世代後の `promote | spin_out | archive | terminate | extend_once` はHost Integratorの `operational_decision`です。

### Generation Is Experience, Not Revision

一世代は、異なる経験に晒されたInnovator、Auditor、Integratorの完全サイクルです。commit数、文言修正数、同じ証拠の別表現ではありません。Emulator manifestは各世代に固有の `experience_id` とcandidate digestを要求し、世代間の同一evidence locator再利用を拒否します。

現在の `unflatten-v2-greenfield` は第二世代です。第一世代はGreenfield Ingressの初期設計・監査・統合、第二世代はHuman Stewardによる「内部Stable／上流gestating」というエミュレーター境界の訂正と、その後の再監査です。第三世代は実projectでのprovisional運用という異なる経験が得られるまで開始しません。

## Anti-Proliferation Boundary

Worldlineは判断回避のための分岐ではありません。新しいWorldlineとして保持するには、少なくとも次が必要です。

- 既存Worldlineと異なる中核前提または評価文法
- 独自の作用機序
- 観測可能な成功・失敗信号
- 反証条件
- 親系譜と分岐理由
- 有限の世代、reviewおよび停止条件

単なる言い換え、ブランド差、モデル名の違い、または「どちらも大切」という判断延期は、独立Worldlineの根拠になりません。

## Current Implementation Boundary

現在のSDKは次を実装しています。

- 一つのHost registryに複数Guestを登録できる。
- Guest roleをroot通常roleから隔離して明示的にロードできる。
- Internal Stable / Upstream Gestatingの二重状態でCapsuleを起動できる。
- Host commitに加えてHost asset digestとCapsule digestを検証し、entrypoint、schemaおよびrole overlayを隔離ロードできる。
- 世代ごとのexperienceとevidence再利用を検査できる。
- 世代を進め、第三世代でreviewを要求できる。
- Integrator decision historyとspin-out provenanceを構造検証できる。
- 状態遷移は入力を直接上書きせず、新しいmanifest候補を返す。

現在まだ実装していないものがあります。

- Worldlineを育成する書き込み用CLI
- 分散した同一Guest個体を区別する`lineage_id`と`instance_id`
- 判断者の暗号学的な本人確認
- evidenceの意味的品質の自動証明
- GitHub repositoryの自動spin-out

したがって、現在のclone利用者はNode.js APIからWorldlineを育てられますが、生成されたmanifest候補の保存、差分確認およびcommitは利用者が行います。静的検証結果を意味的監査や成熟の証明として扱ってはいけません。

## Next Experimental Threshold

次の世代を開始する条件は、機能一覧を増やすことではありません。初めてrepositoryをpullした第三者が、既存の説明とSDKだけで次を実行できるかを観測することです。

1. GuestとStable roleを混同せずロードする。
2. 完全な役割サイクルと証拠を残す。
3. manifest候補を安全に生成し、差分を理解する。
4. upstreamへの還流、継続、休眠またはspin-outを選ぶ。

この実験でNode.js APIが実質的な障壁になった場合、最小の育成CLIを追加します。CLIは正本を自動上書きせず、review可能な候補を生成する境界として設計します。
