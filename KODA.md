# KODA: Документация проекта

## Обзор проекта

**Название проекта:** Визуальная новелла с Дракулой (Telegram Mini App)

**Тип проекта:** Интерактивная визуальная новелла с системой выбора, инвентарём и мини-играми

**Назначение:** Проект представляет собой интерактивную историю в формате визуальной новеллы, которая работает как Telegram Mini App. Пользователь может проходить историю с Дракулой, делать выбор, влияющий на сюжет, собирать предметы, играть в мини-игры и использовать встроенный редактор для создания собственных историй.

## Основные технологии

### Frontend
- **Svelte 5** (с runes) — реактивный фреймворк для UI
- **TypeScript** — типизация JavaScript
- **Vite** — сборщик и инструмент разработки
- **SvelteKit** — фреймворк для полнофункциональных веб-приложений

### Backend и хранение данных
- **Supabase** — облачная база данных и хранилище файлов
  - Хранилище файлов для историй (JSON) и ресурсов (изображения, Rive-файлы)
  - Аутентификация пользователей через Telegram

### Анимации и визуализация
- **Rive** — интерактивные анимации для персонажей и фонов
- Поддержка статических изображений для фонов и персонажей

### Платформа
- **Telegram Mini App (TMA)** — интеграция с Telegram WebApp API

## Архитектура проекта

### Структура директорий

```
src/
├── lib/
│   ├── novella/              # Игровой движок визуальной новеллы
│   │   ├── Main.svelte       # Главный компонент игры
│   │   ├── DialogueCard.svelte # Карточка диалога с выбором
│   │   ├── Rive.svelte       # Компонент для Rive-анимаций
│   │   └── components/       # Дополнительные игровые компоненты
│   ├── editor/               # Визуальный редактор историй
│   │   ├── Editor.svelte     # Главный компонент редактора
│   │   ├── components/       # Компоненты UI редактора
│   │   │   ├── EditorSidebar.svelte
│   │   │   ├── DialogueForm.svelte
│   │   │   ├── ItemsManager.svelte
│   │   │   └── PreviewPanel.svelte
│   │   ├── stores/           # Сторы редактора
│   │   │   ├── editorStore.svelte.ts
│   │   │   ├── storyStore.ts
│   │   │   └── resourceStore.ts
│   │   ├── types/            # TypeScript типы
│   │   │   └── index.ts
│   │   └── utils/            # Утилиты (миграции, валидация)
│   ├── novella_telegram/     # Интеграция с Telegram
│   │   └── TelegramApp.svelte
│   ├── store/                # Игровые сторы
│   │   ├── gameStore.svelte.ts  # Прогресс игры, инвентарь, статы
│   │   └── store.svelte.ts      # Главный стор приложения
│   ├── supabaseClient.ts     # Клиент Supabase
│   └── telegram.ts           # Утилиты Telegram WebApp
├── routes/                   # SvelteKit маршруты
├── app.html                  # HTML шаблон
├── main.ts                   # Точка входа
└── App.svelte                # Корневой компонент
```

### Основные компоненты

#### Игровой движок (`src/lib/novella/`)
- **Main.svelte**: Загружает историю из JSON, управляет состоянием игры, обрабатывает навигацию между диалогами
- **DialogueCard.svelte**: Отображает текст диалога, фоны, персонажей и варианты ответов
- **Rive.svelte**: Компонент для рендеринга Rive-анимаций

#### Редактор (`src/lib/editor/`)
- **Editor.svelte**: Главная панель редактора с разделённым интерфейсом
- **EditorSidebar.svelte**: Навигация по главам и диалогам
- **DialogueForm.svelte**: Форма редактирования диалога
- **ItemsManager.svelte**: Управление предметами инвентаря
- **PreviewPanel.svelte**: Предпросмотр текущей сцены

#### Сторы (State Management)
- **gameStore.svelte.ts**: Игровой прогресс, инвентарь, статы персонажа
- **store.svelte.ts**: Глобальное состояние приложения
- **editorStore.svelte.ts**: Состояние редактора (выбранный диалог, статус, данные)
- **storyStore.ts**: Действия с историями (загрузка, сохранение, создание)
- **resourceStore.ts**: Управление ресурсами в Supabase

### Модель данных

#### StoryData
```typescript
{
  meta: { version: string, title: string }
  chapters: Chapter[]
  dialogues: Dialogue[]
  items: Item[]
  miniGames: any[]
}
```

#### Dialogue
```typescript
{
  id: string
  chapterId: string
  text: string
  backgroundImage?: string
  characterImage?: string
  stateMachineCharacterRive?: string  // Rive-анимация персонажа
  smTriggerBackgroundRive?: string     // Триггер для Rive-анимации фона
  nextDialogueId?: string
  options?: Option[]
  onEnter?: Array<{ type: string, id?: string, value?: any }>
}
```

#### Option (вариант ответа)
```typescript
{
  text: string
  nextDialogueId?: string
  miniGame?: {
    id: string
    onWinDialogueId: string
    onLoseDialogueId: string
  }
  actions?: Array<{ type: string, id?: string, value?: any }>
  enabled: boolean
  visible: boolean
  visibilityCondition?: Condition
}
```

#### Condition (условие видимости)
```typescript
{
  type: "has_item" | "stat_greater" | "flag_true" | "always"
  itemId?: string
  statName?: string
  statValue?: number
  flagName?: string
}
```

## Сборка и запуск

### Установка зависимостей
```bash
npm install
```

### Запуск в режиме разработки
```bash
npm run dev
```
Приложение будет доступно по адресу `http://localhost:5173`

### Сборка для продакшена
```bash
npm run build
```

### Предпросмотр продакшн-сборки
```bash
npm run preview
```

### Запуск тестов
```bash
npm run test
```
*(Примечание: проверить наличие тестов в проекте)*

### Проверка типов
```bash
npm run check
```

### Линтер
```bash
npm run lint
```
*(Примечание: проверить наличие ESLint конфигурации)*

## Правила разработки

### Стиль кодирования

#### Svelte 5 (Runes)
- Использовать runes (`$state`, `$derived`, `$effect`) вместо старого реактивного API
- Для реактивных компонентов использовать runes-based подход
- Компоненты должны быть максимально декларативными

#### TypeScript
- Использовать строгую типизацию (strict mode)
- Все типы должны быть определены в `src/lib/editor/types/index.ts`
- Избегать типа `any`, использовать `unknown` или конкретные типы

#### Именование
- Компоненты: PascalCase (`Main.svelte`, `DialogueCard.svelte`)
- Переменные и функции: camelCase (`selectedDialogueId`, `loadStory`)
- Константы: UPPER_SNAKE_CASE (`BUCKET_NAME`)
- TypeScript интерфейсы и типы: PascalCase (`StoryData`, `Dialogue`)

#### Структура файлов
- Каждый компонент в отдельном файле `.svelte`
- Типы выносить в отдельные файлы `types/index.ts`
- Утилиты и helper-функции в директории `utils/`
- Сторы в директории `stores/`

### Конвенции для визуальной новеллы

#### Диалоги
- Каждый диалог должен иметь уникальный `id`
- `chapterId` обязателен для организации структуры
- Текст диалога должен быть кратким и ёмким
- Фоны и персонажи должны быть оптимизированы для TMA

#### Опции (варианты ответов)
- Всегда указывать `nextDialogueId` или `miniGame`
- Использовать условия видимости для ветвления сюжета
- Действия (actions) должны быть атомарными

#### Предметы (Items)
- Типы предметов: `tool`, `key`, `consumable`, `quest`, `misc`
- Каждый предмет должен иметь описание и иконку
- Иконки должны быть оптимизированы для мобильных устройств

### Интеграция с Supabase

- Все файлы историй хранятся в bucket `stories`
- Ресурсы (изображения, Rive) в том же bucket
- Использовать `upsert: true` для обновления файлов
- Обрабатывать ошибки загрузки/сохранения с пользовательскими сообщениями

### Интеграция с Telegram

- Инициализация Telegram WebApp через `initializeTelegram()`
- Проверка окружения через `ifUseTelegram()`
- Получение данных пользователя через `getTelegramUser()`
- Расширять приложение на весь экран: `tg.expand()`

### Анимации Rive

- Rive-файлы хранятся в Supabase
- Использовать State Machine для интерактивных анимаций
- Триггеры для анимаций задаются через `smTriggerBackgroundRive`
- Обеспечивать fallback на статические изображения

### Мини-игры

- Мини-игры интегрируются через опции диалогов
- Обязательно указывать `onWinDialogueId` и `onLoseDialogueId`
- Мини-игры должны быть оптимизированы для мобильных устройств

### Миграции данных

- Использовать систему миграций в `src/lib/editor/utils/migration.ts`
- При загрузке старых историй автоматически применять миграции
- Сохранять обратную совместимость при возможности

### Тестирование

- Тестировать критические пути в редакторе (сохранение, загрузка)
- Проверять работу условий видимости опций
- Тестировать интеграцию с Supabase
- Проверять работу в Telegram Mini App окружении

### Git workflow

- Использовать feature branches для новой функциональности
- Названия веток: `feature/название-функции`, `fix/описание-бага`
- Писать информативные commit messages на русском или английском
- Перед merge запускать `npm run check` и `npm run build`

### Безопасность

- Никогда не коммитить API ключи и секреты
- Использовать переменные окружения для конфиденциальных данных
- Проверять входные данные от пользователей в редакторе
- Валидировать JSON структуры историй

## Конфигурация

### Vite (`vite.config.ts`)
- Алиас `@` указывает на `src`
- Плагин `sveltekit` для интеграции с SvelteKit

### TypeScript (`tsconfig.json`)
- Strict mode включён
- Path aliases настроены
- Целевая версия: ES2020

### Svelte (`svelte.config.js`)
- Адаптер `@sveltejs/adapter-static` для статического деплоя
- Preprocess для TypeScript

## Текущая история

Файл `dracula_story.json` содержит демонстрационную историю:
- **Глава 1**: Встреча с Дракулой
- **Глава 2**: Ритуал призыва демонов
- Несколько веток сюжета
- Мини-игра "Память Теней"
- Система предметов (Крест, Чеснок, Зелье)

## TODO и планы развития

- [ ] Добавить больше мини-игр
- [ ] Улучшить систему достижений
- [ ] Добавить поддержку сохранений/загрузок прогресса
- [ ] Интеграция с Telegram Payments (опционально)
- [ ] Мультиязычность (i18n)
- [ ] Улучшить анимации переходов
- [ ] Добавить систему настроек (звук, эффекты)

## Полезные ресурсы

- [Svelte 5 Documentation](https://svelte.dev/docs)
- [SvelteKit Documentation](https://kit.svelte.dev/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Rive Documentation](https://rive.app/community/doc)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)

---

**Последнее обновление:** 2025
**Версия документации:** 1.0
