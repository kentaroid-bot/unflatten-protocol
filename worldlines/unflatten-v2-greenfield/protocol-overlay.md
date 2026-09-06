# Unflatten v2 Greenfield Protocol Overlay

## Internal Canonical Status

この文書は `unflatten-v2-greenfield` Worldline内部ではStableな正本です。Stable Hostの `docs/protocol.md` を置換せず、その上に次のPhase 0を追加します。Hostから見たWorldline全体の状態はgestatingです。

## Phase 0: Greenfield Ingress

新しいcanonical hypothesisまたはWorldlineを開始し、その生成系譜の動機が現在の依頼、既存artifactまたはHandoffから十分に観測できない場合は、role選択とFrameの前にGreenfield Ingressを実行します。

この入口は、問題設定、望まれる差異および成果の初期形態をAIが依頼者より先に決めることを防ぎます。既知情報を抽出した後も生成起点が不足する場合は、一度に一つのMotive Queryを返します。詳細な起動条件、記録形式、状態遷移、非開示および安全例外は `ingress.md` をこのWorldline内部の正本とします。

Greenfield Ingressはroleではありません。`ready`になるまでcanonical生成を開始せず、`ready`後に現在の作業フェーズから最初のroleを選択します。

**Output**

- Motive Record
- Outcome Envelope
- Ingress state
- 必要な場合は一つのMotive Query

## Upstream Boundary

このPhase 0をWorldline内部でStableとして用いても、Stable Hostへ自動昇格したことにはなりません。第三世代後のHost Integratorだけが、昇格、別repositoryへの分娩、保存または終了を判断できます。
