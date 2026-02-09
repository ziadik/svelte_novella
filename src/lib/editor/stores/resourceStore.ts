import { supabase, bucketName } from "../../supabaseClient";
import { editor, editorActions } from "./editorStore.svelte";
import type { StoredFile } from "../types";

export const resourceActions = {
  async loadStoriesList() {
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list("", { search: ".json" });

    if (!error && files) {
      editor.storiesList = files
        .map((f) => f.name)
        .filter((n) => n !== ".emptyFolderPlaceholder");
    }
  },

  async loadStoredResources() {
    const { data: files } = await supabase.storage.from(bucketName).list();
    if (files) {
      editor.storedFiles = files.filter(
        (f) =>
          f.name !== ".emptyFolderPlaceholder" && !f.name.endsWith(".json"),
      );
    }
  },

  async uploadNewFile(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    editorActions.setStatus("loading", "Загрузка файла...");

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(file.name, file, { upsert: true });

    if (error) {
      editorActions.setStatus("error", "Ошибка загрузки");
    } else {
      editorActions.setStatus("success", "Файл загружен");
      await this.loadStoredResources();
    }
  },
};
