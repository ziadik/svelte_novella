<script lang="ts">
  import { onMount, tick } from "svelte";
  import BodyWrapper from './components/BodyWrapper.svelte';
  import GameHeader from './components/GameHeader.svelte';
  import GameFooter from './components/GameFooter.svelte';
  import MinigameModal from './components/MinigameModal.svelte';
  import type { MinigameProps, ModalState } from './types';

  let {
    integrated = false,
    onWin,
    onLose,
    rewardItem = null,
    items = [],
    bucketName = "dracula",
  }: MinigameProps = $props();

  // --- Настройки ---
  const ROWS = 16;
  const COLS = 9;
  const HINT_COOLDOWN_TIME = 5;
  const TIMEOUT = 1000;

  const ICONS = [
    // Монстры и нечисть (1-20)
    "🧛", "🧛‍♀️", "🧛‍♂️", "🧟", "🧟‍♀️", "🧟‍♂️", "👻", "💀", "☠️", "👹",
    "👺", "👻", "👽", "👾", "🤖", "🦇", "🐉", "🦄", "🦕", "🦖",
    // Животные и существа (21-40)
    "🐺", "🐗", "🦊", "🦝", "🦁", "🐯", "🐆", "🐆", "🦓", "🦍",
    "🐘", "🦏", "🦛", "🐙", "🦑", "🐡", "🐠", "🐟", "🐬", "🐳",
    // Насекомые и пауки (41-50)
    "🕷️", "🕸️", "🦂", "🐝", "🪲", "🐞", "🦗", "🦟", "🪳", "🐜",
    // Магия и ритуалы (51-65)
    "🔮", "🧪", "⚗️", "🧿", "🕯️", "🗝️", "🗡️", "⚔️", "🛡️", "🏺",
    "📜", "⚰️", "⚱️", "🪦", "🧬",
    // Природа и стихии (66-77)
    "🔥", "🌊", "🌪️", "🌩️", "❄️", "🌙", "🌛", "🌜", "☀️", "🌞",
    "⭐", "🌟", "💫",
  ];

  // --- State (Runes) ---
  let board = $state<string[][]>([]); // 2D массив иконок
  let matched = $state<boolean[][]>([]); // 2D массив булевых (удалена ли плитка)
  let shuffling = $state<Record<string, boolean>>({}); // Объект для отслеживания анимации тряски
  let hintCells = $state<Array<{ r: number; c: number }>>([]); // Массив координат для подсказки
  let firstSelected = $state<{ r: number; c: number } | null>(null);
  let isProcessing = $state(false);
  let isGameOver = $state(false);
  let linePath = $state<string>(""); // Координаты для SVG polyline
  let lineKey = $state(0); // Ключ для перерисовки SVG и рестарта анимации
  let hintCooldown = $state(0); // Оставшееся время cooldown

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  // Refs
  let gridContainer: HTMLElement;
  let gridEl: HTMLElement;

  // Инициализация при монтировании
  onMount(() => {
    initGame();
  });

  // --- Вычисляемые свойства ---
  function getRemainingCount(): number {
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
  let isHintAvailable = $derived(hintCooldown < 1);

  // --- Инициализация ---
  function initGame(): void {
    board = [];
    matched = [];
    firstSelected = null;
    isProcessing = false;
    isGameOver = false;
    shuffling = {};
    hintCells = [];
    linePath = "";
    hintCooldown = 0;
    hideModal();

    // Подготовка колоды
    let uniqueIcons = [...new Set(ICONS)];
    while (uniqueIcons.length < (ROWS * COLS) / 2) {
      uniqueIcons = [...uniqueIcons, ...uniqueIcons];
    }
    let selectedIcons = uniqueIcons.sort(() => 0.5 - Math.random()).slice(0, (ROWS * COLS) / 2);
    let deck: string[] = [];
    selectedIcons.forEach((icon) => deck.push(icon, icon));
    deck.sort(() => Math.random() - 0.5);

    // Заполнение сетки
    let index = 0;
    for (let r = 0; r < ROWS; r++) {
      let rowBoard: string[] = [];
      let rowMatched: boolean[] = [];
      for (let c = 0; c < COLS; c++) {
        rowBoard.push(deck[index++]);
        rowMatched.push(false);
      }
      board.push(rowBoard);
      matched.push(rowMatched);
    }

    // Проверка ходов с небольшой задержкой
    setTimeout(checkGameStatus, 500);
  }

  // --- Логика игры ---
  async function handleCellClick(r: number, c: number): Promise<void> {
    if (isProcessing || matched[r][c] || isGameOver) return;
    // Сброс подсказки при клике
    if (hintCells.length > 0) hintCells = [];

    if (!firstSelected) {
      firstSelected = { r, c };
      return;
    }

    if (firstSelected.r === r && firstSelected.c === c) {
      firstSelected = null;
      return;
    }

    const icon1 = board[firstSelected.r][firstSelected.c];
    const icon2 = board[r][c];

    if (icon1 === icon2) {
      const path = findPath(firstSelected.r, firstSelected.c, r, c);
      if (path) {
        isProcessing = true;
        await drawLine(path);
        // Анимация завершена, удаляем плитки
        matched[firstSelected.r][firstSelected.c] = true;
        matched[r][c] = true;
        firstSelected = null;
        isProcessing = false;
        // Запускаем cooldown для подсказки после успешного хода
        startHintCooldown();
        checkGameStatus();
        return;
      }
    }

    // Неправильный выбор
    firstSelected = { r, c };
  }

  async function handleCellKeyDown(r: number, c: number, event: KeyboardEvent): Promise<void> {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      await handleCellClick(r, c);
    }
  }

  // --- Подсказки ---
  function startHintCooldown(): void {
    hintCooldown = HINT_COOLDOWN_TIME;
    const timer = setInterval(() => {
      hintCooldown--;
      if (hintCooldown <= 0) {
        clearInterval(timer);
      }
    }, 1000);
  }

  function showHint(): void {
    if (isProcessing || isGameOver || !isHintAvailable) return;

    let remainingTiles: Array<{ r: number; c: number; icon: string }> = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!matched[r][c]) {
          remainingTiles.push({ r, c, icon: board[r][c] });
        }
      }
    }

    let groups: Record<string, Array<{ r: number; c: number; icon: string }>> = {};
    remainingTiles.forEach((tile) => {
      if (!groups[tile.icon]) groups[tile.icon] = [];
      groups[tile.icon].push(tile);
    });

    for (const icon in groups) {
      const tiles = groups[icon];
      if (tiles.length < 2) continue;

      for (let i = 0; i < tiles.length; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
          const t1 = tiles[i];
          const t2 = tiles[j];
          if (findPath(t1.r, t1.c, t2.r, t2.c)) {
            hintCells = [t1, t2];
            setTimeout(() => (hintCells = []), 1500);
            return;
          }
        }
      }
    }
  }

  // --- Статус игры ---
  function checkGameStatus(): void {
    if (remainingCount === 0) {
      isGameOver = true;
      if (integrated) {
        showModal("🎉 Победа!", "Все монстры пойманы!", []);
        setTimeout(() => {
          hideModal();
          onWin?.();
        }, TIMEOUT);
      } else {
        showModal("🎉 Победа!", "Все монстры пойманы!", [
          { text: "Играть снова", action: initGame },
        ]);
      }
      return;
    }

    if (!hasAvailableMoves()) {
      if (integrated) {
        setTimeout(() => shuffleBoard(), 1000);
      } else {
        showModal("😨 Тупик!", "Ходов больше нет. Перемешать?", [
          {
            text: "Перемешать",
            action: () => {
              hideModal();
              shuffleBoard();
            },
          },
          {
            text: "Сдаться",
            action: () => {
              showModal("Конец", "Попытайте удачу снова!", [
                { text: "ОК", action: initGame },
              ]);
            },
          },
        ]);
      }
    }
  }

  function hasAvailableMoves(): boolean {
    let remainingTiles: Array<{ r: number; c: number; icon: string }> = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!matched[r][c]) remainingTiles.push({ r, c, icon: board[r][c] });
      }
    }

    let groups: Record<string, Array<{ r: number; c: number; icon: string }>> = {};
    remainingTiles.forEach((tile) => {
      if (!groups[tile.icon]) groups[tile.icon] = [];
      groups[tile.icon].push(tile);
    });

    for (const icon in groups) {
      const tiles = groups[icon];
      if (tiles.length < 2) continue;

      for (let i = 0; i < tiles.length; i++) {
        for (let j = i + 1; j < tiles.length; j++) {
          if (findPath(tiles[i].r, tiles[i].c, tiles[j].r, tiles[j].c))
            return true;
        }
      }
    }

    return false;
  }

  // --- Перемешивание ---
  function shuffleBoard(): void {
    let remainingIcons: string[] = [];
    let remainingPositions: Array<{ r: number; c: number }> = [];

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!matched[r][c]) {
          remainingIcons.push(board[r][c]);
          remainingPositions.push({ r, c });
        }
      }
    }

    if (remainingIcons.length === 0) return;

    remainingIcons.sort(() => Math.random() - 0.5);

    // Обновляем доску
    remainingPositions.forEach((pos, index) => {
      board[pos.r][pos.c] = remainingIcons[index];
      shuffling[`${pos.r},${pos.c}`] = true;
    });

    // Убираем класс тряски через 500мс
    setTimeout(() => {
      shuffling = {};
      // Рекурсивная проверка
      if (!hasAvailableMoves()) {
        shuffleBoard();
      } else {
        isGameOver = false;
      }
    }, 500);
  }

  // --- Pathfinding (Логика пути) ---
  function isEmpty(r: number, c: number): boolean {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true;
    return matched[r][c];
  }

  function checkLine(r1: number, c1: number, r2: number, c2: number): boolean {
    if (r1 !== r2 && c1 !== c2) return false;

    if (r1 === r2) {
      const minC = Math.min(c1, c2);
      const maxC = Math.max(c1, c2);
      for (let c = minC + 1; c < maxC; c++) {
        if (!isEmpty(r1, c)) return false;
      }
    } else {
      const minR = Math.min(r1, r2);
      const maxR = Math.max(r1, r2);
      for (let r = minR + 1; r < maxR; r++) {
        if (!isEmpty(r, c1)) return false;
      }
    }
    return true;
  }

  function findPath(r1: number, c1: number, r2: number, c2: number): Array<{ r: number; c: number }> | null {
    // 0 поворотов
    if (checkLine(r1, c1, r2, c2)) {
      return [
        { r: r1, c: c1 },
        { r: r2, c: c2 },
      ];
    }

    // 1 поворот
    const c1_r1_c2 = { r: r1, c: c2 };
    if (
      isEmpty(c1_r1_c2.r, c1_r1_c2.c) &&
      checkLine(r1, c1, c1_r1_c2.r, c1_r1_c2.c) &&
      checkLine(c1_r1_c2.r, c1_r1_c2.c, r2, c2)
    ) {
      return [{ r: r1, c: c1 }, c1_r1_c2, { r: r2, c: c2 }];
    }

    const c1_r2_c1 = { r: r2, c: c1 };
    if (
      isEmpty(c1_r2_c1.r, c1_r2_c1.c) &&
      checkLine(r1, c1, c1_r2_c1.r, c1_r2_c1.c) &&
      checkLine(c1_r2_c1.r, c1_r2_c1.c, r2, c2)
    ) {
      return [{ r: r1, c: c1 }, c1_r2_c1, { r: r2, c: c2 }];
    }

    // 2 поворота
    for (let r = -1; r <= ROWS; r++) {
      if (r === r1 || r === r2) continue;
      const p1 = { r: r, c: c1 };
      const p2 = { r: r, c: c2 };
      if (
        isEmpty(p1.r, p1.c) &&
        isEmpty(p2.r, p2.c) &&
        checkLine(r1, c1, p1.r, p1.c) &&
        checkLine(p1.r, p1.c, p2.r, p2.c) &&
        checkLine(p2.r, p2.c, r2, c2)
      ) {
        return [{ r: r1, c: c1 }, p1, p2, { r: r2, c: c2 }];
      }
    }

    for (let c = -1; c <= COLS; c++) {
      if (c === c1 || c === c2) continue;
      const p1 = { r: r1, c: c };
      const p2 = { r: r2, c: c };
      if (
        isEmpty(p1.r, p1.c) &&
        isEmpty(p2.r, p2.c) &&
        checkLine(r1, c1, p1.r, p1.c) &&
        checkLine(p1.r, p1.c, p2.r, p2.c) &&
        checkLine(p2.r, p2.c, r2, c2)
      ) {
        return [{ r: r1, c: c1 }, p1, p2, { r: r2, c: c2 }];
      }
    }

    return null;
  }

  // --- Отрисовка линии ---
  async function drawLine(path: Array<{ r: number; c: number }>): Promise<void> {
    // Ждем обновления DOM перед измерением координат
    await tick();
    if (!gridContainer || !gridEl) return;

    const containerRect = gridContainer.getBoundingClientRect();
    const gridRect = gridEl.getBoundingClientRect();

    // Для вычисления "виртуальных" точек (за пределами сетки)
    const baseCell = gridEl.querySelector(".cell:not(.matched)"); // Первая доступная ячейка для замера размеров
    if (!baseCell) return;

    const cellW = baseCell.offsetWidth;
    const cellH = baseCell.offsetHeight;
    const style = window.getComputedStyle(gridEl);
    const gap = parseFloat(style.gap) || 4;
    const offsetX = gridRect.left - containerRect.left;
    const offsetY = gridRect.top - containerRect.top;

    const points = path
      .map((p) => {
        let x: number, y: number;
        if (p.r >= 0 && p.r < ROWS && p.c >= 0 && p.c < COLS) {
          // Реальная ячейка
          const cell = gridEl.children[p.r * COLS + p.c];
          const rect = cell.getBoundingClientRect();
          x = rect.left - containerRect.left + rect.width / 2;
          y = rect.top - containerRect.top + rect.height / 2;
        } else {
          // Виртуальная точка
          const xRel = p.c * (cellW + gap) + cellW / 2;
          const yRel = p.r * (cellH + gap) + cellH / 2;
          x = offsetX + xRel;
          y = offsetY + yRel;
        }
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

    linePath = points;
    lineKey++; // Изменяем ключ, чтобы пересоздать элемент и запустить CSS анимацию

    return new Promise((resolve) => {
      setTimeout(() => {
        linePath = "";
        resolve();
      }, 350);
    });
  }

  // --- Modal Helpers ---
  function showModal(title: string, text: string, actions: Array<{ text: string; action: () => void; class?: string }>): void {
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }

  function showRules(): void {
    showModal("📖 Правила", `Соеди монстров:

🎯 Цель: Удалить все пары одинаковых монстров.

🔗 Соедини две одинаковые фигуры линией.

📐 Линия может иметь не более 2 поворотов (изгибов).

🚫 Линия не должна проходить через другие фигуры.

💡 Если ходов нет — игра сама перемешает доску.

💡 Кнопка 💡 покажет доступную пару (с перезарядкой).`, [
      { text: "Понятно", action: hideModal },
    ]);
  }

  function handleGiveUp(): void {
    if (integrated) {
      showModal("💀 Сдаюсь", "Вы сдались...", []);
      setTimeout(() => {
        hideModal();
        onLose?.();
      }, TIMEOUT);
    } else {
      showModal("Конец", "Попытайте удачу снова!", [
        { text: "ОК", action: initGame },
      ]);
    }
  }
</script>

<BodyWrapper>
  <GameHeader onRestart={initGame} onGiveUp={integrated ? handleGiveUp : undefined} showGiveUp={integrated} onShowRules={showRules} />
  <div id="game-container" bind:this={gridContainer}>
    <div
      id="grid"
      bind:this={gridEl}
      style="grid-template-columns: repeat({COLS}, 1fr); grid-template-rows: repeat({ROWS}, 1fr);"
    >
      {#each board as row, r (r)}
        {#each row as icon, c (c)}
          <div
            class="cell"
            class:selected={firstSelected?.r === r && firstSelected?.c === c}
            class:matched={matched[r][c]}
            class:shuffling={shuffling[`${r},${c}`]}
            class:hint-glow={hintCells.some((h) => h.r === r && h.c === c)}
            onclick={() => handleCellClick(r, c)}
            onkeydown={(e) => handleCellKeyDown(r, c, e)}
            role="button"
            tabindex="0"
          >
            {icon}
          </div>
        {/each}
      {/each}
    </div>
    <svg id="line-layer">
      {#key lineKey}
        {#if linePath}
          <polyline
            points={linePath}
            class="connection-line"
            vector-effect="non-scaling-stroke"
          />
        {/if}
      {/key}
    </svg>
  </div>
  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="tiles-counter">Осталось: <strong>{remainingCount}</strong></span>
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
  </GameFooter>
  <MinigameModal {modal} />
</BodyWrapper>

<style>
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
    overflow: visible;
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

  .cell {
    width: 11vmin;
    height: 11vmin;
    max-width: 60px;
    max-height: 60px;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(20px, 5vmin, 32px);
    cursor: pointer;
    border: 2px solid #5e5c8a;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
    transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), background-color 0.2s, box-shadow 0.2s;
    position: relative;
  }

  @media (min-width: 800px) {
    .cell {
      width: 60px;
      height: 60px;
    }
  }
  @media (max-width: 800px) {
    .cell {
      width: 35px;
      height: 35px;
    }
  }

  @media (max-width: 390px) {
    .cell {
      width: 28px;
      height: 28px;
      font-size: 16px;
    }
  }

  @media (max-width: 340px) {
    .cell {
      width: 20px;
      height: 20px;
      font-size: 10px;
    }
    #grid {
      gap: 3px;
    }
  }

  .cell:hover {
    transform: translateY(-4px);
    background: linear-gradient(135deg, #5e5c8a, #4e4c75);
    z-index: 10;
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.4);
  }

  .cell.selected {
    background: linear-gradient(135deg, #e94560, #c0394d);
    color: white;
    transform: scale(1.1) translateY(-2px);
    box-shadow: 0 0 20px rgba(233, 69, 96, 0.8);
    z-index: 20;
    border-color: #ff9f43;
  }

  .cell.matched {
    visibility: hidden;
    opacity: 0;
    pointer-events: none;
  }

  .cell.shuffling {
    animation: shake 0.4s ease-in-out;
    filter: brightness(1.5);
    border-color: rgba(255, 255, 255, 0.5);
  }

  .cell.hint-glow {
    animation: pulse-hint 1s infinite;
    border-color: #ffd700;
    box-shadow: 0 0 15px #ffd700, inset 0 0 10px #ffd700;
    z-index: 15;
    filter: brightness(1.3);
  }

  @keyframes shake {
    0%, 100% { transform: translate(0, 0) rotate(0); }
    25% { transform: translate(-3px, 3px) rotate(-3deg); }
    50% { transform: translate(3px, -3px) rotate(3deg); }
    75% { transform: translate(-3px, -3px) rotate(-3deg); }
  }

  @keyframes pulse-hint {
    0% { transform: scale(1); }
    50% { transform: scale(1.15); }
    100% { transform: scale(1); }
  }

  #line-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 5;
    overflow: visible;
  }

  .connection-line {
    stroke: #ff9f43;
    stroke-width: 6px;
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0 0 5px #ff9f43);
    stroke-dasharray: 1000;
    stroke-dashoffset: 1000;
    animation: dash 0.3s ease-out forwards;
  }

  @keyframes dash {
    to { stroke-dashoffset: 0; }
  }

  .footer-stats {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .tiles-counter {
    font-size: 0.9rem;
    color: #ececec;
  }

  .tiles-counter strong {
    color: #ff9f43;
    font-size: 1.1rem;
  }

  .btn {
    padding: 6px 12px;
    font-size: 1.2rem;
    background: linear-gradient(135deg, #e94560, #c0394d);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.2s, filter 0.2s;
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
</style>
