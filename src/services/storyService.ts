import { supabase, getPublicUrl } from "./supabase";
import type { StoryData } from "../types";

export class StoryService {
  // Загрузить историю из бакета
  static async loadStory(bucket: string, fileName: string): Promise<StoryData> {
    try {
      const url = getPublicUrl(bucket, fileName);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to load story: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error loading story:", error);
      throw error;
    }
  }

  // Сохранить историю в бакет
  static async saveStory(
    bucket: string,
    fileName: string,
    data: StoryData,
  ): Promise<boolean> {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, blob, { upsert: true });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error saving story:", error);
      return false;
    }
  }

  // Получить список файлов в бакете
  static async listBucketFiles(bucket: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.storage.from(bucket).list();

      if (error) throw error;
      return data.map((file) => file.name);
    } catch (error) {
      console.error("Error listing bucket files:", error);
      return [];
    }
  }
}
