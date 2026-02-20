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
  const ROWS = 4;
  const COLS = 4;
  const SHUFFLE_MOVES = 100; // Количество ходов для перемешивания

  // --- State (Runes) ---
  // Храним массив чисел от 0 до 15. 0 - это пустая ячейка.
  let board = $state([]);
  let moves = $state(0);
  let isGameOver = $state(false);
  let isShuffling = $state(false); // Флаг для отключения кликов во время перемешивания

  // Modal State
  let modal = $state({
    show: false,
    title: "",
    text: "",
    actions: [],
  });

  onMount(() => {
    initGame();
  });

  // --- Вычисляемые свойства ---
  // Проверка победы: массив должен быть [1, 2, ..., 15, 0]
  let isWin = $derived(board.join(',') === solvedBoard().join(','));
  
  // Координаты пустой ячейки
  let emptyIndex = $derived(board.indexOf(0));
  let emptyCoords = $derived({
    r: Math.floor(emptyIndex / COLS),
    c: emptyIndex % COLS
  });

  function solvedBoard() {
    return Array.from({ length: ROWS * COLS }, (_, i) => (i + 1) % (ROWS * COLS));
  }

  function getRewardItemData() {
    if (!rewardItem || !items || items.length === 0) return null;
    const itemId = typeof rewardItem === "string" ? rewardItem : rewardItem.id;
    return items.find((item) => item.id === itemId);
  }

  let rewardItemData = $derived(getRewardItemData());

  // --- Инициализация ---
  function initGame() {
    board = solvedBoard();
    moves = 0;
    isGameOver = false;
    hideModal();
    
    // Перемешивание делаем с задержкой, чтобы пользователь увидел исходное состояние
    isShuffling = true;
    setTimeout(() => {
      shuffleBoard();
      isShuffling = false;
    }, 500);
  }

  // --- Логика игры ---
  
  // Проверка, можно ли двигать плитку
  function canMove(index) {
    const r = Math.floor(index / COLS);
    const c = index % COLS;
    
    const er = emptyCoords.r;
    const ec = emptyCoords.c;

    // Соседство по горизонтали или вертикали
    return (Math.abs(r - er) + Math.abs(c - ec)) === 1;
  }

  function handleTileClick(index) {
    if (isShuffling || isGameOver) return;
    if (!canMove(index)) return;

    swapTiles(index);
    moves++;
    checkGameStatus();
  }

  function swapTiles(index) {
    const ei = emptyIndex;
    
    // Меняем местами в массиве
    const newBoard = [...board];
    newBoard[ei] = board[index];
    newBoard[index] = 0;
    board = newBoard;
  }

  // Перемешивание (делаем случайные валидные ходы)
  function shuffleBoard() {
    let lastMove = -1;
    for (let i = 0; i < SHUFFLE_MOVES; i++) {
      const neighbors = getMovableNeighbors();
      // Фильтруем, чтобы не ходить туда-обратно
      const filtered = neighbors.filter(n => n !== lastMove);
      const chosen = filtered.length > 0 
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : neighbors[Math.floor(Math.random() * neighbors.length)];
      
      if (chosen !== undefined) {
        lastMove = emptyIndex; // Запоминаем, где была пустая до хода
        swapTiles(chosen);
      }
    }
    moves = 0;
  }

  function getMovableNeighbors() {
    const neighbors = [];
    const { r, c } = emptyCoords;
    
    if (r > 0) neighbors.push((r - 1) * COLS + c); // Up
    if (r < ROWS - 1) neighbors.push((r + 1) * COLS + c); // Down
    if (c > 0) neighbors.push(r * COLS + (c - 1)); // Left
    if (c < COLS - 1) neighbors.push(r * COLS + (c + 1)); // Right
    
    return neighbors;
  }

  function checkGameStatus() {
    if (isWin) {
      isGameOver = true;
      if (integrated) {
        if (onWin) onWin(); else dispatch("win");
      } else {
        showModal("🪞 Зеркало Восстановлено!", `Вы собрали осколки за ${moves} ходов.`, [
          { text: "Играть снова", action: initGame },
        ]);
      }
    }
  }

  // --- Render Helpers ---
  
  // Вычисляем позицию background для кусочка картинки
  // Value 1..15. 0 - пустая.
  function getBgStyle(value) {
    if (!rewardItemData || value === 0) return '';
    
    // Индекс в собранной сетке (0..15)
    // value 1 -> index 0 (верхний левый)
    const index = value - 1;
    const r = Math.floor(index / COLS);
    const c = index % COLS;
    
    // Сдвиг фона в процентах
    // Для 4x4: 0%, 33.33%, 66.66%, 100%
    // Общая формула: (col / (cols - 1)) * 100
    const x = (c / (COLS - 1)) * 100;
    const y = (r / (ROWS - 1)) * 100;

    return `background-position: ${x}% ${y}%;`;
  }

  // --- Modal Helpers ---
  function showModal(title, text, actions) {
    if (integrated) return;
    modal = { show: true, title, text, actions };
  }

  function hideModal() {
    modal.show = false;
  }

  function handleGiveUp() {
    if (integrated) {
      if (onLose) onLose(); else dispatch("lose");
    } else {
      showModal("Сдаемся?", "Зеркало осталось разбитым...", [
        { text: "Заново", action: initGame },
      ]);
    }
  }
</script>

<div class="body-wrapper">
  <!-- Header -->
  <div id="game-header">
    <button class="btn btn-secondary" onclick={initGame} disabled={isShuffling}>
      {isShuffling ? '⏳' : '🔄'} Заново
    </button>
    
    <div class="moves-counter">
      Ходов: <strong>{moves}</strong>
    </div>

    {#if integrated}
      <button class="btn btn-danger" onclick={handleGiveUp}>🏳️</button>
    {/if}
  </div>

  <!-- Game Board -->
  <div id="game-container">
    <div
      id="grid"
      style="grid-template-columns: repeat({COLS}, 1fr); grid-template-rows: repeat({ROWS}, 1fr);"
    >
      {#each board as value, index (index)}
        <!-- Пустая ячейка -->
        {#if value === 0}
          <div class="tile empty"></div>
        <!-- Плитка с картинкой или числом -->
        {:else}
          <button
            class="tile"
            class:movable={canMove(index)}
            style={getBgStyle(value)}
            onclick={() => handleTileClick(index)}
            disabled={isShuffling || isGameOver || !canMove(index)}
          >
            {#if rewardItemData}
              <!-- Картинка награды (фон) -->
              <div 
                class="tile-bg-img" 
                style="background-image: url({`${import.meta.env.VITE_SUPABASE_URL_FILE}/storage/v1/object/public/${bucketName}/${rewardItemData.icon}`}); {getBgStyle(value)}"
              ></div>
            {:else}
              <!-- Числа, если нет картинки -->
              <span class="tile-number">{value}</span>
            {/if}
          </button>
        {/if}
      {/each}
    </div>
    
    <!-- Оверлей для картинки (декоративная рамка) -->
    <div class="mirror-frame"></div>
  </div>

  <!-- Footer -->
  <div id="game-footer">
    {#if rewardItemData}
      <div id="reward-panel">
        {#if rewardItemData.icon}
          <div class="item-icon reward-glow">
            <img
              src={`${import.meta.env.VITE_SUPABASE_URL_FILE}/storage/v1/object/public/${bucketName}/${rewardItemData.icon}`}
              alt={rewardItemData.name}
              class="icon-preview"
              height="64px"
            />
          </div>
        {/if}
        <div class="reward-info">
          <div class="reward-label">Восстановить:</div>
          <div class="reward-name">{rewardItemData.name}</div>
        </div>
      </div>
    {:else}
      <div class="hint-text">
        💡 Передайте <code>rewardItem</code>, чтобы собрать картинку
      </div>
    {/if}
  </div>
</div>

<!-- Модальное окно -->
{#if modal.show}
  <div id="modal-overlay" class:active={modal.show}>
    <div class="modal-content">
      <div class="modal-title">{modal.title}</div>
      <div class="modal-text">{modal.text}</div>
      <div class="modal-buttons">
        {#each modal.actions as action (action.text)}
          <button class="btn" onclick={action.action}>
            {action.text}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  /* --- Base & Layout --- */
  :global(body) {
    margin: 0;
    background-color: #120f1a;
    background-image: radial-gradient(circle at center, #2a2a40 0%, #120f1a 100%);
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    color: #ececec;
    overflow-x: hidden;
    overflow-y: auto;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .body-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    width: 100%;
    height: 100%;
    user-select: none;
    padding: 10px;
    box-sizing: border-box;
    overflow-y: auto;
    gap: 15px;
  }

  /* --- Header --- */
  #game-header {
    width: 100%;
    max-width: 340px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(5px);
    z-index: 10;
    box-sizing: border-box;
  }

  .moves-counter strong { color: #ff9f43; font-size: 1.1rem; }

  /* --- Game Container --- */
  #game-container {
    position: relative;
    background-color: #000;
    padding: 4px; /* Рамка вокруг плиток */
    border-radius: 12px;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.8), 0 0 20px rgba(100, 100, 150, 0.1);
    border: 2px solid #444;
    box-sizing: border-box;
  }

  #grid {
    display: grid;
    gap: 2px;
    background: #111;
    border-radius: 8px;
    overflow: hidden; /* Чтобы углы не вылезали */
  }

  .tile {
    width: 75px;
    height: 75px;
    background: #2a2a40;
    border: none;
    padding: 0;
    cursor: default;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: white;
    position: relative;
    transition: transform 0.15s ease-out, box-shadow 0.15s;
    overflow: hidden; /* Обрезаем фон */
  }

  /* Стиль для плитки, которую можно двигать */
  .tile.movable {
    cursor: pointer;
    box-shadow: inset 0 0 15px rgba(255, 255, 255, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  .tile.movable:hover {
    transform: scale(0.95);
    filter: brightness(1.2);
    z-index: 5;
  }
  
  /* Анимация нажатия */
  .tile.movable:active {
    transform: scale(0.9);
  }

  /* Пустая клетка */
  .tile.empty {
    background: transparent;
    box-shadow: inset 0 0 20px rgba(0,0,0,0.8);
    pointer-events: none;
  }

  /* --- Изображение на плитке --- */
  .tile-bg-img {
    position: absolute;
    inset: 0;
    background-size: 400% 400%; /* Важно: 4x4 сетка */
    background-repeat: no-repeat;
    /* Приглушаем кусочки, чтобы выглядели как часть целого */
    filter: brightness(0.9);
    transition: filter 0.2s;
  }
  
  .tile.movable:hover .tile-bg-img {
    filter: brightness(1.1);
  }

  /* --- Числа (Fallback) --- */
  .tile-number {
    font-weight: bold;
    text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    font-family: 'Courier New', Courier, monospace;
    color: #a0a0c0;
  }

  /* Декоративная рамка зеркала */
  .mirror-frame {
    position: absolute;
    inset: -5px;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    pointer-events: none;
    box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.05);
  }

  /* --- Footer --- */
  #game-footer {
    width: 100%;
    max-width: 340px;
    display: flex;
    justify-content: center;
  }
  
  .hint-text {
    font-size: 0.8rem;
    color: #666;
    text-align: center;
    padding: 10px;
    background: rgba(0,0,0,0.2);
    border-radius: 10px;
  }
  
  .hint-text code {
    background: #333;
    padding: 2px 4px;
    border-radius: 4px;
  }

  /* --- Reward Styles --- */
  #reward-panel {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(255, 215, 0, 0.05);
    border-radius: 15px;
    width: 100%;
    box-sizing: border-box;
    justify-content: center;
  }

  .item-icon { width: 36px; height: 36px; background: #2d2d2d; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid #444; }
  .icon-preview { width: 100%; height: 100%; object-fit: cover; }
  .reward-glow { animation: icon-glow 2s ease-in-out infinite; border-color: rgba(255, 215, 0, 0.5); box-shadow: 0 0 15px rgba(255, 215, 0, 0.3); }
  @keyframes icon-glow { 0%, 100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); } 50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); } }
  .reward-info { display: flex; flex-direction: column; gap: 1px; }
  .reward-label { font-size: 0.65rem; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; }
  .reward-name { font-size: 0.85rem; color: #ffd700; font-weight: bold; text-shadow: 0 0 8px rgba(255, 215, 0, 0.5); }

  /* --- Buttons & Modal --- */
  .btn {
    padding: 6px 12px; font-size: 1rem; background: linear-gradient(135deg, #e94560, #c0394d);
    color: white; border: none; border-radius: 12px; cursor: pointer;
    box-shadow: 0 3px 8px rgba(233, 69, 96, 0.4); white-space: nowrap;
    min-width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
  }
  .btn-secondary { background: linear-gradient(135deg, #4e4c75, #3d3b5c); box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4); }
  .btn-danger { background: linear-gradient(135deg, #6c757d, #495057); }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; }

  #modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center; align-items: center; z-index: 100; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
  #modal-overlay.active { opacity: 1; pointer-events: all; }
  .modal-content { background: #252338; padding: 40px; border-radius: 20px; text-align: center; border: 2px solid #5e5c8a; box-shadow: 0 0 30px rgba(0, 0, 0, 0.8); max-width: 90%; width: 340px; }
  .modal-title { font-size: 1.8rem; margin-bottom: 10px; color: #ff9f43; }
  .modal-text { margin-bottom: 30px; font-size: 1rem; color: #ccc; }
  .modal-buttons { display: flex; gap: 15px; justify-content: center; }

  @media (max-width: 340px) {
    .tile { width: 65px; height: 65px; }
  }
</style>