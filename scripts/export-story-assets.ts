/**
 * Скрипт для экспорта ресурсов истории из Supabase Storage в папку public/stories/
 * 
 * Использование:
 *   npx tsx -r dotenv/config scripts/export-story-assets.ts <bucket_name>
 *   npx tsx -r dotenv/config scripts/export-story-assets.ts dracula
 *   npx tsx -r dotenv/config scripts/export-story-assets.ts --all
 * 
 * Создаёт структуру:
 *   public/stories/<bucket>/
 *   ├── story.json
 *   └── все остальные файлы
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Загружаем .env
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY; // Для админских операций

const PUBLIC_DIR = path.join(process.cwd(), 'public', 'stories');

interface StorageFile {
  name: string;
  id: string;
  updated_at: string;
  created_at: string;
  last_accessed_at: string;
  metadata: Record<string, unknown>;
}

async function exportBucket(bucketName: string): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Ошибка: Не указаны VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  // Используем service key если есть, иначе anon key
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  const supabase = createClient(SUPABASE_URL, key);

  console.log(`\n📦 Экспорт ресурсов из bucket: ${bucketName}`);
  console.log(`   URL: ${SUPABASE_URL}`);

  const outputDir = path.join(PUBLIC_DIR, bucketName);
  
  // Создаём директории
  const dirs = [
    outputDir,    
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`   📁 Создана директория: ${path.relative(process.cwd(), dir)}`);
    }
  }

  try {
    // Получаем список файлов
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1000 });

    if (error) {
      console.error('❌ Ошибка получения списка файлов:', error.message);
      process.exit(1);
    }

    if (!files || files.length === 0) {
      console.log('   ⚠️  Bucket пуст');
      return;
    }

    console.log(`   Найдено файлов: ${files.length}`);

    // Скачиваем каждый файл
    let downloaded = 0;
    let skipped = 0;

    for (const file of files as StorageFile[]) {
      // Пропускаем папки
      if (file.metadata?.isFolder) continue;

      const fileName = file.name;
      let destDir = outputDir;

      // Все файлы в корень bucket'а (для простоты загрузки)
      // JSON - в корень
      const ext = path.extname(fileName).toLowerCase();
      
      if (ext === '.json') {
        destDir = outputDir;
      }
      // Остальные - тоже в корень (не в other)

      const destPath = path.join(destDir, fileName);

      try {
        // Используем нативный fetch для больших файлов (RIV могут быть десятки MB)
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${fileName}`;
        
        const response = await fetch(publicUrl, {
          headers: { 'Authorization': `Bearer ${key}` }
        });
        
        if (!response.ok) {
          console.error(`   ❌ Ошибка HTTP ${response.status} для ${fileName}`);
          skipped++;
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(destPath, buffer);
        
        downloaded++;
        console.log(`   ✅ ${fileName} → ${path.relative(PUBLIC_DIR, destPath)}`);
      } catch (err) {
        console.error(`   ❌ Ошибка при скачивании ${fileName}:`, err);
        skipped++;
      }
    }

    console.log(`\n✨ Готово!`);
    console.log(`   Скачано: ${downloaded}`);
    console.log(`   Пропущено: ${skipped}`);
    console.log(`   Папка: ${path.relative(process.cwd(), outputDir)}`);

  } catch (err) {
    console.error('❌ Критическая ошибка:', err);
    process.exit(1);
  }
}

async function exportAll(): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Ошибка: Не указаны VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  const supabase = createClient(SUPABASE_URL, key);

  console.log('📋 Получение списка buckets...');

  // Получаем список buckets через API
  const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: {
      'Authorization': `Bearer ${key}`,
      'apikey': key,
    },
  });

  if (!response.ok) {
    console.error('❌ Ошибка получения списка buckets');
    process.exit(1);
  }

  const buckets = await response.json();
  
  // Фильтруем только наши buckets (исключаем системные)
  const storyBuckets = (buckets as { id: string }[]).filter(b => 
    b.id !== 'avatars' && 
    !b.id.includes('icon') &&
    !b.id.includes('temp')
  );

  console.log(`Найдено buckets: ${storyBuckets.length}`);
  
  for (const bucket of storyBuckets) {
    await exportBucket(bucket.id);
  }
}

// Точка входа
const args = process.argv.slice(2);
const bucketName = args[0];

if (!bucketName) {
  console.log(`
📖 Использование:
   npx tsx scripts/export-story-assets.ts <bucket_name>   npx tsx scripts/export-story-assets.ts dracula
   npx tsx scripts/export-story-assets.ts --all

📋 Примеры buckets:
   - dracula
   - zombie
   - fairy_tale
   - minigames
   - stories (основной)

🔧 Требуемые переменные окружения:
   VITE_SUPABASE_URL
   VITE_SUPABASE_ANON_KEY   SUPABASE_SERVICE_KEY (опционально, для полного доступа)
`);
  process.exit(1);
}

if (bucketName === '--all') {
  exportAll();
} else {
  exportBucket(bucketName);
}
