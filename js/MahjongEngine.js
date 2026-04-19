/**
 * 麻將核心引擎
 * 牌組定義、洗牌發牌、胡牌判斷（5組面子+1對將）、台數計算、能否吃碰槓胡、AI決策三等級
 */

class MahjongEngine {
  constructor() {
    // 牌種定義：1-9萬、11-19筒、21-29條，東南西北中發白
    this.TILE_SUITS = {
      WAN: 'wan',   // 1-9
      TONG: 'tong', // 11-19
      TIAO: 'tiao'  // 21-29
    };
    
    // 花色：1-9萬、11-19筒、21-29條、31-37字牌
    this.TILE_NAMES = {
      1:'一萬',2:'二萬',3:'三萬',4:'四萬',5:'五萬',6:'六萬',7:'七萬',8:'八萬',9:'九萬',
      11:'一筒',12:'二筒',13:'三筒',14:'四筒',15:'五筒',16:'六筒',17:'七筒',18:'八筒',19:'九筒',
      21:'一條',22:'二條',23:'三條',24:'四條',25:'五條',26:'六條',27:'七條',28:'八條',29:'九條',
      31:'東',32:'南',33:'西',34:'北',35:'中',36:'發',37:'白'
    };
    
    // 麻將 Unicode 字元（用于显示）
    this.TILE_CHARS = {
      1:'🀇',2:'🀈',3:'🀉',4:'🀊',5:'🀋',6:'🀌',7:'🀍',8:'🀎',9:'🀏',
      11:'🀙',12:'🀚',13:'🀛',14:'🀜',15:'🀝',16:'🀞',17:'🀟',18:'🀠',19:'🀡',
      21:'🀐',22:'🀑',23:'🀒',24:'🀓',25:'🀔',26:'🀕',27:'🀖',28:'🀗',29:'🀘',
      31:'🀀',32:'🀁',33:'🀂',34:'🀃',35:'🀄',36:'🀅',37:'🀆'
    };
    
    // 所有牌張（4組）
    this.TILE_COUNT = 4; // 每種牌4張
    
    // 完整牌池
    this.tilePool = [];
    
    // 玩家手牌
    this.playerHands = [[], [], [], []];
    
    // 桌面上的牌（摸牌堆）
    this.wallTiles = [];
    
    // 捨牌記錄
    this.discardedTiles = [];
    
    // 碰槓吃記錄
    this.meldRecords = []; // {player, type, tiles}
    
    // 當前玩家
    this.currentPlayer = 0;
    
    // 莊家
    this.dealer = 0;
    
    // 台灣16張：每人16張，莊家17張
    this.INITIAL_HAND_SIZE = 16;
  }
  
  /**
   * 建立完整牌池
   */
  buildTilePool() {
    this.tilePool = [];
    
    // 數字牌：萬筒條 1-9，每種4張
    for (let suit of [1, 11, 21]) {
      for (let num = 0; num < 9; num++) {
        for (let c = 0; c < 4; c++) {
          this.tilePool.push(suit + num);
        }
      }
    }
    
    // 字牌：東南西北中發白 31-37，每種4張
    for (let tile = 31; tile <= 37; tile++) {
      for (let c = 0; c < 4; c++) {
        this.tilePool.push(tile);
      }
    }
    
    return this.tilePool.length; // 應為144張
  }
  
  /**
   * Fisher-Yates 洗牌
   */
  shuffleTiles() {
    for (let i = this.tilePool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tilePool[i], this.tilePool[j]] = [this.tilePool[j], this.tilePool[i]];
    }
    return this.tilePool;
  }
  
  /**
   * 發牌：每位玩家13張，莊家多一張
   */
  dealTiles() {
    console.log('[Engine.dealTiles] INITIAL_HAND_SIZE=' + this.INITIAL_HAND_SIZE);
    this.playerHands = [[], [], [], []];
    this.wallTiles = [...this.tilePool];
    this.discardedTiles = [];
    this.meldRecords = [];

    // 發初始手牌
    for (let i = 0; i < 4; i++) {
      const start = i * this.INITIAL_HAND_SIZE;
      this.playerHands[i] = this.wallTiles.splice(start, this.INITIAL_HAND_SIZE);
      console.log('[Engine.dealTiles] player' + i + ' handSize=' + this.playerHands[i].length);
    }
    
    // 莊家補一張
    this.currentPlayer = this.dealer;
    
    return {
      hands: this.playerHands,
      wallTiles: this.wallTiles.length
    };
  }
  
  /**
   * 補牌（從牌牆摸牌）
   */
  drawTile(playerIndex) {
    if (this.wallTiles.length === 0) return null;
    const tile = this.wallTiles.shift();
    this.playerHands[playerIndex].push(tile);
    return tile;
  }
  
  /**
   * 玩家打字牌
   */
  discardTile(playerIndex, tileIndex) {
    const tile = this.playerHands[playerIndex].splice(tileIndex, 1)[0];
    this.discardedTiles.push({ tile, player: playerIndex });
    return tile;
  }
  
  /**
   * 取得牌的花色
   */
  getSuit(tile) {
    if (tile >= 31) return 'honor';
    if (tile >= 21) return 'tiao';
    if (tile >= 11) return 'tong';
    return 'wan';
  }
  
  /**
   * 取得牌面值（1-9）
   */
  getNumber(tile) {
    if (tile >= 31) return tile;
    return ((tile - 1) % 10) + 1;
  }
  
  /**
   * 判斷能否碰
   */
  canPeng(playerIndex, tile) {
    const hand = this.playerHands[playerIndex];
    const count = hand.filter(t => t === tile).length;
    return count >= 2;
  }
  
  /**
   * 判斷能否槓（暗槓）
   */
  canKong(playerIndex, tile) {
    const hand = this.playerHands[playerIndex];
    const count = hand.filter(t => t === tile).length;
    return count === 4;
  }
  
  /**
   * 判斷能否加槓（碰後補槓）
   */
  canAddKong(playerIndex, tile) {
    // 檢查是否有對應的碰牌
    for (let meld of this.meldRecords) {
      if (meld.player === playerIndex && meld.type === 'peng' && meld.tiles[0] === tile) {
        return true;
      }
    }
    return false;
  }
  
  /**
   * 判斷能否吃（順子）
   */
  canChi(playerIndex, tile) {
    const hand = this.playerHands[playerIndex];
    const suit = this.getSuit(tile);
    if (suit === 'honor') return false; // 字牌不能吃
    
    const num = this.getNumber(tile);
    
    // 檢查能否組成順子
    const results = this.findChiCombinations(hand, tile);
    return results.length > 0;
  }
  
  /**
   * 找吃牌組合
   */
  findChiCombinations(hand, targetTile) {
    const suit = this.getSuit(targetTile);
    if (suit === 'honor') return [];
    
    const suitPrefix = suit === 'wan' ? 1 : suit === 'tong' ? 11 : 21;
    const num = this.getNumber(targetTile);
    const results = [];
    
    // 三種吃法：(num-2, num-1, num), (num-1, num, num+1), (num, num+1, num+2)
    const patterns = [
      [num - 2, num - 1],
      [num - 1, num + 1],
      [num + 1, num + 2]
    ];
    
    for (let pattern of patterns) {
      const [a, b] = pattern;
      if (a < 1 || b > 9) continue;
      
      const tileA = suitPrefix + a - 1;
      const tileB = suitPrefix + b - 1;
      
      const hasA = hand.includes(tileA);
      const hasB = hand.includes(tileB);
      
      if (hasA && hasB) {
        results.push([tileA, tileB]);
      }
    }
    
    return results;
  }
  
  /**
   * 執行碰
   */
  doPeng(playerIndex, tile) {
    if (!this.canPeng(playerIndex, tile)) return false;
    
    // 從手牌移除2張
    let removed = 0;
    this.playerHands[playerIndex] = this.playerHands[playerIndex].filter(t => {
      if (t === tile && removed < 2) {
        removed++;
        return false;
      }
      return true;
    });
    
    // 記錄碰
    this.meldRecords.push({
      player: playerIndex,
      type: 'peng',
      tiles: [tile, tile, tile]
    });
    
    return true;
  }
  
  /**
   * 執行吃
   */
  doChi(playerIndex, tile, tileA, tileB) {
    const hand = this.playerHands[playerIndex];
    if (!hand.includes(tileA) || !hand.includes(tileB)) return false;
    
    // 移除吃的牌
    this.playerHands[playerIndex] = hand.filter(t => t !== tileA && t !== tileB);
    
    // 記錄吃
    this.meldRecords.push({
      player: playerIndex,
      type: 'chi',
      tiles: [tileA, tile, tileB].sort((a, b) => a - b)
    });
    
    return true;
  }
  
  /**
   * 執行槓（暗槓）
   */
  doKong(playerIndex, tile) {
    if (!this.canKong(playerIndex, tile)) return false;
    
    // 從手牌移除4張
    this.playerHands[playerIndex] = this.playerHands[playerIndex].filter(t => t !== tile);
    
    // 記錄槓
    this.meldRecords.push({
      player: playerIndex,
      type: 'gang',
      tiles: [tile, tile, tile, tile]
    });
    
    return true;
  }
  
  /**
   * 胡牌判斷（5組面子 + 1 對將）
   * 使用深度優先搜索
   */
  canWin(playerIndex, tiles = null) {
    const hand = tiles || [...this.playerHands[playerIndex]];
    
    // 計數
    const counts = {};
    for (let tile of hand) {
      counts[tile] = (counts[tile] || 0) + 1;
    }
    
    // 取得所有牌種
    const tiles_list = Object.keys(counts).map(Number).sort((a, b) => a - b);
    
    // 嘗試找到將牌
    for (let tile of tiles_list) {
      if (counts[tile] >= 2) {
        // 假設這張是將牌
        const newCounts = { ...counts };
        newCounts[tile] -= 2;
        
        // 檢查剩下的牌能否組成4組面子
        if (this.canFormMelds(newCounts)) {
          return { canWin: true, pair: tile };
        }
      }
    }
    
    return { canWin: false, pair: null };
  }
  
  /**
   * 檢查能否組成4組面子
   */
  canFormMelds(counts) {
    const tiles = Object.keys(counts).map(Number);
    
    // 找到最小的牌
    let smallest = null;
    for (let t of tiles) {
      if (counts[t] > 0) {
        smallest = t;
        break;
      }
    }
    
    if (!smallest) return true; // 沒有牌了，成功
    
    const suit = this.getSuit(smallest);
    const num = this.getNumber(smallest);
    
    // 面子可以是刻子（3張相同）或順子（3張連續同花色）
    // 優先嘗試刻子
    if (counts[smallest] >= 3) {
      const newCounts = { ...counts };
      newCounts[smallest] -= 3;
      if (this.canFormMelds(newCounts)) return true;
    }
    
    // 嘗試順子（數字牌）
    if (suit !== 'honor') {
      const suitPrefix = suit === 'wan' ? 1 : suit === 'tong' ? 11 : 21;
      const next1 = suitPrefix + num; // 下一張
      const next2 = suitPrefix + num + 1; // 下下一張
      
      if (num <= 7 && counts[next1] > 0 && counts[next2] > 0) {
        const newCounts = { ...counts };
        newCounts[smallest]--;
        newCounts[next1]--;
        newCounts[next2]--;
        if (this.canFormMelds(newCounts)) return true;
      }
    }
    
    return false;
  }
  
  /**
   * 台數計算（台灣麻將）
   */
  calculateTaiwanScore(hand, winTile, isSelfDraw, melds, prevailingWind, playerWind) {
    let fans = 0;
    let details = [];
    
    // 基本台（莊家/閒家）
    const isDealer = (this.dealer === this.getCurrentPlayer());
    fans += isDealer ? 1 : 0;
    details.push({ name: isDealer ? '莊家' : '閒家', fans: isDealer ? 1 : 0 });
    
    // 自摸
    if (isSelfDraw) {
      fans += 1;
      details.push({ name: '自摸', fans: 1 });
    }
    
    // 門清
    const isAllMeldsHidden = melds.every(m => m.type !== 'peng' && m.type !== 'chi');
    if (isAllMeldsHidden && melds.length === 0) {
      fans += 1;
      details.push({ name: '門清', fans: 1 });
    }
    
    // 刻子計算
    const pengCounts = {};
    for (let tile of hand) {
      pengCounts[tile] = (pengCounts[tile] || 0) + 1;
    }
    
    // 中發白
    const honors = [35, 36, 37];
    for (let h of honors) {
      if (pengCounts[h] >= 3) {
        fans += 1;
        details.push({ name: `${this.TILE_NAMES[h]}刻`, fans: 1 });
      }
    }
    
    // 門風（與圈風相同）
    const windTiles = { 31: '東', 32: '南', 33: '西', 34: '北' };
    const circleWind = 31; // 假設東圈
    if (pengCounts[prevailingWind] >= 3) {
      fans += 1;
      details.push({ name: '圈風刻', fans: 1 });
    }
    
    // 自風
    if (pengCounts[playerWind] >= 3) {
      fans += 1;
      details.push({ name: '自風刻', fans: 1 });
    }
    
    // 三元牌刻子（已計算中發白，此處為食糊加分）
    
    // 湊一色（全部同一花色）
    const suits = new Set(hand.map(t => this.getSuit(t)));
    if (suits.size === 1 && !suits.has('honor')) {
      fans += 4;
      details.push({ name: '湊一色', fans: 4 });
    }
    
    // 混一色（全部同一花色+字牌）
    if (suits.size === 2 && suits.has('honor')) {
      fans += 3;
      details.push({ name: '混一色', fans: 3 });
    }
    
    // 對對胡（全是刻子）
    const allKeZi = Object.values(pengCounts).every(c => c === 3 || c === 2 || c === 0);
    if (allKeZi) {
      fans += 3;
      details.push({ name: '對對胡', fans: 3 });
    }
    
    // 屁胡（無任何加分）
    if (fans === 0) {
      fans = 1;
      details.push({ name: '屁胡', fans: 1 });
    }
    
    return { fans, details, score: fans * 100 };
  }
  
  /**
   * AI 決策 - 等級1：基礎（隨機）
   */
  aiLevel1_Decision(playerIndex) {
    const hand = this.playerHands[playerIndex];
    if (hand.length === 0) return { action: 'pass' };
    
    // 隨機打字牌
    const tileIndex = Math.floor(Math.random() * hand.length);
    const tile = hand[tileIndex];
    
    return {
      action: 'discard',
      tileIndex: tileIndex,
      tile: tile,
      reason: 'random'
    };
  }
  
  /**
   * AI 決策 - 等級2：防守（避免放炮）
   */
  aiLevel2_Decision(playerIndex) {
    const hand = this.playerHands[playerIndex];
    if (hand.length === 0) return { action: 'pass' };
    
    // 統計各牌危險度
    const dangerScores = {};
    
    for (let tile of hand) {
      let danger = 0;
      
      // 檢查周圍牌是否有人在聽
      for (let disc of this.discardedTiles) {
        const diff = Math.abs(disc.tile - tile);
        // 數字牌：檢查相鄰
        if (this.getSuit(tile) !== 'honor' && diff <= 2 && this.getSuit(disc.tile) === this.getSuit(tile)) {
          danger += 1;
        }
        // 字牌：相同危險
        if (this.getSuit(tile) === 'honor' && disc.tile === tile) {
          danger += 2;
        }
      }
      
      dangerScores[tile] = danger;
    }
    
    // 找最安全（危險度最低）的牌
    let safestTile = hand[0];
    let lowestDanger = dangerScores[hand[0]];
    
    for (let tile of hand) {
      if (dangerScores[tile] < lowestDanger) {
        lowestDanger = dangerScores[tile];
        safestTile = tile;
      }
    }
    
    const tileIndex = hand.indexOf(safestTile);
    
    // 檢查能否胡牌
    const tempHand = [...hand];
    const winResult = this.canWin(playerIndex, tempHand);
    if (winResult.canWin) {
      return {
        action: 'win',
        tile: winResult.pair,
        reason: 'win'
      };
    }
    
    // 檢查能否槓
    for (let tile of hand) {
      if (this.canKong(playerIndex, tile)) {
        return {
          action: 'kong',
          tile: tile,
          reason: 'has_kong'
        };
      }
    }
    
    return {
      action: 'discard',
      tileIndex: tileIndex,
      tile: safestTile,
      reason: 'safe_discard'
    };
  }
  
  /**
   * AI 決策 - 等級3：進攻（聽牌優化）
   */
  aiLevel3_Decision(playerIndex) {
    const hand = this.playerHands[playerIndex];
    if (hand.length === 0) return { action: 'pass' };
    
    // 檢查能否胡牌
    const winResult = this.canWin(playerIndex);
    if (winResult.canWin) {
      return {
        action: 'win',
        tile: winResult.pair,
        reason: 'win'
      };
    }
    
    // 計算每張牌打出後的聽牌數
    const waitingCounts = {};
    
    for (let i = 0; i < hand.length; i++) {
      const tile = hand[i];
      const testHand = [...hand];
      testHand.splice(i, 1);
      
      // 嘗試加入各種牌看能否聽
      let waitCount = 0;
      const possibleTiles = this.getPossibleTiles();
      
      for (let pTile of possibleTiles) {
        const test = [...testHand, pTile];
        const result = this.canWin(playerIndex, test);
        if (result.canWin) {
          waitCount++;
        }
      }
      
      waitingCounts[i] = waitCount;
    }
    
    // 找聽牌數最多的牌
    let bestIndex = 0;
    let maxWaits = waitingCounts[0];
    
    for (let i = 1; i < hand.length; i++) {
      if (waitingCounts[i] > maxWaits) {
        maxWaits = waitingCounts[i];
        bestIndex = i;
      }
    }
    
    // 檢查能否槓
    for (let tile of hand) {
      if (this.canKong(playerIndex, tile)) {
        return {
          action: 'kong',
          tile: tile,
          reason: 'aggressive_kong'
        };
      }
    }
    
    // 如果有聽牌機會，選擇聽牌數多的
    if (maxWaits > 0) {
      return {
        action: 'discard',
        tileIndex: bestIndex,
        tile: hand[bestIndex],
        reason: `waiting_${maxWaits}`
      };
    }
    
    // 否則退級到防守
    return this.aiLevel2_Decision(playerIndex);
  }
  
  /**
   * 取得所有可能的牌
   */
  getPossibleTiles() {
    const possible = [];
    // 數字牌
    for (let suit of [1, 11, 21]) {
      for (let n = 0; n < 9; n++) {
        possible.push(suit + n);
      }
    }
    // 字牌
    for (let t = 31; t <= 37; t++) {
      possible.push(t);
    }
    return possible;
  }
  
  /**
   * 綜合AI決策
   */
  makeAIDecision(playerIndex, level = 2) {
    switch (level) {
      case 1:
        return this.aiLevel1_Decision(playerIndex);
      case 2:
        return this.aiLevel2_Decision(playerIndex);
      case 3:
        return this.aiLevel3_Decision(playerIndex);
      default:
        return this.aiLevel2_Decision(playerIndex);
    }
  }
  
  /**
   * 取得玩家聽牌列表
   */
  getWaitingTiles(playerIndex) {
    const hand = this.playerHands[playerIndex];
    const waiting = [];
    const possibleTiles = this.getPossibleTiles();
    
    for (let tile of possibleTiles) {
      const testHand = [...hand, tile];
      const result = this.canWin(playerIndex, testHand);
      if (result.canWin) {
        waiting.push(tile);
      }
    }
    
    return waiting;
  }
  
  /**
   * 檢查遊戲是否結束（牌牆空了）
   */
  isGameOver() {
    return this.wallTiles.length === 0;
  }
  
  /**
   * 取得當前玩家
   */
  getCurrentPlayer() {
    return this.currentPlayer;
  }
  
  /**
   * 下一回合
   */
  nextTurn() {
    this.currentPlayer = (this.currentPlayer + 1) % 4;
    return this.currentPlayer;
  }
  
  /**
   * 重置遊戲
   */
  reset() {
    console.log('[Engine.reset] called');
    this.buildTilePool();
    this.shuffleTiles();
    return this.dealTiles();
  }
  
  /**
   * 測試用：打印手牌
   */
  printHand(playerIndex) {
    const hand = this.playerHands[playerIndex];
    const sorted = [...hand].sort((a, b) => a - b);
    return sorted.map(t => this.TILE_NAMES[t] || t).join(' ');
  }
}

// 匯出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MahjongEngine;
}
