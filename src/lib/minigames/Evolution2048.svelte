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
  const SIZE = 4;
  
  // Цепочка эволюции: Индекс массива = уровень плитки (значение в ячейке)
  // 0 = пусто, 1 = кость, 2 = череп и т.д.
  const EVOLUTION_CHAIN = [
    "",      // 0 - placeholder for empty
    "🦴",    // 1 - Кость
    "💀",    // 2 - Череп
    "👻",    // 3 - Призрак
    "🧟",    // 4 - Зомби
    "🧛",    // 5 - Вампир
    "👹",    // 6 - Демон
    "😈",    // 7 - Архидемон
    "🐉",    // 8 - Дракон нежити (Финальная форма)
  ];

  const WIN_LEVEL = 8; // Уровень победы (Дракон)

  // --- State (Runes) ---
  let board = $state([]); // 2D массив чисел (0 = пусто)
  let score = $state(0);
  let isGameOver = $state(false);
  let isWin = $state(false);

  // Для свайпов
  let touchStartX = 0;
  let touchStartY = 0;

  // Modal State
  let modal = $state({ show: false, title: "", text: "", actions: [] });

  onMount(() => {
    initGame();
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
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
    board = Array(SIZE).fill(null).map(() => Array(SIZE).fill(0));
    score = 0;
    isGameOver = false;
    isWin = false;
    hideModal();
    
    addRandomTile();
    addRandomTile();
  }

  // --- Логика игры ---

  function addRandomTile() {
    let emptyCells = [];
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    
    if (emptyCells.length === 0) return false;

    const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    // 90% шанс уровня 1 (Кость), 10% шанс уровня 2 (Череп)
    board[r][c] = Math.random() < 0.9 ? 1 : 2;
    return true;
  }

  // Обработка нажатий клавиш
  function handleKeydown(e) {
    if (isGameOver) return;
    
    const map = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
    };
    
    if (map[e.key]) {
      e.preventDefault();
      move(map[e.key]);
    }
  }

  // Обработка свайпов
  function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }

  function handleTouchEnd(e) {
    if (isGameOver) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const dx = touchEndX - touchStartX;
    const dy = touchEndY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Минимальная длина свайпа
    if (Math.max(absDx, absDy) < 30) return;

    if (absDx > absDy) {
      move(dx > 0 ? "right" : "left");
    } else {
      move(dy > 0 ? "down" : "up");
    }
  }

  // Главная логика движения
  function move(direction) {
    // Копируем доску для сравнения
    const prevBoard = board.map(row => [...row]);
    
    if (direction === "left") board = board.map(row => slide(row));
    else if (direction === "right") board = board.map(row => slide(row.reverse()).reverse());
    else if (direction === "up") {
      board = transpose(board);
      board = board.map(row => slide(row));
      board = transpose(board);
    } 
    else if (direction === "down") {
      board = transpose(board);
      board = board.map(row => slide(row.reverse()).reverse());
      board = transpose(board);
    }

    // Если доска изменилась, добавляем новый тайл
    if (JSON.stringify(prevBoard) !== JSON.stringify(board)) {
      addRandomTile();
      checkGameStatus();
    }
  }

  // Транспонирование (поворот на 90 градусов для Up/Down)
  function transpose(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }

  // Логика слияния одной строки/столбца (слева направо)
  function slide(row) {
    let arr = row.filter(val => val); // Убираем нули
    let missing = SIZE - arr.length;
    let zeros = Array(missing).fill(0);
    
    // Слияние
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i+1]) {
        arr[i]++; // Повышаем уровень
        score += Math.pow(2, arr[i]); // Очки
        arr.splice(i+1, 1); // Удаляем слитый элемент
        arr.push(0); // Добавляем ноль в конец для сохранения длины
      }
    }
    
    return zeros.concat(arr); // Возвращаем с нулями слева (для движения влево)
    // Для движения вправо логика инвертируется в функции move
    // Но в slide мы формируем массив: [0, 0, val, val], если это "left"
    // Стандартный 2048 слайд: нули в начале.
    // arr = row.filter(v => v);
    // missing = SIZE - arr.length;
    // zeros = Array(missing).fill(0);
    // return zeros.concat(arr);
  }
  
  // Коррекция логики slide для стандартного 2048 (нули слева для движения влево)
  // В моем коде выше `zeros.concat(arr)` ставит нули ПЕРЕД значениями. Это правильно для "Left".
  // Для "Right" мы вызываем reverse() внутри move.
  // Итого функция slide правильная.

  // --- Статус игры ---
  function checkGameStatus() {
    // Проверка победы
    if (board.flat().includes(WIN_LEVEL)) {
      isGameOver = true;
      isWin = true;
      if (integrated) {
        if (onWin) onWin(); else dispatch("win");
      } else {
        showModal("🐉 Абсолютная Эволюция!", `Вы создали Повелителя Нежити! Счет: ${score}`, [
          { text: "Играть снова", action: initGame },
        ]);
      }
      return;
    }

    // Проверка проигрыша (нет пустых и нет ходов)
    if (!board.flat().includes(0) && !canMove()) {
      isGameOver = true;
      if (integrated) {
        if (onLose) onLose(); else dispatch("lose");
      } else {
        showModal("💀 Ритуал провалился", "Некромантия истощила силы. Ходов нет.", [
          { text: "Заново", action: initGame },
        ]);
      }
    }
  }

  function canMove() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) return true;
        if (c < SIZE - 1 && board[r][c] === board[r][c+1]) return true;
        if (r < SIZE - 1 && board[r][c] === board[r+1][c]) return true;
      }
    }
    return false;
  }

  // --- Modal & Helpers ---
  function showModal(title, text, actions) {
    if (integrated) return;
    modal = { show: true, title, text, actions };
  }
  function hideModal() { modal.show = false; }
  function handleGiveUp() {
    if (integrated) {
      if (onLose) onLose(); else dispatch("lose");
    } else {
      showModal("Отступление", "Магический круг разорван.", [{ text: "ОК", action: initGame }]);
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="body-wrapper">
  <div id="game-header">
    <div class="score-panel">
      <span>Очки:</span>
      <strong>{score}</strong>
    </div>
    <button class="btn btn-secondary" onclick={initGame}>🔄 Заново</button>
    {#if integrated}
      <button class="btn btn-danger" onclick={handleGiveUp}>🏳️</button>
    {/if}
  </div>

  <div 
    id="game-container" 
    ontouchstart={handleTouchStart}
    ontouchend={handleTouchEnd}
  >
    <div id="grid">
      {#each board as row, r (r)}
        {#each row as val, c (c)}
          <div class="cell" class:tile-{val}>
            {#if val > 0}
              <span class="monster">
                {EVOLUTION_CHAIN[val]}
              </span>
            {/if}
          </div>
        {/each}
      {/each}
    </div>
  </div>

  <div id="game-footer">
    {#if rewardItemData}
      <div id="reward-panel">
        <div class="item-icon reward-glow">
          <img src={`${import.meta.env.VITE_SUPABASE_URL_FILE}/storage/v1/object/public/${bucketName}/${rewardItemData.icon}`} alt={rewardItemData.name} class="icon-preview" />
        </div>
        <div class="reward-info">
          <div class="reward-label">Цель эволюции:</div>
          <div class="reward-name">{rewardItemData.name}</div>
        </div>
      </div>
    {:else}
      <div class="evolution-hint">
        Цель: Соберите {EVOLUTION_CHAIN[WIN_LEVEL]} (Ур. {WIN_LEVEL})
      </div>
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
    touch-action: none; /* Отключаем зум свайпом */
    overflow: hidden;
  }

  .body-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    width: 100%;
    padding: 10px;
    box-sizing: border-box;
  }

  #game-header, #game-footer {
    width: 100%;
    max-width: 360px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-sizing: border-box;
    margin-bottom: 10px;
  }

  .score-panel strong { color: #ff9f43; font-size: 1.2rem; margin-left: 5px; }

  #game-container {
    background: #1a1a2e;
    padding: 8px;
    border-radius: 12px;
    border: 2px solid #333;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
    touch-action: none;
  }

  #grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }

  .cell {
    width: 75px;
    height: 75px;
    background: #2d2d44;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    transition: transform 0.15s ease, background-color 0.2s;
    position: relative;
  }

  /* Цвета для уровней */
  .tile-1 { background: #3d3b5c; color: #aaa; } /* Кость */
  .tile-2 { background: #5e5c8a; color: #ddd; } /* Череп */
  .tile-3 { background: #8e8cd1; color: white; } /* Призрак */
  .tile-4 { background: #e94560; color: white; box-shadow: 0 0 15px rgba(233, 69, 96, 0.4); } /* Зомби */
  .tile-5 { background: #ff6b6b; color: white; } /* Вампир */
  .tile-6 { background: #9b59b6; color: white; box-shadow: 0 0 20px rgba(155, 89, 182, 0.6); } /* Демон */
  .tile-7 { background: #3498db; color: white; } /* Архидемон */
  .tile-8 { background: #f1c40f; color: #333; box-shadow: 0 0 30px rgba(241, 196, 15, 0.8); animation: pulse-win 1s infinite; } /* Дракон */

  @keyframes pulse-win {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
  }

  .monster {
    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
  }

  /* Reward styles */
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

  .evolution-hint {
    font-size: 0.9rem;
    color: #aaa;
  }

  /* Buttons & Modal */
  .btn {
    padding: 6px 12px; font-size: 1rem; background: linear-gradient(135deg, #e94560, #c0394d);
    color: white; border: none; border-radius: 12px; cursor: pointer;
    box-shadow: 0 3px 8px rgba(233, 69, 96, 0.4);
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

  /* Mobile adjustments */
  @media (max-width: 380px) {
    .cell { width: 65px; height: 65px; font-size: 28px; }
    #grid { gap: 6px; }
  }
</style>