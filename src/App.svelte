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
  let resetPasswordToken = $state('');

  onMount(async () => {
    // Сохраняем URL сразу при загрузке, потому что он может измениться
    const fullUrl = window.location.href;
    console.log('[App] Initial URL:', fullUrl);

    // Парсим параметры из сохранённого URL
    let accessToken = '';
    let type = '';
    let error = '';
    let errorDescription = '';

    // Проверяем есть ли параметры в URL
    if (fullUrl.includes('token=') || fullUrl.includes('access_token=')) {
      // Из search (?token=xxx)
      const searchMatch = fullUrl.match(/\?([^#]+)/);
      if (searchMatch) {
        const params = new URLSearchParams('?' + searchMatch[1]);
        accessToken = params.get('token') || '';
        type = params.get('type') || '';
        error = params.get('error') || '';
        errorDescription = params.get('error_description') || '';
      }
      
      // Из hash (#access_token=xxx)
      if (!accessToken) {
        const hashMatch = fullUrl.match(/#(.+)$/);
        if (hashMatch) {
          const hashParams = new URLSearchParams(hashMatch[1]);
          accessToken = hashParams.get('access_token') || '';
          type = hashParams.get('type') || '';
          error = hashParams.get('error') || '';
          errorDescription = hashParams.get('error_description') || '';
        }
      }
    }

    console.log('[App] Parsed - Token:', accessToken ? 'found' : 'not found', 'Type:', type, 'Error:', error ? 'yes' : 'no');

    // Если есть ошибка - показываем форму с ошибкой
    if (error) {
      resetPasswordError = errorDescription || error;
      showResetPassword = true;
    }
    // Если есть токен - показываем форму ввода пароля
    else if (accessToken) {
      resetPasswordToken = accessToken;
      showResetPassword = true;
    }
    // Если в URL есть reset-password - показываем пустую форму
    else if (fullUrl.includes('reset-password')) {
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
  <ResetPasswordPage 
    onClose={handleCloseResetPassword} 
    initialError={resetPasswordError}
    initialToken={resetPasswordToken}
  />
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