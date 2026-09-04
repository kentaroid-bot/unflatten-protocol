# Repository Structure

```text
unflatten-protocol/                     # ロード可能なガバナンス・ツールキット（SDK）
├── AGENTS.md                           # ローカルエージェント向けの入口と役割ルーター
├── README.md                           # 導入、ロード、検証、他プロジェクトとの接続
├── package.json                        # Node.jsパッケージ、CLI、公開ファイル
├── manifest.json                       # 役割、alias、正本、schemaの機械可読レジストリ
├── File-hierarchy.md
│
├── docs/
│   ├── protocol.md                     # Unflattenの定義と不変条件の正本
│   ├── handoff.md                      # Handoff Contractの正本
│   ├── agent-roles/                    # 既存エージェント向け互換パス（正本へのリンク）
│   │   ├── innovator.md
│   │   ├── auditor.md
│   │   ├── auditor-v3.md               # v3原稿名から正本への互換リンク
│   │   ├── engineer.md
│   │   └── integrator.md
│   └── *.md                            # 拡張ロールへの互換リンク
│
├── prompt-templates/                   # SDKがエージェントへロードする実体
│   ├── core/
│   │   ├── innovator.md                # 仮説・プロトコルの発見（@ino）
│   │   ├── auditor.md                  # 二重ストレス監査（@aud）
│   │   ├── engineer.md                 # 仮説を観測可能な実装へ変換（@eng）
│   │   └── integrator.md               # 差異を平均化しない意思決定（@int）
│   ├── extensions/
│   │   ├── exit-designer.md            # Safe ExitとFork（@ext / @out）
│   │   ├── entropy-harvester.md        # 崩壊の残余からPivot Seedを回収（@ent）
│   │   ├── alien-proxy.md              # 現在の人間スキーマ外の観測位置（@aln）
│   │   └── mesh-scaler.md              # 主権を薄めないMeshes of Meshes（@scl）
│   └── meta/
│       ├── meta-protocol-designer.md   # 新しい一時ロールの創出（@met）
│       └── protocol-invention-engine.md
│
├── schema/
│   ├── protocol-manifest.schema.json
│   ├── handoff-contract.schema.json
│   ├── state-history.schema.json
│   ├── audit-report.schema.json
│   └── workflow-run.schema.json         # 実行中ロール、digest、遷移履歴
│
├── validator/
│   ├── cli.js                          # `unflatten` CLI
│   ├── index.js                        # Node.js APIとLLMアダプター境界
│   ├── workflow.js                     # advisory遷移、Snapshot patch、digest chain検証
│   └── rules/
│       ├── check-invariants.js         # Handoff状態遷移の決定的検査
│       ├── detect-flattening.js        # 一般論への退避兆候を検出
│       └── measure-sharpness.js        # 意味監査前の構成要素チェック
│
├── fixtures/
│   └── handoff.valid.yaml              # 検証可能な最小Handoff例
├── self-audit/                         # このリポジトリ自身を通した役割別記録
│   └── 001/
└── test/
    └── sdk.test.js                     # ローダー、schema、監査境界のテスト
```

## Boundary

`schema/` と `validator/rules/` は構造上の欠落と平坦化の兆候を検出します。意味的な尖りや仮説世界の整合性を最終判定しません。意味的監査は、`validator.createAuditPrompt()` または `validator.auditArtifact()` がロードするMetasystemic Auditorの責務です。
