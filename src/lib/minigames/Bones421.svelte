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

  const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  const TIMEOUT = 1000;
  const WIN_COMBO = '124';
  
  let dice = $state([1, 1, 1]);
  let rollsLeft = $state(3);
  let locked = $state([false, false, false]);
  let gameOver = $state(false);
  let gameWon = $state(false);
  let message = $state('Брось кости!');

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  function rollDice() {
    if (rollsLeft <= 0 || gameOver) return;

    for (let i = 0; i < dice.length; i++) {
      if (!locked[i]) {
        dice[i] = Math.floor(Math.random() * 6) + 1;
      }
    }
    rollsLeft--;
    checkScore();
  }

  function checkScore() {
    const sorted = [...dice].sort().join('');
    if (sorted === WIN_COMBO) {
      message = 'Победа! Снято проклятие!';
      gameOver = true;
      gameWon = true;
      handleWin();
    } else if (rollsLeft === 0) {
      message = 'Попытки кончились...';
      gameOver = true;
      gameWon = false;
      handleLose();
    } else {
      message = `Осталось бросков: ${rollsLeft}`;
    }
  }

  function handleWin() {
    if (integrated) {
      showModal("🎉 Победа!", "Выпало 4-2-1! Проклятие снято!", []);
      setTimeout(() => { hideModal(); onWin?.(); }, TIMEOUT);
    } else {
      showModal("🎉 Победа!", "Выпало 4-2-1! Проклятие снято!", [
        { text: "Играть снова", action: initGame },
      ]);
    }
  }

  function handleLose() {
    if (integrated) {
      showModal("💥 Поражение", "Не удалось выбросить 4-2-1...", []);
      setTimeout(() => { hideModal(); onLose?.(); }, TIMEOUT);
    } else {
      showModal("💥 Поражение", "Не удалось выбросить 4-2-1...", [
        { text: "Попробовать снова", action: initGame },
      ]);
    }
  }

  function toggleLock(index: number) {
    if (gameOver || rollsLeft === 3) return;
    locked[index] = !locked[index];
  }

  function initGame() {
    dice = [1, 1, 1];
    rollsLeft = 3;
    locked = [false, false, false];
    gameOver = false;
    gameWon = false;
    message = 'Брось кости!';
    hideModal();
  }

  function handleGiveUp(): void {
    if (!gameOver) {
      gameOver = true;
      gameWon = false;
      if (integrated) {
        showModal("💀 Сдаюсь", "Вы сдались...", []);
        setTimeout(() => { hideModal(); onLose?.(); }, TIMEOUT);
      } else {
        showModal("Конец", "Попробуйте ещё раз!", [
          { text: "Новая игра", action: initGame },
        ]);
      }
    }
  }

  function showModal(title: string, text: string, actions: Array<{ text: string; action: () => void; class?: string }>): void {
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }

  function showRules(): void {
    showModal("📖 Правила", `Кости 4-2-1:

🎯 Цель: Выбрось комбинацию 4-2-1.

🎲 У тебя есть 3 броска.

🔒 После первого броска можно зафиксировать кубики.

💡 Комбинация 4-2-1 (в любом порядке) — победа!`, [
      { text: "Понятно", action: hideModal },
    ]);
  }

  onMount(() => { initGame(); });
</script>

<BodyWrapper>
  <GameHeader
    onRestart={initGame}
    onGiveUp={integrated ? handleGiveUp : undefined}
    showGiveUp={integrated && !gameOver}
    onShowRules={showRules}
  />

  <div id="game-container">
    <div class="message">{message}</div>
    
    <div class="dice-area">
      {#each dice as die, i}
        <button
          type="button"
          class="die"
          class:locked={locked[i]}
          onclick={() => toggleLock(i)}
          disabled={gameOver || rollsLeft === 3}
        >
          <span class="die-face">{DICE_FACES[die - 1]}</span>
          <span class="die-number">{die}</span>
        </button>
      {/each}
    </div>

    <button 
      type="button" 
      class="roll-btn"
      onclick={rollDice}
      disabled={rollsLeft === 0 || gameOver}
    >
      🎲 Бросить ({rollsLeft})
    </button>

    <div class="target">
      Цель: <span class="target-combo">4-2-1</span>
    </div>
  </div>

  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="rolls-info">Бросков: <strong>{rollsLeft}</strong></span>
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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    max-width: 100%;
    overflow: hidden;
    margin-bottom: 15px;
    min-height: 180px;
    gap: 15px;
  }

  .message {
    font-size: 1.1rem;
    color: #ececec;
    text-align: center;
  }

  .dice-area {
    display: flex;
    gap: 15px;
    justify-content: center;
  }

  .die {
    width: 80px;
    height: 80px;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border: 3px solid #5e5c8a;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-family: inherit;
    position: relative;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
  }

  .die:hover:not(:disabled) {
    transform: translateY(-4px);
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.4);
    border-color: #e94560;
  }

  .die:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.4);
  }

  .die:disabled {
    cursor: not-allowed;
  }

  .die.locked {
    border-color: #e94560;
    box-shadow: 0 0 15px rgba(233, 69, 96, 0.5);
  }

  .die-face {
    font-size: 2.5rem;
    line-height: 1;
  }

  .die-number {
    font-size: 0.8rem;
    color: #aaa;
    margin-top: 2px;
  }

  .roll-btn {
    padding: 12px 24px;
    font-size: 1.1rem;
    background: linear-gradient(135deg, #e94560, #c0394d);
    color: white;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.2s, filter 0.2s;
    box-shadow: 0 3px 8px rgba(233, 69, 96, 0.4);
    font-family: inherit;
  }

  .roll-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 5px 12px rgba(233, 69, 96, 0.6);
    filter: brightness(1.1);
  }

  .roll-btn:active:not(:disabled) {
    transform: translateY(1px);
  }

  .roll-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .target {
    font-size: 0.9rem;
    color: #aaa;
  }

  .target-combo {
    color: #ff9f43;
    font-weight: bold;
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

  .rolls-info {
    font-size: 0.9rem;
    color: #ececec;
  }

  .rolls-info strong {
    color: #ff9f43;
    font-size: 1.1rem;
  }

  @media (max-width: 800px) {
    .die {
      width: 65px;
      height: 65px;
    }
    .die-face {
      font-size: 2rem;
    }
  }

  @media (max-width: 400px) {
    .die {
      width: 55px;
      height: 55px;
    }
    .die-face {
      font-size: 1.6rem;
    }
    .dice-area {
      gap: 10px;
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
