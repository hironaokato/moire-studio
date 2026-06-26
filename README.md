# Moiré Studio

ブラウザで動く 3D モアレ構造デザイナー（ビルド不要の静的アプリ / Three.js）。

- 3次元エッジ（ジャングルジム格子）・2D平面・曲面・放射状のテンプレート
- 2層を回転・ずらしで重ね、**モアレ現象**を可視化
- パラメータ（分割数 / エッジ太さ / 回転 / ずらし / 実寸サイズ）をリアルタイム操作
- 多角的に見回し（ドラッグ回転・ズーム・パン）
- **STL 書き出し**（初期 20cm の実寸スケール、3Dプリント向け）

## 動かす
```
# ローカル
python3 -m http.server 8080   # → http://localhost:8080
# もしくは GitHub Pages にそのまま公開（ビルド不要）
```

## 構成
- index.html / style.css / main.js（Three.js は importmap で CDN 読み込み）

Generated & operated by AI Company OS.
