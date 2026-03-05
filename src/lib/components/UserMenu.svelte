<script lang="ts">
  import { authState, authDerivedState, signOut } from '../store/authStore.svelte';
  import AuthModal from './AuthModal.svelte';
  import Trophies from '../novella/components/Trophies.svelte';
  import { editorActions } from '../editor/stores/editorStore.svelte';
  
  let showAuthModal = $state(false);
  let isOpen = $state(false);
  let showTrophies = $state(false);
  let isOnline = $state(true);
  let isDesktop = $state(false);

  function handleTrophiesClick() {
    isOpen = false;
    showTrophies = true;
  }

  function handleLoginClick() {
    isOpen = false;
    showAuthModal = true;
  }

  function handleEditorClick() {
    if (!isOnline) {
      alert('Редактирование недоступно без интернета');
      return;
    }
    isOpen = false;
    editorActions.toggleEditor();
  }

  // Check online status and desktop
  $effect(() => {
    isOnline = navigator.onLine;
    isDesktop = window.innerWidth >= 769;
    
    const handleOnline = () => { isOnline = true; };
    const handleOffline = () => { isOnline = false; };
    const handleResize = () => { isDesktop = window.innerWidth >= 769; };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', handleResize);
    };
  });
</script>

<div class="user-menu">
  {#if authDerivedState.isAuthenticated}
    <button 
      class="user-btn"
      onclick={() => isOpen = !isOpen}
      title={authState.user?.email || 'Профиль'}
    >
      👤
    </button>
    
    {#if isOpen}
      <div class="user-dropdown">
        <div class="user-email">{authState.user?.email}</div>
        {#if authDerivedState.isAuthor}
          <span class="author-badge">Автор</span>
        {/if}
        <button class="trophies-btn" onclick={handleTrophiesClick}>
          🏆 Трофеи
        </button>
        {#if authDerivedState.isAuthenticated && (authDerivedState.isAuthor || authDerivedState.isAdmin) && isOnline && isDesktop}
          <button class="editor-btn-dropdown" onclick={handleEditorClick}>
            ✏️ Редактор
          </button>
        {/if}
        <button class="signout-btn" onclick={signOut}>
          Выйти
        </button>
      </div>
    {/if}
  {:else}
    <!-- Для гостей - кнопка профиля с выпадающим меню -->
    <button 
      class="user-btn login-btn"
      onclick={() => isOpen = !isOpen}
      title="Профиль"
    >
      👤
    </button>
    
    {#if isOpen}
      <div class="user-dropdown">
        <div class="guest-label">Гость</div>
        <button class="trophies-btn" onclick={handleTrophiesClick}>
          🏆 Мои трофеи
        </button>
        <button class="login-btn-dropdown" onclick={handleLoginClick}>
          🔑 Войти
        </button>
      </div>
    {/if}
  {/if}
  
  {#if showAuthModal}
    <AuthModal onClose={() => showAuthModal = false} />
  {/if}

  {#if showTrophies}
    <Trophies onClose={() => showTrophies = false} />
  {/if}
</div>

<style>
  :root {
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-left: env(safe-area-inset-left, 0px);
    --safe-area-right: env(safe-area-inset-right, 0px);
  }

  .user-menu {
    position: fixed;
    top: calc(16px + var(--safe-area-top));
    right: calc(16px + var(--safe-area-right));
    z-index: 1000;
  }
  
  /* Кнопка редактора - desktop only */
  .editor-btn {
    position: fixed;
    top: calc(16px + var(--safe-area-top));
    right: calc(70px + var(--safe-area-right));
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: rgba(102, 126, 234, 0.8);
    color: white;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
    z-index: 1000;
    display: none;
  }

  .editor-btn:hover {
    background: rgba(102, 126, 234, 1);
    transform: scale(1.1);
  }

  .user-btn {
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
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .user-btn:hover {
    background: rgba(233, 69, 96, 0.8);
    transform: scale(1.1);
  }

  .login-btn {
    background: rgba(102, 126, 234, 0.6);
  }

  .login-btn:hover {
    background: rgba(102, 126, 234, 1);
  }

  .user-dropdown {
    position: absolute;
    top: 52px;
    right: 0;
    background: rgba(37, 37, 38, 0.95);
    padding: 12px;
    border-radius: 12px;
    border: 1px solid #3c3c3c;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    min-width: 180px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .user-email {
    color: #ececec;
    font-size: 0.85rem;
    word-break: break-all;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }

  .author-badge {
    background: #e94560;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    align-self: flex-start;
  }

  .trophies-btn {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 170, 0, 0.1));
    color: #ffd700;
    border: 1px solid rgba(255, 215, 0, 0.3);
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.3s ease;
    text-align: left;
  }

  .trophies-btn:hover {
    background: linear-gradient(135deg, rgba(255, 215, 0, 0.3), rgba(255, 170, 0, 0.2));
    border-color: #ffd700;
  }

  .signout-btn {
    background: rgba(233, 69, 96, 0.8);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.3s ease;
  }

  .signout-btn:hover {
    background: #e94560;
    transform: translateY(-1px);
  }

  .guest-label {
    color: #888;
    font-size: 0.85rem;
    text-align: center;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    margin-bottom: 4px;
  }

  .login-btn-dropdown {
    background: rgba(102, 126, 234, 0.8);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.3s ease;
    text-align: left;
  }

  .login-btn-dropdown:hover {
    background: rgba(102, 126, 234, 1);
    transform: translateY(-1px);
  }

  .editor-btn-dropdown {
    background: rgba(102, 126, 234, 0.6);
    color: white;
    border: 1px solid rgba(102, 126, 234, 0.5);
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
    transition: all 0.3s ease;
    text-align: left;
  }

  .editor-btn-dropdown:hover {
    background: rgba(102, 126, 234, 1);
    border-color: rgba(102, 126, 234, 1);
  }

  /* Desktop only */
  .desktop-only {
    display: none;
  }

  @media (min-width: 769px) {
    .desktop-only {
      display: flex;
    }
  }
</style>