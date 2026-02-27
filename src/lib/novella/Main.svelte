<script lang="ts">
  import { onMount } from "svelte";
  import { fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import DialogueCard from "./DialogueCard.svelte";
  import StorySelector from "./components/StorySelector.svelte";
  import Inventory from "./components/Inventory.svelte";
  import { gameState } from "../store/gameStore.svelte";
  import { supabaseUrlFile } from "../store/store.svelte";
  import { loadStoryJson } from "../store/storiesStore.svelte";
  import { editorActions } from "../editor/stores/editorStore.svelte";
  import { authState } from "../store/authStore.svelte";
  import { userKeyStore } from "../store/userKeyStore";

  let isOnline = $state(true);
  let initialized = $state(false);

  onMount(async () => {
    // Проверка наличия сети
    isOnline = navigator.onLine;
    
    const handleOnline = () => { isOnline = true; };
    const handleOffline = () => { isOnline = false; };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Инициализируем истории (включая URL параметр)
    await gameState.initStories();
    initialized = true;
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  });

  // Загрузка истории при выборе (включая URL параметр)
  $effect(async () => {
    if (initialized && gameState.selectedStory && gameState.selectedStoryData) {
      const story = gameState.selectedStoryData;
      if (!story || !story.id) {
        console.warn('[Main] История не выбрана или некорректна');
        return;
      }
      console.log('[Main] Загрузка истории:', story?.title || story.id);
      
      // Отслеживаем запуск истории
      await userKeyStore.trackStoryStart(story.id, story.title || story.id);
      
      const storyData = await loadStoryJson(story);
      
      if (storyData) {
        gameState.storyData = storyData;
        gameState.currentDialogueId = storyData.dialogues?.[0]?.id || "0";
        gameState.isLoading = false;
        console.log('[Main] История загружена, диалогов:', storyData.dialogues?.length);
      } else {
        gameState.error = "Не удалось загрузить историю";
        gameState.isLoading = false;
      }
    }
  });

  // Отслеживание завершения истории (возврат к выбору)
  let previousStoryId: string | null = null;
  
  $effect(() => {
    // Когда пользователь возвращается к выбору историй (selectedStory = null)
    // а ранее была активна история
    if (previousStoryId && !gameState.selectedStory && gameState.storyData) {
      const dialogueCount = gameState.storyData.dialogues?.length || 0;
      userKeyStore.trackStoryComplete(
        previousStoryId, 
        gameState.selectedStoryData?.title || previousStoryId,
        dialogueCount
      );
      previousStoryId = null;
    } else if (gameState.selectedStory) {
      previousStoryId = gameState.selectedStory;
    }
  });

  function openEditor() {
    if (!isOnline) {
      alert('Редактирование недоступно без интернета');
      return;
    }
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
      <!-- Инвентарь (скрываем во время мини-игры) -->
      {#if !gameState.isMinigameActive}
        <Inventory />
      {/if}

      <!-- Кнопка возврата к выбору истории (скрываем во время мини-игры) -->
      {#if !gameState.isMinigameActive}
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
      {/if}

      <!-- Кнопка редактирования (скрываем во время мини-игры) -->
      {#if authState.user && isOnline && !gameState.isMinigameActive}
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
          {#key gameState.currentDialogueId}
            <div 
              class="dialogue-wrapper"
              in:fly={{ y: 20, duration: 500, easing: cubicOut }}
            >
              <DialogueCard bucketName={gameState.selectedStoryData?.bucket || 'stories'} />
            </div>
          {/key}
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  :root {
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-left: env(safe-area-inset-left, 0px);
    --safe-area-right: env(safe-area-inset-right, 0px);
  }

  .app {
    width: 400px;
    height: 600px;
    min-height: 100vh;
    background: #1a1a1a;
    color: white;
    font-family: sans-serif;
    padding-top: var(--safe-area-top);
    padding-bottom: var(--safe-area-bottom);
  }

  .loading, .error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    text-align: center;
    padding: 20px;
    padding-top: calc(20px + var(--safe-area-top));
    padding-bottom: calc(20px + var(--safe-area-bottom));
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
    padding-top: var(--safe-area-top);
    padding-bottom: var(--safe-area-bottom);
  }

  .btn-change-story {
    position: fixed;
    top: calc(70px + var(--safe-area-top));
    left: calc(16px + var(--safe-area-left));
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
    bottom: calc(16px + var(--safe-area-bottom));
    right: calc(16px + var(--safe-area-right));
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

  .dialogue-wrapper {
    width: 100%;
    height: 100%;
  }
</style>