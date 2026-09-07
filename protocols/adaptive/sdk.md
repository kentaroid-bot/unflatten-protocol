# Adaptive Inquiry SDK

`const sdk = require('unflatten-protocol')`。checkout内では `require('./validator')`。入力はオブジェクトまたはJSON/YAML文字列。返り値は新しいオブジェクトで、入力を変更しない。

| API | 用途 |
| --- | --- |
| `createInquiry(seed)` | 初期記録を作る。modeはexplore、budgetは12手・進展なし2回を既定とする |
| `recordInquiryMove(record, move)` | 一手を検査して追記。失敗時は例外。元の記録は残る |
| `readInquiry(record)` | 検証後、現在の問い・候補・異論・判断状態を再構成 |
| `validateInquiry(record, options?)` | `{valid, errors, state?, assets_match?, limitation}`。不正入力も結果として返す |
| `composeInquiryPrompt(record, task)` | 実際の版・モード・原問・履歴を含むプロンプト。API呼び出しはしない |
| `loadAdaptiveProtocol()` | 本文を返す |

seedには `id`、`question`、`motives`、`dimensions` が必要。動機には `claim`、`basis`、`source`。basisは `direct_record / author_confirmed / inferred / unknown`。分からない場合はunknownと、その不明な範囲を記す。空欄を埋めるために由来を創作しない。非公開資料は内容を複製せず、共有できる参照を置く。

moveには `kind`、`actor`、`note` が必要。`data` は種類に応じる。`progress` は `new_information / no_change / unassessed`（既定）。`evidence` は `{kind, source, note}` の配列。kindは `direct_record / reported / inferred / simulation`。進捗も証拠種別も記録者の申告であり、SDKの意味判定ではない。

| kind | dataと効果 |
| --- | --- |
| explore | `{}`で探索の区切りを記録。候補を残すならalternativesにid、claim、mechanism、falsifiers、evaluation_frame。派生はderived_fromで既存idを参照 |
| observe | `{}`。証拠が1件以上必要 |
| reframe | question、motives、dimensionsのいずれかを更新。理由はnote。旧評価を現行フレームの判断に使えなくする |
| assess | alternative_id、verdict、criterion、effects。証拠が必要。全現行次元をpreserved/lost/unknownと理由で記録 |
| dissent | holder、position、source、revisit_when。多数案に吸収せず残す |
| mode | `{mode: 'explore' または 'decision'}`。工程を進める義務は生まれない |
| commit | selected、decision_maker、authority、scope、affected_parties、accepted_tradeoffs、stop_when、review_when。証拠が必要 |
| pause | resume_when。進行中の判断宣言を停止し、pausedへ |
| resume | 証拠とnoteが必要。任意でbudgetを更新。回数をリセットし、旧評価と実行判断の効力を引き継がず再開 |
| finish | outcomeはno_discovery / existing_explanation / answered / withdrawn。発見がなくても終えられる |
| fork | 新id。履歴と異論を保持し、評価をやり直す。同じ親記録から複数の返り値を作って保存できる |

assessのverdictは `open / supported / rejected / held`。commitはDecisionモードでのみ可能で、選択候補すべての現行評価が必要。rejectedとheldは選べない。lost/unknownの全次元を `accepted_tradeoffs: [{alternative_id, dimension_id, reason}]` に一度ずつ記す。これは損失を受容した宣言であり、他者に損失を負わせる許可ではない。

authorityは `{status: 'pending' または 'declared_authorized', basis: '範囲と根拠への参照'}`。pendingは `awaiting_authority`、後者は記録上の `committed`。SDKは同意取得・署名認証・アクセス制御を実装しない。実運用への接続時は、委任範囲を確認する側で実行可否を判定する。`open`な仮説でも条件付き実験の判断を残せるが、証明済みへの昇格ではない。

全体のmovesが上限、またはno_changeが指定回数に達すると `review_required`。new_informationの申告は停滞回数だけを戻す。unassessedで停滞を解除できない。pause/finish/resumeは回数に含めない。非activeからの通常の一手は拒否するが、終了済みを除きpause/finishできる。終了後は明示的resumeで再開する。SDK上の停止は、既に行われた外部行為を取り消さない。

## 版と履歴

記録はmanifest、本文、モード、schema、inquiry runtimeの内容ダイジェストと、seedからのハッシュ連鎖を持つ。読み込み・追記・プロンプト生成は一致を要求する。依存ライブラリやNodeの版まではハッシュに含めないため、再現にはcheckout、package-lock、Node版も保存する。

`validateInquiry(record, {checkAssets: false})` は、同じ0.3.0形式を現在の実装で検査する調査用オプション。現在の資産と違えば `assets_match: false` が返る。古い実装の意味を再現したことにはならず、この結果を使ってそのまま追記するAPIもない。元の資産を復元するか、出典を記した新しいInquiryへ移行する。

記録者が履歴全体を再計算すれば、別の整合した記録を作れる。第三者の改変検出には、信頼できる場所に保存したheadとの比較や外部署名が必要。プロンプトは履歴全体を含むので、長期運用では原記録を保存したまま新しい問いへ明示的に引き継ぐ。無制限のコンテキスト維持は保証しない。

完全なフィールド定義は[inquiry.schema.json](inquiry.schema.json)。CLIのinquiry-new/move/show/validate/promptは対応するAPIを使い、JSONまたは文章を標準出力へ返す。形式違反や無効な遷移は終了コード1。
