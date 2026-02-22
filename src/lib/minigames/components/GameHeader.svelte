<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    onRestart,
    onGiveUp,
    showGiveUp = false,
    extraContent = null,
    onShowRules = null,
  } = $props<{
    onRestart?: () => void;
    onGiveUp?: () => void;
    showGiveUp?: boolean;
    extraContent?: Snippet;
    onShowRules?: () => void;
  }>();
</script>

<div id="game-header">
  {#if onShowRules}
    <button class="btn btn-info" onclick={onShowRules}>❓ Правила</button>
  {/if}

  {#if onRestart}
    <button class="btn btn-secondary" onclick={onRestart}>🔄 Заново</button>
  {/if}

  {#if extraContent}
    {@render extraContent()}
  {/if}

  {#if showGiveUp && onGiveUp}
    <button class="btn btn-danger" onclick={onGiveUp}>🏳️ Сдаться</button>
  {/if}
</div>

<style>
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

  .btn-danger {
    background: linear-gradient(135deg, #6c757d, #495057);
  }

  .btn-info {
    background: linear-gradient(135deg, #0984e3, #0652DD);
    box-shadow: 0 3px 8px rgba(9, 132, 227, 0.4);
  }

  .btn-info:hover {
    box-shadow: 0 5px 12px rgba(9, 132, 227, 0.6);
  }

  @media (max-width: 380px) {
    #game-header {
      flex-wrap: wrap;
      justify-content: center;
      gap: 8px;
      padding: 8px;
    }
  }
</style>
