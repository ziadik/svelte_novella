<script lang="ts">
  import { onMount } from "svelte";
  import DialogueCard from "./DialogueCard.svelte";
  import StorySelector from "./components/StorySelector.svelte";
  import Inventory from "./components/Inventory.svelte";
  import { gameState } from "../store/gameStore.svelte";
  import { supabaseUrlFile } from "../store/store.svelte";
  import { loadStoryJson } from "../store/storiesStore.svelte";
  import { editorActions } from "../editor/stores/editorStore.svelte";
  import { authState } from "../store/authStore.svelte";

  // Загрузка истории при выборе
  $effect(async () => {
    if (gameState.selectedStory && gameState.selectedStoryData) {
      const story = gameState.selectedStoryData;
      const storyData = await loadStoryJson(story);
      
      if (storyData) {
        gameState.storyData = storyData;
        gameState.currentDialogueId = storyData.dialogues?.[0]?.id || "0";
        gameState.isLoading = false;
      } else {
        gameState.error = "Не удалось загрузить историю";
        gameState.isLoading = false;
      }
    }
  });

  function openEditor() {
    editorActions.toggleEditor();
  }
</script>

<div class="app">
  {#if !gameState.selectedStory}
    <!-- Экран выбора истории -->
    <StorySelector />
  {:else if gameState.isLoading}
    <div class="loading">
      <p>🔄 Загрузка истории...</p>
    </div>
  {:else if gameState.error}
    <div class="error">
      ⚠️ {gameState.error}
      <button class="btn-back" onclick={() => gameState.selectedStory = null}>
        ← Вернуться к выбору
      </button>
    </div>
  {:else}
    <div class="game-container">
      <!-- Инвентарь -->
      <Inventory />

      <!-- Кнопка возврата к выбору истории -->
      <button 
        class="btn-change-story"
        onclick={() => {
          gameState.selectedStory = null;
          gameState.selectedStoryData = null;
          gameState.storyData = null;
        }}
        title="Сменить историю"
      >
        📚
      </button>

      <!-- Кнопка редактирования (только для авторизованных на десктопах) -->
      {#if authState.user}
        <button 
          class="btn-edit desktop-only"
          onclick={openEditor}
          title="Редактор историй"
        >
          ✏️ Редактор
        </button>
      {/if}

      <!-- Контейнер диалогов -->
      <div class="dialogues-container">
        {#if gameState.storyData}
          <DialogueCard bucketName={gameState.selectedStoryData?.bucket || 'stories'} />
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .app {
    width: 400px;
    height: 600px;
    min-height: 100vh;
    background: #1a1a1a;
    color: white;
    font-family: sans-serif;
  }

  .loading, .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    text-align: center;
    padding: 20px;
  }

  .error {
    gap: 16px;
  }

  .game-container {
    position: relative;
    display: flex;
    justify-content: center;
    min-height: 100vh;
    padding: 0px;
  }

  .btn-change-story {
    position: fixed;
    bottom: 16px;
    left: 16px;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    z-index: 1000;
  }

  .btn-change-story:hover {
    background: rgba(233, 69, 96, 0.8);
    transform: scale(1.1);
  }

  /* Кнопка редактирования - только для десктопов, в правом нижнем углу */
  .btn-edit {
    position: fixed;
    bottom: 16px;
    right: 16px;
    padding: 10px 16px;
    border-radius: 8px;
    border: none;
    background: rgba(102, 126, 234, 0.8);
    color: white;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    z-index: 1000;
  }

  .btn-edit:hover {
    background: rgba(102, 126, 234, 1);
    transform: scale(1.05);
  }

  /* Адаптивная видимость */
  .mobile-only {
    display: flex;
  }

  .desktop-only {
    display: none;
  }

  @media (min-width: 769px) {
    .mobile-only {
      display: none;
    }

    .desktop-only {
      display: flex;
    }
  }

  .btn-back {
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    background: #e94560;
    color: white;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .btn-back:hover {
    background: #ff6b6b;
    transform: translateY(-2px);
  }

  .dialogues-container {
     display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 500px;
    height: 600px;
  }
</style>