<!-- src/components/story-selector/CreateStoryModal.svelte -->
<script lang="ts">
  import { StoryService } from '../../services/storyService'
  import { stories, setCurrentStory } from '../../stores/storyStore'
  
  const { onClose, onSuccess } = $props<{
    onClose?: () => void
    onSuccess?: (story: any) => void
  }>()
  
  // Форма
  let storyName = $state('')
  let description = $state('')
  let bucketName = $state('')
  let storyType = $state('novella')
  let tags = $state<string[]>([])
  let currentTag = $state('')
  
  // Состояние
  let isLoading = $state(false)
  let error = $state<string | null>(null)
  
  // Доступные типы историй
  const storyTypes = [
    { id: 'novella', label: '📖 Новелла', description: 'Текстовая история с выбором' },
    { id: 'quest', label: '🗺️ Квест', description: 'Приключенческая игра с поиском предметов' },
    { id: 'rpg', label: '⚔️ RPG', description: 'Ролевая игра с характеристиками' },
    { id: 'mystery', label: '🔍 Детектив', description: 'История с загадками и расследованиями' },
    { id: 'romance', label: '💖 Романтика', description: 'Романтическая история' },
    { id: 'horror', label: '👻 Хоррор', description: 'Страшная история' },
  ]
  
  // Популярные теги
  const popularTags = [
    'Фэнтези', 'Научная фантастика', 'Детектив', 'Романтика',
    'Хоррор', 'Комедия', 'Драма', 'Приключения', 'Мистика'
  ]
  
  // Генерируем имя бакета из названия истории
  function generateBucketName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9а-яё]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 50)
  }
  
  // Обновляем бакет при изменении названия
  $effect(() => {
    if (storyName && !bucketName) {
      bucketName = generateBucketName(storyName)
    }
  })
  
  // Добавить тег
  function addTag() {
    const tag = currentTag.trim()
    if (tag && !tags.includes(tag)) {
      tags = [...tags, tag]
      currentTag = ''
    }
  }
  
  // Удалить тег
  function removeTag(tagToRemove: string) {
    tags = tags.filter(tag => tag !== tagToRemove)
  }
  
  // Добавить популярный тег
  function addPopularTag(tag: string) {
    if (!tags.includes(tag)) {
      tags = [...tags, tag]
    }
  }
  
  // Валидация формы
  function validateForm(): boolean {
    if (!storyName.trim()) {
      error = 'Введите название истории'
      return false
    }
    
    if (!bucketName.trim()) {
      error = 'Введите имя бакета'
      return false
    }
    
    // Проверяем уникальность бакета
    const existingBuckets = $stories.map(s => s.bucket)
    if (existingBuckets.includes(bucketName)) {
      error = `Бакет "${bucketName}" уже существует`
      return false
    }
    
    // Валидация имени бакета
    const bucketRegex = /^[a-z0-9_]+$/
    if (!bucketRegex.test(bucketName)) {
      error = 'Имя бакета может содержать только латинские буквы в нижнем регистре, цифры и подчеркивания'
      return false
    }
    
    error = null
    return true
  }
  
  // Создать историю
  async function createStory() {
    if (!validateForm()) return
    
    isLoading = true
    error = null
    
    try {
      // Создаем структуру истории в зависимости от типа
      const storyTemplate = createStoryTemplate(storyName, storyType)
      
      // Сохраняем в Supabase
      const success = await StoryService.saveStory(bucketName, 'story.json', storyTemplate)
      
      if (!success) {
        throw new Error('Не удалось создать историю')
      }
      
      // Создаем объект истории
      const newStory = {
        id: bucketName,
        name: storyName,
        bucket: bucketName,
        defaultFile: 'story.json',
        description: description || undefined,
        tags: tags.length > 0 ? tags : undefined,
        lastModified: new Date(),
      }
      
      // Обновляем список историй
      stories.update(current => [...current, newStory])
      
      // Устанавливаем как текущую
      setCurrentStory(newStory)
      
      // Вызываем коллбэки
      onSuccess?.(newStory)
      onClose?.()
      
    } catch (err: any) {
      error = err.message || 'Произошла ошибка при создании истории'
      console.error('Ошибка создания истории:', err)
    } finally {
      isLoading = false
    }
  }
  
  // Создать шаблон истории по типу
  function createStoryTemplate(name: string, type: string) {
    const baseTemplate = {
      meta: {
        version: "3.1",
        title: name,
        description: description || undefined,
        created: new Date().toISOString(),
        tags: tags.length > 0 ? tags : undefined,
        type: type,
      },
      chapters: [{ id: "ch1", title: "Глава 1" }],
      dialogues: [],
      items: [],
    }
    
    // Добавляем начальный диалог в зависимости от типа
    const initialDialogues = {
      novella: {
        id: "start",
        chapterId: "ch1",
        text: "Это начало вашей истории. Что произойдет дальше?",
        options: [
          {
            text: "Начать приключение",
            enabled: true,
            visible: true,
            visibilityCondition: { type: "always" }
          }
        ]
      },
      quest: {
        id: "start",
        chapterId: "ch1",
        text: "Вы стоите на перекрестке. Куда отправитесь?",
        options: [
          {
            text: "Пойти на север",
            enabled: true,
            visible: true
          },
          {
            text: "Пойти на восток",
            enabled: true,
            visible: true
          },
          {
            text: "Осмотреть сумку",
            enabled: true,
            visible: true
          }
        ]
      },
      rpg: {
        id: "start",
        chapterId: "ch1",
        text: "Вы просыпаетесь в неизвестном месте. Ваши характеристики:",
        onEnter: [
          { type: "stat_change", stat: "health", value: 100 },
          { type: "stat_change", stat: "strength", value: 10 },
          { type: "stat_change", stat: "agility", value: 10 }
        ],
        options: []
      },
      mystery: {
        id: "start",
        chapterId: "ch1",
        text: "Вы получили странное письмо. На конверте нет обратного адреса.",
        options: [
          {
            text: "Открыть письмо",
            enabled: true,
            visible: true
          },
          {
            text: "Изучить конверт",
            enabled: true,
            visible: true
          }
        ]
      }
    }
    
    return {
      ...baseTemplate,
      dialogues: [initialDialogues[type as keyof typeof initialDialogues] || initialDialogues.novella]
    }
  }
  
  // Закрыть модалку по Escape
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose?.()
    }
  }
  
  // Обработчик клика вне модалки
  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose?.()
    }
  }
</script>

<!-- Оверлей -->
<div 
  class="modal-overlay"
  on:click={handleBackdropClick}
  on:keydown={handleKeyDown}
>
  <!-- Модальное окно -->
  <div class="modal" role="dialog" aria-labelledby="modal-title">
    <!-- Заголовок -->
    <div class="modal-header">
      <h2 id="modal-title" class="modal-title">Создать новую историю</h2>
      <button 
        class="close-button"
        on:click={onClose}
        aria-label="Закрыть"
        disabled={isLoading}
      >
        ✕
      </button>
    </div>
    
    <!-- Форма -->
    <div class="modal-body">
      {#if error}
        <div class="error-message" role="alert">
          ⚠️ {error}
        </div>
      {/if}
      
      <div class="form-grid">
        <!-- Название истории -->
        <div class="form-group">
          <label for="story-name" class="required">
            Название истории
          </label>
          <input
            id="story-name"
            type="text"
            bind:value={storyName}
            placeholder="Моя удивительная история"
            class="input"
            disabled={isLoading}
            maxlength={100}
          />
          <div class="input-help">
            Будет отображаться в списке историй
          </div>
        </div>
        
        <!-- Описание -->
        <div class="form-group">
          <label for="description">
            Описание
          </label>
          <textarea
            id="description"
            bind:value={description}
            placeholder="Краткое описание сюжета..."
            class="textarea"
            rows={3}
            disabled={isLoading}
            maxlength={500}
          />
          <div class="input-help">
            Опционально, максимум 500 символов
          </div>
        </div>
        
        <!-- Имя бакета -->
        <div class="form-group">
          <label for="bucket-name" class="required">
            Имя бакета
          </label>
          <div class="input-with-prefix">
            <span class="input-prefix">supabase.co/storage/v1/object/public/</span>
            <input
              id="bucket-name"
              type="text"
              bind:value={bucketName}
              placeholder="my_awesome_story"
              class="input"
              disabled={isLoading}
              pattern="[a-z0-9_]+"
              title="Только латинские буквы в нижнем регистре, цифры и подчеркивания"
            />
          </div>
          <div class="input-help">
            Уникальное имя папки в Supabase Storage. Только латинские буквы в нижнем регистре, цифры и _
          </div>
        </div>
        
        <!-- Тип истории -->
        <div class="form-group">
          <label class="required">Тип истории</label>
          <div class="type-grid">
            {#each storyTypes as type}
              <label 
                class:selected={storyType === type.id}
                class="type-option"
              >
                <input
                  type="radio"
                  name="story-type"
                  value={type.id}
                  bind:group={storyType}
                  disabled={isLoading}
                  class="visually-hidden"
                />
                <div class="type-icon">{type.label.split(' ')[0]}</div>
                <div class="type-content">
                  <div class="type-title">{type.label.split(' ').slice(1).join(' ')}</div>
                  <div class="type-description">{type.description}</div>
                </div>
              </label>
            {/each}
          </div>
        </div>
        
        <!-- Теги -->
        <div class="form-group">
          <label>Теги</label>
          
          <!-- Поле добавления тега -->
          <div class="tag-input">
            <input
              type="text"
              bind:value={currentTag}
              placeholder="Добавить тег"
              class="input"
              disabled={isLoading}
              on:keydown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag()
                }
              }}
            />
            <button
              type="button"
              class="btn tag-add"
              on:click={addTag}
              disabled={isLoading || !currentTag.trim()}
            >
              +
            </button>
          </div>
          
          <!-- Популярные теги -->
          <div class="popular-tags">
            <div class="popular-tags-label">Популярные теги:</div>
            <div class="popular-tags-list">
              {#each popularTags as tag}
                <button
                  type="button"
                  class="btn tag-popular"
                  on:click={() => addPopularTag(tag)}
                  disabled={isLoading || tags.includes(tag)}
                >
                  {tag}
                </button>
              {/each}
            </div>
          </div>
          
          <!-- Выбранные теги -->
          {#if tags.length > 0}
            <div class="selected-tags">
              {#each tags as tag}
                <div class="selected-tag">
                  {tag}
                  <button
                    type="button"
                    class="tag-remove"
                    on:click={() => removeTag(tag)}
                    disabled={isLoading}
                    aria-label={`Удалить тег ${tag}`}
                  >
                    ×
                  </button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
    
    <!-- Футер -->
    <div class="modal-footer">
      <button
        type="button"
        class="btn secondary"
        on:click={onClose}
        disabled={isLoading}
      >
        Отмена
      </button>
      <button
        type="button"
        class="btn primary"
        on:click={createStory}
        disabled={isLoading || !storyName.trim()}
      >
        {#if isLoading}
          <span class="loading-spinner"></span>
          Создание...
        {:else}
          Создать историю
        {/if}
      </button>
    </div>
  </div>
</div>

<style>
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: var(--space-md);
    animation: fadeIn 0.3s ease-out;
  }
  
  .modal {
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: var(--shadow-lg);
    animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    overflow: hidden;
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-lg);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2);
  }
  
  .modal-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .close-button {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 1.5rem;
    cursor: pointer;
    padding: var(--space-xs);
    border-radius: var(--radius-sm);
    transition: all 0.2s;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .close-button:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
  }
  
  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-lg);
  }
  
  .error-message {
    background: rgba(244, 67, 54, 0.1);
    color: var(--error);
    padding: var(--space-md);
    border-radius: var(--radius-md);
    margin-bottom: var(--space-lg);
    border: 1px solid rgba(244, 67, 54, 0.3);
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    font-weight: 500;
  }
  
  .form-grid {
    display: grid;
    gap: var(--space-xl);
  }
  
  .form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
  }
  
  label {
    color: var(--text-primary);
    font-weight: 500;
    font-size: 0.95rem;
  }
  
  label.required::after {
    content: " *";
    color: var(--error);
  }
  
  .input, .textarea {
    background: var(--bg-tertiary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md);
    padding: var(--space-md);
    color: var(--text-primary);
    font-size: 1rem;
    transition: all 0.2s;
    width: 100%;
  }
  
  .input:focus, .textarea:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 2px rgba(0, 122, 204, 0.2);
  }
  
  .input:disabled, .textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .input-help {
    color: var(--text-muted);
    font-size: 0.85rem;
    line-height: 1.4;
  }
  
  .input-with-prefix {
    display: flex;
    background: var(--bg-tertiary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md);
    overflow: hidden;
  }
  
  .input-prefix {
    padding: var(--space-md);
    background: rgba(0, 0, 0, 0.2);
    color: var(--text-muted);
    font-size: 0.9rem;
    white-space: nowrap;
    border-right: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
  }
  
  .input-with-prefix .input {
    border: none;
    border-radius: 0;
  }
  
  /* Стили для выбора типа */
  .type-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: var(--space-sm);
  }
  
  .type-option {
    background: var(--bg-tertiary);
    border: 2px solid transparent;
    border-radius: var(--radius-md);
    padding: var(--space-md);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: var(--space-sm);
  }
  
  .type-option:hover:not(.selected) {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(0, 122, 204, 0.3);
  }
  
  .type-option.selected {
    background: rgba(0, 122, 204, 0.1);
    border-color: var(--primary);
  }
  
  .type-icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }
  
  .type-content {
    flex: 1;
    min-width: 0;
  }
  
  .type-title {
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 2px;
  }
  
  .type-description {
    font-size: 0.8rem;
    color: var(--text-muted);
    line-height: 1.3;
  }
  
  /* Стили для тегов */
  .tag-input {
    display: flex;
    gap: var(--space-sm);
  }
  
  .tag-input .input {
    flex: 1;
  }
  
  .btn.tag-add {
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1.2rem;
    font-weight: bold;
    flex-shrink: 0;
  }
  
  .btn.tag-add:hover:not(:disabled) {
    background: var(--primary-hover);
  }
  
  .btn.tag-add:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .popular-tags {
    margin-top: var(--space-sm);
  }
  
  .popular-tags-label {
    color: var(--text-muted);
    font-size: 0.9rem;
    margin-bottom: var(--space-xs);
  }
  
  .popular-tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
  }
  
  .btn.tag-popular {
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-secondary);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 4px 12px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .btn.tag-popular:hover:not(:disabled) {
    background: rgba(0, 122, 204, 0.1);
    color: var(--primary);
    border-color: var(--primary);
  }
  
  .btn.tag-popular:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .selected-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin-top: var(--space-sm);
  }
  
  .selected-tag {
    background: rgba(0, 122, 204, 0.2);
    color: var(--primary);
    border: 1px solid rgba(0, 122, 204, 0.3);
    border-radius: 16px;
    padding: 4px 8px 4px 12px;
    font-size: 0.85rem;
    display: flex;
    align-items: center;
    gap: 4px;
    animation: fadeIn 0.3s ease-out;
  }
  
  .tag-remove {
    background: none;
    border: none;
    color: var(--primary);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0 2px;
    opacity: 0.7;
    transition: opacity 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
  }
  
  .tag-remove:hover:not(:disabled) {
    opacity: 1;
    background: rgba(0, 0, 0, 0.1);
  }
  
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-md);
    padding: var(--space-lg);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(0, 0, 0, 0.2);
  }
  
  .btn {
    padding: var(--space-md) var(--space-lg);
    border: none;
    border-radius: var(--radius-md);
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    min-width: 120px;
  }
  
  .btn.primary {
    background: var(--primary);
    color: white;
  }
  
  .btn.primary:hover:not(:disabled) {
    background: var(--primary-hover);
    transform: translateY(-1px);
  }
  
  .btn.secondary {
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-primary);
  }
  
  .btn.secondary:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
  }
  
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none !important;
  }
  
  .loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s linear infinite;
  }
  
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  /* Адаптивность */
  @media (max-width: 640px) {
    .modal {
      max-height: 95vh;
    }
    
    .modal-header {
      padding: var(--space-md);
    }
    
    .modal-body {
      padding: var(--space-md);
    }
    
    .modal-footer {
      padding: var(--space-md);
      flex-direction: column-reverse;
    }
    
    .btn {
      width: 100%;
    }
    
    .type-grid {
      grid-template-columns: 1fr;
    }
  }
</style>