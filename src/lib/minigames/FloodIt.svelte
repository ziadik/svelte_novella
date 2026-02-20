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
  const ROWS = 10;
  const COLS = 10;
  // Лимит ходов обычно ставится как (ширина + высота) * 1.5 или жестко 22-25 для 10x10
  const MAX_MOVES = 22; 

  const ICONS = [
    "💀", // Смерть (часто стартовая)
    "🧟", // Зомби
    "🧛", // Вампир
    "🦇", // Летучая мышь
    "🐺", // Оборотень
    "🕸️", // Паутина
  ];

  // --- State (Runes) ---
  let board = $state([]); // 2D массив индексов иконок
  let moves = $state(0);
  let isGameOver = $state(false);
  let currentPlayerIcon = $state(ICONS[0]); // Текущий цвет "Чумы"

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
  // Проверка победы: все ячейки равны ячейке [0][0]
  let isWin = $derived(board.flat().every((cell) => cell === board[0]?.[0]));

  // Осталось ходов
  let movesLeft = $derived(MAX_MOVES - moves);

  function getRewardItemData() {
    if (!rewardItem || !items || items.length === 0) return null;
    const itemId = typeof rewardItem === "string" ? rewardItem : rewardItem.id;
    return items.find((item) => item.id === itemId);
  }

  let rewardItemData = $derived(getRewardItemData());

  // --- Инициализация ---
  function initGame() {
    board = [];
    moves = 0;
    isGameOver = false;
    hideModal();

    // Заполняем случайными иконками
    for (let r = 0; r < ROWS; r++) {
      let row = [];
      for (let c = 0; c < COLS; c++) {
        row.push(Math.floor(Math.random() * ICONS.length));
      }
      board.push(row);
    }
    
    // Устанавливаем текущую иконку игрока
    currentPlayerIcon = ICONS[board[0][0]];
  }

  // --- Логика игры (Flood Fill) ---
  function handleColorPick(index) {
    if (isGameOver || moves >= MAX_MOVES) return;
    
    const oldIndex = board[0][0];
    const newIndex = index;

    // Если выбрали тот же цвет, ничего не делаем
    if (oldIndex === newIndex) return;

    moves++;
    
    // Итеративный Flood Fill (чтобы не переполнить стек вызовов)
    // Используем стек для координат
    let stack = [[0, 0]];
    let visited = new Set();
    
    // Сначала меняем стартовую ячейку
    board[0][0] = newIndex;
    visited.add("0,0");

    while (stack.length > 0) {
      let [r, c] = stack.pop();
      
      // Соседи: верх, низ, лево, право
      const neighbors = [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1]
      ];

      for (let [nr, nc] of neighbors) {
        // Проверка границ
        if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) {
          let key = `${nr},${nc}`;
          // Если сосед имеет старый цвет (OldIndex) и не посещен
          if (!visited.has(key) && board[nr][nc] === oldIndex) {
            board[nr][nc] = newIndex; // Перекрашиваем
            visited.add(key);
            stack.push([nr, nc]); // Добавляем в стек для обработки его соседей
          }
        }
      }
    }
    
    // Обновляем текущую иконку игрока
    currentPlayerIcon = ICONS[newIndex];
    
    checkGameStatus();
  }

  // --- Статус игры ---
  function checkGameStatus() {
    if (isWin) {
      isGameOver = true;
      if (integrated) {
        if (onWin) onWin(); else dispatch("win");
      } else {
        showModal("🦇 Мор Победил!", `Вы поглотили мир за ${moves} ходов.`, [
          { text: "Играть снова", action: initGame },
        ]);
      }
      return;
    }

    if (moves >= MAX_MOVES) {
      isGameOver = true;
      if (integrated) {
        if (onLose) onLose(); else dispatch("lose");
      } else {
        showModal("☠️ Сопротивление сломлено", "Ходы закончились. Свет не погас.", [
          { text: "Попробовать снова", action: initGame },
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
      if (onLose) onLose(); else dispatch("lose");
    } else {
      showModal("Сдаемся?", "Тьма отступает...", [
        { text: "Заново", action: initGame },
      ]);
    }
  }
</script>

<div class="body-wrapper">
  <!-- Header -->
  <div id="game-header">
    <button class="btn btn-secondary" onclick={initGame}>🔄 Заново</button>
    
    <div class="current-plague">
      <span>Ваша сущность:</span>
      <span class="plague-icon">{currentPlayerIcon}</span>
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
      {#each board as row, r (r)}
        {#each row as iconIdx, c (c)}
          <div class="cell" class:player-origin={r === 0 && c === 0}>
            {ICONS[iconIdx]}
          </div>
        {/each}
      {/each}
    </div>
  </div>

  <!-- Footer: Stats & Palette -->
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

    <div class="stats-bar">
      <div class="moves-display">
        Ходов: <span class="moves-count">{moves}</span>
        <span class="moves-limit">/ {MAX_MOVES}</span>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar" style="width: {(moves / MAX_MOVES) * 100}%"></div>
      </div>
    </div>

    <div id="palette">
      {#each ICONS as icon, index (index)}
        <button
          class="palette-btn"
          class:disabled={isGameOver}
          class:selected={ICONS[board[0]?.[0]] === icon}
          onclick={() => handleColorPick(index)}
          disabled={isGameOver}
        >
          {icon}
        </button>
      {/each}
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
    gap: 10px;
  }

  /* --- Header --- */
  #game-header {
    width: 100%;
    max-width: 400px;
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

  .current-plague {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 0.7rem;
    color: #aaa;
  }

  .plague-icon {
    font-size: 1.5rem;
    animation: pulse-icon 2s infinite;
  }

  @keyframes pulse-icon {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }

  /* --- Game Container --- */
  #game-container {
    position: relative;
    background-color: rgba(0, 0, 0, 0.6);
    padding: 5px;
    border-radius: 12px;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
    border: 2px solid rgba(255, 255, 255, 0.1);
    box-sizing: border-box;
  }

  #grid {
    display: grid;
    gap: 2px;
  }

  .cell {
    width: 34px;
    height: 34px;
    background: #2a2a40;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    transition: background-color 0.2s, transform 0.2s;
  }

  /* Адаптивность для больших экранов */
  @media (min-width: 420px) {
    .cell {
      width: 38px;
      height: 38px;
      font-size: 22px;
    }
  }

  /* Адаптивность для маленьких экранов */
  @media (max-width: 360px) {
    .cell {
      width: 30px;
      height: 30px;
      font-size: 18px;
    }
    #grid { gap: 1px; }
  }

  .player-origin {
    box-shadow: inset 0 0 5px #fff, 0 0 5px rgba(255, 255, 255, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.3);
  }

  /* --- Footer --- */
  #game-footer {
    width: 100%;
    max-width: 400px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .stats-bar {
    background: rgba(255, 255, 255, 0.05);
    padding: 8px 12px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .moves-display {
    text-align: center;
    font-size: 0.9rem;
  }
  
  .moves-count { color: #ff9f43; font-weight: bold; font-size: 1.1rem; }
  .moves-limit { color: #888; }

  .progress-bar-container {
    width: 100%;
    height: 4px;
    background: #333;
    border-radius: 2px;
    overflow: hidden;
  }

  .progress-bar {
    height: 100%;
    background: linear-gradient(90deg, #ff9f43, #e94560);
    transition: width 0.3s ease;
  }

  /* --- Palette --- */
  #palette {
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 10px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .palette-btn {
    width: 50px;
    height: 50px;
    font-size: 28px;
    background: #3d3b5c;
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .palette-btn:hover {
    transform: translateY(-3px) scale(1.05);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
    background: #5e5c8a;
  }

  .palette-btn:active {
    transform: scale(0.95);
  }

  .palette-btn.selected {
    border-color: #fff;
    box-shadow: 0 0 0 2px #e94560;
    opacity: 0.5; /* Визуально отключаем текущий выбранный цвет */
    pointer-events: none;
  }

  .palette-btn.disabled {
    opacity: 0.3;
    cursor: not-allowed;
    transform: none;
  }

  /* --- Reward Styles --- */
  #reward-panel {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(255, 215, 0, 0.05);
    border-radius: 15px;
    margin-bottom: 5px;
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
  
  #modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.85); display: flex; justify-content: center; align-items: center; z-index: 100; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
  #modal-overlay.active { opacity: 1; pointer-events: all; }
  .modal-content { background: #252338; padding: 40px; border-radius: 20px; text-align: center; border: 2px solid #5e5c8a; box-shadow: 0 0 30px rgba(0, 0, 0, 0.8); max-width: 90%; width: 340px; }
  .modal-title { font-size: 1.8rem; margin-bottom: 10px; color: #ff9f43; }
  .modal-text { margin-bottom: 30px; font-size: 1rem; color: #ccc; }
  .modal-buttons { display: flex; gap: 15px; justify-content: center; }
</style>