<script lang="ts">
  import { onMount } from "svelte";
  import { supabase, bucketName, storyFileName } from "../supabaseClient";
  
  // Импортируем игровой компонент для предпросмотра
  import DialogueCard from "../novella/DialogueCard.svelte"; 

  // Интерфейсы (приводим в соответствие с реальными типами игры)
  interface Option {
    text: string;
    nextDialogueId?: string;
    miniGame?: { id: string; onWinDialogueId: string; onLoseDialogueId: string };
    actions?: Array<{ type: string; id?: string; value?: any }>;
    visibleIf?: { hasItem?: string };
  }

  interface Dialogue {
    id: string;
    text: string;
    backgroundImage?: string;
    characterImage?: string;
    stateMachineCharacterRive?: string;
    smTriggerBackgroundRive?: string;
    nextDialogueId?: string;
    options?: Option[];
    onEnter?: Array<{ type: string; id?: string; value?: any }>;
  }

  interface StoryData {
    dialogues: Dialogue[];
    meta?: { version: string; title: string };
    items?: any[];
    miniGames?: any[];
  }

  // --- Состояние редактора ---
  let data = $state<StoryData | null>(null);
  let selectedDialogueId = $state<string | null>(null);
  let statusMessage = $state({ type: '', text: '' });
  
  // Загрузка файлов
  let uploadQueue = $state<any[]>([]);
  let isUploading = $state(false);

  onMount(async () => {
    await loadStoryFromSupabase();
  });

  // --- Supabase Logic ---

  async function loadStoryFromSupabase() {
    statusMessage = { type: 'loading', text: 'Загрузка...' };
    try {
      const { data: fileData, error } = await supabase
        .storage
        .from(bucketName)
        .download(storyFileName);

      if (error) throw error;
      data = JSON.parse(await fileData.text());
      statusMessage = { type: 'success', text: 'Загружено!' };
    } catch (err: any) {
      console.error(err);
      statusMessage = { type: 'error', text: 'Ошибка: ' + err.message };
      data = { dialogues: [], meta: { version: "2.0", title: "New Story" } };
    }
  }

  async function saveStoryToSupabase() {
    if (!data) return;
    statusMessage = { type: 'loading', text: 'Сохранение...' };
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const { error } = await supabase.storage.from(bucketName).upload(storyFileName, blob, { upsert: true });
      if (error) throw error;
      statusMessage = { type: 'success', text: 'Сохранено!' };
    } catch (err: any) {
      console.error(err);
      statusMessage = { type: 'error', text: 'Ошибка сохранения' };
    }
  }

  // --- File Upload ---

  async function handleFileSelect(event: Event, type: 'bg' | 'char') {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    
    const uploadItem = { id: Math.random().toString(36).substr(2, 9), file, type, status: 'uploading' };
    uploadQueue = [...uploadQueue, uploadItem];

    try {
      const { error } = await supabase.storage.from(bucketName).upload(file.name, file, { upsert: true });
      if (error) throw error;
      
      uploadItem.status = 'done';
      
      if (selectedDialogueId) {
        const dialogue = data.dialogues.find(d => d.id === selectedDialogueId);
        if (dialogue) {
          if (type === 'bg') dialogue.backgroundImage = file.name;
          if (type === 'char') dialogue.characterImage = file.name;
        }
      }
      statusMessage = { type: 'success', text: `Файл ${file.name} загружен` };
    } catch (err: any) {
      uploadItem.status = 'error';
      uploadItem.error = err.message;
      statusMessage = { type: 'error', text: `Ошибка загрузки` };
    }
  }

  // --- Editor Logic ---

  function addDialogue() {
    if (!data) return;
    const newId = "new_" + Date.now();
    data.dialogues.push({ id: newId, text: "Новый текст...", options: [] });
    data.dialogues.sort((a, b) => a.id.localeCompare(b.id));
    selectedDialogueId = newId;
  }

  function addOption(dialogue: Dialogue) {
    if (!dialogue.options) dialogue.options = [];
    dialogue.options.push({ text: "Новый вариант", nextDialogueId: "0" });
  }

  let currentDialogue = $derived(
    data?.dialogues.find(d => d.id === selectedDialogueId)
  );
</script>

<div class="editor-container">
  <header class="toolbar">
    <div class="logo">
      <h2>Story Editor</h2>
    </div>
    <div class="actions">
      <button onclick={saveStoryToSupabase} class="btn success" disabled={isUploading}>
        💾 Сохранить
      </button>
    </div>
  </header>

  <div class="main-workspace">
    <!-- 1. Left Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h3>Сцены ({data?.dialogues.length || 0})</h3>
        <button onclick={addDialogue} class="btn small primary">+</button>
      </div>
      
      <div class="dialogue-list">
        {#each data?.dialogues || [] as dialogue (dialogue.id)}
          <div 
            class="dialogue-item {selectedDialogueId === dialogue.id ? 'active' : ''}" 
            onclick={() => selectedDialogueId = dialogue.id}
          >
            <span class="id-badge">{dialogue.id}</span>
            <span class="preview-text">{dialogue.text.substring(0, 25)}...</span>
          </div>
        {/each}
      </div>

      <!-- Status Footer -->
      <div class="status-footer">
        {#if statusMessage.text}
          <div class="alert {statusMessage.type}">
            {statusMessage.text}
          </div>
        {/if}
        {#if uploadQueue.some(i => i.status === 'uploading')}
          <div class="alert loading">Загрузка файлов...</div>
        {/if}
      </div>
    </aside>

    <!-- 2. Center Editor -->
    <main class="editor-area">
      {#if currentDialogue}
        <div class="dialogue-form">
          <div class="form-row">
            <div class="form-group full-width">
              <label>ID диалога</label>
              <input type="text" bind:value={currentDialogue.id} class="input" />
            </div>
          </div>

          <div class="form-group">
            <label>Текст</label>
            <textarea bind:value={currentDialogue.text} class="textarea" rows="4"></textarea>
          </div>

          <div class="media-section">
             <div class="form-group">
                <div class="label-row">
                    <label>Фон (Background)</label>
                    <label class="file-label">
                        📁 Загрузить
                        <input type="file" accept="image/*,.riv" onchange={(e) => handleFileSelect(e, 'bg')} hidden />
                    </label>
                </div>
                <input type="text" bind:value={currentDialogue.backgroundImage} class="input" placeholder="back.png" />
             </div>

             <div class="form-group">
                <div class="label-row">
                    <label>Персонаж (Character)</label>
                    <label class="file-label">
                        📁 Загрузить
                        <input type="file" accept="image/*,.riv" onchange={(e) => handleFileSelect(e, 'char')} hidden />
                    </label>
                </div>
                <input type="text" bind:value={currentDialogue.characterImage} class="input" placeholder="dracula.riv" />
             </div>
          </div>

          <div class="options-section">
            <div class="section-header">
              <h4>Варианты ответов</h4>
              <button onclick={() => addOption(currentDialogue)} class="btn small">+ Добавить</button>
            </div>
            {#each currentDialogue.options || [] as option, index (index)}
              <div class="option-card">
                <div class="form-row">
                    <input type="text" bind:value={option.text} placeholder="Текст кнопки" class="input" />
                    <button onclick={() => currentDialogue.options!.splice(index, 1)} class="btn danger small">×</button>
                </div>
                <div class="form-row">
                    <input type="text" bind:value={option.nextDialogueId} placeholder="ID перехода" class="input" />
                </div>
              </div>
            {/each}
          </div>
        </div>
      {:else}
        <div class="empty-state">Выберите сцену</div>
      {/if}
    </main>

    <!-- 3. Right Preview Panel -->
    <aside class="preview-panel">
      <h3>Предпросмотр (Live)</h3>
      <div class="preview-wrapper">
        {#if currentDialogue}
          <!-- 
             Передаем компоненту DialogueCard текущий диалог.
             Важно: Внутри DialogueCard ссылки на изображения должны работать через Supabase Public URL 
             или вы должны убедиться, что компонент умеет строить правильные пути.
             В этом примере мы предполагаем, что DialogueCard уже настроен на работу с Supabase
             или мы используем хак с контекстом, если это нужно.
             
             Чтобы Rive работал, убедитесь, что DialogueCard имеет доступ к supabaseUrlFile
          -->
          <div class="game-preview-container">
             <DialogueCard 
                dialogue={currentDialogue} 
                index={0} 
             />
          </div>
        {:else}
          <div class="empty-preview">Нет выбранной сцены</div>
        {/if}
      </div>
    </aside>
  </div>
</div>

<style>
  :global(body) { margin: 0; background: #1e1e1e; color: #ddd; font-family: sans-serif; overflow: hidden; }
  .editor-container { height: 100vh; display: flex; flex-direction: column; }

  .toolbar { background: #252526; padding: 10px 20px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; }
  .logo h2 { margin: 0; color: #ff5555; font-size: 18px; }

  .main-workspace { display: flex; flex: 1; overflow: hidden; }

  /* Sidebar */
  .sidebar { width: 260px; background: #252526; border-right: 1px solid #333; display: flex; flex-direction: column; }
  .sidebar-header { padding: 10px; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; background: #2d2d2d; }
  .sidebar-header h3 { margin: 0; font-size: 14px; }
  
  .dialogue-list { flex: 1; overflow-y: auto; }
  .dialogue-item { padding: 10px; border-bottom: 1px solid #333; cursor: pointer; display: flex; flex-direction: column; gap: 4px; }
  .dialogue-item:hover { background: #2a2d2e; }
  .dialogue-item.active { background: #37373d; border-left: 3px solid #ff5555; }
  .id-badge { font-size: 10px; color: #888; font-family: monospace; }
  .preview-text { font-size: 12px; color: #ccc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .status-footer { padding: 10px; border-top: 1px solid #333; background: #1e1e1e; }
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
  .label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; }

  .input, .textarea { width: 100%; background: #3c3c3c; border: 1px solid #3c3c3c; color: white; padding: 8px; border-radius: 4px; box-sizing: border-box; }
  .input:focus, .textarea:focus { border-color: #ff5555; outline: none; }
  
  .media-section { padding: 15px; background: #2d2d2d; border-radius: 4px; margin-bottom: 20px; }
  .file-label { color: #4caf50; cursor: pointer; font-size: 11px; font-weight: bold; }
  .file-label:hover { text-decoration: underline; }

  .options-section { margin-top: 20px; border-top: 1px dashed #444; padding-top: 20px; }
  .option-card { background: #2d2d2d; padding: 10px; margin-bottom: 10px; border-radius: 4px; }

  /* Preview Panel */
  .preview-panel { 
    width: 400px; /* Сделал чуть шире для компонентов игры */
    background: #121212; 
    border-left: 1px solid #333; 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
  }
  .preview-panel h3 { 
    width: 100%; 
    padding: 10px; 
    margin: 0; 
    font-size: 14px; 
    background: #252526; 
    text-align: center; 
    border-bottom: 1px solid #333; 
  }

  .preview-wrapper {
    width: 100%;
    height: 100%;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Масштабируем, если компонент игры слишком большой */
    transform-origin: top center;
  }
  
  .game-preview-container {
     width: 100%;
     height: 100%;
     /* Добавляем overflow hidden, чтобы игра не вылезала за пределы панели */
     overflow: hidden;
  }

  .empty-state, .empty-preview {
      display: flex; align-items: center; justify-content: center;
      color: #666; font-size: 14px;
      height: 100%;
  }

  .btn { padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; }
  .btn.primary { background: #0e639c; color: white; }
  .btn.success { background: #2e7d32; color: white; }
  .btn.danger { background: #c62828; color: white; }
  .btn.small { padding: 4px 8px; font-size: 11px; }
</style>