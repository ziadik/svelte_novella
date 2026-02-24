<script>
// @ts-nocheck

  // @ts-ignore
  import { onMount, setContext } from "svelte";
  // @ts-ignore
  import { supabase, getTmaAuthInvoke } from "../supabaseClient.js";
  import { initializeTelegram, getTelegramUser } from "../telegram.js";
  import { signOut, authState } from "../store/authStore.svelte";
  import Main from "../novella/Main.svelte";

  let tg = $state(null);
  let telegramUser = $state(null);
  let user = $state(null);
  let session = $state(null);
  let isLoading = $state(true);
  let error = $state("");

  // Инициализация приложения
  onMount(async () => {
    try {
      tg = initializeTelegram();
      telegramUser = getTelegramUser(tg);

      // Проверяем существующую сессию
      const { data: sessionData } = await supabase.auth.getSession();
      // @ts-ignore
      session = sessionData?.session;
     
      if (session) {
        const { data: userData } = await supabase.auth.getUser();
        // @ts-ignore
        user = userData?.user;
        isLoading = false;
        
      }
    } catch (err) {
      // @ts-ignore
      error = "Ошибка инициализации: " + err.message;
    } finally {
      isLoading = false;
    }
  });

  // Аутентификация через Edge Function
  async function authenticate() {
    try {
      isLoading = true;
      error = "";

      // @ts-ignore
      const initData = tg.initData;
      if (!initData) throw new Error("Telegram init data not available");

      //const { data, error: invokeError } = await getTmaAuthInvoke(initData);
      const { data, error: invokeError } = await supabase.functions.invoke("tma-auth", {
        body: { initData },
      });
      if (invokeError) throw invokeError;

      const { error: authError } = await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });

      if (authError) throw authError;

      const { data: userData } = await supabase.auth.getUser();
      // @ts-ignore
      user = userData?.user;
      // @ts-ignore
      session = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      };

      isLoading = false;
    } catch (err) {
      // @ts-ignore
      error = "Ошибка авторизации: " + err.message;
      console.error("Auth error:", err);
    } finally {
      isLoading = false;
    }
  }

  // Выход
  async function logout() {
    console.log("[TelegramApp] Выход из аккаунта...");
    try {
      await signOut();
      user = null;
      session = null;
      console.log("[TelegramApp] Выход выполнен успешно");
    } catch (err) {
      // @ts-ignore
      error = "Ошибка выхода: " + err.message;
      console.error("[TelegramApp] Ошибка выхода:", err);
    }
  }

  // Добавляем обработчик события
  onMount(() => {
    //    window.addEventListener('dialogueChange', handleDialogueChange)
    //    return () => window.removeEventListener('dialogueChange', handleDialogueChange)
  });
</script>

<div class="app-container">
  {#if isLoading}
    <div class="loading">
      <p>Загрузка...</p>
    </div>   

<style>
  .app-container {
    min-height: 100vh;
  }

  /* Мобильные устройства - скрываем авторизацию */
  @media (max-width: 768px) {
    .header {
      display: none !important;
    }
    
    .auth-section {
      display: none !important;
    }
  }

  /* Десктоп - показываем элементы */
  @media (min-width: 769px) {
    .header {
      display: flex;
    }
    
    .auth-section {
      display: block;
    }
  }

  .loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    font-size: 18px;
  }

  /* Стили шапки */
  .header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    z-index: 1000;
  }

  .user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }

  .user-info {
    flex: 1;
  }

  .user-name {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: white;
  }

  .user-meta {
    margin: 0;
    font-size: 12px;
    color: #aaa;
  }

  .button-logout {
    padding: 8px 16px;
    font-size: 14px;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  /* Секция авторизации */
  .auth-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 20px;
    text-align: center;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  }

  .welcome-title {
    font-size: 32px;
    color: white;
    margin: 0 0 16px 0;
  }

  .welcome-text {
    font-size: 16px;
    color: #aaa;
    margin: 0 0 32px 0;
    max-width: 300px;
  }

  .button {
    padding: 14px 32px;
    font-size: 16px;
    font-weight: 600;
    color: white;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .button:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(102, 126, 234, 0.4);
  }
</style>   
    <!-- <Main></Main> -->
    <!-- {:else if error}
    <div class="error">
      {error}
    </div> -->
  {:else if user && session}
    <!-- Шапка -->
    <div class="header row">
      <div class="user-avatar">
        {#if user.user_metadata?.first_name}
          🧛‍♂️
        {:else}
          💩
        {/if}
      </div>
      <div class="user-info">
        <h3 class="user-name">
          {user.user_metadata?.first_name}
          {user.user_metadata?.last_name || ""}
        </h3>
        <p class="user-meta">
          {#if user.user_metadata?.username}
            @{user.user_metadata.username}
          {:else}
            ID: {user.user_metadata?.telegram_id}
          {/if}
        </p>
      </div>
      <button class="button button-logout" onclick={logout}> Выйти </button>
    </div>

    <Main />
  {:else}
    <!-- Аутентификация -->
    <div class="auth-section">
      <h1 class="welcome-title">
        {#if telegramUser}
          Привет, {telegramUser.first_name}!
        {:else}
          Дракула: История
        {/if}
      </h1>

      <p class="welcome-text">
        Погрузитесь в атмосферную историю с интерактивными диалогами
      </p>

      <button class="button" onclick={authenticate}>
        {#if telegramUser}
          Начать историю как {telegramUser.first_name}
        {:else}
          Начать историю
        {/if}
      </button>
    </div>
  {/if}
  <!-- {#if error}
    <div class="error">
      {error}
    </div>
  {/if} -->
</div>
