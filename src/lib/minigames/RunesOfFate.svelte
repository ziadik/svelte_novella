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

  type Rune = '🛡️' | '⚔️' | '🔮' | null;
  
  const RUNES: Rune[] = ['🛡️', '⚔️', '🔮'];
  const WIN_MAP: Record<string, Rune> = {
    '🛡️⚔️': '🛡️',   // Щит побеждает меч
    '⚔️🔮': '⚔️',   // Меч побеждает магию
    '🔮🛡️': '🔮',   // Магия побеждает щит
  };

  let playerChoice = $state<Rune>(null);
  let computerChoice = $state<Rune>(null);
  let playerScore = $state(0);
  let computerScore = $state(0);
  let round = $state(0);
  let maxRounds = $state(5);
  let isAnimating = $state(false);
  let resultMessage = $state('');
  let gameOver = $state(false);

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  function computerSelect(): Rune {
    const randomIndex = Math.floor(Math.random() * RUNES.length);
    return RUNES[randomIndex];
  }

  function determineWinner(player: Rune, computer: Rune): 'player' | 'computer' | 'tie' {
    if (player === computer) return 'tie';
    
    const key = `${player}${computer}`;
    return WIN_MAP[key] === player ? 'player' : 'computer';
  }

  async function handleRuneClick(rune: Rune) {
    if (isAnimating || gameOver || round >= maxRounds) return;

    isAnimating = true;
    playerChoice = rune;
    
    // Анимация "выбора компьютера"
    computerChoice = null;
    resultMessage = 'Дух выбирает...';
    
    await new Promise(resolve => setTimeout(resolve, 800));
    
    computerChoice = computerSelect();
    
    const winner = determineWinner(playerChoice, computerChoice);
    
    if (winner === 'player') {
      playerScore++;
      resultMessage = 'Победа! Силы света с тобой!';
    } else if (winner === 'computer') {
      computerScore++;
      resultMessage = 'Поражение... Тьма наступает';
    } else {
      resultMessage = 'Ничья. Силы уравновешены';
    }
    
    round++;
    
    if (round >= maxRounds) {
      gameOver = true;
      if (playerScore > computerScore) {
        if (integrated) {
          setTimeout(() => onWin?.(), 1000);
        } else {
          showModal("🎉 Победа!", `Ты победил духа ${playerScore}:${computerScore}!`, [
            { text: "Играть снова", action: resetGame },
          ]);
        }
      } else {
        if (integrated) {
          setTimeout(() => onLose?.(), 1000);
        } else {
          showModal("💀 Поражение", `Дух оказался сильнее ${computerScore}:${playerScore}`, [
            { text: "Новая битва", action: resetGame },
          ]);
        }
      }
    }
    
    isAnimating = false;
  }

  function resetGame() {
    playerChoice = null;
    computerChoice = null;
    playerScore = 0;
    computerScore = 0;
    round = 0;
    gameOver = false;
    resultMessage = '';
    hideModal();
  }

  function showModal(title: string, text: string, actions: Array<{ text: string; action: () => void; class?: string }>): void {
    modal = { show: true, title, text, actions };
  }

  function hideModal(): void {
    modal.show = false;
  }

  function showRules(): void {
    showModal("📖 Правила", `Руны Судьбы:

🛡️ Щит побеждает ⚔️ Меч
⚔️ Меч побеждает 🔮 Магию
🔮 Магия побеждает 🛡️ Щит

Первый, кто наберет 3 победы из 5 раундов, станет властелином судьбы!`, [
      { text: "Понятно", action: hideModal },
    ]);
  }
</script>

<BodyWrapper>
  <GameHeader
    onRestart={resetGame}
    onGiveUp={integrated ? () => onLose?.() : undefined}
    showGiveUp={integrated}
    onShowRules={showRules}
  />

  <div id="game-container">
    <div class="score-board">
      <div class="score player">
        <span class="label">Ты</span>
        <span class="value">{playerScore}</span>
      </div>
      <div class="vs">VS</div>
      <div class="score computer">
        <span class="label">Дух</span>
        <span class="value">{computerScore}</span>
      </div>
    </div>

    <div class="battle-area">
      <div class="choice-display player-choice">
        <div class="rune-icon">{playerChoice || '❓'}</div>
        <div class="choice-label">Твой выбор</div>
      </div>
      
      <div class="versus-symbol">⚡</div>
      
      <div class="choice-display computer-choice">
        <div class="rune-icon">{computerChoice || '❓'}</div>
        <div class="choice-label">Выбор духа</div>
      </div>
    </div>

    <div class="result-message">{resultMessage}</div>

    <div class="rune-panel">
      {#each RUNES as rune}
        <button
          class="rune-btn"
          onclick={() => handleRuneClick(rune)}
          disabled={isAnimating || gameOver || round >= maxRounds}
        >
          {rune}
        </button>
      {/each}
    </div>

    <div class="round-indicator">
      Раунд: {round} / {maxRounds}
    </div>
  </div>

  <GameFooter {rewardItem} {items} {bucketName} />

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

  .score-board {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
    padding: 10px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 50px;
  }

  .score {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 10px 20px;
  }

  .score.player {
    color: #00b894;
  }

  .score.computer {
    color: #e94560;
  }

  .label {
    font-size: 0.9rem;
    opacity: 0.8;
  }

  .value {
    font-size: 2.5rem;
    font-weight: bold;
    line-height: 1;
  }

  .vs {
    font-size: 1.5rem;
    color: #fdcb6e;
    text-shadow: 0 0 10px rgba(253, 203, 110, 0.5);
  }

  .battle-area {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .choice-display {
    text-align: center;
    flex: 1;
  }

  .rune-icon {
    font-size: 4rem;
    margin-bottom: 10px;
    animation: float 3s ease-in-out infinite;
  }

  .player-choice .rune-icon {
    color: #00b894;
    filter: drop-shadow(0 0 10px #00b894);
  }

  .computer-choice .rune-icon {
    color: #e94560;
    filter: drop-shadow(0 0 10px #e94560);
  }

  .choice-label {
    font-size: 0.9rem;
    color: #a0a0a0;
  }

  .versus-symbol {
    font-size: 2rem;
    margin: 0 20px;
    color: #fdcb6e;
    animation: pulse 1s ease-in-out infinite;
  }

  .result-message {
    text-align: center;
    margin: 20px 0;
    padding: 15px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 10px;
    font-size: 1.1rem;
    color: #ff9f43;
    min-height: 60px;
  }

  .rune-panel {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin: 20px 0;
  }

  .rune-btn {
    width: 80px;
    height: 80px;
    font-size: 2.5rem;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border: 2px solid #5e5c8a;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.3s;
    box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3);
  }

  .rune-btn:hover:not(:disabled) {
    transform: translateY(-4px) scale(1.1);
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.4);
    filter: brightness(1.2);
  }

  .rune-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .round-indicator {
    text-align: center;
    margin-top: 20px;
    padding: 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    font-size: 0.9rem;
    color: #a0a0a0;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }
</style>