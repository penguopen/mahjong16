/**
 * 麻將16 - 遊戲主邏輯
 * 負責 UI 渲染、事件處理、遊戲流程控制
 */

class MahjongGame {
  constructor() {
    // 初始化麻將引擎
    this.engine = new MahjongEngine();
    
    // 遊戲設定
    this.settings = {
      initialScore: 1000,
      baseScore: 50,
      fanScore: 20,
      aiLevel: 1,
      mode: 'ai'
    };
    
    // 玩家分數
    this.scores = [1000, 1000, 1000, 1000];
    
    // 遊戲狀態
    this.gameState = {
      isPlaying: false,
      currentPlayer: 0,
      selectedTileIndex: null,
      lastDrawnTile: null,
      isFirstDraw: true, // 莊家補一張
      pendingChiCombinations: [], // 等待玩家選擇的吃牌組合
      hasPendingAction: false,     // 是否有吃/碰/槓/胡選項要等玩家選擇
      waitingForPlayerResponse: false, // 是否在等待玩家選擇行動（堵住 nextPlayerTurn）
      lastDiscardTile: null,        // 最近一次別人打的牌（等待玩家決定是否吃/碰/槓/胡）
      skipAutoDraw: false          // 下次 nextPlayerTurn 跳過自動摸牌（玩家放棄 pending 動作時設定）
    };
    
    // 圈風與玩家風
    this.prevailingWind = 31; // 東
    this.playerWinds = [31, 32, 33, 34]; // 東南西北
    
    // UI 元素緩存
    this.ui = {};
    
    // 初始化
    this.init();
  }
  
  /**
   * 初始化
   */
  init() {
    this.cacheUIElements();
    this.bindEvents();
    this.updateUI();
  }
  
  /**
   * 快取 UI 元素
   */
  cacheUIElements() {
    this.ui = {
      dealer: document.getElementById('dealer'),
      remaining: document.getElementById('remaining'),
      round: document.getElementById('round'),
      playerScore: document.getElementById('playerScore'),
      ai1Score: document.getElementById('ai1Score'),
      ai2Score: document.getElementById('ai2Score'),
      ai3Score: document.getElementById('ai3Score'),
      ai1Hand: document.getElementById('ai1Hand'),
      ai2Hand: document.getElementById('ai2Hand'),
      ai3Hand: document.getElementById('ai3Hand'),
      handTiles: document.getElementById('handTiles'),
      meldArea: document.getElementById('meldArea'),
      discardTiles: document.getElementById('discardTiles'),
      wallCount: document.getElementById('wallCount'),
      gameStatus: document.getElementById('gameStatus'),
      btnStart: document.getElementById('btnStart'),
      btnDraw: document.getElementById('btnDraw'),
      btnDiscard: document.getElementById('btnDiscard'),
      btnPon: document.getElementById('btnPon'),
      btnChi: document.getElementById('btnChi'),
      btnKan: document.getElementById('btnKan'),
      btnHu: document.getElementById('btnHu'),
      btnAi: document.getElementById('btnAi'),
      settingsBtn: document.getElementById('settingsBtn'),
      settingsOverlay: document.getElementById('settingsOverlay'),
      settingsPanel: document.getElementById('settingsPanel'),
      settingInitial: document.getElementById('settingInitial'),
      settingBase: document.getElementById('settingBase'),
      settingFan: document.getElementById('settingFan'),
      settingAI: document.getElementById('settingAI'),
      settingMode: document.getElementById('settingMode'),
      btnSaveSettings: document.getElementById('btnSaveSettings'),
      btnCloseSettings: document.getElementById('btnCloseSettings'),
      messageToast: document.getElementById('messageToast'),
      analysisPanel: document.getElementById('analysisPanel'),
      analysisContent: document.getElementById('analysisContent'),
      btnCloseAnalysis: document.getElementById('btnCloseAnalysis'),
      chiOverlay: document.getElementById('chiOverlay'),
      chiOptions: document.getElementById('chiOptions'),
      btnChiCancel: document.getElementById('btnChiCancel'),
      // New casino UI elements
      ledTimer: document.getElementById('ledTimer'),
      dirEast: document.getElementById('dirEast'),
      basePrice: document.getElementById('basePrice'),
      taiPrice: document.getElementById('taiPrice'),
      dirSouth: document.getElementById('dirSouth'),
      dirWest: document.getElementById('dirWest'),
      dirNorth: document.getElementById('dirNorth'),
      ai1TilesCount: document.getElementById('ai1TilesCount'),
      ai2TilesCount: document.getElementById('ai2TilesCount'),
      ai3TilesCount: document.getElementById('ai3TilesCount'),
      playerTilesCount: document.getElementById('playerTilesCount'),
      // Avatar elements for listen badge
      avatar0: document.getElementById('avatar0'),
      avatar1: document.getElementById('avatar1'),
      avatar2: document.getElementById('avatar2'),
      avatar3: document.getElementById('avatar3'),
      // AI meld containers
      ai1Meld: document.getElementById('ai1Meld'),
      ai2Meld: document.getElementById('ai2Meld'),
      ai3Meld: document.getElementById('ai3Meld')
    };
  }
  
  /**
   * 綁定事件
   */
  bindEvents() {
    // 主要按鈕
    this.ui.btnStart.addEventListener('click', () => this.startGame());
    this.ui.btnDraw.addEventListener('click', () => this.playerDraw());
    this.ui.btnDiscard.addEventListener('click', () => this.playerDiscard());
    this.ui.btnPon.addEventListener('click', () => this.playerPon());
    this.ui.btnChi.addEventListener('click', () => this.playerChi());
    this.ui.btnKan.addEventListener('click', () => this.playerKan());
    this.ui.btnHu.addEventListener('click', () => this.playerHu());
    this.ui.btnAi.addEventListener('click', () => this.showAnalysis());
    
    // 設定面板
    this.ui.settingsBtn.addEventListener('click', () => this.openSettings());
    this.ui.btnSaveSettings.addEventListener('click', () => this.saveSettings());
    this.ui.btnCloseSettings.addEventListener('click', () => this.closeSettings());
    this.ui.settingsOverlay.addEventListener('click', () => this.closeSettings());
    
    // AI 分析面板
    this.ui.btnCloseAnalysis.addEventListener('click', () => this.closeAnalysis());
    this.ui.btnChiCancel.addEventListener('click', () => this.hideChiUI());
  }
  
  /**
   * 開始遊戲
   */
  startGame() {
    console.log('[startGame] called, isPlaying=', this.gameState.isPlaying);
    // 如果遊戲已在進行中，直接重置（按鈕點擊本身就是確認）
    if (this.gameState.isPlaying) {
      console.log('[startGame] isPlaying=true, force resetting game');
    }

    // 一開始就禁用開始按鈕，防止遊戲中誤點
    this.ui.btnStart.disabled = true;
    console.log('[startGame] btnStart disabled, proceeding');

    this.engine.reset();

    // 重置遊戲狀態
    this.gameState.isPlaying = true;
    this.gameState.currentPlayer = this.engine.dealer;
    window.audioManager && window.audioManager.startBGM();
    this.gameState.selectedTileIndex = null;
    this.gameState.lastDrawnTile = null;
    this.gameState.isFirstDraw = true;

    // 重置分數
    this.scores = [this.settings.initialScore, this.settings.initialScore, this.settings.initialScore, this.settings.initialScore];
    // 重置pending狀態
    this.gameState.pendingChiCombinations = [];
    this.gameState.hasPendingAction = false;
    this.gameState.waitingForPlayerResponse = false;
    this.gameState.lastDiscardTile = null;
    this.gameState.skipAutoDraw = false;

    // 更新 UI
    this.updateUI();
    this.renderAllHands();
    this.updateStatus('遊戲開始！');
    this.updateAvatarScores();
    this.renderCentralWidget();

    // 如果是玩家回合
    if (this.gameState.currentPlayer === 0) {
      this.enablePlayerActions();
    } else {
      this.disablePlayerActions();
      // AI 回合延遲執行
      setTimeout(() => this.aiTurn(), 1000);
    }
  }

  /**
   * 玩家摸牌
   */
  playerDraw() {
    if (this.gameState.currentPlayer !== 0) return;
    console.log('[playerDraw] BEFORE: handSize=' + this.engine.playerHands[0].length + ' hasPendingAction=' + this.gameState.hasPendingAction);

    // 如果有pending的吃/碰/槓/胡選項，點摸牌 = 放棄那些選項（不要多摸！）
    if (this.gameState.hasPendingAction) {
      console.log('[playerDraw] giving up pending action, NOT drawing extra tile');
      this.gameState.pendingChiCombinations = [];
      this.gameState.hasPendingAction = false;
      this.gameState.waitingForPlayerResponse = false;
      this.gameState.lastDiscardTile = null;
      this.gameState.skipAutoDraw = true; // 標記：下次 nextPlayerTurn 不要自動摸牌
      this.updateStatus('放棄行動。請等待電腦出牌');
      // 直接進入下一回合，不要摸牌！
      this.nextPlayerTurn();
      return;
    }

    const tile = this.engine.drawTile(0);
    window.audioManager && window.audioManager.playDraw();
    console.log('[playerDraw] AFTER drawTile: handSize=' + this.engine.playerHands[0].length + ' drawnTile=' + tile);
    if (!tile) {
      this.handleGameOver();
      return;
    }
    
    this.gameState.lastDrawnTile = tile;
    this.gameState.selectedTileIndex = this.engine.playerHands[0].length - 1;
    
    this.renderHand(0);
    this.updateUI();
    // 鎖住摸牌按鈕，強制玩家先出一張
    this.enableOnlyDiscard();
    
    // 檢查是否能胡
    const winResult = this.engine.canWin(0);
    this.ui.btnHu.disabled = !winResult.canWin;
    
    this.updateStatus('請選擇要出的牌');
  }
  
  /**
   * 玩家出牌
   */
  playerDiscard() {
    if (this.gameState.currentPlayer !== 0) return;
    if (this.gameState.selectedTileIndex === null) return;
    
    // 檢查是否自摸胡（手上14張能否胡）
    const winResult = this.engine.canWin(0);
    if (winResult.canWin) {
      // 強制胡牌，不允許出牌
      const winTile = this.gameState.lastDrawnTile; // 自摸的牌是最後摸的那張
      this.handleWin(0, winTile, true); // 自摸
      return;
    }
    
    const tile = this.engine.discardTile(0, this.gameState.selectedTileIndex);
    window.audioManager && window.audioManager.playDiscard();
    this.gameState.lastDrawnTile = null;
    this.gameState.selectedTileIndex = null;
    
    // 渲染
    this.renderHand(0);
    this.renderDiscards();
    this.updateUI();
    
    // 廣播資訊給其他玩家（AI 决策）
    this.notifyOtherPlayers(tile, 0);
    
    // 下一回合
    this.nextPlayerTurn();
  }
  
  /**
   * 玩家碰
   */
  playerPon() {
    if (this.gameState.currentPlayer !== 0) return;
    console.log('[playerPon] BEFORE: handSize=' + this.engine.playerHands[0].length);

    const lastDiscard = this.gameState.lastDiscardTile;
    if (!lastDiscard) return;

    if (this.engine.doPeng(0, lastDiscard)) {
      window.audioManager && window.audioManager.playPong();
      console.log('[playerPon] AFTER doPeng: handSize=' + this.engine.playerHands[0].length);
      // 清除pending狀態
      this.gameState.pendingChiCombinations = [];
      this.gameState.hasPendingAction = false;
      this.gameState.waitingForPlayerResponse = false;
      this.gameState.lastDiscardTile = null;
      this.renderMeldArea(0);
      this.renderHand(0);
      this.renderDiscards();
      this.updateUI();
      
      // 碰後必須出牌
      this.updateStatus('碰！請選擇要出的牌');
      this.enableOnlyDiscard();
    }
  }
  
  /**
   * 玩家吃（針對別人打的牌）
   */
  playerChi() {
    if (this.gameState.currentPlayer !== 0) return;
    if (this.gameState.pendingChiCombinations.length === 0) return;
    console.log('[playerChi] BEFORE: handSize=' + this.engine.playerHands[0].length + ' pendingChi=' + this.gameState.pendingChiCombinations.length);

    const combos = this.gameState.pendingChiCombinations;
    const lastDiscard = this.gameState.lastDiscardTile;
    if (!lastDiscard) return;

    // 只有一種吃法時直接執行
    if (combos.length === 1) {
      this.executeChi(combos[0], lastDiscard);
      return;
    }

    // 多種吃法：顯示遊戲內 UI 選擇
    this.showChiUI(combos, lastDiscard);
  }

  /**
   * 顯示吃牌選擇 UI
   */
  showChiUI(combos, lastDiscard) {
    const discardNum = this.engine.getNumber(lastDiscard);
    const discardSuit = this.engine.getSuit(lastDiscard);
    const suitChar = discardSuit === 'wan' ? '萬' : discardSuit === 'tong' ? '筒' : '條';

    this.ui.chiOptions.innerHTML = '';
    combos.forEach((combo, i) => {
      const [tileA, tileB] = combo;
      const numA = this.engine.getNumber(tileA);
      const numB = this.engine.getNumber(tileB);
      // 顯示為 7筒8筒吃9筒 格式
      const label = `${numA}${suitChar}${numB}${suitChar}吃${discardNum}${suitChar}`;
      const btn = document.createElement('button');
      btn.className = 'chi-option-btn';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        this.hideChiUI();
        this.executeChi(combo, lastDiscard);
      });
      this.ui.chiOptions.appendChild(btn);
    });

    this.ui.chiOverlay.classList.add('visible');
    this.ui.btnChi.disabled = true;
    this.ui.btnPon.disabled = true;
    this.ui.btnKan.disabled = true;
    this.ui.btnHu.disabled = true;
    this.ui.btnDraw.disabled = true;
  }

  /**
   * 隱藏吃牌選擇 UI
   */
  hideChiUI() {
    this.ui.chiOverlay.classList.remove('visible');
    this.ui.btnChi.disabled = false;
    // 恢復 pending 狀態（允許重新點吃或放棄）
    if (this.gameState.hasPendingAction) {
      this.enableActionButtons();
    }
  }
  
  /**
   * 執行吃牌
   */
  executeChi([tileA, tileB], discardTile) {
    console.log('[executeChi] BEFORE: handSize=' + this.engine.playerHands[0].length + ' tiles=' + tileA + ',' + discardTile + ',' + tileB);
    const success = this.engine.doChi(0, discardTile, tileA, tileB);
    if (success) window.audioManager && window.audioManager.playPong();
    console.log('[executeChi] AFTER doChi: handSize=' + this.engine.playerHands[0].length + ' success=' + success);
    
    // 不管成功或失敗，都要清除pending狀態，避免遊戲卡住
    this.gameState.pendingChiCombinations = [];
    this.gameState.hasPendingAction = false;
    this.gameState.waitingForPlayerResponse = false;
    this.gameState.lastDiscardTile = null;
    
    if (!success) {
      console.warn('[executeChi] doChi failed, clearing pending state and continuing');
      this.updateUI();
      return;
    }
    
    this.renderMeldArea(0);
    this.renderHand(0);
    this.renderDiscards();
    this.updateUI();
    
    this.updateStatus('吃！請選擇要出的牌');
    this.enableOnlyDiscard();
  }
  
  /**
   * 放棄行動（吃/碰/槓/胡）
   */
  giveUpAction() {
    this.gameState.pendingChiCombinations = [];
    this.gameState.hasPendingAction = false;
    this.gameState.waitingForPlayerResponse = false;
    this.gameState.lastDiscardTile = null;
    this.hideChiUI(); // 關閉 chi 選擇 overlay
    // 關閉行動按鈕，開啟摸牌
    this.ui.btnPon.disabled = true;
    this.ui.btnChi.disabled = true;
    this.ui.btnKan.disabled = true;
    this.ui.btnHu.disabled = true;
    this.ui.btnDraw.disabled = false;
    this.updateStatus('放棄。請摸牌');
  }
  
  /**
   * 玩家槓
   */
  playerKan() {
    if (this.gameState.currentPlayer !== 0) return;

    const lastDiscard = this.gameState.lastDiscardTile;
    if (!lastDiscard) return;

    if (this.engine.canKong(0, lastDiscard)) {
      this.engine.doKong(0, lastDiscard);
      window.audioManager && window.audioManager.playKong();
      // 清除pending狀態
      this.gameState.pendingChiCombinations = [];
      this.gameState.hasPendingAction = false;
      this.gameState.waitingForPlayerResponse = false;
      this.gameState.lastDiscardTile = null;
      this.renderMeldArea(0);
      this.renderHand(0);
      this.updateUI();
      
      // 槓後補牌
      const newTile = this.engine.drawTile(0);
      if (!newTile) {
        this.handleGameOver();
        return;
      }
      
      this.gameState.lastDrawnTile = newTile;
      this.renderHand(0);
      this.updateUI();
      
      // 檢查能否胡
      const winResult = this.engine.canWin(0);
      this.ui.btnHu.disabled = !winResult.canWin;
      
      this.updateStatus('槓！請選擇要出的牌');
      this.enableOnlyDiscard();
    }
  }
  
  /**
   * 玩家胡
   */
  playerHu() {
    if (this.gameState.currentPlayer !== 0) return;

    const lastDiscard = this.gameState.lastDiscardTile;
    if (!lastDiscard) return;

    const hand = [...this.engine.playerHands[0], lastDiscard];
    const winResult = this.engine.canWin(0, hand);

    if (winResult.canWin) {
      this.gameState.waitingForPlayerResponse = false;
      this.handleWin(0, lastDiscard, false);
    }
  }
  
  /**
   * AI 回合
   */
  aiTurn() {
    if (!this.gameState.isPlaying) return;
    if (this.gameState.currentPlayer === 0) return;
    
    const playerIndex = this.gameState.currentPlayer;
    const decision = this.engine.makeAIDecision(playerIndex, this.settings.aiLevel);
    
    switch (decision.action) {
      case 'discard':
        this.engine.discardTile(playerIndex, decision.tileIndex);
        this.renderHand(playerIndex);
        this.renderDiscards();
        this.notifyOtherPlayers(decision.tile, playerIndex);
        this.showToast(`AI-${playerIndex} 出了 ${this.getTileName(decision.tile)}`);
        this.nextPlayerTurn();
        break;
        
      case 'kong':
        this.engine.doKong(playerIndex, decision.tile);
        this.renderMeldArea(playerIndex);
        this.renderHand(playerIndex);
        
        // 槓後補牌
        const newTile = this.engine.drawTile(playerIndex);
        if (!newTile) {
          this.handleGameOver();
          return;
        }
        this.renderHand(playerIndex);
        
        // 檢查是否自摸胡（槓後摸牌可能胡）
        const kongWinResult = this.engine.canWin(playerIndex);
        if (kongWinResult.canWin) {
          this.handleWin(playerIndex, newTile, false); // isSelfDraw=false (槓後補牌不視為自摸)
          return;
        }
        
        // AI 槓後直接出牌
        const discardDecision = this.engine.makeAIDecision(playerIndex, this.settings.aiLevel);
        if (discardDecision.action === 'discard') {
          this.engine.discardTile(playerIndex, discardDecision.tileIndex);
          this.renderHand(playerIndex);
          this.renderDiscards();
          this.notifyOtherPlayers(discardDecision.tile, playerIndex);
        }
        
        this.nextPlayerTurn();
        break;
        
      case 'win':
        this.handleWin(playerIndex, decision.tile, true);
        break;
        
      default:
        this.nextPlayerTurn();
    }
  }
  
  /**
   * 通知其他玩家（AI 决策碰槓胡）
   */
  notifyOtherPlayers(tile, fromPlayer) {
    // 儲存最後打的牌（提供給玩家）
    this.gameState.lastDiscardTile = tile;
    console.log('[notifyOtherPlayers] tile=' + tile + ' fromPlayer=' + fromPlayer + ' nextPlayer=0 hasPendingAction will be set');
    
    // 先關閉所有行動按鈕，避免上一輪的殘留狀態
    this.ui.btnPon.disabled = true;
    this.ui.btnKan.disabled = true;
    this.ui.btnHu.disabled = true;
    
    // 檢查是否有玩家可以碰、槓、胡
    for (let i = 1; i <= 3; i++) {
      const playerIndex = (fromPlayer + i) % 4;
      if (playerIndex === 0) continue; // 玩家决策
      
      if (this.engine.canHu(playerIndex, tile)) {
        // AI 胡
        this.handleWin(playerIndex, tile, false);
        return;
      }
    }
    
    // 檢查玩家能否碰或槓
    if (this.engine.canPeng(0, tile)) {
      this.ui.btnPon.disabled = false;
      this.showToast('可以碰！');
    }
    
    if (this.engine.canKong(0, tile)) {
      this.ui.btnKan.disabled = false;
      this.showToast('可以槓！');
    }
    
    // 檢查玩家能否吃
    const chiCombos = this.engine.findChiCombinations(this.engine.playerHands[0], tile);
    if (chiCombos.length > 0) {
      this.gameState.pendingChiCombinations = chiCombos;
      this.gameState.hasPendingAction = true;
      this.gameState.waitingForPlayerResponse = true;
      this.ui.btnChi.disabled = false;
      this.ui.btnDraw.disabled = true; // 鎖住摸牌，等玩家選擇
      this.showToast('可以吃！');
    } else {
      // 沒有任何行動選項：關閉所有按鈕，允許玩家直接摸牌
      this.gameState.pendingChiCombinations = [];
      this.gameState.hasPendingAction = false;
      this.gameState.waitingForPlayerResponse = false;
      this.ui.btnChi.disabled = true;
      this.ui.btnDraw.disabled = false;
    }
  }
  
  /**
   * 下一玩家回合
   */
  nextPlayerTurn() {
    console.log('[nextPlayerTurn] currentPlayer=' + this.gameState.currentPlayer + ' waitingForPlayerResponse=' + this.gameState.waitingForPlayerResponse + ' hasPendingAction=' + this.gameState.hasPendingAction + ' skipAutoDraw=' + this.gameState.skipAutoDraw);
    
    // Auto-reject pending player-only actions when it's AI's turn
    // This fixes the infinite loop where AI gets stuck because waitingForPlayerResponse=true
    if (this.gameState.hasPendingAction && this.gameState.currentPlayer !== 0) {
      console.log('[nextPlayerTurn] AI has pending player-only action, auto-rejecting');
      this.gameState.pendingChiCombinations = [];
      this.gameState.hasPendingAction = false;
      this.gameState.waitingForPlayerResponse = false;
      this.gameState.skipAutoDraw = false;
    }
    
    // 如果在等待玩家選擇行動，直接堵住（不透傳）
    if (this.gameState.waitingForPlayerResponse) {
      return;
    }
    
    // 關閉玩家的碰槓胡按鈕
    this.ui.btnPon.disabled = true;
    this.ui.btnKan.disabled = true;
    this.ui.btnHu.disabled = true;
    this.ui.btnChi.disabled = true;
    
    // 切換玩家
    this.gameState.currentPlayer = this.engine.nextTurn();
    this.updateUI();
    
    // 檢查遊戲是否結束
    if (this.engine.isGameOver()) {
      this.handleGameOver();
      return;
    }
    
    // After switching player, check again if AI has pending player-only action and auto-clear
    // This handles edge cases where pending action was set for an AI that couldn't act on it
    if (this.gameState.hasPendingAction && this.gameState.currentPlayer !== 0) {
      console.log('[nextPlayerTurn] AI after switch has pending player-only action, auto-rejecting');
      this.gameState.pendingChiCombinations = [];
      this.gameState.hasPendingAction = false;
      this.gameState.waitingForPlayerResponse = false;
      this.gameState.skipAutoDraw = false;
    }
    
    // 如果是玩家：檢查是否有pending的吃/碰/槓/胡選項
    if (this.gameState.currentPlayer === 0) {
      if (this.gameState.hasPendingAction) {
        // 有選項：停下來等玩家決定
        this.gameState.waitingForPlayerResponse = true;
        this.enableActionButtons();
        this.updateStatus('請選擇：吃/碰/槓/胡，或點摸牌放棄');
        return;
      }
      // 沒有pending選項，正常摸牌
      // 但如果 skipAutoDraw=true（玩家剛放棄pending動作），跳過這次摸牌
      if (this.gameState.skipAutoDraw) {
        console.log('[nextPlayerTurn] skipAutoDraw=true, skipping draw for player 0');
        this.gameState.skipAutoDraw = false;
        this.enablePlayerActions();
        this.updateStatus('請選擇要出的牌');
        return;
      }
      const drawnTile = this.engine.drawTile(0);
      if (!drawnTile) {
        this.handleGameOver();
        return;
      }
      this.gameState.lastDrawnTile = drawnTile;
      this.gameState.selectedTileIndex = this.engine.playerHands[0].length - 1;
      this.renderHand(0);
      this.enableOnlyDiscard(); // 自動摸牌後只准出牌，禁止再摸！
      this.updateStatus('請選擇要出的牌');
      // 檢查能否胡（玩家自摸）
      const winResult = this.engine.canWin(0);
      this.ui.btnHu.disabled = !winResult.canWin;
    } else {
      this.disablePlayerActions();
      // AI 回合
      setTimeout(() => this.aiTurn(), 1000);
    }
    this.updateAvatarScores();
    this.renderCentralWidget();
  }
  
  /**
   * 處理胡牌
   */
  handleWin(playerIndex, winTile, isSelfDraw) {
    window.audioManager && window.audioManager.playWin();
    const hand = this.engine.playerHands[playerIndex];
    const melds = this.engine.meldRecords.filter(m => m.player === playerIndex);
    const playerWind = this.playerWinds[playerIndex];
    
    // 計算台數
    const scoreResult = this.engine.calculateTaiwanScore(
      hand, winTile, isSelfDraw, melds, this.prevailingWind, playerWind
    );
    
    // 計算分數
    const winScore = scoreResult.fans * this.settings.baseScore;
    
    // 更新分數
    let loserIndex;
    if (isSelfDraw) {
      // 自摸：其他三家支付
      for (let i = 0; i < 4; i++) {
        if (i === playerIndex) continue;
        this.scores[i] -= winScore;
        this.scores[playerIndex] += winScore;
      }
      this.showToast(`自摸！${this.getPlayerName(playerIndex)} 贏了 ${winScore} 分 x${scoreResult.fans} 台`);
    } else {
      // 放炮：點炮者支付
      const lastDiscard = this.engine.discardedTiles[this.engine.discardedTiles.length - 1];
      loserIndex = lastDiscard ? lastDiscard.player : null;
      if (loserIndex !== null && loserIndex !== playerIndex) {
        this.scores[loserIndex] -= winScore;
        this.scores[playerIndex] += winScore;
      }
      this.showToast(`${this.getPlayerName(playerIndex)} 胡了！贏了 ${winScore} 分`);
    }
    
    // 顯示胡牌詳情
    let detailsText = scoreResult.details.map(d => `${d.name}:${d.fans}台`).join(', ');
    this.showToast(`台數：${detailsText}`, 5000);
    
    // 結束遊戲
    this.gameState.isPlaying = false;
    this.disablePlayerActions();
    this.ui.btnStart.disabled = false;
    
    this.updateScoreDisplay();
    this.updateStatus(`遊戲結束！${this.getPlayerName(playerIndex)} 獲勝`);
  }
  
  /**
   * 處理遊戲結束
   */
  handleGameOver() {
    window.audioManager && window.audioManager.stopBGM();
    this.gameState.isPlaying = false;
    this.gameState.hasPendingAction = false;
    this.gameState.waitingForPlayerResponse = false;
    this.gameState.pendingChiCombinations = [];
    this.gameState.lastDiscardTile = null;
    this.gameState.skipAutoDraw = false;
    this.disablePlayerActions();
    this.ui.btnStart.disabled = false;
    this.updateStatus('遊戲結束！牌牆已空');
    this.showToast('流局');
  }
  
  /**
   * 渲染所有手牌
   */
  renderAllHands() {
    for (let i = 0; i < 4; i++) {
      this.renderHand(i);
    }
    this.renderDiscards();
    this.renderAllMelds();
  }

  /**
   * 渲染對手（AI）手牌 - 顯示背面牌
   */
  renderOpponentHands() {
    for (let i = 1; i <= 3; i++) {
      const container = this.ui[`ai${i}Hand`];
      if (!container) continue;
      const hand = this.engine.playerHands[i];
      container.innerHTML = hand.map(() => this.createBackTileHTML()).join('');
    }
  }
  
  /**
   * 渲染手牌
   */
  renderHand(playerIndex) {
    const hand = this.engine.playerHands[playerIndex];
    // DEBUG: 追蹤手牌數量
    console.log(`[renderHand] player=${playerIndex} handSize=${hand.length} melds=${this.engine.meldRecords.filter(m => m.player === playerIndex).length}`);
    // 建立 [tile, originalIndex] 陣列再排序，永不丟失原始 index
    const indexedHand = hand.map((tile, idx) => ({ tile, originalIndex: idx }));
    const sortedIndexed = [...indexedHand].sort((a, b) => a.tile - b.tile);
    
    if (playerIndex === 0) {
      // 玩家手牌
      this.ui.handTiles.innerHTML = sortedIndexed.map(({ tile, originalIndex }) => {
        const isSelected = this.gameState.selectedTileIndex === originalIndex;
        const isLastDrawn = this.gameState.lastDrawnTile === tile && 
                           originalIndex === hand.length - 1 &&
                           this.gameState.currentPlayer === 0;
        return this.createTileHTML(tile, isSelected, isLastDrawn, originalIndex, true);
      }).join('');
      
      // 綁定點擊事件
      this.ui.handTiles.querySelectorAll('.tile').forEach(tileEl => {
        tileEl.addEventListener('click', (e) => {
          const index = parseInt(e.currentTarget.dataset.index);
          this.selectTile(index);
        });
        tileEl.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const index = parseInt(e.currentTarget.dataset.index);
            this.selectTile(index);
          }
        });
      });
    } else {
      // AI 手牌（只顯示背面，按 originalIndex 順序）
      const element = this.ui[`ai${playerIndex}Hand`];
      if (element) {
        element.innerHTML = sortedIndexed.map(({ originalIndex }) => this.createBackTileHTML()).join('');
      }
    }
  }
  
  /**
   * 渲染攤牌區（所有玩家）
   */
  renderMeldArea(playerIndex) {
    const melds = this.engine.meldRecords.filter(m => m.player === playerIndex);
    const meldHTML = melds.map(meld => {
      return meld.tiles.map(tile => this.createSmallTileHTML(tile)).join('') +
             `<span class="meld-type">${this.getMeldName(meld.type)}</span>`;
    }).join('<div class="meld-separator"></div>');

    if (playerIndex === 0) {
      this.ui.meldArea.innerHTML = meldHTML;
    } else {
      // AI 玩家的副露顯示：使用快取的元素
      const aiMeldEl = this.ui[`ai${playerIndex}Meld`];
      if (aiMeldEl) aiMeldEl.innerHTML = meldHTML;
    }
  }

  /**
   * 渲染所有攤牌區
   */
  renderAllMelds() {
    for (let i = 0; i < 4; i++) {
      this.renderMeldArea(i);
    }
  }

  /**
   * 渲染中央 widget（LED 計時器 + 方向標籤）
   */
  renderCentralWidget() {
    // 更新剩餘牌數
    if (this.ui.ledTimer) {
      this.ui.ledTimer.textContent = this.engine.wallTiles.length;
    }
    // 更新方向標籤高亮
    const windEls = {
      31: this.ui.dirEast,
      32: this.ui.dirSouth,
      33: this.ui.dirWest,
      34: this.ui.dirNorth
    };
    Object.values(windEls).forEach(el => el && el.classList.remove('active'));
    const currentWind = this.playerWinds[this.gameState.currentPlayer];
    const activeEl = windEls[currentWind];
    if (activeEl) activeEl.classList.add('active');
  }

  /**
   * 更新所有玩家 Avatar 的分數和牌數
   */
  updateAvatarScores() {
    const names = ['player', 'ai1', 'ai2', 'ai3'];
    const scoreEls = [
      this.ui.playerScore,
      this.ui.ai1Score,
      this.ui.ai2Score,
      this.ui.ai3Score
    ];
    const tilesCountEls = [
      this.ui.playerTilesCount,
      this.ui.ai1TilesCount,
      this.ui.ai2TilesCount,
      this.ui.ai3TilesCount
    ];
    for (let i = 0; i < 4; i++) {
      if (scoreEls[i]) scoreEls[i].textContent = this.scores[i];
      if (tilesCountEls[i]) {
        const count = this.engine.playerHands[i].length;
        tilesCountEls[i].innerHTML = `<span>${count}</span>張`;
      }
    }
  }

  /**
   * 顯示/隱藏聽牌 badge
   */
  showListenBadge(playerIndex, show) {
    const avatarEl = this.ui[`avatar${playerIndex}`];
    if (!avatarEl) return;
    const existing = avatarEl.querySelector('.listen-badge');
    if (show && !existing) {
      const badge = document.createElement('div');
      badge.className = 'listen-badge';
      badge.textContent = '聴牌';
      avatarEl.style.position = 'relative';
      avatarEl.appendChild(badge);
    } else if (!show && existing) {
      existing.remove();
    }
  }

  /**
   * 渲染捨牌區
   */
  renderDiscards() {
    this.ui.discardTiles.innerHTML = this.engine.discardedTiles.map((disc, idx, arr) => {
      const isLast = idx === arr.length - 1;
      return `<div class="tile-small" style="position:relative">${this.getTileSVG(disc.tile, 'tile-img-small')}${isLast ? '<div class="discard-last-marker"></div>' : ''}</div>`;
    }).join('');

    this.ui.wallCount.textContent = this.engine.wallTiles.length;
  }
  
  /**
   * 選擇手牌
   */
  selectTile(index) {
    if (this.gameState.currentPlayer !== 0) return;
    
    // 切換選中狀態
    if (this.gameState.selectedTileIndex === index) {
      this.gameState.selectedTileIndex = null;
    } else {
      this.gameState.selectedTileIndex = index;
    }
    
    // 更新顯示 - 使用 'tile-selected' 與 createTileHTML 一致
    this.ui.handTiles.querySelectorAll('.tile').forEach((tileEl, i) => {
      const actualIndex = parseInt(tileEl.dataset.index);
      tileEl.classList.toggle('tile-selected', actualIndex === this.gameState.selectedTileIndex);
    });
  }
  
  /**
   * 更新 UI
   */
  updateUI() {
    // 莊家
    const windNames = ['東', '南', '西', '北'];
    this.ui.dealer.textContent = windNames[this.engine.dealer];
    
    // 剩餘牌數
    this.ui.remaining.textContent = this.engine.wallTiles.length;
    
    // 局數
    this.ui.round.textContent = `${windNames[(this.prevailingWind - 31)]}一局`;
    
    // 分數
    this.updateScoreDisplay();
    
    // 按鈕狀態
    this.ui.btnDraw.disabled = this.gameState.currentPlayer !== 0 || !this.gameState.isPlaying;
    this.ui.btnDiscard.disabled = this.gameState.currentPlayer !== 0 || 
                                   this.gameState.selectedTileIndex === null || 
                                   !this.gameState.isPlaying;
  }
  
  /**
   * 更新分數顯示
   */
  updateScoreDisplay() {
    this.ui.playerScore.textContent = this.scores[0];
    this.ui.ai1Score.textContent = this.scores[1];
    this.ui.ai2Score.textContent = this.scores[2];
    this.ui.ai3Score.textContent = this.scores[3];
  }
  
  /**
   * 啟用玩家操作按鈕（摸牌階段）
   */
  enablePlayerActions() {
    this.ui.btnDraw.disabled = this.gameState.currentPlayer !== 0;
    this.ui.btnDiscard.disabled = true; // 需要先選擇牌
    this.ui.btnPon.disabled = true;
    this.ui.btnChi.disabled = true;
    this.ui.btnKan.disabled = true;
    this.ui.btnHu.disabled = true;
  }
  
  /**
   * 啟用行動按鈕（吃/碰/槓/胡 - 針對別人打的牌）
   */
  enableActionButtons() {
    const lastDiscard = this.gameState.lastDiscardTile;
    if (!lastDiscard) return;

    const tile = lastDiscard; // lastDiscard is already the tile number
    this.ui.btnDraw.disabled = false; // 放棄吃/碰/槓，選擇摸牌
    this.ui.btnDiscard.disabled = true;

    // 碰
    this.ui.btnPon.disabled = !this.engine.canPeng(0, tile);
    // 槓
    this.ui.btnKan.disabled = !this.engine.canKong(0, tile);
    // 吃
    this.ui.btnChi.disabled = this.gameState.pendingChiCombinations.length === 0;
    // 胡
    this.ui.btnHu.disabled = !this.engine.canHu(0, tile);
  }
  
  /**
   * 僅啟用出牌按鈕
   */
  enableOnlyDiscard() {
    this.ui.btnDraw.disabled = true;
    this.ui.btnDiscard.disabled = false;
    this.ui.btnPon.disabled = true;
    this.ui.btnChi.disabled = true;
    this.ui.btnKan.disabled = true;
    this.ui.btnHu.disabled = true;
  }
  
  /**
   * 停用玩家操作按鈕
   */
  disablePlayerActions() {
    this.ui.btnDraw.disabled = true;
    this.ui.btnDiscard.disabled = true;
    this.ui.btnPon.disabled = true;
    this.ui.btnKan.disabled = true;
    this.ui.btnHu.disabled = true;
  }
  
  /**
   * 更新狀態訊息
   */
  updateStatus(message) {
    this.ui.gameStatus.textContent = message;
  }
  
  /**
   * 顯示提示訊息
   */
  showToast(message, duration = 3000) {
    this.ui.messageToast.textContent = message;
    this.ui.messageToast.classList.add('show');
    
    setTimeout(() => {
      this.ui.messageToast.classList.remove('show');
    }, duration);
  }
  
  /**
   * 開啟設定面板
   */
  openSettings() {
    this.ui.settingInitial.value = this.settings.initialScore;
    this.ui.settingBase.value = this.settings.baseScore;
    this.ui.settingFan.value = this.settings.fanScore;
    this.ui.settingAI.value = this.settings.aiLevel;
    this.ui.settingMode.value = this.settings.mode;
    
    this.ui.settingsOverlay.classList.add('show');
    this.ui.settingsPanel.classList.add('show');
  }
  
  /**
   * 儲存設定
   */
  saveSettings() {
    this.settings.initialScore = parseInt(this.ui.settingInitial.value) || 1000;
    this.settings.baseScore = parseInt(this.ui.settingBase.value) || 50;
    this.settings.fanScore = parseInt(this.ui.settingFan.value) || 20;
    this.settings.aiLevel = parseInt(this.ui.settingAI.value) || 1;
    this.settings.mode = this.ui.settingMode.value || 'ai';
    
    // 更新分數顯示
    this.scores = [this.settings.initialScore, this.settings.initialScore, this.settings.initialScore, this.settings.initialScore];
    this.updateScoreDisplay();
    
    // 更新底/台價格顯示
    if (this.ui.basePrice) this.ui.basePrice.textContent = this.settings.baseScore;
    if (this.ui.taiPrice) this.ui.taiPrice.textContent = this.settings.fanScore;
    
    this.closeSettings();
    this.showToast('設定已儲存');
  }
  
  /**
   * 關閉設定面板
   */
  closeSettings() {
    this.ui.settingsOverlay.classList.remove('show');
    this.ui.settingsPanel.classList.remove('show');
  }
  
  /**
   * 顯示 AI 分析
   */
  showAnalysis() {
    const analysis = this.analyzeGameSituation();
    this.ui.analysisContent.innerHTML = analysis;
    this.ui.analysisPanel.classList.add('show');
  }
  
  /**
   * 關閉 AI 分析面板
   */
  closeAnalysis() {
    this.ui.analysisPanel.classList.remove('show');
  }
  
  /**
   * 分析遊戲局勢
   */
  analyzeGameSituation() {
    let html = '<div class="analysis-section">';
    
    // 玩家手牌分析
    html += '<h4>你的手牌</h4>';
    const playerHand = this.engine.playerHands[0];
    const playerMelds = this.engine.meldRecords.filter(m => m.player === 0);
    
    // 統計各花色
    const suitCount = { wan: 0, tong: 0, tiao: 0, honor: 0 };
    for (let tile of playerHand) {
      const suit = this.engine.getSuit(tile);
      suitCount[suit]++;
    }
    html += `<p>萬:${suitCount.wan} 筒:${suitCount.tong} 條:${suitCount.tiao} 字:${suitCount.honor}</p>`;
    
    // 聽牌分析
    const waitingTiles = this.engine.getWaitingTiles(0);
    if (waitingTiles.length > 0) {
      html += `<p class="waiting">聽牌：${waitingTiles.map(t => this.getTileName(t)).join(', ')}</p>`;
    } else {
      // 計算向聽數
      const shanten = this.calculateShanten(playerHand, playerMelds);
      html += `<p>向聽數：${shanten}</p>`;
    }
    
    // 場上資訊
    html += '</div><div class="analysis-section">';
    html += '<h4>場上資訊</h4>';
    html += `<p>剩餘牌數：${this.engine.wallTiles.length}</p>`;
    html += `<p>已出牌數：${this.engine.discardedTiles.length}</p>`;
    
    // 統計各牌被丟出數量
    const discardStats = {};
    for (let disc of this.engine.discardedTiles) {
      discardStats[disc.tile] = (discardStats[disc.tile] || 0) + 1;
    }
    
    // 顯示危險牌
    const dangerousTiles = this.findDangerousTiles();
    if (dangerousTiles.length > 0) {
      html += `<p class="dangerous">危險牌：${dangerousTiles.map(t => this.getTileName(t)).join(', ')}</p>`;
    }
    
    html += '</div>';
    return html;
  }
  
  /**
   * 計算向聽數（簡化版）
   */
  calculateShanten(hand, melds) {
    // 這是一個簡化的向聽數計算
    // 完整實現需要考慮更多情況
    const totalTiles = hand.length + melds.length * 3;
    const targetTiles = 14; // 聽牌時的手牌數
    const currentTiles = totalTiles;
    
    // 計算已完成的面子數
    let completeMelds = melds.filter(m => m.type === 'peng' || m.type === 'gang').length;
    
    // 計算需要的面子數（4組面子 + 1對將 = 5組）
    const neededGroups = 5 - completeMelds;
    const tilesNeeded = neededGroups * 3;
    
    return Math.max(0, Math.ceil((tilesNeeded - currentTiles) / 3));
  }
  
  /**
   * 找出危險牌（可能被聽的牌）
   */
  findDangerousTiles() {
    const dangerous = [];
    const recentDiscards = this.engine.discardedTiles.slice(-6); // 最近6張
    
    for (let disc of recentDiscards) {
      const suit = this.engine.getSuit(disc.tile);
      if (suit !== 'honor') {
        // 數字牌：檢查相鄰牌
        const num = this.engine.getNumber(disc.tile);
        if (num > 1) dangerous.push(disc.tile - 1);
        if (num < 9) dangerous.push(disc.tile + 1);
      }
    }
    
    return [...new Set(dangerous)];
  }
  
  /**
   * 取得牌的 SVG 圖片 HTML
   */
  getTileSVG(tileId, cssClass = '') {
    const TILE_SVG = {
      1: 'tiles/wan_1.svg',   2: 'tiles/wan_2.svg',   3: 'tiles/wan_3.svg',
      4: 'tiles/wan_4.svg',   5: 'tiles/wan_5.svg',   6: 'tiles/wan_6.svg',
      7: 'tiles/wan_7.svg',   8: 'tiles/wan_8.svg',   9: 'tiles/wan_9.svg',
      11: 'tiles/tong_1.svg', 12: 'tiles/tong_2.svg', 13: 'tiles/tong_3.svg',
      14: 'tiles/tong_4.svg', 15: 'tiles/tong_5.svg', 16: 'tiles/tong_6.svg',
      17: 'tiles/tong_7.svg', 18: 'tiles/tong_8.svg', 19: 'tiles/tong_9.svg',
      21: 'tiles/tiao_1.svg', 22: 'tiles/tiao_2.svg', 23: 'tiles/tiao_3.svg',
      24: 'tiles/tiao_4.svg', 25: 'tiles/tiao_5.svg', 26: 'tiles/tiao_6.svg',
      27: 'tiles/tiao_7.svg', 28: 'tiles/tiao_8.svg', 29: 'tiles/tiao_9.svg',
      31: 'tiles/dong.svg',  32: 'tiles/nan.svg',   33: 'tiles/xi.svg',
      34: 'tiles/bei.svg',   35: 'tiles/zhong.svg', 36: 'tiles/fa.svg',
      37: 'tiles/bai.svg',
    };
    const src = TILE_SVG[tileId];
    if (!src) return `<span class="tile-text ${cssClass}">${this.getTileDisplay(tileId)}</span>`;
    return `<img src="assets/${src}" alt="${this.getTileDisplay(tileId)}" class="tile-img ${cssClass}" loading="lazy">`;
  }

  /**
   * 創建麻將牌 HTML（使用 SVG 瓷磚圖片）
   */
  createTileHTML(tile, isSelected = false, isLastDrawn = false, index = 0, isPlayer = true) {
    const selectedClass = isSelected ? 'tile-selected' : '';
    const lastDrawnClass = isLastDrawn ? 'tile-last-drawn' : '';
    return `<div class="tile ${selectedClass} ${lastDrawnClass}"
                   data-index="${index}" data-tile="${tile}" tabindex="0">
      ${this.getTileSVG(tile)}
    </div>`;
  }
  
  /**
   * 創建背面麻將牌 HTML
   */
  createBackTileHTML() {
    return `<div class="tile-back">
      <img src="assets/tiles/back.svg" alt="back" class="tile-img" loading="lazy">
    </div>`;
  }
  
  /**
   * 創建小麻將牌 HTML
   */
  createSmallTileHTML(tile) {
    return `<div class="tile-small">${this.getTileSVG(tile, 'tile-img-small')}</div>`;
  }
  
  /**
   * 取得牌的顯示文字
   */
  getTileDisplay(tile) {
    const suit = this.engine.getSuit(tile);
    if (suit === 'honor') {
      const honorNames = ['東', '南', '西', '北', '中', '發', '白'];
      const idx = this.engine.getNumber(tile) - 31;
      return honorNames[idx] || '';
    } else {
      const num = this.engine.getNumber(tile);
      const suitChar = suit === 'wan' ? '萬' : suit === 'tong' ? '筒' : '條';
      return `${num}${suitChar}`;
    }
  }
  
  /**
   * 取得牌名
   */
  getTileName(tile) {
    return this.engine.TILE_NAMES[tile] || tile;
  }
  
  /**
   * 取得玩家名稱
   */
  getPlayerName(playerIndex) {
    return playerIndex === 0 ? '你' : `AI-${playerIndex}`;
  }
  
  /**
   * 取得面子名稱
   */
  getMeldName(type) {
    const names = {
      peng: '碰',
      chi: '吃',
      gang: '槓',
      angang: '暗槓'
    };
    return names[type] || type;
  }
}

// 初始化遊戲
let game;
document.addEventListener('DOMContentLoaded', () => {
  game = new MahjongGame();
});

// 擴展 MahjongEngine：新增 canHu 方法
if (typeof MahjongEngine !== 'undefined') {
  MahjongEngine.prototype.canHu = function(playerIndex, tile) {
    const hand = [...this.playerHands[playerIndex], tile];
    const result = this.canWin(playerIndex, hand);
    return result.canWin;
  };
}
