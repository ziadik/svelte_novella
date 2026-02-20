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
  const ROWS = 5;
  const COLS = 5;
  const SHUFFLE_MOVES = 15; // Количество случайных ходов для генерации уровня

  // --- State (Runes) ---
  let board = $state([]); // 2D массив булевых (true = горит, false = погасла)
  let moves = $state(0);
  let isGameOver = $state(false);

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
  // Проверка победы: все свечи погашены (false)
  let isWin = $derived(board.flat().every((cell) => !cell));

  function getRewardItemData() {
    if (!rewardItem || !items || items.length === 0) return null;
    const itemId = typeof rewardItem === "string" ? rewardItem : rewardItem.id;
    return items.find((item) => item.id === itemId);
  }

  let rewardItemData = $derived(getRewardItemData());

  // --- Инициализация ---
  function initGame() {
    // Начинаем с пустого поля (все погашены)
    board = Array(ROWS)
      .fill(null)
      .map(() => Array(COLS).fill(false));
    moves = 0;
    isGameOver = false;
    hideModal();

    // Генерация уровня: делаем случайные ходы из чистого состояния
    // Это гарантирует, что головоломка имеет решение
    for (let i = 0; i < SHUFFLE_MOVES; i++) {
      const r = Math.floor(Math.random() * ROWS);
      const c = Math.floor(Math.random() * COLS);
      toggleCell(r, c, true); // true = silent mode (без анимации/звука)
    }
  }

  // --- Логика игры ---
  function toggleCell(r, c, silent = false) {
    // Переключение текущей клетки
    board[r][c] = !board[r][c];

    // Переключение соседей (Up, Down, Left, Right)
    if (r > 0) board[r - 1][c] = !board[r - 1][c];
    if (r < ROWS - 1) board[r + 1][c] = !board[r + 1][c];
    if (c > 0) board[r][c - 1] = !board[r][c - 1];
    if (c < COLS - 1) board[r][c + 1] = !board[r][c + 1];

    if (!silent) {
      moves++;
      checkGameStatus();
    }
  }

  function handleCellClick(r, c) {
    if (isGameOver) return;
    toggleCell(r, c);
  }

  function handleCellKeyDown(r, c, event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleCellClick(r, c);
    }
  }

  // --- Статус игры ---
  function checkGameStatus() {
    if (isWin) {
      isGameOver = true;
      if (integrated) {
        if (onWin) {
          onWin();
        } else {
          dispatch("win");
        }
      } else {
        showModal("🕯️ Тьма наступила", `Вы погасили все свечи за ${moves} ходов!`, [
          { text: "Играть снова", action: initGame },
        ]);
      }
    }
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
      if (onLose) {
        onLose();
      } else {
        dispatch("lose");
      }
    } else {
      showModal("Сдаемся?", "Тьма оказалась сильнее...", [
        { text: "Заново", action: initGame },
      ]);
    }
  }
</script>

<div class="body-wrapper">
  <div id="game-header">
    <button class="btn btn-secondary" onclick={initGame}>🔄 Заново</button>
    {#if integrated}
      <button class="btn btn-danger" onclick={handleGiveUp}>🏳️ Сдаться</button>
    {/if}
  </div>

  <div id="game-container">
    <div
      id="grid"
      style="grid-template-columns: repeat({COLS}, 1fr); grid-template-rows: repeat({ROWS}, 1fr);"
    >
      {#each board as row, r (r)}
        {#each row as isLit, c (c)}
          <button
            class="cell"
            class:lit={isLit}
            onclick={() => handleCellClick(r, c)}
            onkeydown={(e) => handleCellKeyDown(r, c, e)}
            disabled={isGameOver}
            aria-label={isLit ? "Lit candle" : "Unlit candle"}
          >
            <span class="icon">🕯️</span>
            <div class="glow-overlay" class:active={isLit}></div>
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
            <img
              src={`${import.meta.env.VITE_SUPABASE_URL_FILE}/storage/v1/object/public/${bucketName}/${rewardItemData.icon}`}
              alt={rewardItemData.name}
              class="icon-preview"
              height="64px"
            />
          </div>
        {/if}
        <div class="reward-info">
          <div class="reward-label">Награда:</div>
          <div class="reward-name">{rewardItemData.name}</div>
        </div>
      </div>
    {/if}

    <div class="stats-panel">
      <span class="moves-counter">Ходов: <strong>{moves}</strong></span>
      <span class="goal-text">Цель: Погасить все</span>
    </div>
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
  /* --- Base & Layout (Same style as previous games) --- */
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
  }

  #game-header, #game-footer {
    width: 100%;
    max-width: 340px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(5px);
    z-index: 10;
    box-sizing: border-box;
    margin-bottom: 15px;
  }

  #game-footer {
    flex-direction: column;
    gap: 8px;
    margin-top: 0;
    margin-bottom: 15px;
  }

  .stats-panel {
    display: flex;
    justify-content: space-between;
    width: 100%;
    font-size: 0.9rem;
  }
  
  .goal-text {
    color: #a0a0a0;
    font-size: 0.8rem;
  }

  .moves-counter strong {
    color: #ff9f43;
    font-size: 1.1rem;
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

  .item-icon {
    width: 36px;
    height: 36px;
    background: #2d2d2d;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid #444;
  }

  .icon-preview { width: 100%; height: 100%; object-fit: cover; }

  .reward-glow {
    animation: icon-glow 2s ease-in-out infinite;
    border-color: rgba(255, 215, 0, 0.5);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
  }

  @keyframes icon-glow {
    0%, 100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); border-color: rgba(255, 215, 0, 0.4); }
    50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); border-color: rgba(255, 215, 0, 0.7); }
  }

  .reward-info { display: flex; flex-direction: column; gap: 1px; }
  .reward-label { font-size: 0.65rem; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; }
  .reward-name { font-size: 0.85rem; color: #ffd700; font-weight: bold; text-shadow: 0 0 8px rgba(255, 215, 0, 0.5); }

  /* --- Game Container --- */
  #game-container {
    position: relative;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 10px;
    border-radius: 15px;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
    max-width: 100%;
    overflow: hidden;
    box-sizing: border-box;
  }

  #grid {
    display: grid;
    gap: 8px;
    position: relative;
    z-index: 1;
    width: fit-content;
    height: fit-content;
    background: rgba(0, 0, 0, 0.3);
    padding: 10px;
    border-radius: 10px;
  }

  /* --- Lights Out Specific Styles --- */
  .cell {
    width: 55px;
    height: 55px;
    padding: 0;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    position: relative;
    background: #1a1a2e; /* Базовый темный фон */
    box-shadow: inset 0 0 10px rgba(0,0,0,0.8);
    transition: all 0.2s ease;
    overflow: hidden;
  }

  .cell:focus {
    outline: 2px solid #e94560;
    z-index: 10;
  }

  /* Состояние "Погашено" (Default) */
  .icon {
    font-size: 28px;
    opacity: 0.3;
    filter: grayscale(100%);
    transition: all 0.3s ease;
    z-index: 2;
    position: relative;
    text-shadow: none;
  }

  /* Состояние "Горит" */
  .cell.lit {
    background: #2c2c44; /* Чуть светлее фон */
    box-shadow: 0 0 15px rgba(255, 167, 39, 0.4), inset 0 0 5px rgba(255, 200, 100, 0.2);
  }

  .cell.lit .icon {
    opacity: 1;
    filter: grayscale(0%);
    transform: scale(1.1);
    text-shadow: 0 0 10px rgba(255, 200, 100, 0.8);
    animation: flicker 3s infinite alternate;
  }

  /* Эффект свечения */
  .glow-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 0;
    height: 0;
    background: radial-gradient(circle, rgba(255,167,39,0.4) 0%, rgba(0,0,0,0) 70%);
    border-radius: 50%;
    transition: all 0.3s ease;
    pointer-events: none;
    opacity: 0;
  }

  .glow-overlay.active {
    width: 120px;
    height: 120px;
    opacity: 1;
  }

  /* Hover Effect */
  .cell:hover {
    transform: scale(1.05);
  }
  
  .cell:hover .icon {
    opacity: 0.6; 
  }
  
  .cell.lit:hover .icon {
    opacity: 1;
  }

  @keyframes flicker {
    0%, 18%, 22%, 25%, 53%, 57%, 100% {
        text-shadow: 0 0 10px rgba(255, 200, 100, 0.8), 0 0 20px rgba(255, 167, 39, 0.4);
    }
    20%, 24%, 55% {
        text-shadow: none;
    }
  }

  /* --- Buttons & Modal --- */
  .btn {
    padding: 6px 12px;
    font-size: 1rem;
    background: linear-gradient(135deg, #e94560, #c0394d);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    box-shadow: 0 3px 8px rgba(233, 69, 96, 0.4);
    white-space: nowrap;
    min-width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-secondary {
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  }
  
  .btn-danger {
     background: linear-gradient(135deg, #6c757d, #495057);
  }

  #modal-overlay {
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center; align-items: center; z-index: 100;
    opacity: 0; pointer-events: none; transition: opacity 0.3s;
  }
  #modal-overlay.active { opacity: 1; pointer-events: all; }

  .modal-content {
    background: #252338; padding: 40px; border-radius: 20px; text-align: center;
    border: 2px solid #5e5c8a; box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
    max-width: 90%; width: 340px;
  }
  .modal-title { font-size: 1.8rem; margin-bottom: 10px; color: #ff9f43; }
  .modal-text { margin-bottom: 30px; font-size: 1rem; color: #ccc; }
  .modal-buttons { display: flex; gap: 15px; justify-content: center; }

  @media (max-width: 360px) {
    .cell { width: 45px; height: 45px; }
    .icon { font-size: 22px; }
    #grid { gap: 5px; padding: 5px; }
  }
</style>