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

  let question = $state('');
  let correctAnswer = $state(0);
  let options = $state<number[]>([]);
  let score = $state(0);
  let timeLeft = $state(30);
  let gameActive = $state(false);
  let timerInterval: ReturnType<typeof setInterval> | null = null;
  
  const TIMEOUT = 1000;
  const WIN_SCORE = 10;

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  onMount(() => {
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  });

  function generateQuestion() {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const operations = ['+', '-', '*'];
    const op = operations[Math.floor(Math.random() * operations.length)];
    
    question = `${a} ${op} ${b}`;
    correctAnswer = eval(question);
    
    let newOptions = [correctAnswer];
    while (newOptions.length < 4) {
      let fake = correctAnswer + (Math.floor(Math.random() * 7) - 3);
      if (!newOptions.includes(fake) && fake > 0) newOptions.push(fake);
    }
    options = newOptions.sort(() => Math.random() - 0.5);
  }

  function initGame() {
    if (timerInterval) clearInterval(timerInterval);
    gameActive = false;
    score = 0;
    timeLeft = 30;
    hideModal();
  }

  function startGame() {
    gameActive = true;
    score = 0;
    timeLeft = 30;
    generateQuestion();
    timerInterval = setInterval(() => {
      timeLeft--;
      if (timeLeft <= 0) {
        endGame();
      }
    }, 1000);
  }

  function endGame() {
    gameActive = false;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    if (score >= WIN_SCORE) {
      if (integrated) {
        showModal("🎉 Победа!", `Вы набрали ${score} очков!`, []);
        setTimeout(() => {
          hideModal();
          onWin?.();
        }, TIMEOUT);
      } else {
        showModal("🎉 Победа!", `Вы набрали ${score} очков!`, [
          { text: "Играть снова", action: initGame },
        ]);
      }
    } else {
      if (integrated) {
        showModal("💥 Время вышло!", `Вы набрали ${score} очков. Нужно ${WIN_SCORE}.`, []);
        setTimeout(() => {
          hideModal();
          onLose?.();
        }, TIMEOUT);
      } else {
        showModal("💥 Время вышло!", `Вы набрали ${score} очков. Нужно ${WIN_SCORE}.`, [
          { text: "Попробовать снова", action: initGame },
        ]);
      }
    }
  }

  function handleAnswer(selected: number) {
    if (!gameActive) return;
    if (selected === correctAnswer) {
      score++;
      if (score >= WIN_SCORE) {
        endGame();
      } else {
        generateQuestion();
      }
    } else {
      timeLeft = Math.max(0, timeLeft - 2);
    }
  }

  function handleGiveUp(): void {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    gameActive = false;
    if (integrated) {
      showModal("💀 Сдаюсь", "Вы сдались...", []);
      setTimeout(() => {
        hideModal();
        onLose?.();
      }, TIMEOUT);
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
    showModal("📖 Правила", `Шёпот пауков:

🎯 Цель: Набери ${WIN_SCORE} очков за 30 секунд.

🔢 Реши математический пример, выбрав правильный ответ из 4 вариантов.

⏱️ За неправильный ответ штраф -2 секунды.`, [
      { text: "Понятно", action: hideModal },
    ]);
  }
</script>

<BodyWrapper>
  <GameHeader
    onRestart={initGame}
    onGiveUp={integrated ? handleGiveUp : undefined}
    showGiveUp={integrated}
    onShowRules={showRules}
  />

  <div id="game-container">
    {#if gameActive}
      <div class="timer" class:warning={timeLeft <= 10}>⏱️ {timeLeft}s</div>
      <div class="score">Очки: <strong>{score}/{WIN_SCORE}</strong></div>
      <div class="question">{question} = ?</div>
      <div class="options">
        {#each options as opt}
          <button type="button" class="option-btn" onclick={() => handleAnswer(opt)}>
            {opt}
          </button>
        {/each}
      </div>
    {:else}
      <div class="start-screen">
        <div class="title">🕷️ Шёпот пауков</div>
        <div class="description">Реши {WIN_SCORE} примеров за 30 секунд</div>
        <button type="button" class="start-btn" onclick={startGame}>
          Начать испытание
        </button>
      </div>
    {/if}
  </div>

  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="score-display">Очки: <strong>{score}</strong></span>
      <span class="time-display">Время: <strong>{timeLeft}s</strong></span>
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
    min-height: 200px;
  }

  .timer {
    font-size: 1.5rem;
    color: #00b894;
    margin-bottom: 10px;
  }

  .timer.warning {
    color: #e94560;
    animation: pulse 0.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .score {
    font-size: 1.1rem;
    color: #ececec;
    margin-bottom: 15px;
  }

  .score strong {
    color: #ff9f43;
  }

  .question {
    font-size: 2.5rem;
    font-weight: bold;
    color: #ececec;
    margin-bottom: 20px;
  }

  .options {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    position: relative;
    z-index: 1;
    width: fit-content;
    height: fit-content;
  }

  .option-btn {
    width: 80px;
    height: 80px;
    font-size: 1.8rem;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    color: #ececec;
    border: 2px solid #5e5c8a;
    border-radius: 12px;
    cursor: pointer;
    transition: transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.2s;
    font-family: inherit;
  }

  .option-btn:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 0 rgba(0, 0, 0, 0.4);
    border-color: #e94560;
  }

  .option-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 0 rgba(0, 0, 0, 0.4);
  }

  .start-screen {
    text-align: center;
  }

  .title {
    font-size: 1.8rem;
    color: #e94560;
    margin-bottom: 10px;
  }

  .description {
    color: #a0a0a0;
    margin-bottom: 20px;
  }

  .start-btn {
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

  .start-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 12px rgba(233, 69, 96, 0.6);
    filter: brightness(1.1);
  }

  .start-btn:active {
    transform: translateY(1px);
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

  .score-display, .time-display {
    font-size: 0.9rem;
    color: #ececec;
  }

  .score-display strong, .time-display strong {
    color: #ff9f43;
    font-size: 1.1rem;
  }

  @media (max-width: 800px) {
    .option-btn {
      width: 65px;
      height: 65px;
      font-size: 1.4rem;
    }
  }

  @media (max-width: 400px) {
    .option-btn {
      width: 55px;
      height: 55px;
      font-size: 1.2rem;
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