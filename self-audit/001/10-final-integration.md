# Final Integration Decision

- **Authority:** `operational_decision`
- **Decision:** `advance`
- **Selected Connection State:** Limited Connection
- **Accepted scope:** Unflatten Protocol v0.2.0のWorkflow API、CLI、完全Handoff Snapshot、明示patch、advisory route、role authority/status profile、digest chainおよびローカル完全性検証。
- **Not claimed:** 意味的監査の自動正解、発行主体の暗号学的認証、身体的Noise Signalの代理生成、外部プロジェクトでの実用性の証明。
- **Operational status:** リポジトリ内部の自己適用基盤として受け入れる。外部SDKとしての一般化は、実プロジェクト一巡までは条件付きとする。
- **Stop condition:** Workflowが意味的statusを生成する、理由付きdeviationを拒否する、またはpatchが未指定のDistinct Dimensions / Residual / Dissentを消去する場合は直ちに再監査する。
- **Review trigger:** Aperture Mesh等で最初の一巡を実行し、Handoff記入負荷、Noise Signal、履歴検証の実測が得られたとき。
- **Preserved dissent:** hash chainは署名ではなく、悪意ある主体による全履歴再生成を防がない。
- **Preserved residual:** 身体的・認知的Noiseの真正性は現在のテキストSDKでは判定不能である。

この判断は今回の変更をローカル成果として受け入れるものであり、コミット、push、releaseまたは外部プロジェクトへの導入を自動的には許可しない。
