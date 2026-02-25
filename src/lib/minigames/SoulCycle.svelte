<script lang="ts">
  import { onMount } from "svelte";
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
  } = $props<MinigameProps>();

  const SYMBOLS = ['🔥', '💧', '🌪️', '🌑'];
  const COLORS = ['#e94560', '#0984e3', '#fdcb6e', '#6c5ce7'];
  const TIMEOUT = 1000;
  const WIN_ROUND = 5;
  
  let sequence = $state<string[]>([]);
  let playerSequence = $state<string[]>([]);
  let round = $state(0);
  let isPlaying = $state(false);
  let activeIndex = $state(-1);
  let gameOver = $state(false);
  let gameWon = $state(false);
  let isPlayerTurn = $state(false);

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  function startNewRound() {
    isPlaying = true;
    isPlayerTurn = false;
    playerSequence = [];
    const newSymbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    sequence = [...sequence, newSymbol];
    playSequence();
  }

  async function playSequence() {
    await new Promise(resolve => setTimeout(resolve, 500));
    for (let i = 0; i < sequence.length; i++) {
      activeIndex = SYMBOLS.indexOf(sequence[i]);
      await new Promise(resolve => setTimeout(resolve, 500));
      activeIndex = -1;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    isPlaying = false;
    isPlayerTurn = true;
  }

  function handleSymbolClick(index: number) {
    if (isPlaying || !isPlayerTurn || gameOver) return;

    const clickedSymbol = SYMBOLS[index];
    const expectedSymbol = sequence[playerSequence.length];

    if (clickedSymbol !== expectedSymbol) {
      handleLose();
      return;
    }

    playerSequence = [...playerSequence, clickedSymbol];

    if (playerSequence.length === sequence.length) {
      round++;
      if (round >= WIN_ROUND) {
        handleWin();
      } else {
        isPlayerTurn = false;
        setTimeout(startNewRound, 1000);
      }
    }
  }

  function handleWin() {
    gameOver = true;
    gameWon = true;
    if (integrated) {
      showModal("🎉 Победа!", `Вы прошли ${WIN_ROUND} раундов!`, []);
      setTimeout(() => { hideModal(); onWin?.(); }, TIMEOUT);
    } else {
      showModal("🎉 Победа!", `Вы прошли ${WIN_ROUND} раундов!`, [
        { text: "Играть снова", action: initGame },
      ]);
    }
  }

  function handleLose() {
    gameOver = true;
    gameWon = false;
    if (integrated) {
      showModal("💥 Ошибка!", "Вы нажали неправильный символ!", []);
      setTimeout(() => { hideModal(); onLose?.(); }, TIMEOUT);
    } else {
      showModal("💥 Ошибка!", "Вы нажали неправильный символ!", [
        { text: "Попробовать снова", action: initGame },
      ]);
    }
  }

  function initGame() {
    sequence = [];
    playerSequence = [];
    round = 0;
    gameOver = false;
    gameWon = false;
    isPlaying = false;
    isPlayerTurn = false;
    activeIndex = -1;
    hideModal();
    startNewRound();
  }

  function handleGiveUp(): void {
    gameOver = true;
    if (integrated) {
      showModal("💀 Сдаюсь", "Вы сдались...", []);
      setTimeout(() => { hideModal(); onLose?.(); }, TIMEOUT);
    } else {
      showModal("Конец", "Попробуйте ещё раз!", [
        { text: "Новая игра", action: initGame },
      ]);
    }
  }

  function showModal(title: string, text: string, actions: Array<{ text: string; action: () => void; class?: string }>): void {
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }

  function showRules(): void {
    showModal("📖 Правила", `Цикл душ:

🎯 Цель: Пройди ${WIN_ROUND} раундов.

🔴 Компьютер показывает последовательность символов.

🟢 Повтори последовательность в том же порядке.

⚠️ Одна ошибка — и игра окончена!`, [
      { text: "Понятно", action: hideModal },
    ]);
  }

  onMount(() => { initGame(); });
</script>

<BodyWrapper>
  <GameHeader
    onRestart={initGame}
    onGiveUp={integrated ? handleGiveUp : undefined}
    showGiveUp={integrated}
    onShowRules={showRules}
  />

  <div id="game-container">
    <div class="status">
      {#if isPlaying}
        <span class="watching">👀 Смотри...</span>
      {:else if isPlayerTurn}
        <span class="playing">🎮 Повторяй!</span>
      {:else if gameOver}
        <span class:won={gameWon} class:lost={!gameWon}>
          {gameWon ? '🎉 Победа!' : '💥 Проигрыш'}
        </span>
      {/if}
    </div>

    <div class="round-info">Раунд: <strong>{round}/{WIN_ROUND}</strong></div>

    <div class="symbols">
      {#each SYMBOLS as symbol, i}
        <button
          type="button"
          class="symbol"
          style="background-color: {COLORS[i]}; filter: {activeIndex === i ? 'brightness(1.5)' : 'none'}; transform: {activeIndex === i ? 'scale(1.1)' : 'scale(1)'};"
          onclick={() => handleSymbolClick(i)}
          disabled={isPlaying || !isPlayerTurn || gameOver}
        >
          {symbol}
        </button>
      {/each}
    </div>
  </div>

  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="round-display">Раунд: <strong>{round}</strong></span>
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
    overflow: hidden;
    margin-bottom: 15px;
    min-height: 180px;
  }

  .status { 
    position: absolute;
    top: 10px;
    font-size: 1.1rem; 
    min-height: 24px;
    z-index: 10;
  }
  .watching { color: #fdcb6e; }
  .playing { color: #00b894; }
  .won { color: #00b894; }
  .lost { color: #e94560; }
  .round-info { font-size: 1rem; color: #ececec; margin-bottom: 15px; }
  .round-info strong { color: #ff9f43; }

  .symbols { 
    display: grid; 
    grid-template-columns: repeat(2, 1fr); 
    gap: 10px;
    position: relative;
    z-index: 1;
  }

  .symbol {
    width: 80px; height: 80px;
    font-size: 2.5rem;
    border: none; border-radius: 12px;
    cursor: pointer;
    transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
    display: flex; align-items: center; justify-content: center;
    font-family: inherit;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border: 2px solid #5e5c8a;
  }

  .symbol:hover:not(:disabled) {
    transform: translateY(-4px);
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.4);
    border-color: #e94560;
  }

  .symbol:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.4);
  }

  .symbol:disabled { 
    opacity: 0.6; 
    cursor: not-allowed; 
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

  .round-display { font-size: 0.9rem; color: #ececec; }
  .round-display strong { color: #ff9f43; font-size: 1.1rem; }

  @media (max-width: 800px) {
    .symbol {
      width: 65px;
      height: 65px;
      font-size: 2rem;
    }
  }

  @media (max-width: 400px) {
    .symbol {
      width: 55px;
      height: 55px;
      font-size: 1.6rem;
    }
  }

  @media (max-width: 380px) {
    .footer-stats {
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
    }
  }
</style>