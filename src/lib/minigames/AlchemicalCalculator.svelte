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

  const OPERATIONS = [
    { symbol: '+', func: (a: number, b: number) => a + b },
    { symbol: '−', func: (a: number, b: number) => a - b },
    { symbol: '×', func: (a: number, b: number) => a * b },
    { symbol: '÷', func: (a: number, b: number) => a / b },
  ];

  const TIMEOUT = 1000;
  
  let numbers = $state<number[]>([]);
  let targetNumber = $state(0);
  let expression: Array<{ type: 'number' | 'operation'; value: number | string; id: string }> = $state([]);
  let availableNumbers = $state<number[]>([]);
  let availableOps = $state<typeof OPERATIONS>([]);
  let gameOver = $state(false);
  let gameWon = $state(false);
  let message = $state('');

  let modal = $state<ModalState>({ show: false, title: "", text: "", actions: [] });

  function generatePuzzle() {
    const newNumbers = Array(4).fill(0).map(() => Math.floor(Math.random() * 12) + 1);
    numbers = [...newNumbers];
    availableNumbers = [...newNumbers];
    targetNumber = Math.floor(newNumbers.reduce((a, b) => a + b, 0) / 2) + 2;
    availableOps = [...OPERATIONS];
    expression = [];
    message = '';
    gameOver = false;
    gameWon = false;
  }

  function addNumber(num: number) {
    if (gameOver) return;
    if (availableNumbers.includes(num)) {
      expression = [...expression, { type: 'number', value: num, id: `${num}-${Date.now()}-${Math.random()}` }];
      availableNumbers = availableNumbers.filter(n => n !== num);
    }
  }

  function addOperation(op: typeof OPERATIONS[0]) {
    if (gameOver) return;
    const lastItem = expression[expression.length - 1];
    if (lastItem && lastItem.type === 'number' && expression.length < 7) {
      expression = [...expression, { type: 'operation', value: op.symbol, id: `${op.symbol}-${Date.now()}-${Math.random()}` }];
    }
  }

  function calculateExpression(): number | null {
    if (expression.length < 3) return null;
    let result = expression[0].value as number;
    for (let i = 1; i < expression.length; i += 2) {
      const op = expression[i];
      const nextNum = expression[i + 1];
      if (op.type !== 'operation' || !nextNum || nextNum.type !== 'number') return null;
      const opFunc = OPERATIONS.find(o => o.symbol === op.value)?.func;
      if (!opFunc) return null;
      result = opFunc(result, nextNum.value as number);
    }
    return result;
  }

  function checkSolution() {
    if (availableNumbers.length > 0) {
      message = 'Используй все числа!';
      return;
    }
    const result = calculateExpression();
    if (result === null) {
      message = 'Неполное выражение';
      return;
    }
    if (Math.abs(result - targetNumber) < 0.01) {
      message = '✨ Великолепно! Алхимия удалась! ✨';
      gameOver = true;
      gameWon = true;
      if (integrated) {
        showModal("🎉 Победа!", "Алхимия удалась!", []);
        setTimeout(() => { hideModal(); onWin?.(); }, TIMEOUT);
      } else {
        showModal("🎉 Победа!", "Алхимия удалась!", [
          { text: "Играть снова", action: initGame },
        ]);
      }
    } else {
      message = `❌ Получилось ${result.toFixed(1)}, нужно ${targetNumber}`;
    }
  }

  function clearExpression() {
    availableNumbers = [...numbers];
    expression = [];
    message = '';
  }

  function removeLast() {
    const newExpr = [...expression];
    const last = newExpr.pop();
    if (last && last.type === 'number') {
      availableNumbers = [...availableNumbers, last.value as number].sort((a, b) => a - b);
    }
    expression = newExpr;
  }

  function initGame() {
    generatePuzzle();
    hideModal();
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
    showModal("📖 Правила", `Алхимический калькулятор:

🎯 Цель: Используя все числа и операции, получи целевое число.

🔢 Доступны 4 числа от 1 до 12.

➕➖✖️➗ Можно использовать любые операции.

⚠️ Порядок выполнения: слева направо.`, [
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
    <div class="target-number">
      <div class="target-label">Цель:</div>
      <div class="target-value">{targetNumber}</div>
    </div>

    <div class="expression-area">
      {#each expression as item}
        <span class="expr-item expr-{item.type}">{item.value}</span>
      {/each}
      <span class="expr-cursor">_</span>
    </div>

    <div class="numbers-panel">
      <div class="numbers-grid">
        {#each availableNumbers as num}
          <button type="button" class="num-btn" onclick={() => addNumber(num)} disabled={gameOver}>{num}</button>
        {/each}
      </div>
    </div>

    <div class="operations-grid">
      {#each OPERATIONS as op}
        <button type="button" class="op-btn" onclick={() => addOperation(op)} disabled={gameOver}>{op.symbol}</button>
      {/each}
    </div>

    <div class="action-buttons">
      <button type="button" class="action-btn" onclick={removeLast} disabled={expression.length === 0 || gameOver}>↩</button>
      <button type="button" class="action-btn" onclick={clearExpression} disabled={expression.length === 0 || gameOver}>🧹</button>
      <button type="button" class="action-btn primary" onclick={checkSolution} disabled={gameOver}>⚗️</button>
    </div>

    {#if message}
      <div class="message" class:success={message.includes('✨')}>{message}</div>
    {/if}
  </div>

  <GameFooter {rewardItem} {items} {bucketName}>
    <div class="footer-stats">
      <span class="target-info">Цель: <strong>{targetNumber}</strong></span>
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
    max-width: 100%;
    overflow: hidden;
    margin-bottom: 15px;
    gap: 10px;
  }

  .target-number {
    text-align: center;
    padding: 10px 20px;
    background: linear-gradient(135deg, #3d3b5c, #2a2a40);
    border-radius: 10px;
    border: 1px solid #5e5c8a;
  }

  .target-label { font-size: 0.9rem; color: #aaa; }
  .target-value { font-size: 2.5rem; font-weight: bold; color: #ff9f43; }

  .expression-area {
    min-height: 45px;
    background: #2a2a40;
    border-radius: 8px;
    padding: 10px 15px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
    font-size: 1.4rem;
    border: 1px solid #5e5c8a;
  }

  .expr-item { padding: 4px 8px; border-radius: 5px; }
  .expr-number { background: #4e4c75; color: #00b894; }
  .expr-operation { background: #3d3b5c; color: #fdcb6e; }
  .expr-cursor { animation: blink 1s infinite; color: #e94560; }

  .numbers-grid { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
  .num-btn {
    width: 55px; height: 55px;
    font-size: 1.4rem;
    background: linear-gradient(135deg, #00b894, #00a884);
    border: none; border-radius: 10px;
    color: white; cursor: pointer;
    transition: transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 0 #008066;
    font-family: inherit;
  }
  .num-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 6px 0 #008066; }
  .num-btn:active:not(:disabled) { transform: translateY(0); box-shadow: 0 2px 0 #008066; }
  .num-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .operations-grid { display: flex; gap: 8px; justify-content: center; }
  .op-btn {
    width: 55px; height: 55px;
    font-size: 1.8rem;
    background: linear-gradient(135deg, #fdcb6e, #f39c12);
    border: none; border-radius: 10px;
    color: white; cursor: pointer;
    transition: transform 0.15s, box-shadow 0.2s;
    box-shadow: 0 4px 0 #d35400;
    font-family: inherit;
  }
  .op-btn:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 6px 0 #d35400; }
  .op-btn:active:not(:disabled) { transform: translateY(0); box-shadow: 0 2px 0 #d35400; }
  .op-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .action-buttons { display: flex; gap: 8px; justify-content: center; }
  .action-btn {
    padding: 10px 16px;
    background: #4e4c75; border: none; border-radius: 10px;
    color: white; cursor: pointer;
    transition: transform 0.15s, box-shadow 0.2s;
    font-size: 1rem;
    box-shadow: 0 3px 0 #3d3b5c;
    font-family: inherit;
  }
  .action-btn.primary { background: linear-gradient(135deg, #e94560, #c0394d); box-shadow: 0 3px 0 #962d3a; }
  .action-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.1); }
  .action-btn:active:not(:disabled) { transform: translateY(0); }
  .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .message { padding: 10px; background: #2a2a40; border-radius: 8px; text-align: center; color: #e94560; font-size: 0.9rem; }
  .message.success { color: #00b894; }

  .footer-stats {
    display: flex; justify-content: space-between; align-items: center;
    gap: 10px; padding: 8px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .target-info { font-size: 0.9rem; color: #ececec; }
  .target-info strong { color: #ff9f43; font-size: 1.1rem; }

  @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

  @media (max-width: 400px) {
    .num-btn, .op-btn { width: 50px; height: 50px; }
    .target-value { font-size: 2rem; }
  }

  @media (max-width: 380px) {
    .footer-stats { flex-wrap: wrap; justify-content: center; gap: 8px; }
  }
</style>
