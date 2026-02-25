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

  const CRYSTALS = [
    { color: '#e94560', name: 'Рубин', icon: '🔴' },
    { color: '#0984e3', name: 'Сапфир', icon: '🔵' },
    { color: '#00b894', name: 'Изумруд', icon: '🟢' },
    { color: '#fdcb6e', name: 'Топаз', icon: '🟡' },
  ];

  const TIMEOUT = 1000;
  const WIN_ROUNDS = 10;

  let sequence = $state<number[]>([]);
  let playerSequence = $state<number[]>([]);
  let round = $state(1);
  let isPlaying = $state(false);
  let activeCrystal = $state<number | null>(null);
  let gameOver = $state(false);
  let highScore = $state(0);

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  function startNewGame() {
    sequence = [];
    playerSequence = [];
    round = 1;
    gameOver = false;
    addToSequence();
  }

  function addToSequence() {
    const randomCrystal = Math.floor(Math.random() * CRYSTALS.length);
    sequence = [...sequence, randomCrystal];
    playSequence();
  }

  async function playSequence() {
    isPlaying = true;
    playerSequence = [];
    
    for (let i = 0; i < sequence.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 300));
      activeCrystal = sequence[i];
      playSound(sequence[i]);
      await new Promise(resolve => setTimeout(resolve, 500));
      activeCrystal = null;
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    isPlaying = false;
  }

  function handleCrystalClick(index: number) {
    if (isPlaying || gameOver) return;

    activeCrystal = index;
    playSound(index);
    
    setTimeout(() => {
      activeCrystal = null;
    }, 300);

    const expectedIndex = playerSequence.length;
    
    if (index !== sequence[expectedIndex]) {
      gameOver = true;
      if (round - 1 > highScore) {
        highScore = round - 1;
      }
      
      if (integrated) {
        showModal("💀 Поражение", "Время распалось...", []);
        setTimeout(() => { hideModal(); onLose?.(); }, TIMEOUT);
      } else {
        showModal("💀 Время распалось", `Раунд ${round - 1}`, [
          { text: "Начать заново", action: startNewGame },
        ]);
      }
      return;
    }

    playerSequence = [...playerSequence, index];

    if (playerSequence.length === sequence.length) {
      round++;
      if (round > highScore) {
        highScore = round;
      }
      
      if (round > WIN_ROUNDS) {
        gameOver = true;
        if (integrated) {
          showModal("🎉 Победа!", "Время под контролем!", []);
          setTimeout(() => { hideModal(); onWin?.(); }, TIMEOUT);
        } else {
          showModal("🎉 Победа!", "Ты покорил время!", [
            { text: "Играть снова", action: startNewGame },
          ]);
        }
        return;
      }
      
      setTimeout(() => {
        addToSequence();
      }, 1000);
    }
  }

  function playSound(index: number) {
    console.log(`Play sound for crystal ${index}`);
  }

  function getButtonStyle(index: number): string {
    const crystal = CRYSTALS[index];
    const isActive = activeCrystal === index;
    const boxShadow = isActive 
      ? `0 0 50px ${crystal.color}, 0 0 100px ${crystal.color}`
      : `0 8px 0 ${crystal.color}`;
    return `background-color: ${crystal.color}; box-shadow: ${boxShadow}; transform: ${isActive ? 'translateY(2px)' : 'none'};`;
  }

  function adjustBrightness(hex: string, percent: number): string {
    return hex;
  }

  function showModal(title: string, text: string, actions: Array<{ text: string; action: () => void; class?: string }>): void {
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }

  function showRules(): void {
    showModal("📖 Правила", `Кристаллы времени:

🎯 Цель: Повтори последовательность кристаллов.

🔮 Смотри внимательно на последовательность.

👆 Кликай кристаллы в том же порядке.

💀 Если ошибся - игра окончена.

✨ Пройди 10 раундов для победы!`, [
      { text: "Понятно", action: hideModal },
    ]);
  }

  onMount(() => {
    startNewGame();
  });
</script>

<BodyWrapper>
  <GameHeader
    onRestart={startNewGame}
    onGiveUp={integrated ? () => { gameOver = true; showModal("💀 Сдаюсь", "Вы сдались...", []); setTimeout(() => { hideModal(); onLose?.(); }, TIMEOUT); } : undefined}
    showGiveUp={integrated}
    onShowRules={showRules}
  />

  <div id="game-container">
    <div class="stats-panel">
      <div class="round">Раунд: <strong>{round}</strong></div>
      <div class="high-score">Рекорд: <strong>{highScore}</strong></div>
    </div>

    <div class="crystals-grid">
      {#each CRYSTALS as crystal, i}
        <button
          type="button"
          class="crystal-btn"
          style={getButtonStyle(i)}
          onclick={() => handleCrystalClick(i)}
          disabled={isPlaying || gameOver}
        >
          <span class="crystal-icon">{crystal.icon}</span>
          <span class="crystal-name">{crystal.name}</span>
        </button>
      {/each}
    </div>

    <div class="status-area">
      {#if gameOver}
        <div class="game-over-message">
          <span>💀 Время распалось... Раунд {round - 1}</span>
        </div>
      {:else if isPlaying}
        <div class="status-message">✨ Кристаллы показывают путь... ✨</div>
      {:else}
        <div class="status-message">👆 Повтори последовательность</div>
      {/if}
    </div>

    {#if sequence.length > 0 && !gameOver && !isPlaying}
      <div class="progress">
        Прогресс: {playerSequence.length} / {sequence.length}
      </div>
    {/if}
  </div>

  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="target-info">Раунд: <strong>{round}/{WIN_ROUNDS}</strong></span>
    </div>
  </GameFooter>

  <MinigameModal {modal} />
</BodyWrapper>

<style>
  #game-container {
    background-color: rgba(0, 0, 0, 0.5);
    padding: 20px;
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin-bottom: 15px;
  }

  .stats-panel {
    display: flex;
    justify-content: space-between;
    padding: 15px;
    background: #2a2a40;
    border-radius: 10px;
    margin-bottom: 30px;
    border: 1px solid #5e5c8a;
  }

  .round, .high-score {
    font-size: 1.2rem;
    color: #a0a0a0;
  }

  .round strong {
    color: #ff9f43;
    font-size: 1.8rem;
  }

  .high-score strong {
    color: #e94560;
    font-size: 1.8rem;
  }

  .crystals-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin: 30px 0;
  }

  .crystal-btn {
    aspect-ratio: 1;
    border: none;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.1s;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.5);
    position: relative;
    overflow: hidden;
    font-family: inherit;
  }

  .crystal-btn::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .crystal-btn:active::before {
    opacity: 1;
  }

  .crystal-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 0 rgba(0, 0, 0, 0.5);
  }

  .crystal-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }

  .crystal-icon {
    font-size: 3rem;
    filter: drop-shadow(0 4px 2px rgba(0, 0, 0, 0.5));
  }

  .crystal-name {
    color: white;
    font-size: 1rem;
    text-shadow: 0 2px 2px black;
  }

  .status-area {
    text-align: center;
    margin: 20px 0;
    min-height: 80px;
  }

  .status-message {
    padding: 15px;
    background: #2a2a40;
    border-radius: 10px;
    color: #a0a0a0;
    font-size: 1.1rem;
  }

  .game-over-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    padding: 20px;
    background: #2a2a40;
    border-radius: 10px;
    color: #e94560;
    font-size: 1.3rem;
    border: 1px solid #e94560;
  }

  .progress {
    text-align: center;
    padding: 10px;
    background: #3d3b5c;
    border-radius: 20px;
    color: #ff9f43;
    font-size: 1.1rem;
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

  .target-info {
    font-size: 0.9rem;
    color: #ececec;
  }

  .target-info strong {
    color: #ff9f43;
    font-size: 1.1rem;
  }

  @media (max-width: 500px) {
    .crystal-icon {
      font-size: 2rem;
    }
    
    .crystal-name {
      font-size: 0.8rem;
    }
  }
</style>