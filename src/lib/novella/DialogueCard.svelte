<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { fly, fade } from "svelte/transition";
  import { gameState } from "../store/gameStore.svelte";
  import { gameModeState } from "../store/gameModeStore.svelte";
  import Rive from "./Rive.svelte";
  import MinigameLauncher from "./MinigameLauncher.svelte";
  import { bucketName as defaultBucketName, supabaseUrlFile } from "../store/store.svelte";
  import { userKeyStore } from "../store/userKeyStore";

  let { index, dialogue: propDialogue, bucketName = defaultBucketName, isPreview = false }: { index?: number; dialogue?: any; bucketName?: string; isPreview?: boolean } = $props();

// Если пропс dialogue не передан, берем из стора (режим игры)
const currentDialogue = $derived(propDialogue || gameState.findDialogue(gameState.currentDialogueId));

/**
 * Получить URL для ресурса (локальный или Supabase)
 */
function getResourceUrl(fileName: string, bucket: string): string {
  // В игровом режиме используем локальные assets
  if (gameModeState.isGame) {
    const basePath = import.meta.env.BASE_URL || '/';
    return `${basePath}stories/${bucket}/${fileName}`;
  }
  // В редакторе используем Supabase
  return `${supabaseUrlFile}/storage/v1/object/public/${bucket}/${fileName}`;
}

  // Состояние свайпа
  let touchStartX = $state(0);
  let touchEndX = $state(0);
  let isSwiping = $state(false);
  let touchStartTime = $state(0);

  // Проверка мобильного устройства
  let isMobile = $state(false);
  let isDesktop = $derived(!isMobile);
  
  onMount(() => {
    isMobile = window.innerWidth < 768;
    window.addEventListener('resize', () => {
      isMobile = window.innerWidth < 768;
    });
  });
    
  // Обработка входа в диалог (выполнение actions)
  let dialogKey = $state(0);
  
  $effect(() => {
    if (currentDialogue?.onEnter) {
      gameState.runActions(currentDialogue.onEnter);
    }
    // Меняем key для запуска анимации при смене диалога
    dialogKey = currentDialogue?.id || 0;
  });

  // Единая функция перехода к следующему диалогу
  function goToNext() {
    if (currentDialogue?.nextDialogueId) {
      gameState.goToDialogue(currentDialogue.nextDialogueId);
    }
  }

  // Ref для Rive компонента фона
  let backgroundRive: any = $state(null);

  // Обработчик клика - запускает trigger T1 у background (мобильные)
  function handleBackgroundRiveClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (backgroundRive?.triggerT1) {
      backgroundRive.triggerT1();
    }
  }

  // Обработчик клика по тексту диалога (десктоп) - переход к следующему
  function handleDialogueContentClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isDesktop && !currentDialogue?.options?.length && currentDialogue?.nextDialogueId) {
      goToNext();
    }
  }

  // Обработчики свайпа (только для мобильных)
  function handleTouchStart(e: TouchEvent) {
    if (!isMobile) return;
    touchStartX = e.touches[0].clientX;
    touchStartTime = Date.now();
    isSwiping = true;
  }

  function handleTouchMove(e: TouchEvent) {
    if (!isMobile || !isSwiping) return;
    touchEndX = e.touches[0].clientX;
  }

  function handleTouchEnd() {
    if (!isMobile || !isSwiping) return;
    isSwiping = false;
    
    const touchDuration = Date.now() - touchStartTime;
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    // Свайп влево - только если касание было дольше 200мс
    if (diff > swipeThreshold && touchDuration > 200 && currentDialogue?.nextDialogueId) {
      goToNext();
    }

    touchStartX = 0;
    touchEndX = 0;
    touchStartTime = 0;
  }

  function handleOptionSelect(option: any) {
    console.log('[DialogueCard] handleOptionSelect() вызван, option:', option.text);
    if (option.actions) {
      gameState.runActions(option.actions);
    }

    if (option.miniGame) {
      console.log('[DialogueCard] Запуск мини-игры:', option.miniGame.id);
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
      console.log('[DialogueCard] Переход по опции к:', option.nextDialogueId);
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
  <!-- Основной контейнер - свайп и клик для trigger -->
  <div 
    class="dialogue-container"
    class:preview-mode={isPreview}
    ontouchstart={handleTouchStart}
    ontouchmove={handleTouchMove}
    ontouchend={handleTouchEnd}
    onclick={handleBackgroundRiveClick}
  >
    {#key dialogKey}
      <div class="dialogue-inner" in:fly={{ x: 300, duration: 300, delay: 0 }} out:fly={{ x: -300, duration: 300 }}>
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
            <Rive 
              bind:this={backgroundRive}
              fileName={currentDialogue.backgroundImage} 
              {bucketName} 
            />
          {/key}
        {:else}
          <img 
            src={getResourceUrl(currentDialogue.backgroundImage, bucketName)} 
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
            src={getResourceUrl(currentDialogue.characterImage, bucketName)} 
            alt="Char" 
            class="character-image" 
          />
        {/if}
      </div>
    {/if}

    <!-- Контент - снизу -->
    <div 
      class="dialogue-content" 
      class:clickable={isDesktop}
      onclick={handleDialogueContentClick}
    >
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
  {/key}
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
    cursor: pointer;
  }
  
  .dialogue-inner {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
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
    pointer-events: none;
  }

  .background-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
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
    pointer-events: none;
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

  .dialogue-content.clickable {
    cursor: pointer;
  }
  
  .dialogue-content.clickable:hover {
    background: rgba(29, 43, 56, 1);
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