<script lang="ts">
  import { authState, authDerivedState, signOut } from '../store/authStore.svelte';
  import AuthModal from './AuthModal.svelte';
  
  let showAuthModal = $state(false);
</script>

<div class="user-menu">
  {#if authDerivedState.isAuthenticated}
    <div class="user-info">
      <span class="user-email">{authState.user?.email}</span>
      {#if authDerivedState.isAuthor}
        <span class="author-badge">Автор</span>
      {/if}
      <button onclick={signOut}>Выйти</button>
    </div>
  {:else}
    <button onclick={() => showAuthModal = true}>Войти</button>
  {/if}
  
  {#if showAuthModal}
    <AuthModal onClose={() => showAuthModal = false} />
  {/if}
</div>

<style>
  .user-menu {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 1000;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    background: rgba(37, 37, 38, 0.95);
    padding: 8px 15px;
    border-radius: 20px;
    border: 1px solid #3c3c3c;
    backdrop-filter: blur(5px);
    box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  }
  
  .user-email {
    color: #ececec;
    font-size: 0.9rem;
  }
  
  .author-badge {
    background: #e94560;
    color: white;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: bold;
  }
  
  .signin-btn, .signout-btn {
    background: linear-gradient(135deg, #e94560, #c0394d);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.9rem;
    font-weight: 500;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .signin-btn:hover, .signout-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(233, 69, 96, 0.4);
  }
</style>