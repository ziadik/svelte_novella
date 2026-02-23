<script lang="ts">
  import { onMount } from 'svelte';
  import Editor from './lib/editor/Editor.svelte';
  import Main from './lib/novella/Main.svelte';
  import UserMenu from './lib/components/UserMenu.svelte';
  import ResetPasswordPage from './lib/components/ResetPasswordPage.svelte';
  import { editor, editorActions } from './lib/editor/stores/editorStore.svelte';
  import { initAuth, authDerivedState } from './lib/store/authStore.svelte';

  let initialized = $state(false);
  let showResetPassword = $state(false);
  let resetPasswordError = $state('');

  onMount(async () => {
    const url = window.location.href;
    const hash = window.location.hash;
    
    console.log('[App] URL:', url);
    console.log('[App] Hash:', hash);

    // Проверяем hash параметры
    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    const error = hashParams.get('error');
    const errorDescription = hashParams.get('error_description');

    console.log('[App] Hash params:', { accessToken, type, error, errorDescription });

    // Если есть ошибка - показываем форму с ошибкой
    if (error) {
      resetPasswordError = errorDescription || error;
      showResetPassword = true;
    }
    // Если есть access_token - показываем форму ввода пароля (даже без type)
    else if (accessToken) {
      showResetPassword = true;
    }
    // Если в URL есть reset-password - показываем пустую форму
    else if (url.includes('reset-password')) {
      showResetPassword = true;
    }
    
    // Инициализируем auth в любом случае
    await initAuth();
    initialized = true;
  });

  function handleCloseResetPassword() {
    showResetPassword = false;
    resetPasswordError = '';
    // Очищаем URL
    window.history.replaceState({}, '', '/');
  }
</script>

{#if !initialized}
  <div class="loading-screen">
    <div class="loader"></div>
    <p>Загрузка...</p>
  </div>
{:else if showResetPassword}
  <ResetPasswordPage onClose={handleCloseResetPassword} initialError={resetPasswordError} />
{:else if editor.showEditor}
  <button 
    onclick={editorActions.toggleEditor}
    style="position:fixed; top:10px; right:500px; z-index:9999;"
  >
    ← Назад к игре
  </button>
  <Editor />
{:else}
  <UserMenu />
  <Main />
{/if}

<style>
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
    to { transform: rotate(360deg); }
  }
</style>