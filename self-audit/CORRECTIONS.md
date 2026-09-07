# 2026-09-08 — 過去記録の形式・参照の訂正

基準版: `04caeb34e8a9f58d9ea9a5c1225d8545b2b9b58c`。原文はこのcommitに残る。今回の修正は過去の監査内容・評価を新しく実施したものではない。

- `004/02-audit-report.yaml` と `004/04-greenfield-ingress-audit.yaml`: `counter_factual_steelman.setup` の内容を既存schemaの `steelman_setup` 配列へ移した。
- `004/02-audit-report.yaml`: F4の分類名 `noise_veto_triggered` を既存enumの `noise_veto` へ訂正。finding/rationaleは保持した。
- `worldlines/unflatten-v2-greenfield/manifest.json`: generation 1の二つの証拠パスを、実在し当該Ingress提案と監査を含む `03-greenfield-ingress-innovator-to-auditor.yaml` と `04-greenfield-ingress-audit.yaml` へ訂正。

証拠内容の新規追加、世代更新、Guestの昇格は行っていない。固定Host/Capsule資産は変更していない。自己監査の全JSON/YAMLと世代証拠ファイルの存在確認を回帰テストへ追加した。
