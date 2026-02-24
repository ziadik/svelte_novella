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

  async function handleAuthCallback() {
    const hash = window.location.hash;
    const search = window.location.search;
    
    console.log('[App] Checking auth callback:', { hash, search });

    // Проверяем тип recovery (сброс пароля)
    if (hash.includes('type=recovery') || search.includes('type=recovery')) {
      console.log('[App] Recovery flow detected');
      
      // Извлекаем токен из hash или search
      let accessToken = '';
      
      if (hash.includes('access_token=')) {
        const hashParams = new URLSearchParams(hash.substring(1));
        accessToken = hashParams.get('access_token') || '';
      } else if (search.includes('token=')) {
        const searchParams = new URLSearchParams(search);
        accessToken = searchParams.get('token') || '';
      }

      if (accessToken) {
        resetPasswordToken = accessToken;
        showResetPassword = true;
        
        // Очищаем URL от токенов
        window.history.replaceState({}, '', '/reset-password');
      }
    }
    // Проверяем ошибки
    else if (search.includes('error=')) {
      const params = new URLSearchParams(search);
      resetPasswordError = params.get('error_description') || params.get('error') || 'Unknown error';
      showResetPassword = true;
      window.history.replaceState({}, '', '/reset-password');
    }
    // Проверяем прямой переход на /reset-password
    else if (window.location.pathname === '/reset-password') {
      showResetPassword = true;
    }
  }

  onMount(async () => {
    console.log('[App] Mounted');
    
    // Проверяем callback от Supabase
    await handleAuthCallback();
    
    // Инициализируем auth
    await initAuth();
    initialized = true;
  });

  function handleCloseResetPassword() {
    showResetPassword = false;
    resetPasswordError = '';
    resetPasswordToken = '';
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