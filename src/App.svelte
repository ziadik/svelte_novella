<script lang="ts">
  import { onMount } from "svelte";
  import Editor from "./lib/editor/Editor.svelte";
  import Main from "./lib/novella/Main.svelte";
  import UserMenu from "./lib/components/UserMenu.svelte";
  import ResetPasswordPage from "./lib/components/ResetPasswordPage.svelte";
  import AllGames from "./lib/minigames/AllGames.svelte";
  import {
    editor,
    editorActions,
  } from "./lib/editor/stores/editorStore.svelte";
  import {
    initAuth,
    authState,
    authDerivedState,
  } from "./lib/store/authStore.svelte";
import { gameState } from "./lib/store/gameStore.svelte";
  import {
    getStoryById,
    getStoryByBucket,
    loadStories,
  } from "./lib/store/storiesStore.svelte";
  import { userKeyStore, type UserStats } from "./lib/store/userKeyStore";
  import { gameModeState, setAppMode } from "./lib/store/gameModeStore.svelte";

  let userKey: string | null = null;
  let userStats: UserStats | null = null;
  let isLoading: boolean = true;
  let error: string | null = null;

  let appInitialized = $state(false);
  let showResetPassword = $state(false);
  let showAllGames = $state(false);
  let resetPasswordError = $state("");
  let resetPasswordToken = $state("");
  let showDebugPanel = $state(true);

  // Обработка внешней ссылки на историю
  async function handleExternalStoryLink() {
    const params = new URLSearchParams(window.location.search);
    const storyId = params.get("story");
    const bucket = params.get("bucket");

    if (!storyId && !bucket) return null;

    console.log("[App] Внешняя ссылка на историю:", { storyId, bucket });

    // Инициализируем истории если ещё не загружены
    await loadStories();

    let story = null;

    if (storyId) {
      // Ищем по ID
      story = getStoryById(storyId);
    } else if (bucket) {
      // Ищем по bucket (для обратной совместимости)
      story = getStoryByBucket(bucket);
    }

    if (story) {
      console.log("[App] Найдена история:", story.title);
      // Устанавливаем историю для автоматического запуска
      gameState.selectedStory = story.id;
      gameState.selectedStoryData = story;

      // Очищаем URL
      window.history.replaceState({}, "", "/");
      return story;
    }

    console.log("[App] История не найдена");
    return null;
  }

// Отслеживаем изменения аутентификации
  $effect(() => {
    if (authState.initialized) {
      console.log("[App] Auth state changed:", {
        user: authState.user?.email,
        isAuthenticated: authDerivedState.isAuthenticated,
        session: !!authState.session,
        loading: authState.loading,
      });
    }
  });

  // Автоматическое переключение режима game/editor
  $effect(() => {
    if (editor.showEditor && gameModeState.isGame) {
      setAppMode('editor');
    } else if (!editor.showEditor && gameModeState.isEditor) {
      setAppMode('game');
    }
  });

  async function handleAuthCallback() {
    const hash = window.location.hash;
    const search = window.location.search;

    console.log("[App] Checking auth callback:", { hash, search });

    // Проверяем тип recovery (сброс пароля)
    if (hash.includes("type=recovery") || search.includes("type=recovery")) {
      console.log("[App] Recovery flow detected");

      let accessToken = "";

      if (hash.includes("access_token=")) {
        const hashParams = new URLSearchParams(hash.substring(1));
        accessToken = hashParams.get("access_token") || "";
      } else if (search.includes("token=")) {
        const searchParams = new URLSearchParams(search);
        accessToken = searchParams.get("token") || "";
      }

      if (accessToken) {
        resetPasswordToken = accessToken;
        showResetPassword = true;
        window.history.replaceState({}, "", "/reset-password");
      }
    }
    // Проверяем ошибки
    else if (search.includes("error=")) {
      const params = new URLSearchParams(search);
      resetPasswordError =
        params.get("error_description") ||
        params.get("error") ||
        "Unknown error";
      showResetPassword = true;
      window.history.replaceState({}, "", "/reset-password");
    }
    // Проверяем прямой переход на /reset-password
    else if (window.location.pathname === "/reset-password") {
      showResetPassword = true;
    }
  }

  // Обработчик закрытия страницы
  const handleBeforeUnload = async () => {
    await userKeyStore.stopSessionTimer();
  };
  
  onMount(async () => {
    console.log("[App] Mounted");
    
    // Запускаем таймер сессии
    userKeyStore.startSessionTimer();
    
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('keydown', handleKeydown);
    }
    
    try {
      // Инициализируем ключ при загрузке приложения
      const key = await userKeyStore.init();
      
      if (key) {
        userKey = key;
        
        // Получаем статистику
        const stats = await userKeyStore.getUserStats(key);
        userStats = stats;
      } else {
        error = 'Не удалось создать ключ пользователя';
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Произошла ошибка';
    } finally {
      isLoading = false;
    }

    // Обработчик открытия страницы игр
    const handleOpenAllGames = () => {
      showAllGames = true;
    };
    window.addEventListener("open-all-games", handleOpenAllGames);

    try {
      // Проверяем callback от Supabase
      await handleAuthCallback();

      // Инициализируем auth с timeout
      const authPromise = initAuth();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout auth")), 10000),
      );

      await Promise.race([authPromise, timeoutPromise]);
      console.log("[App] Auth initialized successfully");

      // Обрабатываем внешнюю ссылку на историю
      await handleExternalStoryLink();
    } catch (err) {
      console.error("[App] Auth init error:", err);
    } finally {
      appInitialized = true;
      console.log("[App] App ready");
    }

    return () => {
      window.removeEventListener("open-all-games", handleOpenAllGames);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('keydown', handleKeydown);
    };
  });

  // Горячая клавиша для показа debug-панели (Ctrl+Shift+D)
  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey && e.shiftKey && e.key === 'D') {
      e.preventDefault();
      showDebugPanel = !showDebugPanel;
    }
  }

  const handleRegenerateKey = async (): Promise<void> => {
    isLoading = true;
    const newKey = await userKeyStore.regenerateKey();
    
    if (newKey) {
      userKey = newKey;
      userStats = await userKeyStore.getUserStats(newKey);
    }
    
    isLoading = false;
  };

  const handleClearKey = (): void => {
    userKeyStore.clearKey();
    userKey = null;
    userStats = null;
  };

  function handleCloseResetPassword() {
    showResetPassword = false;
    resetPasswordError = "";
    resetPasswordToken = "";
    window.history.replaceState({}, "", "/");
  }

  function openAllGames() {
    showAllGames = true;
  }

  function closeAllGames() {
    showAllGames = false;
  }
</script>

<!-- ✅ Используем appInitialized, а не initialized -->
{#if !appInitialized}
  <div class="loading-screen">
    <div class="loader"></div>
    <p>Загрузка...</p>
  </div>
{:else if showResetPassword}
  <ResetPasswordPage
    onClose={handleCloseResetPassword}
    initialError={resetPasswordError}
    initialToken={resetPasswordToken}
  />
{:else if editor.showEditor}
  <button
    class="btn-back-to-game"
    onclick={() => { editorActions.toggleEditor(); setAppMode('game'); }}
    title="Назад к игре"
  >
    ← Назад к игре
  </button>

  <Editor />
{:else if showAllGames}
  <AllGames onBack={closeAllGames} />
{:else}
  <!-- UserMenu скрываем во время мини-игры -->
  {#if !gameState.isMinigameActive}
    <UserMenu />
  {/if}
  <Main />
{/if}

<!-- Отладочная панель (DEV only) -->
{#if import.meta.env.DEV && appInitialized && showDebugPanel}
  <div class="debug-panel">
    <button class="debug-close" onclick={() => showDebugPanel = false}>✕</button>
    <div><strong>Auth:</strong> {authDerivedState.isAuthenticated ? '✅' : '❌'}</div>
    <div><strong>User:</strong> {authState.user?.email || 'guest'}</div>
    <div><strong>Key:</strong> {userKey ? userKey.substring(0, 8) + '...' : 'none'}</div>
  </div>
  
  <!-- Панель аналитики (показываем только в специальном режиме) -->
  <div class="analytics-panel">
    <button class="debug-close" onclick={() => showDebugPanel = false}>✕</button>
    <h3>📊 Аналитика пользователя</h3>
    
    {#if userKey}
      <p class="key-display">{userKey}</p>
      
      {#if userStats}
        <div class="stats">
          <p>📅 Первый визит: {new Date(userStats.created_at).toLocaleString()}</p>
          <p>🕐 Последний: {new Date(userStats.last_visit).toLocaleString()}</p>
          <p>👁️ Визитов: <strong>{userStats.visit_count}</strong></p>
          {#if userStats.referrer}
            <p>🔗 Откуда: {userStats.referrer}</p>
          {/if}
        </div>
      {/if}
      
      <div class="actions">
        <button onclick={handleRegenerateKey} class="btn btn-warning">
          Новый ключ
        </button>
        <button onclick={handleClearKey} class="btn btn-danger">
          Очистить
        </button>
      </div>
    {:else}
      <p class="no-key">Ключ недоступен</p>
    {/if}
  </div>
{/if}

<style>
  :root {
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-left: env(safe-area-inset-left, 0px);
    --safe-area-right: env(safe-area-inset-right, 0px);
  }

  .loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: #1a1a2e;
    color: #ececec;
    gap: 20px;
    padding-top: var(--safe-area-top);
    padding-bottom: var(--safe-area-bottom);
  }

  .loader {
    width: 50px;
    height: 50px;
    border: 4px solid #3c3c3c;
    border-top-color: #e94560;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .btn-back-to-game {
    position: fixed;
    bottom: calc(64px + var(--safe-area-bottom));
    right: calc(16px + var(--safe-area-right));
    padding: 10px 16px;
    background: rgba(102, 126, 234, 0.8);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    z-index: 1000;
  }

  .btn-back-to-game:hover {
    background: rgba(102, 126, 234, 1);
    transform: scale(1.05);
  }

  .debug-panel {
    position: fixed;
    bottom: calc(80px + var(--safe-area-bottom));
    left: calc(10px + var(--safe-area-left));
    background: rgba(0, 0, 0, 0.85);
    color: #0f0;
    padding: 8px 12px;
    font-size: 11px;
    z-index: 9998;
    border-radius: 4px;
    font-family: monospace;
  }

  .debug-close {
    position: absolute;
    top: 2px;
    right: 4px;
    background: none;
    border: none;
    color: #666;
    font-size: 12px;
    cursor: pointer;
    padding: 2px 6px;
    line-height: 1;
  }

  .debug-close:hover {
    color: #fff;
  }

  .analytics-panel {
    position: fixed;
    bottom: calc(80px + var(--safe-area-bottom));
    right: calc(10px + var(--safe-area-right));
    background: rgba(255, 255, 255, 0.95);
    color: #333;
    padding: 15px;
    font-size: 12px;
    z-index: 9998;
    border-radius: 8px;
    max-width: 280px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .analytics-panel h3 {
    margin: 0 0 10px 0;
    font-size: 14px;
    color: #1a1a2e;
  }

  .analytics-panel .key-display {
    font-size: 11px;
    padding: 8px;
    word-break: break-all;
  }

  .analytics-panel .stats {
    margin: 10px 0;
    padding: 10px;
    background: #f8f9fa;
    border-radius: 4px;
    border-left: 3px solid #007bff;
  }

  .analytics-panel .stats p {
    margin: 4px 0;
    font-size: 11px;
  }

  .analytics-panel .actions {
    margin-top: 10px;
  }

  .analytics-panel .btn {
    padding: 6px 12px;
    font-size: 11px;
  }
</style>
