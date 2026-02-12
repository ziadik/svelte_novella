<!-- src/components/story-selector/StoryCard.svelte -->
<script lang="ts">

  const { storyName, onselect } = $props<{
    storyName: string
    onselect?: () => void
  }>()
    
  let showActions = $state(false)
  
  function handleClick() {
    onselect?.()
  }
  
  function getStoryIcon(fileName: string): string {
    if (fileName.includes('dracula')) return '🧛‍♂️'
    if (fileName.includes('sherlock')) return '🔍'
    if (fileName.includes('space')) return '🚀'
    if (fileName.includes('fantasy')) return '🐉'
    if (fileName.includes('detective')) return '🕵️‍♂️'
    return '📖'
  }
  
  function getDisplayName(fileName: string): string {
    return fileName.replace('.json', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase())
  }
</script>

<div 
  class="story-card"
  onclick={handleClick}
  onmouseenter={() => showActions = true}
  onmouseleave={() => showActions = false}
>
  <!-- Иконка истории -->
  <div class="story-icon">
    {getStoryIcon(storyName)}
  </div>
  
  <!-- Основное содержимое -->
  <div class="story-content">
    <div class="story-header">
      <h3 class="story-title" title={storyName}>
        {getDisplayName(storyName)}
      </h3>
    </div>
    
    <!-- Метаданные -->
    <div class="story-meta">
      <div class="meta-item">
        <span class="meta-icon">📋</span>
        <span class="meta-text" title="Файл истории">{storyName}</span>
      </div>
    </div>
  </div>
</div>

<style>
  .story-card {
    background: var(--bg-secondary);
    border: 2px solid transparent;
    border-radius: var(--radius-lg);
    padding: var(--space-lg);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    gap: var(--space-md);
    position: relative;
    overflow: hidden;
  }
  
  .story-card:hover {
    background: var(--bg-tertiary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    border-color: rgba(0, 122, 204, 0.3);
  }
  
  .story-card.selected {
    background: linear-gradient(135deg, 
      rgba(0, 122, 204, 0.1), 
      rgba(0, 122, 204, 0.05)
    );
    border-color: var(--primary);
    box-shadow: 
      0 4px 12px rgba(0, 122, 204, 0.15),
      inset 0 0 0 1px rgba(0, 122, 204, 0.1);
  }
  
  .story-icon {
    font-size: 2.5rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 64px;
    height: 64px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
    transition: transform 0.3s;
  }
  
  .story-card:hover .story-icon {
    transform: scale(1.1);
  }
  
  .story-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
    min-width: 0; /* Для правильного обрезания текста */
  }
  
  .story-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-sm);
  }
  
  .story-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .story-actions {
    display: flex;
    gap: var(--space-xs);
    flex-shrink: 0;
  }
  
  .btn-icon {
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: var(--radius-sm);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    color: var(--text-secondary);
  }
  
  .btn-icon:hover {
    background: rgba(255, 255, 255, 0.2);
    transform: scale(1.1);
  }
  
  .btn-icon.edit:hover {
    color: var(--primary);
    background: rgba(0, 122, 204, 0.1);
  }
  
  .btn-icon.delete:hover {
    color: var(--error);
    background: rgba(244, 67, 54, 0.1);
  }
  
  .story-description {
    color: var(--text-secondary);
    font-size: 0.875rem;
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .story-meta {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-md);
    margin-top: var(--space-xs);
  }
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    color: var(--text-muted);
    font-size: 0.75rem;
  }
  
  .meta-icon {
    font-size: 0.875rem;
    opacity: 0.7;
  }
  
  .meta-text {
    max-width: 120px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .story-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin-top: var(--space-xs);
  }
  
  .tag {
    background: rgba(0, 122, 204, 0.15);
    color: var(--primary);
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 500;
  }
  
  .selected-indicator {
    position: absolute;
    top: 12px;
    right: 12px;
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    background: var(--primary);
    color: white;
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
    animation: slideIn 0.3s ease-out;
  }
  
  .checkmark {
    font-size: 0.875rem;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  /* Адаптивность */
  @media (max-width: 640px) {
    .story-card {
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: var(--space-md);
    }
    
    .story-icon {
      width: 48px;
      height: 48px;
      font-size: 2rem;
    }
    
    .story-header {
      flex-direction: column;
      align-items: center;
    }
    
    .story-meta {
      justify-content: center;
    }
    
    .selected-indicator {
      position: static;
      margin-top: var(--space-sm);
      justify-content: center;
      width: auto;
    }
  }
</style>