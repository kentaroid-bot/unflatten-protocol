# Unflatten Protocol

問いの由来、緊張、構成過程を、探索・批判・制作・意思決定を越えて保持する。結論を変えても、そこまでに得た差異や可能性を失わず、次の問いを作れるようにする。

背景にはMonkuAiとAperture Meshがある。AI開発の補助に加えて、異質な主体が接続する社会の思考・意思決定方法を、現在の作業で作り、試すプロトコルである。

## 0.3.1 — Adaptive Inquiry

新版は、**分かったことに応じて、次に必要な一手を選ぶ**。原問へ戻る、仮説を強くする、観測を増やす、評価方法を変える、別の未来へ分岐する、終了する。順序と文書量を作業に合わせる。

- **Explore:** 自由な対話・思考実験・試作。重要な変化だけ記録する。
- **Decision:** 選択肢と失われる差異、異論、判断者、委任、実行範囲を点検できる形で渡す。
- 問いと評価軸を変えたら、旧評価を現在の判断へ流用しない。
- 反証・未発見・保留も成果にする。定めた予算を超えたら続行理由を見直す。
- 複数の未来を保持できる。分岐によって他者や共有物への権限は増えない。

### 文章だけで使う

[プロトコル本文](protocols/adaptive/protocol.md)と、[探索](protocols/adaptive/modes/explore.md)または[意思決定](protocols/adaptive/modes/decision.md)を読み、現在の依頼に使う。インストールや役割の指定は不要。発見や変更の区切りで原問への参照と理由を残す。

短い開始例:

> このプロトコルで、今ある提供物から一緒に何を作れるか考えたい。動機は、同じ価値観にならなくても作れるものを見つけたいこと。各人の提供条件と、完成物として成立することを両方大切にする。まず可能性を探り、必要になったら問い自体も変えてよい。

これは全員の動機を一つに統合した宣言ではない。各人の動機・提供範囲・未確認事項は別に扱う。

### 記録を検証して使う

Node.js 18以上。リポジトリのcheckoutから:

```sh
npm ci
node validator/cli.js inquiry-new examples/adaptive/seed.yaml > inquiry-0.json
node validator/cli.js inquiry-move inquiry-0.json examples/adaptive/observe.yaml > inquiry-1.json
node validator/cli.js inquiry-show inquiry-1.json
node validator/cli.js inquiry-prompt inquiry-1.json examples/adaptive/task.txt
node validator/cli.js inquiry-validate inquiry-1.json
node examples/adaptive/demo.js
npm test
```

CLIは標準出力へ新しい記録を返す。入力ファイルへ同名リダイレクトするとshellが入力を消すため、必ず別名に保存する。初期の問い・動機はseedとして残り、その後の変更は追記される。

SDKは `createInquiry`、`recordInquiryMove`、`readInquiry`、`validateInquiry`、`composeInquiryPrompt`、`loadAdaptiveProtocol` を提供する。プロンプト生成はモデルを呼び出さず、記録上のcommitも外部操作を実行しない。

[API・記録形式](protocols/adaptive/sdk.md) / [実行可能な例](examples/adaptive/demo.js) / [検証と比較課題](protocols/adaptive/evaluation.md)

## この版から次を作る

Adaptive以降は、通常のGitブランチと短い [BRANCH.md](BRANCH.md) で改善候補を管理する。候補を試すことが従来の妊娠、その版を独立して継続することが出産に対応する。さらに独立した後継候補を作るときは、親版の独立継続を記録してから分岐する。

このブランチは `codex/adaptive-inquiry`。旧Hostの `04caeb3` から派生した改善候補で、ブランチ内部ではAdaptiveを使う。専用Guest登録、固定三世代、別repositoryへの移転を要求しない。親へのmergeは共有側の別の判断であり、独立継続の必須条件ではない。

[ブランチ運用の規則](protocols/adaptive/evolution.md)に、親の固定、試行、独立継続、子の作成、休眠と保存の方法をまとめた。SDKのInquiry forkは探究記録の操作で、Gitブランチを作る機能ではない。

## 既存版との関係

パッケージは0.3.1。Adaptiveの正本は `protocols/adaptive/manifest.json`。従来のルート `manifest.json` はClassic 0.2.0のまま保持している。

従来の役割・Handoff・Workflow・Worldline APIは継続利用できる。`loadProtocol()` と `run-*` は従来版を返す。Adaptiveは `loadAdaptiveProtocol()` と `inquiry-*` で明示的に使う。このブランチの通常入口はAdaptiveに変更した。親mainの通常入口は変更しない。

既存Guestの昇格や世代完了を今回の開発で認定していない。新しいInquiryのforkは、旧Worldlineや共有規約の採択ではない。

[移行手順](protocols/adaptive/migration.md) / [従来SDK](docs/classic-sdk.md) / [変更履歴](CHANGELOG.md)

## 確認できること

SDKは履歴の整合性、現在の評価軸の網羅、再評価の要否、申告された権限状態、停止・再開条件を検査する。ハッシュは署名ではなく、記録者の本人性を証明しない。文章の真実性、実際の同意、意味保存、社会的な正当性は別に確かめる。

新版が従来版より良い思考や楽しい探索を生むかは比較対象である。テストの成功を、その効果の実証として扱わない。
