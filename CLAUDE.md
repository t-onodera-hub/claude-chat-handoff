# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Claude ブラウザ版（claude.ai）のチャット内容を新規チャットへ引き継ぐための **Chrome/Edge ブラウザ拡張機能**。
詳細な要件は [requirements.md](requirements.md) を参照。

## ターゲット仕様

- **形式**: Chrome / Edge 向け Manifest V3 ブラウザ拡張機能
- **対象サイト**: claude.ai
- **主要機能**:
  1. 現在のチャット会話を要約して引き継ぎ用テキストを生成・出力
  2. データ受け渡しが必要な場合の通知メッセージ表示

## ディレクトリ構成

```
extension/
├── manifest.json            # Manifest V3 設定
├── content/
│   └── content.js           # claude.ai に注入するコンテンツスクリプト（DOM抽出）
└── popup/
    ├── popup.html           # 拡張機能ポップアップ UI
    ├── popup.js             # 引き継ぎテキスト生成ロジック
    └── popup.css            # ダークテーマ スタイル
```

## ブラウザへのインストール手順

1. Chrome/Edge で `chrome://extensions/` を開く
2. 「デベロッパーモード」を ON にする
3. 「パッケージ化されていない拡張機能を読み込む」→ `extension/` フォルダを選択

## 主要な DOM セレクター（claude.ai）

| 対象 | セレクター |
|------|-----------|
| ターングループ | `div[data-test-render-count]` |
| ユーザーメッセージ | `[data-testid="user-message"]` |
| Claude の返答 | `.font-claude-response .row-start-2 .standard-markdown` |
| アップロードファイル名 | `[data-testid="file-thumbnail"] h3` |

## 開発上の制約

- 引き継ぎ作業（新規チャットへの貼り付け）はユーザーが手動で行う前提
- 自動転送・自動投稿は実装しない
- テキストデータのみ対象（画像・添付ファイルの引き継ぎは対象外）
