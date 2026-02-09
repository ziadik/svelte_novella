// services/bucketService.ts
import { supabase } from "../supabaseClient";
import type { StoryInfo, BucketInfo } from "../types";

export interface StoryInfo {
  id: string;
  name: string;
  bucket: string;
  defaultFile: string;
  description?: string;
  thumbnail?: string;
  lastModified?: Date;
}

export interface BucketInfo {
  name: string;
  size?: number;
  fileCount?: number;
  isPublic?: boolean;
}

export class BucketService {
  // Получить список всех доступных бакетов
  static async listBuckets(): Promise<BucketInfo[]> {
    // Note: Supabase не предоставляет прямой API для списка бакетов
    // Нужно хранить конфигурацию или использовать кастомное решение
    // Здесь предположим, что у нас есть таблица с метаданными бакетов
    const { data, error } = await supabase.from("buckets_metadata").select("*");

    if (error) {
      console.error("Ошибка получения бакетов:", error);
      return [];
    }

    return data as BucketInfo[];
  }

  // Создать новый бакет для истории
  static async createBucket(
    bucketName: string,
    storyName: string,
  ): Promise<boolean> {
    try {
      // Создаем таблицу для метаданных бакета
      const { error: metaError } = await supabase
        .from("buckets_metadata")
        .insert([
          {
            name: bucketName,
            story_name: storyName,
            created_at: new Date().toISOString(),
          },
        ]);

      if (metaError) throw metaError;

      // Создаем стандартные файлы в бакете
      const defaultStory = {
        meta: {
          version: "3.1",
          title: storyName,
          created: new Date().toISOString(),
        },
        chapters: [{ id: "ch1", title: "Глава 1" }],
        dialogues: [
          {
            id: "start",
            chapterId: "ch1",
            text: "Начало вашего приключения...",
            options: [],
          },
        ],
        items: [],
      };

      const blob = new Blob([JSON.stringify(defaultStory, null, 2)], {
        type: "application/json",
      });

      const { error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload("story.json", blob, { upsert: true });

      if (uploadError) {
        // Если бакет не существует, создаем его косвенно через загрузку файла
        // В Supabase бакет создается автоматически при первой загрузке
        console.log("Создаем новый бакет через загрузку файла");
      }

      return true;
    } catch (error) {
      console.error("Ошибка создания бакета:", error);
      return false;
    }
  }

  // Удалить бакет (только для админов)
  static async deleteBucket(bucketName: string): Promise<boolean> {
    // Note: Supabase не предоставляет API для удаления бакетов через JS
    // Нужно делать через админ-панель Supabase
    console.warn(
      "Удаление бакетов доступно только через админ-панель Supabase",
    );
    return false;
  }

  // Получить информацию о бакете
  static async getBucketInfo(bucketName: string): Promise<BucketInfo | null> {
    try {
      const { data: files } = await supabase.storage.from(bucketName).list();

      const { data: metadata } = await supabase
        .from("buckets_metadata")
        .select("*")
        .eq("name", bucketName)
        .single();

      return {
        name: bucketName,
        fileCount: files?.length || 0,
        ...metadata,
      };
    } catch (error) {
      console.error("Ошибка получения информации о бакете:", error);
      return null;
    }
  }
}
