<script lang="ts">
  import { authState, authDerivedState, signOut } from '../store/authStore.svelte';
  import { editorActions } from '../editor/stores/editorStore.svelte';
  import AuthModal from './AuthModal.svelte';

  let showMenu = $state(false);
  let showAuthModal = $state(false);

  function toggleMenu() {
    showMenu = !showMenu;
  }

  function closeMenu() {
    showMenu = false;
  }

  async function handleSignOut() {
    closeMenu();
    await signOut();
  }

  function openEditor() {
    closeMenu();
    editorActions.toggleEditor();
  }

  function openAuthModal() {
    closeMenu();
    showAuthModal = true;
  }

  async function becomeAuthor() {
    // TODO: добавить функцию запроса на статус автора
    closeMenu();
    alert("Функция запроса статуса автора скоро будет доступна!");
  }
</script>

{#if authDerivedState.isAuthenticated}
  <div class="user-menu-container">
    <button class="user-button" onclick={toggleMenu} aria-label="Меню пользователя">
      <div class="avatar">
        {#if authState.profile?.telegram_photo_url}
          <img src={authState.profile.telegram_photo_url} alt="Аватар" />
        {:else}
          {authState.profile?.telegram_first_name?.[0]?.toUpperCase() || authState.user?.email?.[0]?.toUpperCase() || '?'}
        {/if}
      </div>
      <span class="username">{authState.profile?.telegram_first_name || authState.user?.email?.split('@')[0]}</span>
      {#if authDerivedState.isAuthor}
        <span class="author-badge" title="Автор">✏️</span>
      {/if}
      <span class="arrow">▼</span>
    </button>

    {#if showMenu}
      <div class="dropdown-menu">
        <div class="user-info">
          <div class="user-email">{authState.user?.email}</div>
          {#if authDerivedState.isAuthor}
            <div class="user-role">Автор</div>
          {/if}
        </div>
        <div class="menu-divider"></div>
        
        {#if authDerivedState.isAuthor}
          <button class="menu-item" onclick={openEditor}>
            ✏️ Редактор
          </button>
        {:else}
          <button class="menu-item" onclick={becomeAuthor}>
            📝 Стать автором
          </button>
        {/if}
        
        <button class="menu-item" onclick={closeMenu}>
          👤 Профиль
        </button>
        <div class="menu-divider"></div>
        <button class="menu-item danger" onclick={handleSignOut}>
          🚪 Выйти
        </button>
      </div>
    {/if}
  </div>

  <!-- Закрытие меню при клике вне -->
  {#if showMenu}
    <div class="overlay" onclick={closeMenu} onkeydown={(e) => e.key === 'Escape' && closeMenu()} role="button" tabindex="-1" aria-label="Закрыть меню"></div>
  {/if}
{:else}
  <button class="login-button" onclick={openAuthModal}>
    🔑 Войти
  </button>
{/if}

{#if showAuthModal}
  <AuthModal onClose={() => showAuthModal = false} />
{/if}

<style>
  .user-menu-container {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
  }

  .user-button {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #3c3c3c;
    border: 1px solid #4a4a4a;
    border-radius: 25px;
    padding: 5px 15px 5px 5px;
    cursor: pointer;
    color: #ececec;
    font-size: 0.9rem;
    transition: background 0.2s, box-shadow 0.2s;
  }

  .user-button:hover {
    background: #4a4a4a;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e94560, #c0394d);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 0.9rem;
    overflow: hidden;
  }

  .avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .username {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .arrow {
    font-size: 0.7rem;
    color: #888;
  }

  .dropdown-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 8px;
    background: #2d2d2d;
    border: 1px solid #3c3c3c;
    border-radius: 8px;
    min-width: 180px;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }

  .user-info {
    padding: 12px 15px;
    background: #252526;
  }

  .user-email {
    font-size: 0.8rem;
    color: #888;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .user-role {
    font-size: 0.75rem;
    color: #e94560;
    margin-top: 4px;
    font-weight: 600;
  }

  .author-badge {
    font-size: 0.8rem;
    background: #e94560;
    padding: 2px 5px;
    border-radius: 10px;
  }

  .menu-divider {
    height: 1px;
    background: #3c3c3c;
  }

  .menu-item {
    width: 100%;
    padding: 12px 15px;
    background: none;
    border: none;
    color: #ececec;
    font-size: 0.9rem;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: background 0.2s;
  }

  .menu-item:hover {
    background: #3c3c3c;
  }

  .menu-item.danger {
    color: #e94560;
  }

  .menu-item.danger:hover {
    background: rgba(233, 69, 96, 0.1);
  }

  .overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 9998;
  }

  .login-button {
    position: fixed;
    top: 10px;
    right: 10px;
    z-index: 9999;
    background: linear-gradient(135deg, #4e4c75, #3d3b5c);
    border: 1px solid #5e5c8a;
    border-radius: 20px;
    padding: 8px 16px;
    color: #ececec;
    font-size: 0.9rem;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .login-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 480px) {
    .username {
      display: none;
    }

    .user-button {
      padding: 5px;
      border-radius: 50%;
    }

    .arrow {
      display: none;
    }
  }
</style>
