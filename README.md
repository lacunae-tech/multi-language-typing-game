## 1. 概要

本ドキュメントは、ローカルネットワークでの対戦が可能なタイピング練習ゲームの要件を定義するものである。

- **プロジェクト目的**: 楽しみながらタイピングスキルを向上させること。特に、友人や同僚とローカル環境で気軽に対戦できる機能を提供する。
- **ターゲットユーザー**:
    - タイピング初心者から中級者
    - 友人や家族とオフラインでゲームを楽しみたいユーザー


## 2. このゲームについて
フランス語、スペイン語、日本語、英語、ポルトガル語に対応したタイピングゲーム
タイピング練習で使用する単語は、jsonで自由に追加、編集ができるようになっている

また、ローカルネットワークで対戦をすることも可能。
ローカルネットワークで対戦をしながら、タイピング能力の向上を図ることが期待される。

多言語対応するため、練習用単語やキーボードレイアウトは任意で追加することができる設計となっている。

## 3. システム要件

- **動作環境**: Windows 10, Windows 11
- **配布形式**: ZIPファイル（インストール不要で実行可能）
- **最小解像度**: 1280 x 800
- **キーレイアウト**: QWERTY（英語）, JIS（日本語）、AZERTY、ABNT2（ポルトガル語）、QWERTY（スペイン語）
- **その他**: オフラインで全ての機能が動作すること。


## Installation

### Requirements

- Node.js
- npm

### Development Setup

Install dependencies:

```bash
npm install
```

Run in development mode:

```bash
npm start
```

### Building

- `npm run build` – create a production build.
- `npm run build:win32` – build a 32‑bit Windows release. The generated files are placed in the `release/` directory and include an NSIS installer (`Typing Game Setup*.exe`) and a portable `.zip` archive.
- `npm run build:win64` – build a 64‑bit Windows release with the same `release/` output (NSIS installer and `.zip`).
- These Windows build scripts require a Windows environment. When running from macOS or Linux, ensure the necessary tools (e.g. `wine`, `mono`, `nsis`) are installed for cross‑compilation.

## Project Structure

### Technologies
- **Electron** – desktop application framework.
- **Chart.js** – renders performance charts.
- **Node.js** – underlying runtime environment.

### Key Files and Directories
- `assets/` – images, audio and other static resources.
- `main.js` – Electron main-process entry point.
- `renderer.js` – shared renderer script for windows.
- `preload.js` – exposes safe APIs to renderer processes.

## Local Network Play

### Hosting

1. From the main menu, choose **Host game**.
2. A server starts on port **8080** and your local IP address is displayed.
3. Share this IP with players on the same network.

### Joining

1. From the main menu, choose **Connect to host**.
2. Enter the host's IP address to join.

### Network Requirements

- All players must be on the same local area network.
- Ensure firewalls allow connections on port **8080**.

### 4. ゲームモード（ステージ）詳細

全9ステージ構成。各ステージのクリアデータはユーザープロファイルに紐づけて保存される。

| ステージ番号 | ステージ名 | 課題 | UI表示 | 備考 | 構築状況 | 
| --- | --- | --- | --- | --- |
| **1** | ホームキー・ならし | ホームキーポジションのランダムな1文字 | キーレイアウト表示 | 基本の練習 / **制限時間90秒** | ほぼ完成 | 
| **2** | 全キー・ならし | 全てのキーのランダムな1文字 | キーレイアウト表示 | **制限時間90秒** | ほぼ完成 |
| **3** | 星降るホームキー | ホームキーポジションのランダムな文字列 | **キーレイアウト非表示** | 80文字クリアで終了 / 残り時間はボーナススコア / 制限時間120秒 | ほぼ完成 |
| **4** | 星降る全キー | 全てのキーのランダムな文字列 | **キーレイアウト非表示** | 80文字クリアで終了 / 残り時間はボーナススコア / 制限時間120秒  | ほぼ完成 |
| **5** | 単語れんしゅう | 一般的な単語 |  |  | ほぼ完成 |
| **6** | 文章れんしゅう | 短めの文章 |  |  | ほぼ完成 |
| **7** | 対戦：進捗レース | 文章 | 相手の進捗バーを表示 | 先に文章を打ち終えた方の勝利 | 仮実装（ベータ版） |
| **8** | 対戦：早食いチャレンジ | ランダムな単語（料理に見立てる） | 制限時間、相手のスコアを表示 | 制限時間内に多くの単語をタイピングし、スコアが高い方の勝利 | 仮実装（ベータ版） |
| **9** | 苦手キー復習 | 統計データから判定された苦手キーを重点的に出題 |  | 苦手キーがない場合はランダムに出題 | 未実装 |

