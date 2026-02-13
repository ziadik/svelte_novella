import { supabase, bucketName } from "../services/supabase";
import { storedFiles, storiesList, editorActions } from "./editorStore.svelte";

export const resourceActions = {
  async loadStoriesList() {
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list("", { search: ".json" });

    if (!error && files) {
      editorActions.setStoriesList(
        files
          .map((f) => f.name)
          .filter((n) => n !== ".emptyFolderPlaceholder")
      );
    }
  },

  async loadStoredResources() {
    console.log('resourceActions.loadStoredResources: loading...');
    const { data: files, error } = await supabase.storage.from(bucketName).list();
    console.log('resourceActions.loadStoredResources: files', files, 'error', error);

    if (files) {
      const filteredFiles = files.filter(
        (f) =>
          f.name !== ".emptyFolderPlaceholder" && !f.name.endsWith(".json"),
      );
      console.log('resourceActions.loadStoredResources: filtered files', filteredFiles);
      editorActions.setStoredFiles(filteredFiles);
      console.log('resourceActions.loadStoredResources: storedFiles after set', storedFiles());
    }
  },

  async uploadNewFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    console.log('resourceActions.uploadNewFile: uploading', file.name);
    editorActions.setStatus("loading", "Загрузка файла...");

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(file.name, file, { upsert: true });

    if (error) {
      console.error('resourceActions.uploadNewFile: error', error);
      editorActions.setStatus("error", "Ошибка загрузки: " + error.message);
    } else {
      console.log('resourceActions.uploadNewFile: success');
      editorActions.setStatus("success", "Файл загружен");
      await this.loadStoredResources();
    }
  },
};
