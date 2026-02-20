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
  const ROWS = 8;
  const COLS = 8;
  const TOTAL_MINES = 10;

  // --- State (Runes) ---
  let board = $state([]); // Массив объектов { isMine, isRevealed, isFlagged, count }
  let isGameOver = $state(false);
  let isWin = $state(false);
  let flagsLeft = $state(TOTAL_MINES);
  let firstClick = $state(true); // Для безопасного первого хода

  // Таймер для долгого нажатия (флаг)
  let longPressTimer = null;
  let isLongPress = false;

  // Modal State
  let modal = $state({ show: false, title: "", text: "", actions: [] });

  onMount(() => {
    initGame();
  });

  // --- Вычисляемые свойства ---
  function getRewardItemData() {
    if (!rewardItem || !items || items.length === 0) return null;
    const itemId = typeof rewardItem === "string" ? rewardItem : rewardItem.id;
    return items.find((item) => item.id === itemId);
  }
  let rewardItemData = $derived(getRewardItemData());

  // --- Инициализация ---
  function initGame() {
    isGameOver = false;
    isWin = false;
    firstClick = true;
    flagsLeft = TOTAL_MINES;
    hideModal();
    
    // Создаем пустое поле
    board = [];
    for (let r = 0; r < ROWS; r++) {
      let row = [];
      for (let c = 0; c < COLS; c++) {
        row.push({
          isMine: false,
          isRevealed: false,
          isFlagged: false,
          count: 0,
          r, c
        });
      }
      board.push(row);
    }
  }

  // Генерация мин после первого клика (чтобы не убить сразу)
  function generateMines(safeR, safeC) {
    let placed = 0;
    while (placed < TOTAL_MINES) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      
      // Не ставим мину на место клика и его соседей
      const isSafe = Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1;
      
      if (!board[r][c].isMine && !isSafe) {
        board[r][c].isMine = true;
        placed++;
      }
    }

    // Считаем цифры
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!board[r][c].isMine) {
          board[r][c].count = countAdjacentMines(r, c);
        }
      }
    }
  }

  function countAdjacentMines(r, c) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        if (i === 0 && j === 0) continue;
        const nr = r + i, nc = c + j;
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc].isMine) {
          count++;
        }
      }
    }
    return count;
  }

  // --- Логика игры ---
  
  function handleInteraction(r, c, isContextMenu = false) {
    if (isGameOver) return;

    const cell = board[r][c];

    if (cell.isRevealed) return;

    // ПКМ или Долгое нажатие -> Флаг
    if (isContextMenu) {
      if (!cell.isRevealed) {
        cell.isFlagged = !cell.isFlagged;
        flagsLeft += cell.isFlagged ? -1 : 1;
      }
      return;
    }

    // ЛКМ -> Открытие
    if (cell.isFlagged) return;

    if (firstClick) {
      generateMines(r, c);
      firstClick = false;
    }

    revealCell(r, c);
    checkGameStatus();
  }

  function revealCell(r, c) {
    const cell = board[r][c];
    if (cell.isRevealed || cell.isFlagged) return;

    cell.isRevealed = true;

    if (cell.isMine) {
      isGameOver = true;
      revealAllMines();
      if (integrated) {
        if (onLose) onLose(); else dispatch("lose");
      } else {
        showModal("🧛 Вампир проснулся!", "Вы потревожили древнее зло.", [
          { text: "Попробовать снова", action: initGame },
        ]);
      }
      return;
    }

    if (cell.count === 0) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          if (i === 0 && j === 0) continue;
          const nr = r + i, nc = c + j;
          if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
            revealCell(nr, nc);
          }
        }
      }
    }
  }

  function revealAllMines() {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c].isMine) board[r][c].isRevealed = true;
      }
    }
  }

  function checkGameStatus() {
    if (isGameOver) return;

    let allSafeRevealed = true;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!board[r][c].isMine && !board[r][c].isRevealed) {
          allSafeRevealed = false;
          break;
        }
      }
      if (!allSafeRevealed) break;
    }

    if (allSafeRevealed) {
      isGameOver = true;
      isWin = true;
      if (integrated) {
        if (onWin) onWin(); else dispatch("win");
      } else {
        showModal("🕯️ Склеп очищен", "Все вампиры остались в своих могилах!", [
          { text: "Играть снова", action: initGame },
        ]);
      }
    }
  }

  // --- Event Handlers (Svelte 5 Syntax) ---

  // Блокируем стандартное меню браузера
  function handleGlobalContextMenu(e) {
    e.preventDefault();
  }

  function handleClick(r, c) {
    if (isLongPress) {
      isLongPress = false;
      return;
    }
    handleInteraction(r, c, false);
  }

  function handleContextMenu(e, r, c) {
    e.preventDefault(); // Замена |preventDefault
    handleInteraction(r, c, true);
  }

  function handleTouchStart(e, r, c) {
    isLongPress = false;
    longPressTimer = setTimeout(() => {
      isLongPress = true;
      handleInteraction(r, c, true);
    }, 500);
  }

  function handleTouchEnd() {
    clearTimeout(longPressTimer);
  }

  // --- Helpers ---
  function showModal(title, text, actions) {
    if (integrated) return;
    modal = { show: true, title, text, actions };
  }
  function hideModal() { modal.show = false; }
</script>

<svelte:window oncontextmenu={handleGlobalContextMenu} />

<div class="body-wrapper">
  <div id="game-header">
    <button class="btn btn-secondary" onclick={initGame}>🔄 Заново</button>
    <div class="status-panel">
      <span class="flag-counter">🕯️ {flagsLeft}</span>
    </div>
    {#if integrated}
      <button class="btn btn-danger" onclick={() => onLose?.() || dispatch('lose')}>🏳️</button>
    {/if}
  </div>

  <div id="game-container">
    <div id="grid" style="grid-template-columns: repeat({COLS}, 1fr);">
      {#each board as row, r (r)}
        {#each row as cell, c (c)}
          <button
            class="cell"
            class:revealed={cell.isRevealed}
            class:mine={cell.isRevealed && cell.isMine}
            class:flagged={cell.isFlagged}
            class:exploded={cell.isRevealed && cell.isMine && isGameOver && !isWin}
            onclick={() => handleClick(r, c)}
            oncontextmenu={(e) => handleContextMenu(e, r, c)}
            ontouchstart={(e) => handleTouchStart(e, r, c)}
            ontouchend={handleTouchEnd}
            disabled={isGameOver && !isWin}
          >
            {#if cell.isRevealed}
              {#if cell.isMine}
                <span class="monster">🧛</span>
              {:else if cell.count > 0}
                <span class="number count-{cell.count}">{cell.count}</span>
              {/if}
            {:else if cell.isFlagged}
              <span class="flag">🕯️</span>
            {/if}
          </button>
        {/each}
      {/each}
    </div>
  </div>

  <div id="game-footer">
    {#if rewardItemData}
      <div id="reward-panel">
        {#if rewardItemData.icon}
          <div class="item-icon reward-glow">
            <img src={`${import.meta.env.VITE_SUPABASE_URL_FILE}/storage/v1/object/public/${bucketName}/${rewardItemData.icon}`} alt={rewardItemData.name} class="icon-preview" />
          </div>
        {/if}
        <div class="reward-info">
          <div class="reward-label">Цель:</div>
          <div class="reward-name">{rewardItemData.name}</div>
        </div>
      </div>
    {:else}
      <div class="hint">ПКМ или Удержание: Поставить свечу 🕯️</div>
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
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
  }

  .body-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    height: 100%;
    width: 100%;
    padding: 10px;
    box-sizing: border-box;
    gap: 10px;
  }

  #game-header, #game-footer {
    width: 100%;
    max-width: 360px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-sizing: border-box;
  }
  
  .status-panel {
    font-size: 1.2rem;
    font-weight: bold;
    color: #ff9f43;
  }

  #game-container {
    background: #000;
    padding: 5px;
    border-radius: 12px;
    border: 2px solid #333;
    box-shadow: 0 0 20px rgba(0,0,0,0.8);
  }

  #grid {
    display: grid;
    gap: 2px;
  }

  .cell {
    width: 40px;
    height: 40px;
    background: #2a2a40;
    border: none;
    border-radius: 4px;
    padding: 0;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    transition: all 0.1s;
    position: relative;
  }

  /* Стили скрытых ячеек */
  .cell:not(.revealed) {
    background: radial-gradient(circle at center, #3d3b5c, #2b2940);
    box-shadow: inset 0 0 5px rgba(0,0,0,0.5);
  }

  .cell:not(.revealed):hover {
    filter: brightness(1.2);
  }

  /* Открытая ячейка */
  .cell.revealed {
    background: rgba(255, 255, 255, 0.05);
    cursor: default;
  }

  /* Мина */
  .cell.mine {
    background: #4a1e1e;
  }
  .cell.exploded {
    background: #ff0000;
  }

  /* Цифры */
  .number {
    font-weight: 900;
    font-family: monospace;
    text-shadow: 0 0 5px currentColor;
  }
  
  .count-1 { color: #3498db; } 
  .count-2 { color: #2ecc71; } 
  .count-3 { color: #e74c3c; } 
  .count-4 { color: #9b59b6; } 
  .count-5 { color: #e67e22; } 
  .count-6 { color: #1abc9c; } 
  .count-7 { color: #34495e; } 
  .count-8 { color: #95a5a6; } 

  .monster, .flag {
    font-size: 24px;
  }

  .hint {
    font-size: 0.8rem;
    color: #888;
    text-align: center;
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

  @media (max-width: 380px) {
    .cell { width: 35px; height: 35px; font-size: 18px; }
    .monster, .flag { font-size: 20px; }
  }
</style>