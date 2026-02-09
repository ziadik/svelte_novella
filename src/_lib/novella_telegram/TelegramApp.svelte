<script>
// @ts-nocheck

  // @ts-ignore
  import { onMount, setContext } from "svelte";
  // @ts-ignore
  import { supabase, getTmaAuthInvoke } from "../supabaseClient.js";
  import { initializeTelegram, getTelegramUser } from "../telegram.js";
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
    try {
      await supabase.auth.signOut();
      user = null;
      session = null;
    } catch (err) {
      // @ts-ignore
      error = "Ошибка выхода: " + err.message;
    }
  }

  // Добавляем обработчик события
  onMount(() => {
    //    window.addEventListener('dialogueChange', handleDialogueChange)
    //    return () => window.removeEventListener('dialogueChange', handleDialogueChange)
  });
</script>

<div>
  {#if isLoading}
    <div class="loading">
      <p>Загрузка...</p>
    </div>   
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
