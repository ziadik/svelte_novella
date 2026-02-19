<script>
  import { tick, onMount } from "svelte";
  import { createEventDispatcher } from "svelte";

  // --- Props ---
  let {
    // Режим интеграции с визуальной новеллой
    integrated = false,
    // События для отправки результата
    onWin,
    onLose,
    // Награда за победу
    rewardItem = null,
    // Массив всех предметов для поиска описания
    items = [],
    bucketName = "dracula",
  } = $props();

  const dispatch = createEventDispatcher();

  // --- Настройки ---
  const ROWS = 8; 
  const COLS = 6; 
  const ICONS = [
    "🦄",
    "🧙",
    "👻",
    "💀",
    "🔥",
    "🕷️",
    "🕸️",
    "🧟",
    "‍♀️",
    "⚰️",
    "🐸",
    "🦴",
    "🔮",
    "🧪",
    "👹",
    "🌜",
    "🍭",
    "💗",
    "🌛",
    "🖤",
    "🗡️",
    "🧛‍♀️",
    "🗝️",
    "🕯️",
    "🌑",
    "☠️",
    "🧿",
    "🌞",
  ];

  // --- State (Runes) ---
  let board = $state([]); // 2D массив иконок
  let matched = $state([]); // 2D массив булевых (удалена ли плитка)
  let flipped = $state([]); // 2D массив булевых (перевернута ли карточка)
  let hintCells = $state([]); // Массив координат для подсказки [{r, c}, {r, c}]

  let firstSelected = $state(null); // {r, c}
  let isProcessing = $state(false);
  let isGameOver = $state(false);

  // Cooldown для подсказки (в секундах)
  let hintCooldown = $state(0);
  const HINT_COOLDOWN_TIME = 5;

  // Modal State
  let modal = $state({
    show: false,
    title: "",
    text: "",
    actions: [],
  });

  // Инициализация при монтировании
  onMount(() => {
    initGame();
  });

  // --- Вычисляемые свойства ---
  function getRemainingCount() {
    if (!matched || matched.length === 0) return 0;
    let count = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (matched[r] && !matched[r][c]) count++;
      }
    }
    return count;
  }

  let remainingCount = $derived(getRemainingCount());

  // Проверка доступности подсказки
  let isHintAvailable = $derived(hintCooldown < 1);
 
  // Получение данных о награде
  function getRewardItemData() {
    if (!rewardItem || !items || items.length === 0) return null;
    const itemId = typeof rewardItem === "string" ? rewardItem : rewardItem.id;
    return items.find((item) => item.id === itemId);
  }

  let rewardItemData = $derived(getRewardItemData());

  // --- Инициализация ---
  function initGame() {
    board = [];
    matched = [];
    flipped = [];
    firstSelected = null;
    isProcessing = false;
    isGameOver = false;
    hintCells = [];
    hintCooldown = 0;
    hideModal();

    // Подготовка колоды
    let uniqueIcons = [...new Set(ICONS)];
    while (uniqueIcons.length < (ROWS * COLS) / 2) {
      uniqueIcons = [...uniqueIcons, ...uniqueIcons];
    }

    let selectedIcons = uniqueIcons
      .sort(() => 0.5 - Math.random())
      .slice(0, (ROWS * COLS) / 2);
    let deck = [];
    selectedIcons.forEach((icon) => deck.push(icon, icon));
    deck.sort(() => Math.random() - 0.5);

    // Заполнение сетки
    let index = 0;
    for (let r = 0; r < ROWS; r++) {
      let rowBoard = [];
      let rowMatched = [];
      let rowFlipped = [];
      for (let c = 0; c < COLS; c++) {
        rowBoard.push(deck[index++]);
        rowMatched.push(false);
        rowFlipped.push(false);
      }
      board.push(rowBoard);
      matched.push(rowMatched);
      flipped.push(rowFlipped);
    }
  }

  // --- Логика игры (Memo) ---
  async function handleCellClick(r, c) {
    if (isProcessing || matched[r][c] || isGameOver) return;

    // Если кликнули на уже перевернутую карту (и это первая выбранная), отменяем выбор
    if (firstSelected && firstSelected.r === r && firstSelected.c === c) {
      flipped[r][c] = false;
      firstSelected = null;
      return;
    }

    // Нельзя кликать по уже перевернутым картам
    if (flipped[r][c]) return;

    // Сброс подсказки при клике
    if (hintCells.length > 0) hintCells = [];

    // Переворачиваем карточку
    flipped[r][c] = true;

    if (!firstSelected) {
      // Первая карточка
      firstSelected = { r, c };
    } else {
      // Вторая карточка - проверяем пару
      isProcessing = true;
      const second = { r, c };
      const icon1 = board[firstSelected.r][firstSelected.c];
      const icon2 = board[second.r][second.c];

      if (icon1 === icon2) {
        // Пара найдена
        setTimeout(() => {
          matched[firstSelected.r][firstSelected.c] = true;
          matched[second.r][second.c] = true;
          flipped[firstSelected.r][firstSelected.c] = false; // Скрываем (можно оставить перевернутыми, но в Memo обычно очищают поле)
          flipped[second.r][second.c] = false;
          
          firstSelected = null;
          isProcessing = false;
          startHintCooldown();
          checkGameStatus();
        }, 600); // Небольшая задержка, чтобы увидеть совпадение
      } else {
        // Пара не совпала
        setTimeout(() => {
          flipped[firstSelected.r][firstSelected.c] = false;
          flipped[second.r][second.c] = false;
          firstSelected = null;
          isProcessing = false;
        }, 1000); // Задержка, чтобы запомнить карты
      }
    }
  }

  async function handleCellKeyDown(r, c, event) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      await handleCellClick(r, c);
    }
  }

  // --- Подсказки ---
  function startHintCooldown() {
    hintCooldown = HINT_COOLDOWN_TIME;
    const timer = setInterval(() => {
      hintCooldown--;
      if (hintCooldown <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  }

  function showHint() {
    if (isProcessing || isGameOver || !isHintAvailable) return;

    // Ищем любую пару несовпавших и неперевернутых карт
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (matched[r][c] || flipped[r][c]) continue;
        
        // Ищем пару для текущей карты
        let icon = board[r][c];
        for (let r2 = 0; r2 < ROWS; r2++) {
          for (let c2 = 0; c2 < COLS; c2++) {
            if (r === r2 && c === c2) continue;
            if (matched[r2][c2] || flipped[r2][c2]) continue;

            if (board[r2][c2] === icon) {
              hintCells = [{ r, c }, { r: r2, c: c2 }];
              setTimeout(() => (hintCells = []), 1500);
              return;
            }
          }
        }
      }
    }
  }

  // --- Статус игры ---
  function checkGameStatus() {
    if (remainingCount === 0) {
      isGameOver = true;

      if (integrated) {
        if (onWin) {
          onWin();
        } else {
          dispatch("win");
        }
      } else {
        showModal("🎉 Победа!", "Все монстры пойманы!", [
          { text: "Играть снова", action: initGame },
        ]);
      }
      return;
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
      showModal("Конец", "Попытайте удачу снова!", [
        { text: "ОК", action: initGame },
      ]);
    }
  }
</script>

<div class="body-wrapper">
  <div id="game-header">
    <button class="btn btn-secondary" onclick={initGame}>🔄 Новая игра</button>
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
        {#each row as icon, c (c)}
          <div
            class="cell"
            class:flipped={flipped[r][c]}
            class:matched={matched[r][c]}
            class:selected={firstSelected?.r === r && firstSelected?.c === c}
            class:hint-glow={hintCells.some((h) => h.r === r && h.c === c)}
            onclick={() => handleCellClick(r, c)}
            onkeydown={(e) => handleCellKeyDown(r, c, e)}
            role="button"
            tabindex="0"
          >
            <div class="card-inner">
              <div class="card-front">{icon}</div>
              <div class="card-back">?</div>
            </div>
          </div>
        {/each}
      {/each}
    </div>
  </div>

  <div id="game-header">

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

    <span class="tiles-counter"
      >Осталось: <strong>{remainingCount}</strong></span
    >
    <button
      class="btn btn-secondary"
      class:disabled={!isHintAvailable}
      class:cooldown-active={hintCooldown > 0}
      onclick={showHint}
      disabled={!isHintAvailable}
    >
      💡
      {#if hintCooldown > 0}
        <span class="cooldown-timer">({hintCooldown})</span>
      {/if}
    </button>
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
          <button
            class="btn"
            class:btn-secondary={action.class === "btn-secondary"}
            onclick={action.action}
          >
            {action.text}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) {
    margin: 0;
    background-color: #120f1a;
    background-image: radial-gradient(
      circle at center,
      #2a2a40 0%,
      #120f1a 100%
    );
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
    color: #ececec;
    overflow-x: hidden;
    overflow-y: auto;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  @media (max-width: 380px) {
    :global(body) {
      align-items: stretch;
    }

    .body-wrapper {
      align-items: center;
    }
  }
  .item-icon {
    width: 40px;
    height: 40px;
    background: #2d2d2d;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid #444;
  }
  
  .icon-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
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

  #game-header {
    margin-bottom: 15px;
    width: 100%;
    max-width: 390px;
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
  }

  .tiles-counter {
    font-size: 0.9rem;
    color: #ececec;
  }

  .tiles-counter strong {
    color: #ff9f43;
    font-size: 1.1rem;
  }

  #reward-panel {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background: rgba(255, 215, 0, 0.05);
    border-radius: 15px;
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

  .icon-preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .reward-glow {
    animation: icon-glow 2s ease-in-out infinite;
    border-color: rgba(255, 215, 0, 0.5);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.3);
  }

  @keyframes icon-glow {
    0%,
    100% {
      box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
      border-color: rgba(255, 215, 0, 0.4);
    }
    50% {
      box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
      border-color: rgba(255, 215, 0, 0.7);
    }
  }

  .reward-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .reward-label {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  @media (max-width: 340px) {
    .reward-label {
      display: none;
    }
  }

  @media (max-width: 380px) {
    #game-header {
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      padding: 8px;
    }

    #reward-panel {
      order: 1;
      width: 100%;
      justify-content: center;
    }

    .tiles-counter {
      order: 2;
    }

    .btn {
      order: 3;
    }
  }

  .reward-name {
    font-size: 0.85rem;
    color: #ffd700;
    font-weight: bold;
    text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
  }

  @media (max-width: 360px) {
    .body-wrapper {
      padding: 5px;
    }

    #game-header {
      gap: 4px;
      padding: 6px 8px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .btn {
      padding: 5px 10px;
      min-width: 32px;
      height: 32px;
      font-size: 1rem;
    }

    .item-icon {
      width: 32px;
      height: 32px;
    }

    .reward-label {
      font-size: 0.6rem;
    }

    .reward-name {
      font-size: 0.75rem;
    }

    .tiles-counter {
      font-size: 0.8rem;
    }

    .tiles-counter strong {
      font-size: 1rem;
    }

    .cooldown-timer {
      font-size: 0.65rem;
    }

    #reward-panel {
      width: 100%;
      justify-content: center;
    }

    #game-container {
      padding: 3px;
    }
  }

  #game-container {
    position: relative;
    background-color: rgba(0, 0, 0, 0.5);
    padding: 5px;
    border-radius: 15px;
    box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    justify-content: center;
    align-items: center;
    max-width: 100%;
    overflow: hidden;
    box-sizing: border-box;
    margin-bottom: 15px;
  }

  #grid {
    display: grid;
    gap: 4px;
    position: relative;
    z-index: 1;
    width: fit-content;
    height: fit-content;
    max-width: 100%;
  }

  /* --- Styles для Memo (3D Flip) --- */
  .cell {
    width: 11vmin;
    height: 11vmin;
    max-width: 60px;
    max-height: 60px;
    perspective: 1000px; /* Добавляем перспективу для 3D */
    cursor: pointer;
    border-radius: 8px;
    /* Убираем стили фона из .cell, переносим в .card-back, так как теперь это контейнер */
    background: transparent; 
    border: none; 
    box-shadow: none; /* Тень будет на самой карточке */
    transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    position: relative;
  }

  @media (min-width: 800px) {
    .cell {
      width: 60px;
      height: 60px;
    }
  }
  @media (max-width: 390px) {
    .cell {
      width: 45px;
      height: 45px;
    }
  }

  @media (max-width: 340px) {
    .cell {
      width: 38px;
      height: 38px;
    }

    #grid {
      gap: 3px;
    }
  }

  .card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    text-align: center;
    transition: transform 0.6s;
    transform-style: preserve-3d;
    border-radius: 8px;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3); /* Тень карточки */
  }

  .cell.flipped .card-inner {
    transform: rotateY(180deg);
  }

  .card-front, .card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Лицо карточки (иконка) */
  .card-front {
    background-color: #3d3b5c;
    color: white;
    transform: rotateY(180deg);
    font-size: clamp(20px, 5vmin, 32px);
    border: 2px solid rgba(255,255,255,0.1);
  }

  /* Рубашка карточки */
  .card-back {
    background: linear-gradient(135deg, #3d3b5c, #2b2940);
    color: #5e5c8a;
    font-size: 1.5rem;
    font-weight: bold;
    border: 2px solid #444;
  }

  .card-back::after {
    content: "?";
    opacity: 0.3;
  }

  /* Состояния для карточек */
  .cell:hover .card-inner {
    transform: translateY(-4px);
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.4);
  }

  .cell.flipped:hover .card-inner {
    transform: rotateY(180deg) translateY(-4px);
  }

  .cell.selected .card-front {
    border-color: #e94560;
    box-shadow: 0 0 20px rgba(233, 69, 96, 0.8) inset;
    background-color: #5e1e2e;
  }

  .cell.matched {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
  }

  .cell.hint-glow {
    animation: pulse-hint 1s infinite;
    z-index: 15;
  }
  
  /* Свечение для подсказки применяется к контуру, так как карточка закрыта */
  .cell.hint-glow .card-inner {
    box-shadow: 0 0 15px #ffd700;
    border: 1px solid #ffd700;
  }

  @keyframes pulse-hint {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  .btn {
    padding: 6px 12px;
    font-size: 1.2rem;
    background: linear-gradient(135deg, #e94560, #c0394d);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition:
      transform 0.1s,
      box-shadow 0.2s,
      filter 0.2s;
    box-shadow: 0 3px 8px rgba(233, 69, 96, 0.4);
    white-space: nowrap;
    min-width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 12px rgba(233, 69, 96, 0.6);
    filter: brightness(1.1);
  }

  .btn:active {
    transform: translateY(1px);
  }

  .btn-secondary {
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    box-shadow: 0 3px 8px rgba(0, 0, 0, 0.4);
  }

  .btn.disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
    filter: grayscale(0.5);
  }

  .btn.disabled:hover {
    transform: none !important;
    box-shadow: 0 3px 8px rgba(233, 69, 96, 0.4);
  }

  .cooldown-active {
    position: relative;
  }

  .cooldown-timer {
    font-size: 0.7rem;
    margin-left: 2px;
    color: #ffd700;
    font-weight: bold;
  }

  #modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.3s;
  }

  #modal-overlay.active {
    opacity: 1;
    pointer-events: all;
  }

  .modal-content {
    background: #252338;
    padding: 40px;
    border-radius: 20px;
    text-align: center;
    border: 2px solid #5e5c8a;
    box-shadow: 0 0 30px rgba(0, 0, 0, 0.8);
    max-width: 90%;
    width: 390px;
    transform: scale(0.8);
    transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    box-sizing: border-box;
  }

  @media (max-width: 400px) {
    .modal-content {
      padding: 25px;
      width: 95%;
    }

    .modal-title {
      font-size: 1.5rem;
    }

    .modal-text {
      font-size: 1rem;
      margin-bottom: 20px;
    }

    .modal-buttons {
      gap: 10px;
    }

    .btn {
      padding: 8px 16px;
      font-size: 1rem;
    }
  }

  #modal-overlay.active .modal-content {
    transform: scale(1);
  }

  .modal-title {
    font-size: 2rem;
    margin-bottom: 10px;
    color: #ff9f43;
  }

  .modal-text {
    margin-bottom: 30px;
    font-size: 1.1rem;
    line-height: 1.5;
    color: #ccc;
  }

  .modal-buttons {
    display: flex;
    gap: 15px;
    justify-content: center;
    flex-wrap: wrap;
  }
</style>