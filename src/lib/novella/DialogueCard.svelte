<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { gameState } from "../store/gameStore.svelte";
  import Rive from "./Rive.svelte";
  import MinigameLauncher from "./MinigameLauncher.svelte";
  import { bucketName as defaultBucketName, supabaseUrlFile } from "../store/store.svelte";
  import { userKeyStore } from "../store/userKeyStore";

  let { index, dialogue: propDialogue, bucketName = defaultBucketName, isPreview = false }: { index?: number; dialogue?: any; bucketName?: string; isPreview?: boolean } = $props();

// Если пропс dialogue не передан, берем из стора (режим игры)
const currentDialogue = $derived(propDialogue || gameState.findDialogue(gameState.currentDialogueId));

  // Состояние свайпа
  let touchStartX = $state(0);
  let touchEndX = $state(0);
  let isSwiping = $state(false);

  // Проверка мобильного устройства
  let isMobile = $state(false);
  
  onMount(() => {
    isMobile = window.innerWidth < 768;
    window.addEventListener('resize', () => {
      isMobile = window.innerWidth < 768;
    });
  });

  // Обработка входа в диалог (выполнение actions)
  $effect(() => {
    if (currentDialogue?.onEnter) {
      gameState.runActions(currentDialogue.onEnter);
    }
  });

  function handleNext() {
    if (currentDialogue?.nextDialogueId) {
      gameState.goToDialogue(currentDialogue.nextDialogueId);
    }
  }

  // Обработчик клика (только для десктопов)
  function handleContainerClick(e: MouseEvent) {
    if (isMobile) return;
    // Игнорируем клик на кнопках опций
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('.options-container')) return;
    
    handleNext();
  }

  // Обработчики свайпа (только для мобильных)
  function handleTouchStart(e: TouchEvent) {
    if (!isMobile) return;
    touchStartX = e.touches[0].clientX;
    isSwiping = true;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isMobile || !isSwiping) return;
    touchEndX = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    if (!isMobile || !isSwiping) return;
    isSwiping = false;
    
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    // Свайп влево - следующий диалог
    if (diff > swipeThreshold && currentDialogue?.nextDialogueId) {
      handleNext();
    }

    touchStartX = 0;
    touchEndX = 0;
  }

  function handleOptionSelect(option: any) {
    if (option.actions) {
      gameState.runActions(option.actions);
    }

    if (option.miniGame) {
      userKeyStore.trackGameStart(
        option.miniGame.id,
        option.miniGame.id,
        gameState.selectedStory || undefined
      );
      
      gameState.activeMinigame = {
        gameId: option.miniGame.id,
        onWinDialogueId: option.miniGame.onWinDialogueId,
        onLoseDialogueId: option.miniGame.onLoseDialogueId,
        rewardItem: option.miniGame.rewardItem
      };
      return;
    }

    if (option.nextDialogueId) {
      gameState.goToDialogue(option.nextDialogueId);
    }
  }

  function handleMinigameWin() {
    if (gameState.activeMinigame) {
      userKeyStore.trackGameResult(
        gameState.activeMinigame.gameId,
        gameState.activeMinigame.gameId,
        true,
        gameState.selectedStory || undefined
      );
    }
    
    if (gameState.activeMinigame?.rewardItem) {
      gameState.addItem(gameState.activeMinigame.rewardItem);
    }
    if (gameState.activeMinigame?.onWinDialogueId) {
      gameState.goToDialogue(gameState.activeMinigame.onWinDialogueId);
    }
    gameState.activeMinigame = null;
  }

  function handleMinigameLose() {
    if (gameState.activeMinigame) {
      userKeyStore.trackGameResult(
        gameState.activeMinigame.gameId,
        gameState.activeMinigame.gameId,
        false,
        gameState.selectedStory || undefined
      );
    }
    
    if (gameState.activeMinigame?.onLoseDialogueId) {
      gameState.goToDialogue(gameState.activeMinigame.onLoseDialogueId);
    }
    gameState.activeMinigame = null;
  }

  function isOptionVisible(option: any): boolean {
    if (option.visible === false) return false;
    return gameState.checkVisibilityCondition(option);
  }

  function isOptionEnabled(option: any): boolean {
    return option.enabled !== false;
  }
</script>

{#if currentDialogue}
  <!-- Основной контейнер с поддержкой свайпа и клика -->
  <div 
    class="dialogue-container"
    class:preview-mode={isPreview}
    onclick={handleContainerClick}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
  >
    <!-- Мини-игра -->
    {#if gameState.activeMinigame}
      <MinigameLauncher
        gameId={gameState.activeMinigame.gameId}
        onWin={handleMinigameWin}
        onLose={handleMinigameLose}
        rewardItem={gameState.activeMinigame.rewardItem}
        items={gameState.storyData?.items}
        bucketName={bucketName} 
      />
    {/if}

    <!-- Фон на весь экран -->
    {#if currentDialogue.backgroundImage}
      <div class="background-media">
        {#if currentDialogue.backgroundImage.endsWith(".riv")}
          {#key currentDialogue.backgroundImage}
            <Rive fileName={currentDialogue.backgroundImage} {bucketName} />
          {/key}
        {:else}
          <img 
            src={`${supabaseUrlFile}/storage/v1/object/public/${bucketName}/${currentDialogue.backgroundImage}`} 
            alt="BG" 
            class="background-image" 
          />
        {/if}
      </div>
    {/if}

    <!-- Персонаж -->
    {#if currentDialogue.characterImage}
      <div class="character-media">
        {#if currentDialogue.characterImage.endsWith(".riv")}
          {#key currentDialogue.characterImage}
            <Rive fileName={currentDialogue.characterImage} {bucketName} />
          {/key}
        {:else}
           <img 
            src={`${supabaseUrlFile}/storage/v1/object/public/${bucketName}/${currentDialogue.characterImage}`} 
            alt="Char" 
            class="character-image" 
          />
        {/if}
      </div>
    {/if}

    <!-- Контент - снизу -->
    <div class="dialogue-content">
      <div class="dialogue-text">
        {currentDialogue.text}
      </div>

      <!-- Опции -->
      {#if currentDialogue.options && currentDialogue.options.length > 0}
        <div class="options-container">
          {#each currentDialogue.options as option (option.text)}
            {#if isOptionVisible(option)}
              <button 
                class="option-button" 
                class:disabled={!isOptionEnabled(option)}
                onclick={() => handleOptionSelect(option)}
                disabled={!isOptionEnabled(option)}
              >
                {option.text}
              </button>
            {/if}
          {/each}
        </div>
      {:else if currentDialogue.nextDialogueId}
        <!-- Индикатор свайпа (если нет опций) -->
        <div class="swipe-hint">
          <span>← свайп влево →</span>
        </div>
      {/if}
    </div>
  </div>
{:else}
  <p>Диалог не найден (ID: {gameState.currentDialogueId})</p>
{/if}

<style>
  .dialogue-container {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    height: 100dvh;
    overflow: hidden;
    background: #1a1a2e;
    touch-action: pan-y;
  }

  /* Режим предпросмотра - относительное позиционирование */
  .dialogue-container.preview-mode {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 400px;
  }

  .background-media {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 1;
  }

  .background-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .character-media {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 70%;
    height: 90%;
    top: 10%;
    z-index: 2;
  }

  .character-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  .dialogue-content {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 3;
    background: rgba(29, 43, 56, 0.95);
    padding: 12px;
    padding-bottom: max(12px, env(safe-area-inset-bottom));
    box-sizing: border-box;
    max-height: 50vh;
    overflow-y: auto;
  }

  .dialogue-text {
    font-size: 15px;
    color: #fff;
    margin-bottom: 12px;
    line-height: 1.4;
  }

  .options-container {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .option-button {
    background: rgba(233, 69, 96, 0.9);
    color: white;
    border: none;
    padding: 12px 14px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    text-align: left;
    transition: background 0.2s;
  }
  
  .option-button:active {
    background: rgba(233, 69, 96, 1);
  }

  .option-button.disabled {
    background: rgba(100, 100, 100, 0.5);
    opacity: 0.6;
    cursor: not-allowed;
  }

  .swipe-hint {
    text-align: center;
    color: rgba(255,255,255,0.3);
    font-size: 11px;
    padding: 6px;
    margin-top: 8px;
  }

  /* Адаптация для десктопов */
  @media (min-width: 768px) {
    .dialogue-text {
      font-size: 18px;
    }

    .option-button {
      font-size: 15px;
      padding: 12px 20px;
    }

    .dialogue-content {
      padding: 16px;
      padding-bottom: max(16px, env(safe-area-inset-bottom));
    }

    .swipe-hint {
      display: none;
    }
  }
</style>