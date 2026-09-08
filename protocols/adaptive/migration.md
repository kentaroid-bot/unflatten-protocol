# Classic 0.2.0からの移行

Adaptiveは独立した入口として開発した。既存のGuest Worldlineを昇格させたものではない。ルートmanifest・旧Protocol・Handoff・role・schemaとその固定digestは維持する。パッケージの版と、内部で選んだプロトコルの版を区別する。

1. 継続中のClassic Runをそのまま続けるなら、旧APIを使う。`loadProtocol()`や`composeWorkflowPrompt()`の意味は変わらない。
2. Adaptiveへ移るときは元のRunや原資料を保持し、新しいseedのcontextに出典、版、移行理由を記す。原問、動機の確かさ、失いたくない差異を転記または参照する。
3. 必要な候補・反証・異論を新しい記録へ渡す。監査済み・三世代完了・承認済みという旧状態を、自動的な新しい状態へ変換しない。現在の問い・評価軸・実行範囲で確認する。
4. 元の実行判断や既存の合意は原記録へ辿れるようにする。Adaptiveへの移行がそれらを取り消すわけでも、新しい範囲へ拡張するわけでもない。

自動変換を用意しない理由は、Schema間の対応だけでは問いの同一性、失われる差異、現在の委任範囲を判断できないためである。

既存のWorldline/Semantic Mountは従来通り明示選択する。通常のInquiry forkは記録の分岐であり、Guest生成や共有版の採択、他者への適用を実行しない。

## 0.3.1以降の進化方式

Adaptiveの改善は[evolution.md](evolution.md)に従い、通常のGitブランチとBRANCH.mdで扱う。既存Guest registryへの接続は不要。このブランチを選んだ環境内でAdaptiveを通常入口として利用できる。既存Guestの完了・昇格を認定したことにはならない。

0.3.0の記録にはその版の資産digestが残る。0.3.1としてヘッダーだけを書き換えず、旧commitを使うか、原記録を出典にした新しいInquiryへ移す。
