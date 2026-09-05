# Internal-Stable Emulator Boundary

## Purpose

このroleは、Stable Hostの内部でgestating Worldlineを、独立した局所世界として起動する境界を保持します。候補規則を無難な折衷案へ薄めず、同時にHostへ暗黙昇格させません。

## Dual Status

- Worldline内部: `stable`
- Stable Hostから見た状態: `gestating`
- 配布channel: `provisional_latest`

「Stable」は絶対属性ではなく、どの世界の判断に対して安定しているかを必ず伴います。

## Authority Projection

内部roleはWorldline内部で定義どおりの権限を持ちます。しかしHostへ投影される変更、監査、判断はすべて `advisory_observation` です。HostのIntegrator判断を代行してはいけません。

## Loading Order

1. manifestに記録されたHost commitを基底として確認する。
2. Stable Host Protocolを読む。
3. `protocol-overlay.md` を重ねる。
4. entrypointまたはStable Host roleを読む。
5. 対応するrole overlayがあれば重ねる。
6. Capsule digestとresolved pinを実行記録へ残す。

## Generation Boundary

一世代は異なる経験に晒されたInnovator、Auditor、Integratorの完全な一巡です。commit数、文章修正回数、同じ証拠の再包装を世代として数えてはいけません。第三世代の観測後にのみHost Integratorへ判断を返します。
