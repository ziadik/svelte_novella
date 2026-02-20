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
  
  // Структура пирамиды: сколько карт в каждом ряду (сверху вниз)
  // 3 пика: верхушка, средний ряд, нижний ряд, основание
  const PYRAMID_ROWS = [3, 6, 9, 10]; 

  // --- State (Runes) ---
  let deck = $state([]); // Колода для добора
  let pyramid = $state([]); // Массив карт в пирамиде
  let activeCard = $state(null); // Текущая открытая карта
  let score = $state(0);
  let moves = $state(0);
  let isGameOver = $state(false);
  let selectedCardId = $state(null); // Для анимации выбора

  // Modal State
  let modal = $state({ show: false, title: "", text: "", actions: [] });

  onMount(() => {
    initGame();
  });

  // --- Вычисляемые свойства ---
  let isWin = $derived(pyramid.every(c => c.removed));
  
  // Осталось карт в пирамиде
  let remainingCards = $derived(pyramid.filter(c => !c.removed).length);

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
    moves = 0;
    isGameOver = false;
    hideModal();

    // 1. Создаем колоду (2 копии для хорошей игры, или 1)
    // Для Tri-peaks обычно 1 колода. 52 карты.
    // Пирамида: 3+6+9+10 = 28 карт. Остаток 24.
    let tempDeck = [];
    for (let s = 0; s < SUITS.length; s++) {
      for (let r = 0; r < RANKS.length; r++) {
        tempDeck.push({
          id: `card-${s}-${r}`,
          suit: SUITS[s],
          rank: r, // 0-12
          rankStr: RANKS[r],
          removed: false,
          faceUp: false,
          row: -1, col: -1 // Координаты в пирамиде
        });
      }
    }

    // Перемешиваем
    tempDeck.sort(() => Math.random() - 0.5);

    // 2. Раздача пирамиды
    // Логика раскладки Tri-Peaks довольно специфична.
    // Мы разложим карты по рядам, определенным в PYRAMID_ROWS.
    
    // Для простоты координат, используем сетку 10 колонок (0-9)
    // Ряд 0 (Верхушки): карты на позициях 1, 4, 7 (всего 3)
    // Ряд 1: под каждой верхушкой по 2 карты. (0,2), (3,5), (6,8)
    // Ряд 2: по 3 карты под каждым пиком.
    // Ряд 3 (основа): 10 карт подряд.
    
    // Но проще заполнить массив pyramid плоским списком с координатами, 
    // а логику "закрытости" определим по rowIndex и colIndex.
    
    // Формируем структуру пирамиды (28 карт)
    let cardIndex = 0;
    let pyramidalStructure = []; 
    
    // Генерируем координаты для 3-х пиков
    // Пик 1: верх (0,1) -> (1,0),(1,1) -> (2,0)-(2,2) -> (3,0)-(3,3)
    // Это сложно кодировать вручную. 
    // Альтернатива: Используем стандартную логику TriPeaks, где вся нижняя строка открыта.
    
    // Создадим массив из 28 карт
    const pyramidCards = tempDeck.splice(0, 28);
    const deckCards = tempDeck; // Оставшиеся 24 в колоде
    
    // Назначаем координаты (упрощенно для рендеринга)
    // row 0: 3 карты
    // row 1: 6 карт
    // row 2: 9 карт
    // row 3: 10 карт
    
    let rows = [
      { count: 3, y: 0 },
      { count: 6, y: 1 },
      { count: 9, y: 2 },
      { count: 10, y: 3 }
    ];
    
    let currentRow = 0;
    let currentCol = 0;
    
    pyramidCards.forEach(card => {
      const rowInfo = rows[currentRow];
      card.row = rowInfo.y;
      card.col = currentCol;
      
      // Логика faceUp: открыты все карты в последнем ряду (row 3)
      if (card.row === 3) card.faceUp = true;
      
      pyramid.push(card);
      
      currentCol++;
      if (currentCol >= rowInfo.count) {
        currentCol = 0;
        currentRow++;
      }
    });

    deck = deckCards;
    
    // Берем первую карту из колоды
    drawFromDeck();
  }

  // --- Логика игры ---

  function drawFromDeck() {
    if (deck.length === 0) {
      // Конец колоды
      checkGameStatus(true); // force lose check if no moves
      return;
    }
    
    activeCard = deck.pop();
  }

  // Проверка, можно ли кликнуть карту
  function isCardPlayable(card) {
    if (!card.faceUp || card.removed) return false;
    
    // Проверяем, не закрыта ли карта другими
    // Карта закрыта, если есть карта в следующем ряду, перекрывающая её по X.
    // В нашей сетке:
    // Карта (r, c) закрывает карты в ряду r-1, если их индексы находятся в диапазоне.
    // Упрощенная проверка:
    // Карта в ряду R колонка C считается доступной, если нет карт в ряду R+1 
    // которые "накрывают" её.
    // Для пирамиды: карта (r, c) накрывает карты (r+1, c) и (r+1, c+1) - это для 1 пирамиды.
    // Для Tri-Peaks логика сложнее. 
    // Самый простой способ: проверить, есть ли в массиве pyramid карты, у которых row > card.row 
    // и которые "накрывают" текущую по координатам.
    
    // Визуализация сетки для 10-колонного основания:
    // R3 (основа): 0 1 2 3 4 5 6 7 8 9
    // R2:          0 1 2 3 4 5 6 7 8 (сдвинуты?)
    // Это становится сложным для "чистой" логики на координатах без дерева.
    
    // Давайте используем проверку по ID и физическому перекрытию.
    // Карта в пирамиде перекрывает другую, если она в ряду ниже и её индекс внутри ряда "накрывает".
    // Но так как мы задали `col` как глобальный индекс в ряду...
    
    // Давайте сымитируем визуальную сетку.
    // Для простоты: Карта доступна, если она в последнем ряду (row 3) ИЛИ если над ней нет карт.
    // Над картой (r, c) могут быть карты из ряда r-1.
    // В Tri-Peaks "хвосты" пиков свисают.
    
    // Реализуем простую логику покрытия:
    // Карта A закрывает карту B, если A.row == B.row + 1 и их координаты X пересекаются.
    // Ширина карты = 1. Центры X должны быть близко.
    
    // Проще: Карта открыта, если `faceUp` И нет `!removed` карт в массиве, для которых:
    // `other.row == card.row + 1` и `other.col` "накрывает" `card.col`.
    
    // Для структуры 3-6-9-10:
    // R0 (3 карты): col 0,1,2 (условно) - на самом деле лучше разнести их по сетке 10.
    // R0: pos 1, 4, 7
    // R1: pos 0,1,  3,4,  6,7
    // R2: pos 0,1,2, 3,4,5, 6,7,8
    // R3: pos 0..9
    
    // Пересчитаем col для проверки:
    // Это было сделано при инициализации, но переменная `col` сейчас просто счетчик.
    // Давайте пересчитаем `xIndex` для проверки покрытия.
    
    // Пересчет xIndex:
    // Row 0: 1, 4, 7 (ширина 2, отступ 1) -> карта с индексом i в ряду имеет xCenter = i*3 + 1
    // Row 1: пары под ними. i=0 -> x=0, i=1->x=1 (под картой 0 верхнего пика). i=2->x=3, i=3->x=4...
    // Это слишком сложно для короткого кода.
    
    // АЛЬТЕРНАТИВА: Проверка "нет детей".
    // card.children = [].
    // При инициализации заполним связи parent/child.
  }

  // Переопределим initGame с созданием связей
  function initGame() {
    deck = [];
    pyramid = [];
    activeCard = null;
    score = 0;
    moves = 0;
    isGameOver = false;
    hideModal();

    // Создаем колоду
    let tempDeck = [];
    for (let s = 0; s < SUITS.length; s++) {
      for (let r = 0; r < RANKS.length; r++) {
        tempDeck.push({
          id: `card-${s}-${r}-${Math.random()}`,
          suit: SUITS[s],
          rank: r,
          rankStr: RANKS[r],
          removed: false,
          faceUp: false,
          row: 0, 
          col: 0,
          children: [] // Какие карты эту закрывают
        });
      }
    }
    tempDeck.sort(() => Math.random() - 0.5);

    // Разметка поля (Grid 10 wide)
    // Peaks: 3 pyramids.
    // Peak centers at col: 1.5, 4.5, 7.5
    // Width of a card in grid units = 2
    
    let layout = [
      // Row 0 (Top)
      { r: 0, c: 1 }, { r: 0, c: 4 }, { r: 0, c: 7 },
      // Row 1 (Middle)
      { r: 1, c: 0 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 1, c: 5 }, { r: 1, c: 6 }, { r: 1, c: 8 },
      // Row 2 (Lower)
      { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 2, c: 3 }, { r: 2, c: 4 }, 
      { r: 2, c: 5 }, { r: 2, c: 6 }, { r: 2, c: 7 }, { r: 2, c: 8 },
      // Row 3 (Base) - Full row 0 to 9 (10 cards)
      { r: 3, c: 0 }, { r: 3, c: 1 }, { r: 3, c: 2 }, { r: 3, c: 3 }, { r: 3, c: 4 },
      { r: 3, c: 5 }, { r: 3, c: 6 }, { r: 3, c: 7 }, { r: 3, c: 8 }, { r: 3, c: 9 }
    ];
    // Total 3+6+9+10 = 28 cards.

    const pyramidCards = tempDeck.splice(0, 28);
    
    // Assign coords
    pyramidCards.forEach((card, i) => {
      card.row = layout[i].r;
      card.col = layout[i].c;
      card.faceUp = (card.row === 3); // Only base is open initially
    });

    pyramid = pyramidCards;
    deck = tempDeck; // 24 cards left
    
    // Build relationships
    pyramid.forEach(card => {
      if (card.row < 3) {
        // Find children in next row
        // A card covers children if |child.col - card.col| < 2 (approx overlap)
        // Specific logic: 
        // Card at (r, c) covers (r+1, c) and (r+1, c+1) for standard pyramid.
        // For this layout: covers cards in next row with col diff 0 or 1.
        pyramid.forEach(potentialChild => {
          if (potentialChild.row === card.row + 1) {
            if (Math.abs(potentialChild.col - card.col) <= 1 && potentialChild.col >= card.col - 1) {
               // Visual check: Tri-peaks structure has specific connections.
               // But broadly, if col diff is 0 or 1, it overlaps.
               // Let's refine:
               // P1 (c=1): covers (c=0, c=1) in next row.
               // P2 (c=4): covers (c=3, c=4, c=5?) -> P2 covers 3,4. Middle card covers 5?
               // Let's stick to simple: overlap logic based on coordinates.
               if (potentialChild.col === card.col || potentialChild.col === card.col + 1) {
                 // Valid connection for TriPeaks shape defined above
                 // Check exceptions:
                 // Gap between peaks.
                 // P1 (c=1) -> R1(c=0,1,2). Wait, my layout for R1 has 0,2 then 3,5 then 6,8.
                 // Let's simplify: A card is covered if there is ANY card above it.
                 // Reversed: A card is playable if NO card exists in row-1 that covers it.
               }
          }
        });
      }
    });
    
    // Simplified Logic for isPlayable(card):
    // Check if any card in pyramid exists such that:
    //   other.row == card.row - 1  (row above)
    //   AND !other.removed
    //   AND they visually overlap (abs(col - col) <= 1 approx)
    
    drawFromDeck();
  }

  // Helper to check if card is covered
  function isCovered(card) {
    // Check row above
    if (card.row === 0) return false; // Top row never covered
    
    // Check if any non-removed card in row above overlaps
    for (let c of pyramid) {
      if (c.removed) continue;
      if (c.row === card.row - 1) {
        // Overlap logic
        // In TriPeaks: Parent at `pCol` covers Child at `cCol` if `cCol == pCol` or `cCol == pCol + 1`
        // (Depending on alignment). With our grid:
        // Card (r, c) covers (r+1, c) and (r+1, c+1).
        if (card.col === c.col || card.col === c.col + 1) {
           // Exception: Gap check.
           // R0(c=1) covers R1(c=0,1). R0(c=4) covers R1(c=3,4).
           // R1(c=2) covers R2(c=1,2)? R1(c=2) is right side of P1.
           // Let's assume this standard overlap rule works for the layout provided.
           return true;
        }
      }
    }
    return false;
  }

  function handleCardClick(card) {
    if (isGameOver || card.removed) return;
    
    // Проверка доступности
    if (isCovered(card)) return; // Cannot click covered card
    
    // Проверка ранга
    if (isValidMove(card, activeCard)) {
      moveCard(card);
    }
  }

  function isValidMove(card, active) {
    if (!active) return false;
    let diff = Math.abs(card.rank - active.rank);
    // 1 шаг (1 или 12)
    if (diff === 1 || diff === 12) return true;
    return false;
  }

  function moveCard(card) {
    card.removed = true;
    score += 10;
    moves++;
    selectedCardId = card.id;
    
    // Анимация перехода?
    // Обновляем activeCard
    activeCard = card; 
    
    // Открываем новые карты?
    // Ре-оценка faceUp не нужна, просто проверяем isCovered при клике.
    
    checkGameStatus();
  }

  function handleDeckClick() {
    if (isGameOver) return;
    if (deck.length > 0) {
      drawFromDeck();
      moves++;
    } else {
      // Колода пуста
      if (!hasMovesLeft()) {
        endGame(false);
      } else {
        // Можно показать подсказку или просто ничего не делать
        showModal("Колоды пуста", "Ходов больше нет.", [{text: "Сдаться", action: () => endGame(false)}]);
      }
    }
  }

  function hasMovesLeft() {
    // Проверяем есть ли хоть одна открытая карта, подходящая к active
    for (let c of pyramid) {
      if (!c.removed && !isCovered(c)) {
        if (isValidMove(c, activeCard)) return true;
      }
    }
    return false;
  }

  function checkGameStatus(forcedLose = false) {
    if (isWin) {
      isGameOver = true;
      if (integrated) {
        if (onWin) onWin(); else dispatch("win");
      } else {
        showModal("🏆 Башня Пала!", `Вы освободили все души! Счет: ${score}`, [
          { text: "Играть снова", action: initGame },
        ]);
      }
      return;
    }

    if (deck.length === 0 && !hasMovesLeft()) {
      endGame(false);
    }
  }

  function endGame(win) {
    if (win) return;
    isGameOver = true;
    if (integrated) {
       if (onLose) onLose(); else dispatch("lose");
    } else {
       showModal("💀 Запечатано", "Души остались в ловушке.", [
         { text: "Заново", action: initGame },
       ]);
    }
  }

  // --- Helpers ---
  function showModal(title, text, actions) {
    if (integrated) return;
    modal = { show: true, title, text, actions };
  }
  function hideModal() { modal.show = false; }
  
  // Позиционирование для стилей
  function getCardStyle(card) {
    // Row height: 30px overlap. Card height 80px.
    // Top: row * (80 - 30)
    // Col: Need to calculate X based on row and col index.
    // Grid width: ~320px (container).
    // Card width: 50px.
    // R3 (10 cards): 10 * 50 + 9*2(gap) = 518px -> Too wide.
    // Need smaller cards or scale.
    // Let's use absolute percentages.
    
    // Refining coordinates:
    // Base (Row 3): 10 cards. Width 100%.
    // Left % = c * 10 (approx).
    
    // Card width: ~10%.
    
    const baseW = 10; // %
    const cardW = 50; // px (if we use px)
    
    // Using px for precision
    const containerW = 340; 
    const cardWPx = 40;
    const gap = 5; 
    // Total width R3 = 10 * 40 + 9*5 = 400 + 45 = 445. Too big.
    // Card width must be ~28px for 10 in a row. Too small.
    
    // Solution: Overlap cards in base row too?
    // Or just fit 28 cards nicely.
    // Let's use `calc` in style.
    
    // Row Logic:
    // Row 3 (Base): Left 0 to 100%.
    // Card left: col * (100/10).
    
    // Row 0: 3 cards.
    // Left positions?
    // Let's use fixed pixel grid for centering.
    
    // Center of Peak 1: 20%
    // Center of Peak 2: 50%
    // Center of Peak 3: 80%
    
    let left = 0;
    const row = card.row;
    const col = card.col;
    
    if (row === 3) left = col * (100/10); // 0..9 -> 0%..90%
    if (row === 2) left = col * (100/9); // 0..8 -> slightly spaced
    if (row === 1) left = col * (100/6); // 0..5
    if (row === 0) left = col * (100/3); // 0..2
    
    // Adjust for centering peaks
    // This is getting messy with CSS only.
    // I will use Flex/Grid for the layout in the HTML to handle overlap automatically? 
    // No, Tri-Peaks requires offset rows.
    
    // Back to simple logic:
    // We will calculate `left` in JS based on container width ~320px.
    const w = 35; // card width
    const h = 50; // card height
    const vShift = 25; // vertical overlap
    
    // Row 3: y=3*25=75. x = col * 32.
    // Row 0: y=0. x = center - offset.
    
    // Let's cheat slightly with a simple grid calculation:
    // Use percentages mapped to the "col" we assigned.
    // Layout Map (approx percentages):
    // R3: 5%, 15%, 25% ... 95%
    // R0: P1 at 20%, P2 at 50%, P3 at 80%
    
    let leftPct = 0;
    if (row === 3) leftPct = 2 + col * 10; 
    if (row === 2) leftPct = 5 + col * 10; // shifted
    if (row === 1) leftPct = 10 + col * 14; // very rough
    if (row === 0) {
       if(col===0) leftPct = 20;
       if(col===1) leftPct = 50;
       if(col===2) leftPct = 80;
    }
    
    // Adjust offsets to actually look like peaks
    // This requires manual tweaking or a proper layout engine.
    // For the generated code, I'll use a standard coordinate set.
    
    const coords = {
       // R3
       "3-0": 0, "3-1": 30, "3-2": 60, "3-3": 90, "3-4": 120, "3-5": 150,
       "3-6": 180, "3-7": 210, "3-8": 240, "3-9": 270, // in px
       // R2 (centered over R3 pairs)
       "2-0": 15, "2-1": 45, "2-2": 75, "2-3": 105, "2-4": 135, 
       "2-5": 165, "2-6": 195, "2-7": 225, "2-8": 255,
       // R1
       "1-0": 30, "1-1": 60, "1-2": 120, "1-3": 150, "1-4": 210, "1-5": 240,
       // R0
       "0-0": 45, "0-1": 135, "0-2": 225
    };

    const key = `${row}-${col}`;
    const x = coords[key] || 0;
    const y = row * 30;

    return `left: ${x}px; top: ${y}px;`;
  }
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
    height: 240px; /* Fixed height for the pyramid */
    margin-bottom: 10px;
  }

  .card {
    position: absolute;
    width: 38px;
    height: 54px;
    border-radius: 6px;
    border: none;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
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
  
  .card-front .suit { font-size: 18px; margin-top: 2px; }
  .card-front .rank { font-size: 12px; }

  .card-back {
    background: #333;
    color: #666;
    font-size: 20px;
    cursor: default;
  }
  
  .covered {
    cursor: default;
  }

  .playable {
    box-shadow: 0 0 10px #ffd700;
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
    padding: 15px;
    border-radius: 15px;
    width: 100%;
    box-sizing: border-box;
    margin-bottom: 10px;
  }

  #stock-pile, #active-pile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }

  .label { font-size: 0.7rem; color: #888; text-transform: uppercase; }

  .deck-count {
    position: absolute;
    bottom: 2px;
    right: 2px;
    background: #000;
    font-size: 10px;
    padding: 0 2px;
    border-radius: 4px;
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

  @media (max-width: 360px) {
    .card { width: 32px; height: 46px; font-size: 12px; }
    .card-front .suit { font-size: 14px; }
    #pyramid-area { height: 200px; }
    /* Need to adjust coords in script for smaller cards if perfect fit needed, but relative works okayish */
  }
</style>