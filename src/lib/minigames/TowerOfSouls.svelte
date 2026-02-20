<script>
  import { onMount } from "svelte";
  import { createEventDispatcher } from "svelte";

  // --- Props ---
  let {
    integrated = false,
    onWin,
    onLose,
    rewardItem = null,
    items = [],
    bucketName = "dracula",
  } = $props();

  const dispatch = createEventDispatcher();

  // --- Настройки ---
  const SUITS = ["🔥", "💧", "🌪️", "🌿"]; // Огонь, Вода, Воздух, Земля
  const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

  // --- State (Runes) ---
  let deck = $state([]); // Колода для добора
  let pyramid = $state([]); // Массив карт в пирамиде
  let activeCard = $state(null); // Текущая открытая карта
  let score = $state(0);
  let isGameOver = $state(false);

  // Modal State
  let modal = $state({ show: false, title: "", text: "", actions: [] });

  onMount(() => {
    initGame();
  });

  // --- Вычисляемые свойства ---
  let isWin = $derived(pyramid.every(c => c.removed));
  
  function getRewardItemData() {
    if (!rewardItem || !items || items.length === 0) return null;
    const itemId = typeof rewardItem === "string" ? rewardItem : rewardItem.id;
    return items.find((item) => item.id === itemId);
  }
  let rewardItemData = $derived(getRewardItemData());

  // --- Инициализация ---
  function initGame() {
    deck = [];
    pyramid = [];
    activeCard = null;
    score = 0;
    isGameOver = false;
    hideModal();

    // 1. Создаем колоду
    let tempDeck = [];
    for (let s = 0; s < SUITS.length; s++) {
      for (let r = 0; r < RANKS.length; r++) {
        tempDeck.push({
          id: `card-${s}-${r}-${Math.random()}`,
          suit: SUITS[s],
          rank: r,
          rankStr: RANKS[r],
          removed: false,
          row: 0, 
          col: 0,
        });
      }
    }
    tempDeck.sort(() => Math.random() - 0.5);

    // 2. Разметка поля (Grid coordinates)
    // 3 пика: 28 карт.
    // Row 0: 3 карты
    // Row 1: 6 карт
    // Row 2: 9 карт
    // Row 3: 10 карт (base)
    let layout = [
      // R0
      { r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 },
      // R1
      { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 1, c: 4 }, { r: 1, c: 5 },
      // R2
      { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }, 
      { r: 2, c: 5 }, { r: 2, c: 6 }, { r: 2, c: 7 }, { r: 2, c: 8 },
      // R3
      { r: 3, c: 0 }, { r: 3, c: 1 }, { r: 3, c: 2 }, { r: 3, c: 3 }, { r: 3, c: 4 },
      { r: 3, c: 5 }, { r: 3, c: 6 }, { r: 3, c: 7 }, { r: 3, c: 8 }, { r: 3, c: 9 }
    ];

    const pyramidCards = tempDeck.splice(0, 28);
    
    // Назначаем координаты
    pyramidCards.forEach((card, i) => {
      card.row = layout[i].r;
      card.col = layout[i].c;
    });

    pyramid = pyramidCards;
    deck = tempDeck; // Оставшиеся 24 карты
    
    drawFromDeck();
  }

  // --- Логика игры ---

  function drawFromDeck() {
    if (deck.length === 0) {
      checkGameStatus(true); 
      return;
    }
    activeCard = deck.pop();
  }

  // Проверка: закрыта ли карта другими
  function isCovered(card) {
    if (card.row === 0) return false; // Верхний ряд никогда не закрыт
    
    // Проверяем, есть ли над картой (ряд-1) другие карты
    // Карта в ряду R закрывает карту в ряду R-1, если их индексы 'col' пересекаются.
    // В нашей структуре:
    // R0 (c:0,1,2) - маленькие пики
    // R1 (c:0..5) - средний ряд
    // R2 (c:0..8) - большой ряд
    // R3 (c:0..9) - основание
    
    // Логика покрытия для Tri-Peaks:
    // Карта (r, c) закрывает карты в ряду r-1.
    // Но зависит от смещения сетки.
    // Упрощенная и рабочая логика для этой раскладки:
    // Карта закрыта, если существует неудаленная карта в ряду выше (row - 1),
    // чей индекс col находится в диапазоне [c - 1, c + 1] (примерно).
    
    // Точная проверка для нашей сетки:
    // R3 закрывает R2. R2 закрывает R1. R1 закрывает R0.
    
    for (let c of pyramid) {
      if (c.removed) continue;
      if (c.row === card.row - 1) {
        // Проверка перекрытия по X
        // Для наших координат: карта в ряду выше закрывает текущую, 
        // если её индекс достаточно близко.
        // Эвристика: разница col должна быть небольшой.
        // Но проще: карта (r, c) обычно закрывает (r+1, c) и (r+1, c+1).
        // Обратное: карта (r, c) закрыта картой (r-1, c') где c' близко к c.
        
        // Реализуем стандарт TriPeaks:
        // Карта верхнего ряда 'шире' и закрывает две нижние.
        // (0,0) закрывает (1,0) и (1,1).
        // (0,1) закрывает (1,2) и (1,3).
        // (0,2) закрывает (1,4) и (1,5).
        
        // Проверяем конкретно по структуре:
        if (card.row === 3) {
          // R3 закрыт картами R2
          // R2 карта с col=c закрывает R3 карты с col=c и c+1 ? 
          // Нет, в нашей сетке R2 имеет индексы 0..8, R3 имеет 0..9.
          // Обычно R2(c) закрывает R3(c) и R3(c+1).
          if (c.col === card.col || c.col === card.col - 1) return true;
        } else if (card.row === 2) {
          // R2 закрыт картами R1
          // R1(0..5). R1(c) закрывает R2...
          // Визуально: R1(0) над R2(0,1). R1(1) над R2(1,2).
          if (c.col === card.col || c.col === card.col - 1) return true;
        } else if (card.row === 1) {
          // R1 закрыт картами R0
          // R0(0) над R1(0,1). R0(1) над R1(2,3). R0(2) над R1(4,5).
          if (c.col === 0 && card.col <= 1) return true;
          if (c.col === 1 && card.col >= 2 && card.col <= 3) return true;
          if (c.col === 2 && card.col >= 4) return true;
        }
      }
    }
    return false;
  }

  function handleCardClick(card) {
    if (isGameOver || card.removed) return;
    
    // Нельзя кликнуть закрытую карту
    if (isCovered(card)) return;
    
    // Проверка ранга
    if (isValidMove(card, activeCard)) {
      moveCard(card);
    }
  }

  function isValidMove(card, active) {
    if (!active) return false;
    let diff = Math.abs(card.rank - active.rank);
    // Циклическая последовательность (K -> A -> 2)
    // diff 1 или 12 (для A-K)
    if (diff === 1 || diff === 12) return true;
    return false;
  }

  function moveCard(card) {
    card.removed = true;
    score += 10;
    
    // Обновляем activeCard
    activeCard = card; 
    
    checkGameStatus();
  }

  function handleDeckClick() {
    if (isGameOver) return;
    if (deck.length > 0) {
      drawFromDeck();
    } else {
      if (!hasMovesLeft()) {
        endGame(false);
      }
    }
  }

  function hasMovesLeft() {
    for (let c of pyramid) {
      if (!c.removed && !isCovered(c)) {
        if (isValidMove(c, activeCard)) return true;
      }
    }
    return false;
  }

  function checkGameStatus(forcedLose = false) {
    if (isWin) {
      endGame(true);
      return;
    }

    if (deck.length === 0 && !hasMovesLeft()) {
      endGame(false);
    }
  }

  function endGame(win) {
    if (isGameOver) return;
    isGameOver = true;

    if (win) {
      if (integrated) {
        if (onWin) onWin(); else dispatch("win");
      } else {
        showModal("🏆 Башня Пала!", `Вы освободили все души! Счет: ${score}`, [
          { text: "Играть снова", action: initGame },
        ]);
      }
    } else {
      if (integrated) {
        if (onLose) onLose(); else dispatch("lose");
      } else {
        showModal("💀 Запечатано", "Души остались в ловушке.", [
          { text: "Заново", action: initGame },
        ]);
      }
    }
  }

  // --- Helpers ---
  
  // Координаты для рендеринга (картинки)
  function getCardStyle(card) {
    // Контейнер ~320px. Карта 40px.
    // R3 (10 карт): должны поместиться в ширину. 10 * 32px ~ 320px.
    // Используем пиксели для точности.
    
    const cardW = 32;
    const gap = 2; // Отступ между картами
    
    let x = 0;
    let y = card.row * 30; // Вертикальный отступ

    // Центрирование рядов
    if (card.row === 0) {
       // 3 карты. Ширина 3*cardW + 2*gap = 100px. Отступ слева (320-100)/2 = 110.
       x = 110 + card.col * (cardW + gap);
    } else if (card.row === 1) {
       // 6 карт. Ширина ~200. Отступ 60.
       x = 60 + card.col * (cardW + gap);
    } else if (card.row === 2) {
       // 9 карт. Ширина ~290. Отступ 15.
       x = 15 + card.col * (cardW + gap);
    } else if (card.row === 3) {
       // 10 карт. Ширина 320 (впритык). Отступ 0.
       x = card.col * (cardW + gap);
    }
    
    return `left: ${x}px; top: ${y}px;`;
  }

  function showModal(title, text, actions) {
    if (integrated) return;
    modal = { show: true, title, text, actions };
  }
  function hideModal() { modal.show = false; }
</script>

<div class="body-wrapper">
  <!-- Header -->
  <div id="game-header">
    <button class="btn btn-secondary" onclick={initGame}>🔄 Заново</button>
    <div class="score-panel">
      <span>Очки: <strong>{score}</strong></span>
    </div>
    {#if integrated}
      <button class="btn btn-danger" onclick={() => endGame(false)}>🏳️</button>
    {/if}
  </div>

  <!-- Game Area -->
  <div id="game-container">
    <!-- Pyramid -->
    <div id="pyramid-area">
      {#each pyramid as card (card.id)}
        <button 
          class="card pyramid-card"
          class:removed={card.removed}
          class:covered={isCovered(card)}
          class:playable={!isCovered(card) && !card.removed && activeCard && isValidMove(card, activeCard)}
          style={getCardStyle(card)}
          onclick={() => handleCardClick(card)}
          disabled={card.removed || isCovered(card)}
        >
          {#if !card.removed}
            {#if isCovered(card)}
              <div class="card-back">🪦</div>
            {:else}
              <div class="card-front">
                <span class="rank">{card.rankStr}</span>
                <span class="suit">{card.suit}</span>
              </div>
            {/if}
          {/if}
        </button>
      {/each}
    </div>

    <!-- Bottom UI: Deck & Active -->
    <div id="bottom-bar">
      <div id="stock-pile">
        <button class="card card-back" onclick={handleDeckClick} disabled={deck.length === 0}>
          {#if deck.length > 0}
            🎴 <span class="deck-count">{deck.length}</span>
          {:else}
            🚫
          {/if}
        </button>
        <span class="label">Колода</span>
      </div>

      <div id="active-pile">
        {#if activeCard}
          <div class="card card-front active">
             <span class="rank">{activeCard.rankStr}</span>
             <span class="suit">{activeCard.suit}</span>
          </div>
        {:else}
          <div class="card empty"></div>
        {/if}
        <span class="label">Жернов</span>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div id="game-footer">
    {#if rewardItemData}
      <div id="reward-panel">
        <div class="item-icon reward-glow">
          <img src={`${import.meta.env.VITE_SUPABASE_URL_FILE}/storage/v1/object/public/${bucketName}/${rewardItemData.icon}`} alt={rewardItemData.name} class="icon-preview" />
        </div>
        <div class="reward-info">
          <div class="reward-label">Награда:</div>
          <div class="reward-name">{rewardItemData.name}</div>
        </div>
      </div>
    {:else}
       <div class="rules">Соберите пирамиду, выбирая карты на 1 старше или младше.</div>
    {/if}
  </div>
</div>

{#if modal.show}
  <div id="modal-overlay" class:active={modal.show}>
    <div class="modal-content">
      <div class="modal-title">{modal.title}</div>
      <div class="modal-text">{modal.text}</div>
      <div class="modal-buttons">
        {#each modal.actions as action (action.text)}
          <button class="btn" onclick={action.action}>{action.text}</button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    background-color: #120f1a;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    color: #ececec;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    touch-action: manipulation;
  }

  .body-wrapper {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    padding: 10px;
    box-sizing: border-box;
    gap: 10px;
  }

  #game-header, #game-footer {
    width: 100%;
    max-width: 340px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 15px;
    box-sizing: border-box;
    margin: 0 auto;
  }
  
  .score-panel { font-weight: bold; color: #ff9f43; }

  #game-container {
    position: relative;
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end; /* Push bottom bar to bottom */
    align-items: center;
    width: 100%;
    max-width: 340px;
    margin: 0 auto;
  }

  /* --- Pyramid Layout --- */
  #pyramid-area {
    position: relative;
    width: 100%;
    height: 220px; /* Fixed height for the pyramid */
    margin-bottom: 10px;
  }

  .card {
    position: absolute;
    width: 32px;
    height: 46px;
    border-radius: 4px;
    border: none;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    transition: transform 0.1s, opacity 0.3s;
    box-sizing: border-box;
  }

  .pyramid-card {
    cursor: pointer;
  }

  .card-front {
    background: #e94560;
    color: white;
    flex-direction: column;
    line-height: 1;
    font-weight: bold;
  }
  
  .card-front .suit { font-size: 14px; margin-top: 2px; }
  .card-front .rank { font-size: 10px; }

  .card-back {
    background: #333;
    color: #666;
    font-size: 16px;
    cursor: default;
  }
  
  .covered {
    cursor: default;
  }

  .playable {
    box-shadow: 0 0 8px #ffd700;
    border: 1px solid #ffd700;
    z-index: 10;
  }
  
  .playable:hover {
    transform: translateY(-5px);
  }

  .removed {
    opacity: 0;
    pointer-events: none;
  }

  /* --- Bottom Bar --- */
  #bottom-bar {
    display: flex;
    gap: 20px;
    justify-content: center;
    align-items: flex-end;
    background: rgba(0,0,0,0.5);
    padding: 10px;
    border-radius: 15px;
    width: 100%;
    box-sizing: border-box;
    margin-bottom: 10px;
  }

  #stock-pile, #active-pile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .label { font-size: 0.65rem; color: #888; text-transform: uppercase; }

  .deck-count {
    position: absolute;
    bottom: 1px;
    right: 1px;
    background: #000;
    font-size: 8px;
    padding: 0 2px;
    border-radius: 3px;
  }

  .active {
    border: 2px solid #fff;
    box-shadow: 0 0 15px #e94560;
  }
  
  .empty {
    background: rgba(255,255,255,0.1);
    border: 1px dashed #444;
  }

  /* Reward */
  #reward-panel {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    justify-content: center;
  }
  .item-icon { width: 36px; height: 36px; background: #2d2d2d; border-radius: 8px; overflow: hidden; border: 1px solid #444; }
  .icon-preview { width: 100%; height: 100%; object-fit: cover; }
  .reward-glow { border-color: rgba(255, 215, 0, 0.5); box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); }
  .reward-info { display: flex; flex-direction: column; }
  .reward-label { font-size: 0.7rem; color: #888; }
  .reward-name { color: #ffd700; font-weight: bold; }
  
  .rules { font-size: 0.8rem; color: #aaa; text-align: center; }

  /* Buttons & Modal */
  .btn {
    padding: 6px 12px; font-size: 1rem; background: linear-gradient(135deg, #e94560, #c0394d);
    color: white; border: none; border-radius: 12px; cursor: pointer;
    min-width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
  }
  .btn-secondary { background: linear-gradient(135deg, #4e4c75, #3d3b5c); }
  .btn-danger { background: linear-gradient(135deg, #6c757d, #495057); }

  #modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.85); display: flex; justify-content: center; align-items: center; z-index: 100; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
  #modal-overlay.active { opacity: 1; pointer-events: all; }
  .modal-content { background: #252338; padding: 40px; border-radius: 20px; text-align: center; border: 2px solid #5e5c8a; width: 300px; }
  .modal-title { font-size: 1.8rem; margin-bottom: 10px; color: #ff9f43; }
  .modal-text { margin-bottom: 20px; color: #ccc; }
  .modal-buttons { display: flex; gap: 10px; justify-content: center; }
</style>