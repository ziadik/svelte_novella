<!-- src/components/layout/Header.svelte -->
<script lang="ts">
  import { currentStory, stories } from '../../stores/storyStore'
  import { gameStore } from '../../stores/gameStore'
  
  const { currentView } = $props<{
    currentView: 'select' | 'editor' | 'game'
  }>()
  
  const { onViewChange } = $props<{
    onViewChange?: (view: 'select' | 'editor' | 'game') => void
  }>()
  
  // Состояния
  let showStoryMenu = $state(false)
  let showUserMenu = $state(false)
  let showNotifications = $state(false)
  let showSearch = $state(false)
  let searchQuery = $state('')
  
  // Уведомления
  const notifications = $state([
    { id: 1, text: 'История "Дракула" обновлена', time: '5 мин назад', read: false, type: 'update' },
    { id: 2, text: 'Новый комментарий к сцене 12', time: '2 часа назад', read: true, type: 'comment' },
    { id: 3, text: 'Автосохранение выполнено', time: '10:30', read: true, type: 'save' }
  ])
  
  const unreadNotifications = $derived(notifications.filter(n => !n.read).length)
  
  // Пользователь (заглушка, можно интегрировать с auth)
  const user = $state({
    name: 'Редактор',
    avatar: null,
    role: 'admin'
  })
  
  // Навигация
  const navItems = [
    { id: 'select', label: '📚 Библиотека', icon: '📚' },
    { id: 'editor', label: '✏️ Редактор', icon: '✏️', disabled: !$currentStory },
    { id: 'game', label: '🎮 Игра', icon: '🎮', disabled: !$currentStory }
  ]
  
  // Переключение вида
  function handleNavClick(view: 'select' | 'editor' | 'game') {
    onViewChange?.(view)
  }
  
  // Переключение истории
  function switchStory(storyId: string) {
    const story = $stories.find(s => s.id === storyId)
    if (story) {
      currentStory.set(story)
      showStoryMenu = false
    }
  }
  
  // Маркдаун для отображения названия
  function truncateText(text: string, maxLength: number = 30): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  }
  
  // Поиск
  function handleSearch(e: Event) {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Здесь можно реализовать поиск
      console.log('Поиск:', searchQuery)
      showSearch = false
      searchQuery = ''
    }
  }
  
  // Обработчики клавиш
  $effect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + K для поиска
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        showSearch = true
        setTimeout(() => {
          const input = document.querySelector('.search-input') as HTMLInputElement
          input?.focus()
        }, 10)
      }
      
      // Escape для закрытия меню
      if (e.key === 'Escape') {
        showStoryMenu = false
        showUserMenu = false
        showNotifications = false
        showSearch = false
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  })
</script>

<header class="header">
  <!-- Логотип и название приложения -->
  <div class="header-left">
    <div class="logo">
      <div class="logo-icon">📖</div>
      <h1 class="app-title">Novella Editor</h1>
      <span class="app-version">v3.1</span>
    </div>
    
    <!-- Навигация -->
    <nav class="main-nav">
      {#each navItems as item}
        <button
          class:active={currentView === item.id}
          class="nav-btn"
          on:click={() => handleNavClick(item.id as any)}
          disabled={item.disabled}
          title={item.label}
        >
          <span class="nav-icon">{item.icon}</span>
          <span class="nav-label">{item.label}</span>
        </button>
      {/each}
    </nav>
  </div>
  
  <!-- Центральная часть: Текущая история и поиск -->
  <div class="header-center">
    <!-- Текущая история -->
    {#if $currentStory && currentView !== 'select'}
      <div class="current-story-info">
        <button
          class="story-selector"
          on:click={() => showStoryMenu = !showStoryMenu}
          title="Сменить историю"
        >
          <span class="story-icon">📘</span>
          <div class="story-details">
            <span class="story-title">
              {truncateText($currentStory.name, 25)}
            </span>
            <span class="story-meta">
              {$currentStory.bucket} • {$currentStory.defaultFile}
            </span>
          </div>
          <span class="dropdown-arrow">▼</span>
        </button>
        
        <!-- Меню выбора истории -->
        {#if showStoryMenu}
          <div class="story-dropdown">
            <div class="dropdown-header">
              <h3>Ваши истории</h3>
              <button
                class="btn-icon close-btn"
                on:click={() => showStoryMenu = false}
              >
                ×
              </button>
            </div>
            
            <div class="stories-list">
              {#each $stories as story}
                <div
                  class:active={$currentStory?.id === story.id}
                  class="story-item"
                  on:click={() => switchStory(story.id)}
                >
                  <div class="story-item-icon">📖</div>
                  <div class="story-item-content">
                    <div class="story-item-title">{story.name}</div>
                    <div class="story-item-meta">
                      <span class="bucket">{story.bucket}</span>
                      {#if story.description}
                        <span class="description">• {story.description}</span>
                      {/if}
                    </div>
                  </div>
                  {#if $currentStory?.id === story.id}
                    <div class="current-indicator">✓</div>
                  {/if}
                </div>
              {:else}
                <div class="empty-stories">
                  <div class="empty-icon">📚</div>
                  <div class="empty-text">Нет историй</div>
                </div>
              {/each}
            </div>
            
            <div class="dropdown-footer">
              <button class="btn primary small">
                + Новая история
              </button>
            </div>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Поиск в библиотеке -->
      <div class="search-container">
        <form on:submit={handleSearch}>
          <div class="search-input-wrapper">
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Поиск историй, сцен, предметов..."
              class="search-input"
            />
            <button type="submit" class="search-btn">
              🔍
            </button>
          </div>
        </form>
      </div>
    {/if}
  </div>
  
  <!-- Правая часть: Пользователь и уведомления -->
  <div class="header-right">
    <!-- Кнопка поиска (только на мобильных) -->
    <button
      class="btn-icon search-toggle"
      on:click={() => showSearch = true}
      title="Поиск (Ctrl+K)"
    >
      🔍
    </button>
    
    <!-- Информация о текущей игре -->
    {#if currentView === 'game' && $gameStore.currentDialogue}
      <div class="game-info">
        <div class="game-progress">
          <span class="progress-label">Прогресс:</span>
          <span class="progress-value">
            {$gameStore.progress?.completedDialogues?.length || 0}/{$gameStore.storyData?.dialogues?.length || 0}
          </span>
        </div>
        <div class="game-stats">
          <span class="stat-item" title="Знания">
            🧠 {$gameStore.player?.stats?.knowledge || 0}
          </span>
          <span class="stat-item" title="Храбрость">
            ⚔️ {$gameStore.player?.stats?.courage || 0}
          </span>
          <span class="stat-item" title="Харизма">
            💬 {$gameStore.player?.stats?.charisma || 0}
          </span>
        </div>
      </div>
    {/if}
    
    <!-- Уведомления -->
    <div class="notifications-container">
      <button
        class="btn-icon notifications-btn"
        on:click={() => {
          showNotifications = !showNotifications
          showUserMenu = false
        }}
        title="Уведомления"
      >
        {#if unreadNotifications > 0}
          <span class="notification-badge">{unreadNotifications}</span>
        {/if}
        🔔
      </button>
      
      <!-- Выпадающее меню уведомлений -->
      {#if showNotifications}
        <div class="notifications-dropdown">
          <div class="dropdown-header">
            <h3>Уведомления</h3>
            <button
              class="btn-icon clear-btn"
              on:click={() => {
                notifications.forEach(n => n.read = true)
              }}
              title="Пометить все как прочитанные"
            >
              ✕
            </button>
          </div>
          
          <div class="notifications-list">
            {#each notifications as notification}
              <div class:unread={!notification.read} class="notification-item">
                <div class="notification-icon">
                  {#if notification.type === 'update'}🔄
                  {:else if notification.type === 'comment'}💬
                  {:else if notification.type === 'save'}💾
                  {:else}🔔{/if}
                </div>
                <div class="notification-content">
                  <div class="notification-text">{notification.text}</div>
                  <div class="notification-time">{notification.time}</div>
                </div>
                {#if !notification.read}
                  <div class="unread-dot"></div>
                {/if}
              </div>
            {:else}
              <div class="empty-notifications">
                <div class="empty-icon">📭</div>
                <div class="empty-text">Нет уведомлений</div>
              </div>
            {/each}
          </div>
          
          <div class="dropdown-footer">
            <button class="btn small">Показать все</button>
          </div>
        </div>
      {/if}
    </div>
    
    <!-- Профиль пользователя -->
    <div class="user-container">
      <button
        class="user-btn"
        on:click={() => {
          showUserMenu = !showUserMenu
          showNotifications = false
        }}
        title="Профиль пользователя"
      >
        <div class="user-avatar">
          {#if user.avatar}
            <img src={user.avatar} alt={user.name} />
          {:else}
            <div class="avatar-placeholder">
              {user.name.charAt(0)}
            </div>
          {/if}
        </div>
        <span class="user-name">{user.name}</span>
        <span class="dropdown-arrow">▼</span>
      </button>
      
      <!-- Выпадающее меню пользователя -->
      {#if showUserMenu}
        <div class="user-dropdown">
          <div class="user-info">
            <div class="user-info-avatar">
              {#if user.avatar}
                <img src={user.avatar} alt={user.name} />
              {:else}
                <div class="avatar-placeholder large">
                  {user.name.charAt(0)}
                </div>
              {/if}
            </div>
            <div class="user-info-details">
              <div class="user-info-name">{user.name}</div>
              <div class="user-info-role">{user.role}</div>
            </div>
          </div>
          
          <div class="user-menu">
            <a href="#" class="menu-item">
              <span class="menu-icon">👤</span>
              <span class="menu-text">Профиль</span>
            </a>
            <a href="#" class="menu-item">
              <span class="menu-icon">⚙️</span>
              <span class="menu-text">Настройки</span>
            </a>
            <a href="#" class="menu-item">
              <span class="menu-icon">💬</span>
              <span class="menu-text">Обратная связь</span>
            </a>
            <a href="#" class="menu-item">
              <span class="menu-icon">📖</span>
              <span class="menu-text">Документация</span>
            </a>
            
            <div class="menu-divider"></div>
            
            <button class="menu-item logout">
              <span class="menu-icon">🚪</span>
              <span class="menu-text">Выйти</span>
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
  
  <!-- Модалка поиска (на весь экран) -->
  {#if showSearch}
    <div class="search-modal">
      <div class="search-modal-content">
        <div class="search-modal-header">
          <h2>Поиск</h2>
          <button
            class="btn-icon close-btn"
            on:click={() => {
              showSearch = false
              searchQuery = ''
            }}
          >
            ×
          </button>
        </div>
        
        <div class="search-modal-body">
          <form on:submit={handleSearch}>
            <div class="search-modal-input">
              <input
                type="text"
                bind:value={searchQuery}
                placeholder="Что вы ищете? Попробуйте: истории, сцены, персонажи..."
                class="search-input large"
                autofocus
              />
              <button type="submit" class="search-btn large">
                🔍
              </button>
            </div>
          </form>
          
          <!-- Подсказки поиска -->
          <div class="search-hints">
            <div class="hints-title">Популярные запросы:</div>
            <div class="hints-list">
              <button class="hint-tag" on:click={() => searchQuery = 'диалог'}>диалог</button>
              <button class="hint-tag" on:click={() => searchQuery = 'персонаж'}>персонаж</button>
              <button class="hint-tag" on:click={() => searchQuery = 'предмет'}>предмет</button>
              <button class="hint-tag" on:click={() => searchQuery = 'глава 1'}>глава 1</button>
              <button class="hint-tag" on:click={() => searchQuery = 'концовка'}>концовка</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</header>

<style>
  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 24px;
    height: 64px;
    background: linear-gradient(135deg, 
      rgba(30, 30, 46, 0.95), 
      rgba(26, 26, 38, 0.98));
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
    z-index: 100;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.2);
  }
  
  .header-left,
  .header-right {
    display: flex;
    align-items: center;
    gap: 20px;
    flex: 1;
  }
  
  .header-right {
    justify-content: flex-end;
  }
  
  .header-center {
    flex: 2;
    display: flex;
    justify-content: center;
    min-width: 0;
  }
  
  /* Логотип */
  .logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  
  .logo-icon {
    font-size: 28px;
    animation: pulse 2s infinite;
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.8; }
  }
  
  .app-title {
    font-size: 20px;
    font-weight: 700;
    background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0;
  }
  
  .app-version {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.05);
    padding: 2px 8px;
    border-radius: 10px;
  }
  
  /* Навигация */
  .main-nav {
    display: flex;
    gap: 8px;
    margin-left: 20px;
  }
  
  .nav-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid transparent;
    border-radius: 12px;
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
  }
  
  .nav-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    transform: translateY(-1px);
  }
  
  .nav-btn.active {
    background: rgba(0, 122, 204, 0.2);
    border-color: rgba(0, 122, 204, 0.4);
    color: white;
  }
  
  .nav-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  
  .nav-icon {
    font-size: 16px;
  }
  
  .nav-label {
    @media (max-width: 1024px) {
      display: none;
    }
  }
  
  /* Текущая история */
  .current-story-info {
    position: relative;
  }
  
  .story-selector {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
    min-width: 250px;
    max-width: 400px;
  }
  
  .story-selector:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-1px);
  }
  
  .story-icon {
    font-size: 20px;
    flex-shrink: 0;
  }
  
  .story-details {
    flex: 1;
    min-width: 0;
    text-align: left;
  }
  
  .story-title {
    display: block;
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .story-meta {
    display: block;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .dropdown-arrow {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    transition: transform 0.2s;
  }
  
  .story-selector:hover .dropdown-arrow {
    transform: rotate(180deg);
  }
  
  /* Выпадающее меню истории */
  .story-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: rgba(30, 30, 40, 0.98);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    z-index: 1000;
    min-width: 300px;
    max-width: 400px;
    max-height: 500px;
    overflow: hidden;
    animation: slideDown 0.3s ease-out;
  }
  
  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  .dropdown-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .dropdown-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: white;
  }
  
  .btn-icon {
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 20px;
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    transition: all 0.2s;
  }
  
  .btn-icon:hover {
    background: rgba(255, 255, 255, 0.1);
    color: white;
  }
  
  .stories-list {
    max-height: 350px;
    overflow-y: auto;
    padding: 8px;
  }
  
  .story-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
    margin-bottom: 4px;
  }
  
  .story-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .story-item.active {
    background: rgba(0, 122, 204, 0.15);
    border: 1px solid rgba(0, 122, 204, 0.3);
  }
  
  .story-item-icon {
    font-size: 20px;
    flex-shrink: 0;
  }
  
  .story-item-content {
    flex: 1;
    min-width: 0;
  }
  
  .story-item-title {
    font-weight: 500;
    color: white;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .story-item-meta {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.5);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .bucket {
    font-family: monospace;
    background: rgba(255, 255, 255, 0.05);
    padding: 1px 4px;
    border-radius: 4px;
  }
  
  .current-indicator {
    color: #4caf50;
    font-weight: bold;
    flex-shrink: 0;
  }
  
  .empty-stories {
    padding: 40px 20px;
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
  }
  
  .empty-icon {
    font-size: 36px;
    margin-bottom: 12px;
    opacity: 0.5;
  }
  
  .empty-text {
    font-size: 14px;
  }
  
  .dropdown-footer {
    padding: 16px 20px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    text-align: center;
  }
  
  .btn {
    padding: 8px 16px;
    background: rgba(0, 122, 204, 0.2);
    border: 1px solid rgba(0, 122, 204, 0.4);
    border-radius: 10px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn:hover {
    background: rgba(0, 122, 204, 0.3);
    transform: translateY(-1px);
  }
  
  .btn.primary {
    background: linear-gradient(135deg, #667eea, #764ba2);
    border: none;
  }
  
  .btn.small {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  /* Поиск */
  .search-container {
    width: 100%;
    max-width: 500px;
  }
  
  .search-input-wrapper {
    position: relative;
    width: 100%;
  }
  
  .search-input {
    width: 100%;
    padding: 10px 16px 10px 44px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: white;
    font-size: 14px;
    transition: all 0.2s;
  }
  
  .search-input:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.12);
    border-color: rgba(0, 122, 204, 0.5);
    box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
  }
  
  .search-input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  
  .search-btn {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    font-size: 16px;
    cursor: pointer;
    padding: 4px;
  }
  
  .search-toggle {
    display: none;
  }
  
  /* Информация об игре */
  .game-info {
    display: flex;
    align-items: center;
    gap: 20px;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .game-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .progress-label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
  }
  
  .progress-value {
    font-weight: 600;
    color: white;
    font-size: 14px;
  }
  
  .game-stats {
    display: flex;
    gap: 12px;
  }
  
  .stat-item {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  /* Уведомления */
  .notifications-container {
    position: relative;
  }
  
  .notifications-btn {
    position: relative;
  }
  
  .notification-badge {
    position: absolute;
    top: -6px;
    right: -6px;
    background: #ff4757;
    color: white;
    font-size: 10px;
    font-weight: bold;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgba(30, 30, 46, 0.95);
  }
  
  .notifications-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: rgba(30, 30, 40, 0.98);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    z-index: 1000;
    width: 320px;
    max-height: 400px;
    overflow: hidden;
    animation: slideDown 0.3s ease-out;
  }
  
  .notifications-list {
    max-height: 300px;
    overflow-y: auto;
    padding: 8px;
  }
  
  .notification-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    border-radius: 12px;
    margin-bottom: 4px;
    position: relative;
  }
  
  .notification-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .notification-item.unread {
    background: rgba(0, 122, 204, 0.1);
  }
  
  .notification-icon {
    font-size: 18px;
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  .notification-content {
    flex: 1;
    min-width: 0;
  }
  
  .notification-text {
    color: white;
    font-size: 13px;
    line-height: 1.4;
    margin-bottom: 4px;
  }
  
  .notification-time {
    color: rgba(255, 255, 255, 0.4);
    font-size: 11px;
  }
  
  .unread-dot {
    width: 8px;
    height: 8px;
    background: #4caf50;
    border-radius: 50%;
    flex-shrink: 0;
    margin-top: 8px;
  }
  
  .empty-notifications {
    padding: 40px 20px;
    text-align: center;
    color: rgba(255, 255, 255, 0.5);
  }
  
  /* Пользователь */
  .user-container {
    position: relative;
  }
  
  .user-btn {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 12px 4px 4px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    color: white;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .user-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .user-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    background: linear-gradient(135deg, #667eea, #764ba2);
  }
  
  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    color: white;
  }
  
  .user-name {
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
  }
  
  .user-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: rgba(30, 30, 40, 0.98);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
    z-index: 1000;
    width: 280px;
    overflow: hidden;
    animation: slideDown 0.3s ease-out;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .user-info-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    overflow: hidden;
    background: linear-gradient(135deg, #667eea, #764ba2);
  }
  
  .avatar-placeholder.large {
    font-size: 20px;
  }
  
  .user-info-details {
    flex: 1;
    min-width: 0;
  }
  
  .user-info-name {
    font-weight: 600;
    color: white;
    font-size: 16px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .user-info-role {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    margin-top: 2px;
  }
  
  .user-menu {
    padding: 8px;
  }
  
  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    width: 100%;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    text-align: left;
    cursor: pointer;
    border-radius: 10px;
    transition: all 0.2s;
    text-decoration: none;
  }
  
  .menu-item:hover {
    background: rgba(255, 255, 255, 0.05);
    color: white;
  }
  
  .menu-icon {
    font-size: 16px;
    width: 24px;
    text-align: center;
  }
  
  .menu-divider {
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    margin: 8px 16px;
  }
  
  .menu-item.logout {
    color: #ff6b6b;
  }
  
  .menu-item.logout:hover {
    background: rgba(255, 107, 107, 0.1);
  }
  
  /* Модалка поиска */
  .search-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    backdrop-filter: blur(20px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.3s ease-out;
  }
  
  .search-modal-content {
    width: 90%;
    max-width: 700px;
    background: rgba(30, 30, 40, 0.95);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }
  
  .search-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .search-modal-header h2 {
    margin: 0;
    font-size: 24px;
    font-weight: 600;
    color: white;
  }
  
  .search-modal-body {
    padding: 32px;
  }
  
  .search-modal-input {
    position: relative;
    margin-bottom: 32px;
  }
  
  .search-input.large {
    padding: 20px 24px 20px 60px;
    font-size: 18px;
    border-radius: 16px;
  }
  
  .search-btn.large {
    left: 20px;
    font-size: 24px;
  }
  
  .search-hints {
    padding-top: 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .hints-title {
    color: rgba(255, 255, 255, 0.6);
    font-size: 14px;
    margin-bottom: 12px;
  }
  
  .hints-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .hint-tag {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 20px;
    padding: 8px 16px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .hint-tag:hover {
    background: rgba(255, 255, 255, 0.12);
    color: white;
    transform: translateY(-1px);
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  /* Адаптивность */
  @media (max-width: 1200px) {
    .header {
      padding: 0 16px;
    }
    
    .game-info {
      display: none;
    }
  }
  
  @media (max-width: 992px) {
    .header-left {
      flex: 0;
    }
    
    .app-title {
      display: none;
    }
    
    .main-nav {
      margin-left: 0;
    }
    
    .header-center {
      flex: 3;
    }
    
    .story-selector {
      min-width: 200px;
    }
  }
  
  @media (max-width: 768px) {
    .header {
      height: 56px;
    }
    
    .logo-icon {
      font-size: 24px;
    }
    
    .main-nav {
      gap: 4px;
    }
    
    .nav-btn {
      padding: 8px 12px;
    }
    
    .nav-icon {
      font-size: 14px;
    }
    
    .search-container {
      display: none;
    }
    
    .search-toggle {
      display: flex;
    }
    
    .story-selector {
      min-width: 180px;
      padding: 6px 12px;
    }
    
    .user-name {
      display: none;
    }
    
    .user-btn {
      padding: 4px;
    }
    
    .story-dropdown,
    .notifications-dropdown,
    .user-dropdown {
      position: fixed;
      top: 56px;
      left: 0;
      right: 0;
      width: auto;
      border-radius: 0;
      border-left: none;
      border-right: none;
      max-height: calc(100vh - 56px);
    }
  }
  
  @media (max-width: 480px) {
    .header {
      padding: 0 12px;
    }
    
    .nav-btn {
      padding: 8px;
      justify-content: center;
    }
    
    .story-selector {
      min-width: 150px;
    }
    
    .app-version {
      display: none;
    }
  }
</style>