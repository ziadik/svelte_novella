<script lang="ts">
  import { onMount } from 'svelte';
  import { editor } from '../stores/editorStore.svelte';
  import { getStoriesList } from '../stores/bucketStore';
  import { storyActions } from '../stores/storyStore';
  import { resourceActions } from '../stores/resourceStore';
  import { authState, authDerivedState } from '../../store/authStore.svelte';
  import { storiesState, getPublicStories, getPlayerStories, getAuthorStories, loadStories, createStory, updateStory, deleteStory, type Story } from '../../store/storiesStore.svelte';

  let showCreateModal = $state(false);
  let newStoryTitle = $state('');
  let newStoryBucket = $state('stories');
  let creating = $state(false);

  // Информация об историях (для обратной совместимости)
  const storiesInfo: Record<string, { title: string; description: string; icon: string }> = {
    dracula: { title: 'Дракула', description: 'Тёмная готическая история о вампире', icon: '🧛' },
    zombie: { title: 'Выживание', description: 'Постапокалиптическая история о зомби', icon: '🧟' },
    fairy_tale: { title: 'Сказка', description: 'Волшебная история с феями', icon: '🧚' },
    minigames: { title: 'Мини-игры', description: 'Демонстрация мини-игр', icon: '🎮' }
  };

  onMount(async () => {
    await loadStories();
    getStoriesList();
  });

  function loadBuckets() {
    getStoriesList();
  }

  async function handleSelectBucket(bucketName: string) {
    editor.selectedBucket = bucketName;
    editor.data = {
      meta: { version: "3.1", title: "Новая история" },
      dialogues: [], chapters: [], items: [], miniGames: []
    };
    await resourceActions.loadStoriesList();
    await resourceActions.loadStoredResources();
  }

  async function handleSelectStory(story: Story) {
    // Устанавливаем флаг ручного выбора истории
    editor.manualStorySelected = true;
    // Используем bucket из истории, по умолчанию 'stories'
    const bucket = story.bucket || 'stories';
    editor.selectedBucket = bucket;
    // json_url теперь содержит только имя файла
    editor.currentFileName = story.json_url;
    // Загружаем ресурсы из правильного bucket'а
    await resourceActions.loadStoredResources();
    // Загружаем историю
    await storyActions.loadStory(editor.currentFileName);
  }

  // // Функция для выбора старого bucket'а (обратная совместимость)
  // async function handleSelectBucket(bucketName: string) {
  //   editor.manualStorySelected = false;
  //   editor.selectedBucket = bucketName;
  //   // При выборе старого bucket'а сбрасываем флаг
  //   // Загрузка произойдёт автоматически через $effect в Editor.svelte
  // }

  async function handleCreateStory() {
    if (!newStoryTitle.trim()) return;
    creating = true;

    const result = await createStory(newStoryTitle.trim(), newStoryBucket);
    if (result.success && result.story) {
      showCreateModal = false;
      newStoryTitle = '';
      newStoryBucket = 'stories';
      await handleSelectStory(result.story);
    } else {
      alert(result.error || 'Ошибка создания истории');
    }
    creating = false;
  }

  async function handleTogglePublic(story: Story) {
    await updateStory(story.id, { is_public: !story.is_public });
  }

  async function handleDeleteStory(story: Story) {
    if (confirm(`Удалить историю "${story.title}"?`)) {
      await deleteStory(story.id);
    }
  }
</script>

<div class="story-selector">
  <!-- Только для авторов и админов -->
  {#if authDerivedState.isAuthor || authDerivedState.isAdmin}
    <div class="selector-header">
      <h2>📝 Мои истории</h2>
      <button class="btn btn-primary" onclick={() => showCreateModal = true}>
        + Создать историю
      </button>
    </div>

    <!-- Истории из таблицы -->
    {#if storiesState.initialized}
      <!-- Для авторов: их истории -->
      {#if getAuthorStories().length > 0}
        <div class="stories-section">
          <div class="stories-grid">
            {#each getAuthorStories() as story (story.id)}
              <div class="story-card author-card">
                <div class="story-icon">{story.preview_image_url ? '🖼️' : '📖'}</div>
                <div class="story-content">
                  <h4>{story.title}</h4>
                  <span class="story-status" class:public={story.is_public}>
                    {story.is_public ? '🌍 Публичная' : '🔒 Приватная'}
                  </span>
                </div>
                <div class="story-actions">
                  <button class="btn small" onclick={() => handleSelectStory(story)}>Открыть</button>
                  <button class="btn small" onclick={() => handleTogglePublic(story)}>
                    {story.is_public ? 'Скрыть' : 'Опубликовать'}
                  </button>
                  <button class="btn small danger" onclick={() => handleDeleteStory(story)}>✕</button>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <p class="empty-text">У вас пока нет историй. Создайте первую!</p>
      {/if}
    {:else}
      <p>Загрузка историй...</p>
    {/if}

    <!-- Старые bucket'ы (для обратной совместимости) -->
    <div class="stories-section">
      <h3>📚 Архивные истории</h3>
      <div class="stories-grid">
        {#each editor.availableBuckets as bucket (bucket.name)}
          {@const info = storiesInfo[bucket.id] || { title: bucket.name, description: 'История', icon: '📖' }}
          <div class="story-card" class:selected={editor.selectedBucket === bucket.name}>
            <div class="story-icon">{info.icon}</div>
            <div class="story-content">
              <h4>{info.title}</h4>
              <p>{info.description}</p>
            </div>
            <div class="story-actions">
              {#if editor.selectedBucket === bucket.name}
                <span class="selected-badge">Выбрано</span>
              {:else}
                <button class="btn small" onclick={() => handleSelectBucket(bucket.name)}>Выбрать</button>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="access-denied">
      <h2>🔒 Доступ запрещён</h2>
      <p>Редактирование историй доступно только авторам и администраторам.</p>
      <p>Станьте автором, чтобы создавать и редактировать истории.</p>
    </div>
  {/if}
</div>

<!-- Модальное окно создания истории -->
{#if showCreateModal}
  <div class="modal-overlay" onclick={() => showCreateModal = false} role="dialog">
    <div class="modal" onclick={(e) => e.stopPropagation()}>
      <h3>Создать новую историю</h3>
      <div class="form-group">
        <label for="story-title">Название истории</label>
        <input 
          type="text" 
          id="story-title"
          bind:value={newStoryTitle} 
          placeholder="Например: Приключения в замке"
          class="input"
        />
      </div>
      <div class="form-group">
        <label for="story-bucket">Bucket для ресурсов</label>
        <select id="story-bucket" bind:value={newStoryBucket} class="input">
          <option value="stories">stories (по умолчанию)</option>
          <option value="dracula">dracula</option>
          <option value="zombie">zombie</option>
          <option value="fairy_tale">fairy_tale</option>
          <option value="minigames">minigames</option>
        </select>
        <small class="hint">Выберите bucket в котором будут храниться ресурсы истории</small>
      </div>
      <div class="modal-actions">
        <button class="btn" onclick={() => showCreateModal = false}>Отмена</button>
        <button class="btn primary" onclick={handleCreateStory} disabled={creating || !newStoryTitle.trim()}>
          {creating ? 'Создание...' : 'Создать'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .story-selector {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    color: white;
    font-family: sans-serif;
  }

  .selector-header {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 30px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .selector-header h2 {
    font-size: 28px;
    margin: 0;
    background: linear-gradient(90deg, #e94560, #ff6b6b);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .stories-section {
    width: 100%;
    max-width: 900px;
    margin-bottom: 30px;
  }

  .stories-section h3 {
    font-size: 18px;
    color: #aaa;
    margin-bottom: 15px;
    padding-bottom: 8px;
    border-bottom: 1px solid #333;
  }

  .stories-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 15px;
  }

  .story-card {
    display: flex;
    align-items: center;
    gap: 15px;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    transition: all 0.3s ease;
  }

  .story-card:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #e94560;
    transform: translateY(-2px);
  }

  .story-card.selected {
    border-color: #4CAF50;
    background: rgba(76, 175, 80, 0.1);
  }

  .story-card.author-card {
    border-color: #e94560;
  }

  .story-icon {
    font-size: 32px;
    flex-shrink: 0;
  }

  .story-content {
    flex: 1;
    min-width: 0;
  }

  .story-content h4 {
    margin: 0 0 5px 0;
    font-size: 16px;
    color: #fff;
  }

  .story-content p {
    margin: 0;
    font-size: 13px;
    color: #888;
  }

  .story-status {
    font-size: 12px;
    color: #666;
  }

  .story-status.public {
    color: #4CAF50;
  }

  .story-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .btn {
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    background: #3c3c3c;
    color: #fff;
    transition: background 0.2s;
  }

  .btn:hover {
    background: #4a4a4a;
  }

  .btn.small {
    padding: 6px 12px;
    font-size: 12px;
  }

  .btn.primary {
    background: linear-gradient(135deg, #e94560, #c0394d);
  }

  .btn.primary:hover {
    background: linear-gradient(135deg, #ff6b6b, #e94560);
  }

  .btn.danger {
    background: #d32f2f;
  }

  .selected-badge {
    padding: 4px 10px;
    background: #4CAF50;
    color: white;
    border-radius: 4px;
    font-size: 12px;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: #252526;
    padding: 25px;
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    border: 1px solid #3c3c3c;
  }

  .modal h3 {
    margin: 0 0 15px 0;
    color: #fff;
  }

  .modal .input {
    width: 100%;
    padding: 10px;
    background: #3c3c3c;
    border: 1px solid #3c3c3c;
    border-radius: 6px;
    color: #fff;
    margin-bottom: 15px;
    box-sizing: border-box;
  }

  .modal .form-group {
    margin-bottom: 15px;
  }

  .modal .form-group label {
    display: block;
    margin-bottom: 5px;
    color: #aaa;
    font-size: 14px;
  }

  .modal .hint {
    display: block;
    margin-top: 5px;
    color: #666;
    font-size: 12px;
  }

  .modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .empty-text {
    color: #888;
    text-align: center;
    padding: 40px;
    font-size: 16px;
  }

  .access-denied {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    text-align: center;
    padding: 20px;
  }

  .access-denied h2 {
    color: #e94560;
    margin-bottom: 10px;
  }

  .access-denied p {
    color: #888;
    margin: 8px 0;
  }
</style>
