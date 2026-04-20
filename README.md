# 🀄 麻雀 16 - 台灣正宗16張麻將

線上遊玩：https://penguopen.github.io/mahjong16

## 功能（Phase 1）

- ✅ 144張完整牌組（萬/筒/條/字牌/花牌）
- ✅ 每人16張手牌（台灣規則）
- ✅ 莊家17張、摸打補花
- ✅ 碰/槓/胡基本判斷
- ✅ 台數計算（平胡/碰碰胡/清一色/五暗刻等）
- ✅ 三級 AI 對手（低/中/高）
- ✅ 玻璃風格 UI + RWD（手機/電腦）
- ✅ 晶片/點數/設定面板

## Phase 2（規劃中）

- Three.js 3D 視覺化
- 連線對戰（Socket.io）
- AI 局勢分析按鈕
- 自定義牌面貼圖

## 部署

```bash
cd ~/mahjong16
git add .
git commit -m "Phase 1: 16張麻將核心"
git push -u origin main
# 然後在 GitHub repo Settings > Pages 啟用
```

## 架構

```
mahjong16/
├── index.html        # 主頁
├── css/style.css     # 樣式
└── js/
    ├── MahjongEngine.js  # 核心引擎
    └── game.js           # 遊戲主邏輯
```
