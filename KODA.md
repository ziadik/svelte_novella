# KODA: Документация проекта

## Обзор проекта

**Название проекта:** Визуальная новелла с Дракулой (Telegram Mini App + PWA)

**Тип проекта:** Интерактивная визуальная новелла с системой выбора, инвентарём, мини-играми и встроенным редактором историй

**Назначение:** Проект представляет собой интерактивную историю в формате визуальной новеллы, которая работает как Telegram Mini App и PWA-приложение. Пользователь может проходить истории с Дракулой и другими персонажами, делать выбор, влияющий на сюжет, собирать предметы, играть в мини-игры. Также доступен встроенный редактор для создания и редактирования собственных историй (доступен только авторам и админам с интернетом).

## Основные технологии

### Frontend
- **Svelte 5** (с runes) — реактивный фреймворк для UI
- **TypeScript** — типизация JavaScript
- **Vite** — сборщик и инструмент разработки
- **PWA** — прогрессивное веб-приложение с офлайн-поддержкой

### Backend и хранение данных
- **Supabase** — облачная база данных и хранилище файлов
  - Хранилище файлов для историй (JSON) и ресурсов (изображения, Rive-файлы)
  - Аутентификация пользователей через Telegram
  - Таблица `stories` для хранения метаданных историй

### Анимации и визуализация
- **Rive** — интерактивные анимации для персонажей и фонов
- Поддержка статических изображений для фонов и персонажей

### Платформа
- **Telegram Mini App** — основная платформа запуска
- **PWA** — возможность установки на устройство и работы офлайн
- **iOS Safari** — оптимизировано для Safari (viewport-fit=cover, black-translucent status bar)

## Архитектура проекта

### Структура директорий

```
src/
├── lib/
│   ├── novella/              # Игровой движок визуальной новеллы
│   │   ├── Main.svelte       # Главный компонент игры
│   │   ├── DialogueCard.svelte # Карточка диалога с выбором
│   │   ├── Rive.svelte       # Компонент для Rive-анимаций
│   │   ├── MinigameLauncher.svelte # Запуск мини-игр
│   │   └── components/       # Дополнительные игровые компоненты
│   │       ├── Inventory.svelte    # Инвентарь игрока
│   │       └── StorySelector.svelte # Выбор истории
│   ├── editor/               # Визуальный редактор историй
│   │   ├── Editor.svelte     # Главный компонент редактора
│   │   ├── components/       # Компоненты UI редактора
│   │   │   ├── EditorSidebar.svelte
│   │   │   ├── DialogueForm.svelte
│   │   │   ├── ChapterForm.svelte
│   │   │   ├── ItemsManager.svelte
│   │   │   ├── OptionEditor.svelte
│   │   │   ├── PreviewPanel.svelte
│   │   │   ├── InfographicPanel.svelte
│   │   │   └── StorySelector.svelte
│   │   ├── stores/           # Сторы редактора
│   │   │   ├── editorStore.svelte.ts
│   │   │   ├── storyStore.ts
│   │   │   ├── resourceStore.ts
│   │   │   └── bucketStore.ts
│   │   ├── types/            # TypeScript типы
│   │   │   └── index.ts
│   │   └── utils/            # Утилиты (миграции, валидация)
│   │       └── migration.ts
│   ├── minigames/            # Коллекция мини-игр
│   │   ├── MemoMonsters.svelte
│   │   ├── OnetMonsters.svelte
│   │   ├── AlchemicalCalculator.svelte
│   │   ├── AlchemistsCross.svelte
│   │   ├── Bones421.svelte
│   │   ├── BrokenMirror.svelte
│   │   ├── CrystalsOfTime.svelte
│   │   ├── CursedCrypts.svelte
│   │   ├── Evolution2048.svelte
│   │   ├── FloodIt.svelte
│   │   ├── LabyrinthOfMinotaur.svelte
│   │   ├── LightOut.svelte
│   │   ├── RunesOfFate.svelte
│   │   ├── SoulCycle.svelte
│   │   ├── TowerOfSouls.svelte
│   │   ├── WhisperOfSpiders.svelte
│   │   ├── WitchesCauldrons.svelte
│   │   └── components/       # Общие компоненты мини-игр
│   ├── novella_telegram/     # Интеграция с Telegram
│   │   └── TelegramApp.svelte
│   ├── components/           # Общие UI компоненты
│   │   ├── AuthModal.svelte
│   │   ├── UserMenu.svelte
│   │   └── ResetPasswordPage.svelte
│   ├── store/                # Глобальные сторы
│   │   ├── gameStore.svelte.ts  # Прогресс игры, инвентарь, статы
│   │   ├── authStore.svelte.ts  # Аутентификация
│   │   ├── storiesStore.svelte.ts # Управление историями
│   │   ├── store.svelte.ts      # Главный стор приложения
│   │   └── gameModeStore.svelte.ts # Режимы игры
│   ├── supabaseClient.ts     # Клиент Supabase с логированием
│   └── telegram.ts           # Утилиты Telegram WebApp
├── public/
│   ├── sw.js                 # Service Worker для PWA
│   ├── manifest.json         # PWA манифест
│   ├── icon-192.png          # Иконка 192x192
│   └── icon-512.png          # Иконка 512x512
├── App.svelte                # Корневой компонент
├── main.ts                   # Точка входа
└── app.css                   # Глобальные стили
```

### Основные компоненты

#### Игровой движок (`src/lib/novella/`)
- **Main.svelte**: Загружает историю из JSON, управляет состоянием игры, обрабатывает навигацию между диалогами. Содержит проверку онлайн-статуса для управления доступом к редактору. Поддерживает внешние ссылки через URL параметр `?story=id`.
- **DialogueCard.svelte**: Отображает текст диалога, фоны, персонажей и варианты ответов. Поддерживает:
  - Свайп влево для перехода к следующему диалогу (мобильные устройства)
  - Проп `isPreview` для режима предпросмотра в редакторе
  - Клик для перехода (десктопы)
- **Rive.svelte**: Компонент для рендеринга Rive-анимаций
- **MinigameLauncher.svelte**: Запуск мини-игр из диалогов
- **Inventory.svelte**: Отображение и управление инвентарём
- **StorySelector.svelte**: Выбор доступных историй (поддерживает fallback для офлайн)

#### Редактор (`src/lib/editor/`)
- **Editor.svelte**: Главная панель редактора с разделённым интерфейсом. Содержит флаг `manualStorySelected` для корректной загрузки историй из БД.
- **EditorSidebar.svelte**: Навигация по главам и диалогам
- **DialogueForm.svelte**: Форма редактирования диалога
- **ChapterForm.svelte**: Форма редактирования главы
- **ItemsManager.svelte**: Управление предметами инвентаря
- **OptionEditor.svelte**: Редактирование вариантов ответа
- **PreviewPanel.svelte**: Предпросмотр текущей сцены (передаёт `isPreview={true}` в DialogueCard)
- **StorySelector.svelte**: Выбор истории для редактирования (только для авторов/админов)
- **InfographicPanel.svelte**: Панель инфографики

#### Сторы (State Management)
- **gameStore.svelte.ts**: Игровой прогресс, инвентарь, статы персонажа, загрузка историй
- **authStore.svelte.ts**: Аутентификация, профиль пользователя, сессии
- **storiesStore.svelte.ts**: Управление историями из БД, fallback для гостей
- **editorStore.svelte.ts**: Состояние редактора (выбранный диалог, статус, данные)
- **storyStore.ts**: Действия с историями (загрузка, сохранение, создание)
- **resourceStore.ts**: Управление ресурсами в Supabase
- **bucketStore.ts**: Управление bucket'ами хранилища
- **userKeyStore**: Аналитика пользователей (ключи, статистика визитов, отслеживание игр)

#### Мини-игры (`src/lib/minigames/`)
- Более 15 различных мини-игр (память, головоломки, аркады)
- Все мини-игры следуют единому интерфейсу
- Поддержка наград (предметы, статы)

### PWA и Офлайн-режим

#### Service Worker (`public/sw.js`)
- Кэширование статических ресурсов (JS, CSS, изображения, Rive-файлы)
- Динамическое кэширование JSON историй
- Стратегия: Network-first для навигации, Cache-first для статики
- Fallback на кэш при отсутствии сети
- Поддержка схем: chrome-extension, moz-extension, data, blob
- Предкэширование JSON историй для офлайн-работы

#### Обработка онлайн/оффлайн статуса
- Отслеживание через `navigator.onLine` и события `online`/`offline`
- Без сети:
  - Авторизация недоступна (показывается сообщение "Нет подключения")
  - Редактирование недоступно (кнопка редактора скрыта)
  - Доступны только истории из fallback-кэша
- Логирование всех запросов к Supabase

#### Fallback для гостей
- Статический список историй в `storiesStore.svelte.ts` (FALLBACK_STORIES)
- Используется при отсутствии сети или ошибках RLS
- Включает: dracula, zombie, fairy_tale, minigames

## Модель данных

### Story (из таблицы Supabase)
```typescript
{
  id: string
  created_at: string
  title: string
  author_id: string | null
  json_url: string          // Имя JSON файла в storage
  preview_image_url: string | null
  is_public: boolean
  allowed_players: string[]
  bucket: string            // Bucket в storage
}
```

### StoryData (JSON структура)
```typescript
{
  meta: { version: string, title: string }
  chapters: Chapter[]
  dialogues: Dialogue[]
  items: Item[]
  miniGames: any[]
}
```

### Dialogue
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

### Option (вариант ответа)
```typescript
{
  text: string
  nextDialogueId?: string
  miniGame?: {
    id: string
    onWinDialogueId: string
    onLoseDialogueId: string
    rewardItem?: string
  }
  actions?: Array<{ type: string, id?: string, value?: any }>
  enabled?: boolean
  visible?: boolean
  visibilityCondition?: Condition
}
```

### Condition (условие видимости)
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

### Проверка типов
```bash
npm run check
```

## Правила разработки

### Svelte 5 (Runes)
- Использовать runes (`$state`, `$derived`, `$effect`) вместо старого реактивного API
- Для реактивных компонентов использовать runes-based подход
- Компоненты должны быть максимально декларативными

### TypeScript
- Использовать строгую типизацию (strict mode)
- Все типы должны быть определены в `src/lib/editor/types/index.ts`
- Избегать типа `any`, использовать `unknown` или конкретные типы

### Именование
- Компоненты: PascalCase (`Main.svelte`, `DialogueCard.svelte`)
- Переменные и функции: camelCase (`selectedDialogueId`, `loadStory`)
- Константы: UPPER_SNAKE_CASE (`BUCKET_NAME`)
- TypeScript интерфейсы и типы: PascalCase (`StoryData`, `Dialogue`)

### Структура файлов
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
- Иконки должны быть оптимизированы для мобильные устройства

### Интеграция с Supabase

- Все файлы историй хранятся в bucket `stories`
- Ресурсы (изображения, Rive) в том же bucket
- Использовать `upsert: true` для обновления файлов
- Обрабатывать ошибки загрузки/сохранения с пользовательскими сообщениями
- **RLS политики**: Для публичных историй использовать политику `is_public = true`
- Логирование всех запросов через custom fetch в `supabaseClient.ts`
- Кастомный fetch логирует метод, URL, статус и время выполнения каждого запроса

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
- Кэшируются Service Worker'ом для офлайн-работы

### Мини-игры

- Мини-игры интегрируются через опции диалогов
- Обязательно указывать `onWinDialogueId` и `onLoseDialogueId`
- Мини-игры должны быть оптимизированы для мобильных устройств
- Более 15 игр в `src/lib/minigames/`

### PWA и Офлайн

- Service Worker регистрируется в `index.html`
- Кэшируются: JS, CSS, PNG, JPG, SVG, JSON, RIV, шрифты
- Без сети:
  - Авторизация недоступна
  - Редактирование недоступно
  - Истории загружаются из fallback
- Проверка `navigator.onLine` перед запросами к Supabase

### Миграции данных

- Использовать систему миграций в `src/lib/editor/utils/migration.ts`
- При загрузке старых историй автоматически применять миграции
- Сохранять обратную совместимость при возможности

### Тестирование

- Тестировать критические пути в редакторе (сохранение, загрузка)
- Проверять работу условий видимости опций
- Тестировать интеграцию с Supabase
- Проверять работу в офлайн-режиме
- Тестировать в Telegram Mini App окружении
- Тестировать установку PWA на iOS Safari

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
- Ограничивать функциональность без сети (редактирование)

## Конфигурация

### Vite (`vite.config.ts`)
- Алиас `@` указывает на `src`
- Плагин `svelte` для Svelte 5

### TypeScript (`tsconfig.json`)
- Strict mode включён
- Path aliases настроены
- Целевая версия: ES2020

### PWA манифест (`public/manifest.json`)
- name: "Визуальные новеллы"
- short_name: "Новеллы"
- display: "standalone"
- orientation: "portrait"
- categories: ["games", "entertainment"]
- theme_color: "#e94560"
- background_color: "#1a1a2e"

### Service Worker (`public/sw.js`)
- Кэш версии: novella-v1, novella-static-v1, novella-dynamic-v1
- Статические ассеты предкэшируются при установке
- Стратегия Network-first для навигации
- Стратегия Stale-while-revalidate для статики
- Fallback для офлайн-режима

## Текущие истории

В проекте есть демонстрационные JSON файлы:
- `dracula.json` / `dracula_story.json` — история про Дракулу
- `zombie.json` / `zombie_story.json` — постапокалиптическая история
- `fairy_tale.json` — сказочная история
- `minigames.json` — демонстрация мини-игр

Fallback-истории для офлайн-режима определены в `storiesStore.svelte.ts`.

## Ограничения

### Без интернета
- ❌ Авторизация недоступна
- ❌ Редактирование историй недоступно
- ❌ Загрузка историй из Supabase недоступна
- ✅ Прохождение доступных историй (fallback)
- ✅ Все загруженные ранее истории доступны

### Редактор
- ✅ Только для авторизованных пользователей
- ✅ Только для авторов и админов (проверка `is_author`, `is_admin`)
- ✅ Только с интернетом

### Внешние ссылки
- Поддержка URL параметров `?story=id` и `?bucket=name` для прямого запуска истории
- Очистка URL после запуска истории

## TODO и планы развития

- [ ] Добавить больше мини-игр
- [ ] Улучшить систему достижений
- [ ] Добавить поддержку сохранений/загрузок прогресса
- [ ] Интеграция с Telegram Payments (опционально)
- [ ] Мультиязычность (i18n)
- [ ] Улучшить анимации переходов
- [ ] Добавить систему настроек (звук, эффекты)
- [ ] Переход по внешней ссылке на конкретную историю

## Полезные ресурсы

- [Svelte 5 Documentation](https://svelte.dev/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Rive Documentation](https://rive.app/community/doc)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Последнее обновление:** Январь 2025
**Версия документации:** 2.1
