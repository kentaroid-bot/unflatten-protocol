# Integration Decision — Self-Application 001

## Decision Question

Auditorが示した修復候補のうち、Unflatten SDKの中心原理を変えず、今回の自己適用サイクルで実装すべきものは何か。

## Inputs and Independent Positions

- Auditorは、個別ロールの可搬性は成立しているが、フローの可搬性、Handoff整合性、権限分離、provenanceが不足しているとして `revise` を勧告した。
- AuditorのDissentとして、既定遷移をコードで強制すると未知の役割経路を平坦化する可能性が残った。
- ライセンス選択と身体由来のNoise Signalの実運用は、現在の技術実装だけでは決定できない。

## Epistemic Status

- **Supported:** ロール、Schema、静的検証、意味監査プロンプトという個別構成要素は動作する。
- **Contradicted:** 現在のSDKだけでUnflattenの役割フロー全体を再現できるという主張。
- **Unresolved:** 実プロジェクトでの認知負荷、複数LLMでの再現性、第三者利用のライセンス条件。
- **Residual:** 身体的違和感を自動テキスト処理へ変換せずに接続する方法。

## Operational Status

`revision_required`

## Selected Connection State

**Limited Connection:** 現在のロールローダーと検証器を維持し、薄いWorkflow層を追加する範囲に限ってEngineerへ渡す。SDKが意味的判断またはライセンス判断を自動化したと主張することは保留する。

## Adopted Work

1. Workflow runを作成し、Handoffを用いて次ロールへ遷移するprovider非依存APIを追加する。
2. protocol、role、handoffのSHA-256 digestとpackage versionを各履歴へ記録する。
3. 既定遷移は強制規則ではなくadvisory routeとし、逸脱理由を記録すればFork可能にする。
4. 前Snapshotへ明示的patchを適用し、完全Handoffを自動生成できるようにする。配列は暗黙結合せず、patch側の値で置換する。
5. AuditorのVerdictを `epistemic_recommendation`、IntegratorのDecisionを `operational_decision` として機械可読に区別する。
6. Handoffの遷移別最低条件をコードで検証し、文章正本との不一致を解消する。
7. この自己適用runをテストfixtureとして一巡させる。

## Held Work

- 特定LLMプロバイダーの組み込み。
- 身体的Noise SignalをAIが自動推測する機能。
- ライセンスの選択。
- 既定遷移から外れる新ロールを禁止するhard gate。

## Scope, Owner and Duration

- **Owner:** Engineer
- **Scope:** `manifest.json`、Schema、validator API/CLI、tests、README、Handoff文書、自己適用記録
- **Duration:** self-application cycle 001の再監査まで

## Stop / Appeal / Exit / Fork Conditions

- Workflow APIが意味的な `advance` または `reject` を自動決定した場合は停止する。
- patch適用がDistinct Dimensions、ResidualまたはDissentを暗黙に削除した場合は停止する。
- advisory routeからの逸脱を記録できない場合は、固定フロー案をForkする。
- 所有者は採択範囲をいつでもRevisionできる。

## Preserved Dissent and Residuals

- 固定された既定遷移が未知の役割経路を平坦化する可能性をDissentとして保持する。
- 身体的Noise Vetoの真正な入力方法をResidualとして保持し、自動生成しない。
- PublicかつUNLICENSEDな状態の適切性を未解決事項として保持する。

## Review Trigger

- Workflow一巡の統合テスト完了後、Auditorへ再提出する。
- Aperture Meshなど最初の外部プロジェクトで使用した後、認知負荷を再評価する。
