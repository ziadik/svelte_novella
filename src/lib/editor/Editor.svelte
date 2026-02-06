<script lang="ts">
  import { onMount } from "svelte";
  import { supabase, bucketName } from "../supabaseClient";
  import DialogueCard from "../novella/DialogueCard.svelte"; 

  // --- Интерфейсы ---
  interface Option {
    text: string;
    nextDialogueId?: string;
    miniGame?: { id: string; onWinDialogueId: string; onLoseDialogueId: string };
    actions?: Array<{ type: string; id?: string; value?: any }>;
    visibleIf?: { hasItem?: string };
    disabled?: boolean;
  }

  interface Dialogue {
    id: string;
    chapterId: string; 
    text: string;
    backgroundImage?: string;
    characterImage?: string;
    stateMachineCharacterRive?: string;
    smTriggerBackgroundRive?: string;
    nextDialogueId?: string;
    options?: Option[];
    onEnter?: Array<{ type: string; id?: string; value?: any }>;
  }

  interface Chapter {
    id: string;
    title: string;
    description?: string;
  }

  interface StoryData {
    meta?: { version: string; title: string };
    chapters?: Chapter[];
    dialogues: Dialogue[];
    items?: any[];
    miniGames?: any[];
  }

  interface StoredFile {
    name: string;
    id: string;
    updated_at: string;
  }

  // --- Состояние приложения ---
  let data = $state<StoryData>({ 
    meta: { version: "3.0", title: "Untitled" },
    chapters: [], 
    dialogues: [] 
  });
  
  let selectedChapterId = $state<string | null>(null);
  let selectedDialogueId = $state<string | null>(null);
  let editingOptionIndex = $state<number | null>(null);
  
  let storedFiles = $state<StoredFile[]>([]);
  let statusMessage = $state({ type: '', text: '' });
  
  let storiesList = $state<string[]>([]);
  let currentFileName = $state("dracula_story.json");

  onMount(async () => {
    await loadStoriesList();
    await loadStory(currentFileName);
    await loadStoredResources();
  });

  // --- Supabase: Файлы историй ---

  async function loadStoriesList() {
    const { data: files, error } = await supabase.storage.from(bucketName).list('', { search: '.json' });
    if (!error && files) {
      storiesList = files.map(f => f.name).filter(n => n !== '.emptyFolderPlaceholder');
    }
  }

  async function createNewStory() {
    const name = prompt("Введите имя файла истории:", "new_story.json");
    if (!name) return;
    const newTemplate: StoryData = {
      meta: { version: "3.0", title: "New Story" },
      chapters: [{ id: "ch1", title: "Глава 1: Начало" }],
      dialogues: [{ id: "start", chapterId: "ch1", text: "Начало новой истории...", options: [] }]
    };
    const blob = new Blob([JSON.stringify(newTemplate, null, 2)], { type: 'application/json' });
    const { error } = await supabase.storage.from(bucketName).upload(name, blob);
    if (error) {
      statusMessage = { type: 'error', text: 'Ошибка создания: ' + error.message };
    } else {
      await loadStoriesList();
      await loadStory(name);
    }
  }

  async function saveStoryCopy() {
    let copyName = prompt("Введите имя для копии:", currentFileName.replace('.json', '_copy.json'));
    if (!copyName || !data) return;
    if (!copyName.endsWith('.json')) copyName += '.json';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const { error } = await supabase.storage.from(bucketName).upload(copyName, blob, { upsert: true });
    if (error) {
        statusMessage = { type: 'error', text: 'Ошибка копии: ' + error.message };
    } else {
        await loadStoriesList();
        statusMessage = { type: 'success', text: 'Копия сохранена!' };
    }
  }

  async function loadStory(fileName: string) {
    statusMessage = { type: 'loading', text: 'Загрузка...' };
    currentFileName = fileName;
    try {
      const { data: fileData, error } = await supabase.storage.from(bucketName).download(fileName);
      if (error) throw error;
      const parsedData = JSON.parse(await fileData.text());

      // Миграция
      if (!parsedData.chapters) {
        parsedData.chapters = [{ id: "main", title: "Основная история" }];
        if (parsedData.dialogues) {
            parsedData.dialogues.forEach((d: any) => { if (!d.chapterId) d.chapterId = "main"; });
        }
        parsedData.meta = { ...parsedData.meta, version: "3.0 (Migrated)" };
      }

      data = parsedData;
      
      if (data.chapters && data.chapters.length > 0) {
        selectedChapterId = data.chapters[0].id;
      } else {
         data.chapters = [{id: "default", title: "Default"}];
         selectedChapterId = "default";
      }
      if (data.dialogues && data.dialogues.length > 0) {
        selectedDialogueId = data.dialogues[0].id;
      } else {
        selectedDialogueId = null;
      }
      statusMessage = { type: 'success', text: 'Загружено!' };
    } catch (err: any) {
      console.error(err);
      statusMessage = { type: 'error', text: 'Ошибка загрузки: ' + err.message };
    }
  }

  async function saveCurrentStory() {
    if (!data) return;
    statusMessage = { type: 'loading', text: 'Сохранение...' };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const { error } = await supabase.storage.from(bucketName).upload(currentFileName, blob, { upsert: true });
    statusMessage = { type: error ? 'error' : 'success', text: error ? 'Ошибка сохранения' : 'Сохранено!' };
  }

  // --- Supabase: Ресурсы ---

  async function loadStoredResources() {
    const { data: files } = await supabase.storage.from(bucketName).list();
    if (files) {
      storedFiles = files.filter(f => f.name !== '.emptyFolderPlaceholder' && !f.name.endsWith('.json'));
    }
  }

  async function uploadNewFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    statusMessage = { type: 'loading', text: 'Загрузка файла...' };
    const { error } = await supabase.storage.from(bucketName).upload(file.name, file, { upsert: true });
    if (error) {
      statusMessage = { type: 'error', text: 'Ошибка загрузки' };
    } else {
      statusMessage = { type: 'success', text: 'Файл загружен' };
      await loadStoredResources();
    }
  }

  // --- Логика редактора ---

  function addChapter() {
    if (!data) return;
    if (!data.chapters) data.chapters = [];
    const id = "ch_" + Date.now();
    data.chapters.push({ id, title: "Новая глава" });
    selectedChapterId = id;
  }

  function addDialogue() {
    if (!data || !selectedChapterId) return;
    const id = "d_" + Date.now();
    data.dialogues.push({
      id,
      chapterId: selectedChapterId,
      text: "Новый текст...",
      options: []
    });
    selectedDialogueId = id;
  }

  function addOption(dialogue: Dialogue) {
    if (!dialogue.options) dialogue.options = [];
    dialogue.options.push({ text: "Новый вариант", disabled: false });
    editingOptionIndex = dialogue.options.length - 1;
  }

  function deleteDialogue(id: string) {
    if (!confirm("Удалить диалог " + id + "?")) return;
    if (!data) return;
    data.dialogues = data.dialogues.filter(d => d.id !== id);
    data.dialogues.forEach(d => {
      if (d.nextDialogueId === id) d.nextDialogueId = "";
      if (d.options) d.options.forEach(o => { if (o.nextDialogueId === id) o.nextDialogueId = ""; });
    });
    if (selectedDialogueId === id) selectedDialogueId = null;
  }

  let currentDialogue = $derived(
    data?.dialogues.find(d => d.id === selectedDialogueId)
  );

  let currentChapter = $derived(
    data?.chapters.find(c => c.id === selectedChapterId)
  );

  let currentEditingOption = $derived(
    currentDialogue && editingOptionIndex !== null
      ? currentDialogue.options[editingOptionIndex]
      : null
  );

  let chapterDialogues = $derived(
    data ? data.dialogues.filter(d => d.chapterId === selectedChapterId) : []
  );

  let imageResources = $derived(storedFiles.filter(f => f.name.match(/\.(png|jpg|jpeg|webp|gif)$/i)));
  let rivResources = $derived(storedFiles.filter(f => f.name.endsWith('.riv')));

  function jumpTo(id: string) {
    const target = data?.dialogues.find(d => d.id === id);
    if (target) {
      selectedChapterId = target.chapterId;
      selectedDialogueId = id;
    }
  }

  // --- Инфографика связей ---
  let backlinks = $derived(() => {
    if (!data || !selectedDialogueId) return [];
    return data.dialogues.filter(d => {
      if (d.nextDialogueId === selectedDialogueId) return true;
      if (d.options) {
        return d.options.some(o => o.nextDialogueId === selectedDialogueId);
      }
      return false;
    });
  });

  function getTargetText(id: string | undefined): string {
    if (!id || !data) return "Нет";
    const target = data.dialogues.find(d => d.id === id);
    if (!target) return `❌ Не найден: ${id}`;
    return target.text.substring(0, 40) + "...";
  }
</script>

<div class="editor-container">
  <header class="toolbar">
    <div class="logo">
      <h2>Story Editor v3</h2>
    </div>
    
    <div class="stories-control">
      <select bind:value={currentFileName} onchange={(e) => loadStory(e.target.value)} class="story-select">
        {#each storiesList as story}
          <option value={story}>{story}</option>
        {/each}
      </select>
      <button onclick={createNewStory} class="btn primary small">+ Новая</button>
      <button onclick={saveCurrentStory} class="btn success small">💾 Сохранить</button>
      <button onclick={saveStoryCopy} class="btn small">📋 Копия</button>
    </div>
  </header>

  <div class="main-workspace">
    
    <!-- 1. Левая панель -->
    <aside class="sidebar">
      <div class="sidebar-section">
        <div class="section-header">
          <h3>Главы</h3>
          <button onclick={addChapter} class="btn-icon" title="Добавить главу">+</button>
        </div>
        <div class="chapter-list">
          {#each data?.chapters || [] as chapter (chapter.id)}
            <div 
              class="chapter-item {selectedChapterId === chapter.id ? 'active' : ''}"
              onclick={() => selectedChapterId = chapter.id}
            >
              {chapter.title}
            </div>
          {/each}
        </div>
      </div>

      <div class="sidebar-section flex-1">
        <div class="section-header">
          <h3>Сцены ({chapterDialogues.length})</h3>
          <button onclick={addDialogue} class="btn-icon" title="Добавить сцену" disabled={!selectedChapterId}>+</button>
        </div>
        <div class="dialogue-list">
          {#each chapterDialogues as dialogue (dialogue.id)}
            <div 
              class="dialogue-item {selectedDialogueId === dialogue.id ? 'active' : ''}"
              onclick={() => selectedDialogueId = dialogue.id}
            >
              <span class="id-badge">{dialogue.id}</span>
              <span class="preview-text">{dialogue.text.substring(0, 25)}...</span>
            </div>
          {/each}
        </div>
      </div>

      <div class="status-box">
        {#if statusMessage.text}
          <div class="alert {statusMessage.type}">{statusMessage.text}</div>
        {/if}
      </div>
    </aside>

    <!-- 2. Центр: Редактор -->
    <main class="editor-area">
      {#if currentDialogue}
        <div class="dialogue-form">
          <div class="form-group">
            <label>ID диалога</label>
            <input type="text" bind:value={currentDialogue.id} class="input" />
          </div>
          
          <div class="form-group">
            <label>Текст</label>
            <textarea bind:value={currentDialogue.text} class="textarea" rows="3"></textarea>
          </div>

          <div class="media-section">
            <h4>Медиа ресурсы</h4>
            
            <div class="form-group">
              <label>Фон (Background)</label>
              <div class="input-group">
                <select bind:value={currentDialogue.backgroundImage} class="input select">
                  <option value="">-- Нет фона --</option>
                  {#each imageResources as img}
                    <option value={img.name}>{img.name}</option>
                  {/each}
                  {#each rivResources as riv}
                    <option value={riv.name}>{riv.name} (Rive)</option>
                  {/each}
                </select>
                <label class="btn-file">
                  Загрузить
                  <input type="file" accept="image/*,.riv" onchange={uploadNewFile} hidden />
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>Персонаж (Character)</label>
              <div class="input-group">
                <select bind:value={currentDialogue.characterImage} class="input select">
                  <option value="">-- Нет персонажа --</option>
                  {#each imageResources as img}
                    <option value={img.name}>{img.name}</option>
                  {/each}
                  {#each rivResources as riv}
                    <option value={riv.name}>{riv.name} (Rive)</option>
                  {/each}
                </select>
              </div>
            </div>
          </div>

          <div class="options-section">
            <div class="section-header">
              <h4>Варианты ответов</h4>
              <button onclick={() => addOption(currentDialogue)} class="btn small">+ Добавить</button>
            </div>
            
            {#each currentDialogue.options || [] as option, index (index)}
              <div class="option-card {editingOptionIndex === index ? 'editing' : ''}">
                <div class="option-header" onclick={() => editingOptionIndex = index}>
                  <span>#{index + 1} {option.text}</span>
                  <button onclick={() => currentDialogue.options!.splice(index, 1)} class="btn-icon danger">×</button>
                </div>
                
                {#if editingOptionIndex === index}
                  <div class="option-details">
                    <div class="form-group">
                      <label>Текст кнопки</label>
                      <input type="text" bind:value={option.text} class="input" />
                    </div>

                    <div class="form-row">
                      <div class="form-group full-width">
                        <label>Переход к диалогу</label>
                        <select bind:value={option.nextDialogueId} class="input select">
                          <option value="">-- Конец ветки --</option>
                          {#each data.dialogues as d}
                            <option value={d.id}>{d.id}: {d.text.substring(0, 30)}...</option>
                          {/each}
                        </select>
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="checkbox-row">
                        <input type="checkbox" bind:checked={option.disabled} />
                        Отключить кнопку
                      </label>
                    </div>
                    
                    {#if option.miniGame}
                       <div class="mini-game-edit">
                         <label>Мини-игра ID: <input type="text" bind:value={option.miniGame.id} class="input small" /></label>
                       </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          </div>

          <div class="links-section">
             <h4>Авто-переход</h4>
             <select bind:value={currentDialogue.nextDialogueId} class="input select">
                <option value="">-- Нет автоперехода --</option>
                {#each data.dialogues as d}
                  <option value={d.id}>{d.id}: {d.text.substring(0, 30)}...</option>
                {/each}
             </select>
          </div>

          <!-- === ВОЗВРАЩЕННЫЙ БЛОК ИНФОГРАФИКИ === -->
          <div class="infographic-section">
            <h4>Связи и переходы</h4>
            
            <!-- Исходящие -->
            <div class="info-block">
                <div class="info-title">👉 Куда ведет:</div>
                {#if currentDialogue.nextDialogueId}
                    <div class="link-row" class:danger={!data.dialogues.find(d => d.id === currentDialogue.nextDialogueId)}>
                        <span class="link-type">Auto:</span>
                        <span class="link-id">{currentDialogue.nextDialogueId}</span>
                        <button class="btn-link" onclick={() => jumpTo(currentDialogue.nextDialogueId)}>Перейти →</button>
                        <span class="link-target">"{getTargetText(currentDialogue.nextDialogueId)}"</span>
                    </div>
                {:else}
                    <div class="link-row empty">Нет автоперехода</div>
                {/if}

                {#each currentDialogue.options || [] as option}
                    {#if option.nextDialogueId}
                        <div class="link-row" class:danger={!data.dialogues.find(d => d.id === option.nextDialogueId)}>
                            <span class="link-type">Opt:</span>
                            <span class="link-id">{option.nextDialogueId}</span>
                            <button class="btn-link" onclick={() => jumpTo(option.nextDialogueId)}>Перейти →</button>
                            <span class="link-target">"{getTargetText(option.nextDialogueId)}"</span>
                        </div>
                    {/if}
                {/each}
            </div>

            <!-- Входящие -->
            <div class="info-block secondary">
                <div class="info-title">👈 Откуда ведут:</div>
                {#if backlinks().length === 0}
                    <div class="link-row empty">Никто не ссылается на этот диалог</div>
                {:else}
                    {#each backlinks() as link}
                        <div class="link-row">
                            <span class="link-id">{link.id}</span>
                            <button class="btn-link" onclick={() => jumpTo(link.id)}>← Перейти</button>
                            <span class="link-target">{link.text.substring(0, 30)}...</span>
                        </div>
                    {/each}
                {/if}
            </div>
          </div>

          <div class="form-actions">
            <button onclick={() => deleteDialogue(currentDialogue.id)} class="btn danger">Удалить сцену</button>
          </div>
        </div>
      {:else}
        <div class="empty-state">Выберите сцену или создайте новую</div>
      {/if}
    </main>

    <!-- 3. Правая панель -->
    <aside class="preview-panel">
      <div class="preview-header">
        <h3>Предпросмотр</h3>
        <button onclick={() => editingOptionIndex = null} class="btn-link small">Сбросить редакт. опций</button>
      </div>
      
      <div class="preview-wrapper">
        {#if currentDialogue}
           <DialogueCard dialogue={currentDialogue} index={0} />
        {:else}
           <div class="empty-preview">Выберите сцену</div>
        {/if}
      </div>
    </aside>

  </div>
</div>

<style>
  :global(body) { margin: 0; background: #1e1e1e; color: #ddd; font-family: sans-serif; overflow: hidden; }
  .editor-container { height: 100vh; display: flex; flex-direction: column; }

  .toolbar { 
    background: #252526; padding: 10px 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; 
  }
  .logo h2 { margin: 0; color: #ff5555; font-size: 18px; }
  
  .stories-control { display: flex; gap: 10px; align-items: center; }
  .story-select { background: #3c3c3c; color: white; border: 1px solid #3c3c3c; padding: 5px; border-radius: 4px; font-size: 12px; min-width: 200px; }

  .main-workspace { display: flex; flex: 1; overflow: hidden; }

  /* Sidebar */
  .sidebar { width: 280px; background: #252526; border-right: 1px solid #333; display: flex; flex-direction: column; }
  .sidebar-section { display: flex; flex-direction: column; border-bottom: 1px solid #333; }
  .sidebar-section.flex-1 { flex: 1; overflow: hidden; }
  
  .section-header { padding: 10px; background: #2d2d2d; display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold; color: #aaa; }

  .chapter-list { overflow-y: auto; max-height: 150px; }
  .chapter-item { padding: 10px; cursor: pointer; border-bottom: 1px solid #333; font-size: 13px; }
  .chapter-item:hover { background: #2a2d2e; }
  .chapter-item.active { background: #37373d; border-left: 3px solid #ff5555; }

  .dialogue-list { flex: 1; overflow-y: auto; }
  .dialogue-item { padding: 8px; border-bottom: 1px solid #333; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
  .dialogue-item:hover { background: #2a2d2e; }
  .dialogue-item.active { background: #37373d; border-left: 3px solid #ff5555; }
  .id-badge { font-size: 10px; color: #888; font-family: monospace; }
  .preview-text { font-size: 12px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .status-box { padding: 10px; border-top: 1px solid #333; }
  .alert { padding: 8px; border-radius: 4px; font-size: 11px; margin-bottom: 5px; }
  .alert.success { background: #1b5e20; color: #a5d6a7; }
  .alert.error { background: #b71c1c; color: #ef9a9a; }
  .alert.loading { background: #0d47a1; color: #90caf9; }

  /* Editor Area */
  .editor-area { flex: 1; padding: 20px; overflow-y: auto; background: #1e1e1e; }
  .dialogue-form { max-width: 800px; margin: 0 auto; background: #252526; padding: 20px; border-radius: 8px; border: 1px solid #333; }
  
  .form-group { margin-bottom: 15px; }
  .form-row { display: flex; gap: 15px; margin-bottom: 15px; }
  .full-width { flex: 1; }
  
  label { display: block; margin-bottom: 5px; font-size: 12px; color: #aaa; }
  
  .input, .textarea, .select { width: 100%; background: #3c3c3c; border: 1px solid #3c3c3c; color: white; padding: 8px; border-radius: 4px; box-sizing: border-box; }
  .input:focus, .select:focus { border-color: #ff5555; outline: none; }

  .input-group { display: flex; gap: 5px; }
  .btn-file { background: #444; color: white; padding: 0 10px; border-radius: 4px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
  .btn-file:hover { background: #555; }

  .media-section, .options-section, .links-section { margin-top: 20px; padding: 15px; background: #2d2d2d; border-radius: 4px; border: 1px solid #333; }
  .media-section h4, .options-section h4, .links-section h4 { margin: 0 0 10px 0; font-size: 13px; color: #ddd; }

  .option-card { background: #1e1e1e; border: 1px solid #444; padding: 10px; margin-bottom: 10px; border-radius: 4px; }
  .option-card.editing { border-color: #ff5555; box-shadow: 0 0 5px rgba(255, 85, 85, 0.2); }
  
  .option-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; font-weight: bold; font-size: 13px; }
  .option-header:hover { color: #fff; }

  .option-details { margin-top: 15px; padding-top: 15px; border-top: 1px dashed #444; }
  .checkbox-row { display: flex; align-items: center; gap: 8px; cursor: pointer; }
  
  .form-actions { margin-top: 20px; text-align: right; }

  /* Infographic Styles */
  .infographic-section { margin-top: 30px; padding: 15px; background: #2d2d2d; border-radius: 8px; border: 1px solid #444; }
  .infographic-section h4 { margin: 0 0 15px 0; font-size: 14px; color: #ffcc00; border-bottom: 1px solid #555; padding-bottom: 5px; }
  
  .info-block { margin-bottom: 20px; }
  .info-block.secondary { opacity: 0.8; }
  .info-title { font-size: 12px; color: #aaa; margin-bottom: 8px; font-weight: bold; }
  
  .link-row { display: flex; align-items: center; gap: 10px; padding: 6px; background: #1e1e1e; border-radius: 4px; margin-bottom: 4px; font-size: 12px; }
  .link-row.danger { border-left: 3px solid #f44336; background: #2c1b1b; }
  .link-row.empty { color: #666; font-style: italic; padding: 4px; }
  
  .link-type { color: #888; width: 60px; font-size: 10px; }
  .link-id { color: #4db6ac; font-family: monospace; font-weight: bold; flex: 0 0 80px; }
  .btn-link { background: #333; color: white; border: none; border-radius: 4px; padding: 2px 6px; cursor: pointer; font-size: 10px; }
  .btn-link:hover { background: #444; }
  .link-target { color: #ddd; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* Preview Panel */
  .preview-panel { width: 400px; background: #121212; border-left: 1px solid #333; display: flex; flex-direction: column; }
  .preview-header { padding: 10px; background: #252526; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
  .preview-header h3 { margin: 0; font-size: 14px; }
  
  .preview-wrapper { flex: 1; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .game-preview-container { width: 100%; height: 100%; overflow: hidden; }

  .empty-state, .empty-preview { display: flex; align-items: center; justify-content: center; color: #666; font-size: 14px; height: 100%; }

  .btn { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; }
  .btn.primary { background: #0e639c; color: white; }
  .btn.success { background: #2e7d32; color: white; }
  .btn.danger { background: #c62828; color: white; }
  .btn.small { padding: 4px 8px; font-size: 11px; }
  .btn-icon { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; background: #444; border-radius: 4px; cursor: pointer; color: white; font-weight: bold; }
  .btn-icon:hover { background: #555; }
  .btn-icon.danger { background: #b71c1c; }
  .btn-link { background: none; border: none; color: #4caf50; cursor: pointer; font-size: 11px; text-decoration: underline; }
</style>