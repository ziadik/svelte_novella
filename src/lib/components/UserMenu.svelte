<script lang="ts">
  import { authState, authDerivedState, signOut } from '../store/authStore.svelte';
  import AuthModal from './AuthModal.svelte';
  
  let showAuthModal = $state(false);
  let isOpen = $state(false);
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
        <button class="signout-btn" onclick={signOut}>
          Выйти
        </button>
      </div>
    {/if}
  {:else}
    <button 
      class="user-btn login-btn"
      onclick={() => showAuthModal = true}
    >
      🔑
    </button>
  {/if}
  
  {#if showAuthModal}
    <AuthModal onClose={() => showAuthModal = false} />
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
</style>