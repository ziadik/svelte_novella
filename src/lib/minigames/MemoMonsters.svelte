<script lang="ts">
  import { onMount } from "svelte";
  import BodyWrapper from './components/BodyWrapper.svelte';
  import GameHeader from './components/GameHeader.svelte';
  import GameFooter from './components/GameFooter.svelte';
  import MinigameModal from './components/MinigameModal.svelte';
  import type { MinigameProps, ModalState } from './types';

  // --- Props ---
  let {
    integrated = false,
    onWin,
    onLose,
    rewardItem = null,
    items = [],
    bucketName = "dracula",
  } = $props<MinigameProps>();

  // --- Настройки ---
  const ROWS = 6;
  const COLS = 6;
  const HINT_COOLDOWN_TIME = 5;

  const ICONS = [
    "🦄", "🧙", "👻", "💀", "🔥", "🕷️",
    "🕸️", "🧟", "‍♀️", "⚰️", "🐸", "🦴",
    "🔮", "🧪", "👹", "🌜", "🍭", "💗",
  ];

  // --- State (Runes) ---
  let board = $state<string[][]>([]);
  let matched = $state<boolean[][]>([]);
  let flipped = $state<boolean[][]>([]);
  let hintCells = $state<Array<{ r: number; c: number }>>([]);

  let firstSelected = $state<{ r: number; c: number } | null>(null);
  let isProcessing = $state(false);
  let isGameOver = $state(false);
  let hintCooldown = $state(0);

  let modal = $state<ModalState>({
    show: false,
    title: "",
    text: "",
    actions: [],
  });

  onMount(() => {
    initGame();
  });

  // --- Вычисляемые свойства ---
  function getRemainingCount(): number {
    let count = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (!matched[r]?.[c]) count++;
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
    let deck: string[] = [];
    selectedIcons.forEach((icon) => deck.push(icon, icon));
    deck.sort(() => Math.random() - 0.5);

    // Заполнение сетки
    let index = 0;
    for (let r = 0; r < ROWS; r++) {
      let rowBoard: string[] = [];
      let rowMatched: boolean[] = [];
      let rowFlipped: boolean[] = [];
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

  // --- Логика игры ---
  async function handleCellClick(r: number, c: number): Promise<void> {
    if (isProcessing || matched[r]?.[c] || isGameOver) return;

    if (firstSelected && firstSelected.r === r && firstSelected.c === c) {
      flipped[r][c] = false;
      firstSelected = null;
      return;
    }

    if (flipped[r]?.[c]) return;

    if (hintCells.length > 0) hintCells = [];

    flipped[r][c] = true;

    if (!firstSelected) {
      firstSelected = { r, c };
    } else {
      isProcessing = true;
      const second = { r, c };
      const icon1 = board[firstSelected.r][firstSelected.c];
      const icon2 = board[second.r][second.c];

      if (icon1 === icon2) {
        setTimeout(() => {
          matched[firstSelected!.r][firstSelected!.c] = true;
          matched[second.r][second.c] = true;
          flipped[firstSelected!.r][firstSelected!.c] = false;
          flipped[second.r][second.c] = false;

          firstSelected = null;
          isProcessing = false;
          startHintCooldown();
          checkGameStatus();
        }, 600);
      } else {
        setTimeout(() => {
          flipped[firstSelected!.r][firstSelected!.c] = false;
          flipped[second.r][second.c] = false;
          firstSelected = null;
          isProcessing = false;
        }, 1000);
      }
    }
  }

  // --- Подсказки ---
  function startHintCooldown(): void {
    hintCooldown = HINT_COOLDOWN_TIME;
    const timer = setInterval(() => {
      hintCooldown--;
      if (hintCooldown <= 0) clearInterval(timer);
    }, 1000);
  }

  function showHint(): void {
    if (isProcessing || isGameOver || !isHintAvailable) return;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (matched[r]?.[c] || flipped[r]?.[c]) continue;

        let icon = board[r][c];
        for (let r2 = 0; r2 < ROWS; r2++) {
          for (let c2 = 0; c2 < COLS; c2++) {
            if (r === r2 && c === c2) continue;
            if (matched[r2]?.[c2] || flipped[r2]?.[c2]) continue;

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
  function checkGameStatus(): void {
    if (remainingCount === 0) {
      isGameOver = true;
      if (integrated) {
        onWin?.();
      } else {
        showModal("🎉 Победа!", "Все монстры пойманы!", [
          { text: "Играть снова", action: initGame },
        ]);
      }
    }
  }

  function handleGiveUp(): void {
    if (integrated) {
      onLose?.();
    } else {
      showModal("Конец", "Попытайте удачу снова!", [
        { text: "ОК", action: initGame },
      ]);
    }
  }

  // --- Modal Helpers ---
  function showModal(title: string, text: string, actions: Array<{ text: string; action: () => void; class?: string }>): void {
    if (integrated) return;
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }
</script>

<BodyWrapper>
  <GameHeader
    onRestart={initGame}
    onGiveUp={integrated ? handleGiveUp : undefined}
    showGiveUp={integrated}
  />

  <div id="game-container">
    <div id="grid" style="grid-template-columns: repeat({COLS}, 1fr); grid-template-rows: repeat({ROWS}, 1fr);">
      {#each board as row, r (r)}
        {#each row as icon, c (c)}
          <div
            class="cell"
            class:flipped={flipped[r]?.[c]}
            class:matched={matched[r]?.[c]}
            class:selected={firstSelected?.r === r && firstSelected?.c === c}
            class:hint-glow={hintCells.some((h) => h.r === r && h.c === c)}
            onclick={() => handleCellClick(r, c)}
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
  .body-wrapper {
    --cell-size: 11vmin;
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

  .cell {
    width: var(--cell-size);
    height: var(--cell-size);
    max-width: 60px;
    max-height: 60px;
    perspective: 1000px;
    cursor: pointer;
    border-radius: 8px;
    background: transparent;
    border: none;
    box-shadow: none;
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
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
  }

  .cell.flipped .card-inner {
    transform: rotateY(180deg);
  }

  .card-front,
  .card-back {
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

  .card-front {
    background-color: #3d3b5c;
    color: white;
    transform: rotateY(180deg);
    font-size: clamp(20px, 5vmin, 32px);
    border: 2px solid rgba(255, 255, 255, 0.1);
  }

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

  .cell.hint-glow .card-inner {
    box-shadow: 0 0 15px #ffd700;
    border: 1px solid #ffd700;
  }

  @keyframes pulse-hint {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
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
    font-size: 1rem;
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

  @media (max-width: 380px) {
    .footer-stats {
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
    }

    .tiles-counter {
      order: 1;
    }

    .btn {
      order: 2;
    }
  }
</style>

