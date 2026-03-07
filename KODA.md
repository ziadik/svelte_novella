# KODA: Документация проекта

## Обзор проекта

**Название проекта:** Визуальная новелла с Дракулой (Telegram Mini App + PWA)

**Тип проекта:** Интерактивная визуальная новелла с системой выбора, инвентарём, мини-играми и встроенным редактором историй

**Назначение:** Проект представляет собой интерактивную историю в формате визуальной новеллы, которая работает как Telegram Mini App и PWA-приложение. Пользователь может проходить истории с Дракулой и другими персонажами, делать выбор, влияющий на сюжет, собирать предметы, играть в мини-игры. Также доступен встроенный редактор для создания и редактирования собственных историй (доступен только авторам и админам с интернетом). Система поддерживает работу с несколькими независимыми историями через отдельные bucket'ы в Supabase Storage.

**Деплой:** Проект автоматически деплоится на GitHub Pages при пуше в main ветку.

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
  - Таблицы для онлайн-игр: `game_rooms`, `game_players`, `game_state`

### Анимации и визуализация
- **Rive** — интерактивные анимации для персонажей и фонов
- Поддержка статических изображений для фонов и персонажей

### Платформа
- **Telegram Mini App** — основная платформа запуска
- **PWA** — возможность установки на устройство и работы офлайн
- **iOS Safari** — оптимизировано для Safari (viewport-fit=cover, black-translucent status bar)
- **GitHub Pages** — хостинг для продакшн-сборки

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
│   │       ├── StorySelector.svelte # Выбор истории
│   │       └── Trophies.svelte     # Трофеи/достижения
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
│   │   ├── OnetMonsters144.svelte
│   │   ├── Evolution2048.svelte
│   │   ├── WhisperOfSpiders.svelte
│   │   ├── TowerOfSouls.svelte
│   │   ├── SoulCycle.svelte
│   │   ├── LabyrinthOfMinotaur.svelte
│   │   ├── CursedCrypts.svelte
│   │   ├── BrokenMirror.svelte
│   │   ├── AlchemistsCross.svelte
│   │   ├── TicTacToe.svelte
│   │   ├── Renju.svelte          # Рэндзю (5 в ряд) - с онлайн режимом
│   │   ├── Reversi.svelte        # Реверси (Отелло) - с онлайн режимом
│   │   ├── LightOut.svelte
│   │   ├── FloodIt.svelte
│   │   ├── Bones421.svelte
│   │   ├── CrystalsOfTime.svelte
│   │   ├── RunesOfFate.svelte
│   │   ├── WitchesCauldrons.svelte
│   │   ├── AlchemicalCalculator.svelte
│   │   ├── AllGames.svelte
│   │   ├── gamesList.ts
│   │   ├── types.ts
│   │   ├── utils/
│   │   └── components/       # Общие компоненты мини-игр
│   │       ├── BodyWrapper.svelte
│   │       ├── GameFooter.svelte
│   │       ├── GameHeader.svelte
│   │       ├── MinigameModal.svelte
│   │       └── RewardPanel.svelte
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
│   │   ├── gameModeStore.svelte.ts # Режимы игры
│   │   └── userKeyStore.ts      # Аналитика пользователей
│   ├── supabaseClient.ts     # Клиент Supabase с логированием
│   ├── telegram.ts           # Утилиты Telegram WebApp
│   ├── client_utils.ts       # Утилиты для клиента
│   ├── types/                # Глобальные типы
│   │   └── supabase.ts
│   └── yjsSupabaseProvider.ts # Провайдер для коллаборации (Yjs)
├── public/
│   ├── sw.js                 # Service Worker для PWA
│   ├── manifest.json         # PWA манифест
│   └── stories/              # Истории для офлайн
├── App.svelte                # Корневой компонент
├── main.ts                   # Точка входа
├── app.css                   # Глобальные стили
└── state.svelte.ts           # Глобальное состояние (заготовка)
```

### Основные компоненты

#### Корневой компонент (`src/App.svelte`)
- Управляет переключением между режимами: игра, редактор, все мини-игры, сброс пароля
- Обрабатывает внешние ссылки через URL параметры (`?story=id`, `?bucket=`)
- Инициализирует аутентификацию и аналитику пользователей
- Содержит debug-панель (Ctrl+Shift+D) для разработки
- Поддерживает событие `open-all-games` для открытия списка мини-игр
- **Интеграция с Telegram WebApp**: автоматическое определение запуска через Telegram, установка `backgroundColor`, получение имени пользователя (`initDataUnsafe.user.first_name`), расширение на весь экран (`tg.expand()`), приветствие пользователя с анимацией fadeInOut

#### Игровой движок (`src/lib/novella/`)
- **Main.svelte**: Загружает историю из JSON, управляет состоянием игры, обрабатывает навигацию между диалогами. Содержит проверку онлайн-статуса для управления доступом к редактору. Поддерживает внешние ссылки через URL параметр `?story=id`. Кнопка выбора истории (📚) в левом нижнем углу, кнопка редактора (✏️) в правом нижнем углу.
- **DialogueCard.svelte**: Отображает текст диалога, фоны, персонажей и вариантов ответов. Поддерживает:
  - Свайп влево для перехода к следующему диалогу (мобильные устройства, только при касании >200мс)
  - Клик по фону/персонажу запускает trigger T1 в Rive-анимации (мобильные)
  - Клик по тексту диалога — переход к следующему (только десктоп)
  - Проп `isPreview` для режима предпросмотра в редакторе
  - Анимация flip при переходе между диалогами (новый диалог прилетает справа)
  - `max-width: 600px` для контента на десктопе
- **Rive.svelte**: Компонент для рендеринга Rive-анимаций с функцией `triggerT1()` для запуска trigger T1 в state machine SM1
- **MinigameLauncher.svelte**: Запуск мини-игр из диалогов
- **Inventory.svelte**: Отображение и управление инвентарём
- **StorySelector.svelte**: Выбор доступных историй (поддерживает fallback для офлайн)
- **Trophies.svelte**: Система достижений/трофеев

#### Редактор (`src/lib/editor/`)
- **Editor.svelte**: Главная панель редактора с разделённым интерфейсом. Содержит флаг `manualStorySelected` для корректной загрузки историй из БД. Кнопка выбора истории в правом нижнем углу ("📚 Выбрать историю").
- **EditorSidebar.svelte**: Навигация по главам и диалогам
- **DialogueForm.svelte**: Форма редактирования диалога
- **ChapterForm.svelte**: Форма редактирования главы
- **ItemsManager.svelte**: Управление предметами инвентаря
- **OptionEditor.svelte**: Редактирование вариантов ответа
- **PreviewPanel.svelte**: Предпросмотр текущей сцены (передаёт `isPreview={true}` в DialogueCard)
- **StorySelector.svelte**: Выбор истории для редактирования (только для авторов/админов)
- **InfographicPanel.svelte**: Панель инфографики

#### Сторы (State Management)
- **gameStore.svelte.ts**: Игровой прогресс, инвентарь, статы персонажа, загрузка историй. Содержит логику для выбора истории из URL параметров.
- **authStore.svelte.ts**: Аутентификация, профиль пользователя, сессии. Использует реактивный объект `authStateObj` с `$state`.
- **storiesStore.svelte.ts**: Управление историями из БД, fallback для гостей. Содержит `FALLBACK_STORIES` для офлайн-режима.
- **editorStore.svelte.ts**: Состояние редактора (выбранный диалог, статус, данные, флаг `manualStorySelected`, выбранный bucket)
- **storyStore.ts**: Действия с историями (загрузка, сохранение, создание)
- **resourceStore.ts**: Управление ресурсами в Supabase
- **bucketStore.ts**: Управление bucket'ами хранилища (создание, удаление, выбор, список)
- **userKeyStore**: Аналитика пользователей (ключи, статистика визитов, отслеживание игр, таймер сессии)
- **gameModeStore.svelte.ts**: Управление режимами игры

#### Мини-игры (`src/lib/minigames/`)
- Более 20 различных мини-игр (память, головоломки, аркады, настольные)
- Все мини-игры следуют единому интерфейсу
- Поддержка наград (предметы, статы)
- Общие компоненты: BodyWrapper, GameFooter, GameHeader, MinigameModal, RewardPanel
- **Онлайн-режим**: Некоторые игры (Reversi, Renju, TicTacToe) поддерживают онлайн-игру через Yjs и Supabase

### Система нескольких историй (Multi-Story)

Каждая история хранится в отдельном bucket в Supabase Storage:

```
Supabase Storage
├── dracula/              # Bucket 1
│   ├── dracula_story.json
│   ├── background1.jpg
│   └── character1.png
├── zombie/               # Bucket 2
│   ├── story.json
│   └── zombie_bg.jpg
└── fairy_tale/           # Bucket 3
    └── tale.json
```

**bucketStore.ts** предоставляет функции:
- `fetchBucketsList()` — получить список всех bucket'ов
- `createStoryBucket(bucketName)` — создать новый bucket
- `deleteStoryBucket(bucketName)` — удалить bucket
- `getCurrentBucket()` — получить текущий выбранный bucket
- `isBucketSelected()` — проверить, выбран ли bucket

### База данных Supabase

#### Таблицы
- `stories` — метаданные историй (id, title, author_id, json_url, bucket, is_public)
- `game_rooms` — комнаты для онлайн-игр (room_id, room_name, game_type, created_by, expires_at)
- `game_players` — игроки в комнатах (room_id, user_key, symbol)
- `game_state` — сохранённые состояния игр
- `user_key_profiles` — профили пользователей по ключам
- `trophies_view` — представление для трофеев

#### SQL-функции
- `get_active_rooms(p_game_type)` — получение активных комнат с фильтрацией по expires_at
- `cleanup_expired_rooms()` — удаление истёкших комнат

#### Миграции (supabase/migrations/)
- `game_players.sql` — таблица игроков
- `game_state.sql` — таблица состояний игр
- `trophies_view.sql` — представление трофеев
- `user_key_profiles.sql` — профили пользователей

### PWA и Офлайн-режим

#### Service Worker (`public/sw.js`)
- Кэширование статических ресурсов (JS, CSS, изображения, Rive-файлы)
- Динамическое кэширование JSON историй
- Стратегия: Network-first для навигации, Cache-first для статики
- Fallback на кэш при отсутствии сети
- Поддержка схем: chrome-extension, moz-extension, data, blob
- Предкэширование JSON историй для офлайн-работы
- Поддержка `.riv` файлов

#### Обработка онлайн/оффлайн статуса
- Отслеживание через `navigator.onLine` и события `online`/`offline`
- В `TelegramApp.svelte`: отслеживание состояния сети, показ сообщения "Нет подключения" при офлайне
- В `Main.svelte`: проверка сети для кнопки редактора
- Без сети:
  - Авторизация недоступна (показывается сообщение "Нет подключения")
  - Редактирование недоступно (кнопка редактора скрыта)
  - Доступны только истории из fallback-кэша
- Логирование всех запросов к Supabase через кастомный fetch

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

### Item (предмет)
```typescript
{
  id: string
  name: string
  description: string
  icon: string
  type: "tool" | "key" | "consumable" | "quest" | "misc"
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

### Запуск тестов
```bash
npm run test          # Запуск тестов в режиме watch
npm run test:run      # Однократный запуск тестов
npm run test:coverage # Запуск с покрытием
```

### Экспорт ресурсов историй
```bash
npm run export        # Экспорт всех ресурсов историй
```

### CI/CD (GitHub Actions)
При пуше в ветку `main` автоматически:
1. Устанавливаются зависимости
2. Собирается проект (`npm run build`)
3. Деплой на GitHub Pages

Workflow файл: `.github/workflows/main.yml`

## Правила разработки

### Svelte 5 (Runes)
- Использовать runes (`$state`, `$derived`, `$effect`) вместо старого реактивного API
- Для реактивных компонентов использовать runes-based подход
- Компоненты должны быть максимально декларативными
- `$state` использовать для изменяемых данных, `$derived` для вычисляемых значений

### TypeScript
- Использовать строгую типизацию (strict mode)
- Все типы должны быть определены в `src/lib/editor/types/index.ts` или `src/lib/types/`
- Избегать типа `any`, использовать `unknown` или конкретные типы
- Использовать интерфейсы для всех сущностей

### Именование
- Компоненты: PascalCase (`Main.svelte`, `DialogueCard.svelte`)
- Переменные и функции: camelCase (`selectedDialogueId`, `loadStory`)
- Константы: UPPER_SNAKE_CASE (`BUCKET_NAME`)
- TypeScript интерфейсы и типы: PascalCase (`StoryData`, `Dialogue`)
- Файлы сторов: camelCase с суффиксом `Store` или `svelte.ts` для Svelte 5 сторов

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

- Все файлы историй хранятся в соответствующих bucket'ах (dracula, zombie, fairy_tale, minigames)
- Ресурсы (изображения, Rive) в том же bucket
- Использовать `upsert: true` для обновления файлов
- Обрабатывать ошибки загрузки/сохранения с пользовательскими сообщениями
- **RLS политики**: Для публичных историй использовать политику `is_public = true`
- Логирование всех запросов через custom fetch в `supabaseClient.ts`
- Кастомный fetch логирует метод, URL, статус и время выполнения каждого запроса
- Для онлайн-игр используются таблицы `game_rooms` и `game_players`

### Интеграция с Telegram

- Инициализация Telegram WebApp через `window.Telegram.WebApp`
- Проверка окружения: `window.Telegram?.WebApp`
- Получение данных пользователя: `tg.initDataUnsafe.user.first_name`
- Установка background color: `document.body.style.backgroundColor = tg.backgroundColor`
- Расширять приложение на весь экран: `tg.expand()`
- Приветствие пользователя с анимацией fadeInOut (класс `.tg-welcome`)

### Анимации Rive

- Rive-файлы хранятся в Supabase Storage
- Использовать State Machine для интерактивных анимаций
- Триггеры для анимаций задаются через `smTriggerBackgroundRive`
- Обеспечивать fallback на статические изображения
- Кэшируются Service Worker'ом для офлайн-работы
- Поддержка `stateMachineCharacterRive` для анимаций персонажей

### Мини-игры

- Мини-игры интегрируются через опции диалогов
- Обязательно указывать `onWinDialogueId` и `onLoseDialogueId`
- Мини-игры должны быть оптимизированы для мобильных устройств
- Более 20 игр в `src/lib/minigames/`
- Использовать общие компоненты: BodyWrapper, GameFooter, GameHeader, MinigameModal, RewardPanel
- Доступ к списку всех игр через событие `window.dispatchEvent(new CustomEvent('open-all-games'))`
- **Онлайн-режим**: Некоторые игры (Reversi, Renju, TicTacToe) поддерживают онлайн-игру:
  - Используют Yjs для синхронизации состояния
  - Создают комнаты в `game_rooms`
  - Регистрируют игроков в `game_players`
  - Используют `YjsSupabaseProvider` для real-time синхронизации

### PWA и Офлайн

- Service Worker регистрируется в `index.html`
- Кэшируются: JS, CSS, PNG, JPG, SVG, JSON, RIV, шрифты
- Без сети:
  - Авторизация недоступна (показывается сообщение "Нет подключения")
  - Редактирование недоступно (кнопка редактора скрыта)
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
- Тестировать онлайн-игры (создание комнат, синхронизация Yjs)

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

### Debug и разработка

- Debug-панель: Ctrl+Shift+D (только в DEV режиме)
- Аналитика пользователей: ключ, статистика визитов
- Консоль логирует основные события с префиксом `[App]`

## Конфигурация

### Vite (`vite.config.ts`)
- Алиас `@` указывает на `src`
- Плагин `svelte` для Svelte 5
- Настройка режима разработки и продакшена

### TypeScript (`tsconfig.json`)
- Strict mode включён
- Path aliases настроены
- Целевая версия: ES2020
- Отдельные конфигурации для app и node

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
- Поддержка `.riv` файлов

### Supabase
- Проект ID: `vycjpmuyscfygstjjied`
- URL и anon key через переменные окружения `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`
- Таблица `stories` для метаданных историй
- Storage buckets для каждой истории
- Таблицы для онлайн-игр: `game_rooms`, `game_players`, `game_state`

### Telegram WebApp
- Типы определены в `src/vite-env.d.ts`
- Интерфейсы: `TelegramWebApp`, `TelegramWebAppUser`, `TelegramWebAppInitDataUnsafe`
- Используется в `App.svelte` для определения окружения и получения данных пользователя

### Vitest (`vitest.config.ts`)
- Фреймворк для юнит-тестов
- Настройки для Svelte компонентов

## Текущие истории

В проекте есть демонстрационные JSON файлы:
- `dracula.json` / `dracula_story.json` — история про Дракулу
- `zombie.json` / `zombie_story.json` — постапокалиптическая история
- `fairy_tale.json` — сказочная история
- `minigames.json` — демонстрация мини-игр

Fallback-истории для офлайн-режима определены в `storiesStore.svelte.ts`.

## Список мини-игр

| ID | Название | Описание | Категория |
|----|----------|----------|-----------|
| memo_monsters | Память монстров | Найди все пары одинаковых монстров | memory |
| onet_monsters | Связь монстров min | Соедини одинаковых монстров линией | puzzle |
| onet_monsters_144 | Связь монстров middle | Соедини одинаковых монстров линией (144 плитки) | puzzle |
| evolution_2048 | Эволюция 2048 | Объединяй плитки и достигни 2048 | puzzle |
| whisper_of_spiders | Шёпот пауков | Реши математические примеры за 30 секунд | arcade |
| tower_of_souls | Башня душ | Классический пасьянс - собери карты по мастям | board |
| soul_cycle | Цикл душ | Повторяй последовательность символов | memory |
| labyrinth_of_minotaur | Лабиринт Минотавра | Найди выход из лабиринта | puzzle |
| cursed_crypts | Проклятые склепы | Сапёр - найди все безопасные ячейки | puzzle |
| broken_mirror | Разбитое зеркало | Собери числа от 1 до 15 | puzzle |
| alchemists_cross | Алхимический крестик | Крестики-нолики - первым выстрой 3 в ряд | board |
| tic_tac_toe | Крестики-нолики | Классические крестики-нолики 3x3 | board |
| Renju | Рэндзю | Рэндзю (5 в ряд) | board |
| reversi | Реверси | Отелло (Reversi) на поле 8x8 | board |
| light_out | Погаси свет | Погаси все клетки на поле | logic |
| flood_it | Затопи поле | Заливай поле одним цветом за минимальное количество ходов | logic |
| bones_421 | Кости 4-2-1 | Брось кости и набери комбинацию 4-2-1 | board |
| crystals_of_time | Кристаллы времени | Повтори последовательность кристаллов | memory |
| runes_of_fate | Руны судьбы | Победи духа в поединке рун | board |
| witches_cauldrons | Котёл ведьмы | Собери ингредиенты для зелья | arcade |
| alchemical_calculator | Алхимический калькулятор | Получи целевое число используя все числа | logic |

## Ограничения

### Без интернета
- ❌ Авторизация недоступна
- ❌ Редактирование историй недоступно
- ❌ Загрузка историй из Supabase недоступна
- ❌ Онлайн-игры недоступны
- ✅ Прохождение доступных историй (fallback)
- ✅ Офлайн-игры (против компьютера, на одном устройстве)
- ✅ Все загруженные ранее истории доступны

### Редактор
- ✅ Только для авторизованных пользователей
- ✅ Только для авторов и админов (проверка `is_author`, `is_admin`)
- ✅ Только с интернетом

### Внешние ссылки
- Поддержка URL параметров `?story=id` для прямого запуска истории по ID
- Поддержка URL параметров `?bucket=name` для запуска истории по имени bucket
- Очистка URL после запуска истории
- Переход по внешней ссылке на конкретную историю

## Мобильная адаптация

### DialogueCard.svelte
- Занимает весь экран на мобильных устройствах
- Контент выровнен по нижней границе экрана
- Вместо кнопки "Далее" используется свайп влево (только при касании >200мс)
- Минимальные отступы для мобильных устройств
- Поддержка touch events для навигации
- Клик по фону/персонажу запускает trigger T1 в Rive-анимации
- Клик по dialogue-content переходит к следующему диалогу (только десктоп)
- Анимация flip при переходе между диалогами
- На десктопе контент ограничен по ширине (max-width: 600px, centered)

### Main.svelte
- Кнопка выбора истории (📚) в левом нижнем углу (под кнопкой inventory)
- Кнопка редактора (✏️) в правом нижнем углу (только для авторизованных с интернетом)
- Полноэкранный режим для игры

### TelegramApp.svelte
- Проверка онлайн статуса
- Сообщение "Нет подключения" при офлайне
- Адаптивный интерфейс для мобильных устройств
- Оптимизировано для iOS Safari

## TODO и планы развития

- [ ] Добавить больше мини-игр с онлайн-режимом
- [ ] Улучшить систему достижений
- [ ] Добавить поддержку сохранений/загрузок прогресса
- [ ] Интеграция с Telegram Payments (опционально)
- [ ] Мультиязычность (i18n)
- [ ] Улучшить анимации переходов
- [ ] Добавить систему настроек (звук, эффекты)
- [ ] Добавить чат для онлайн-игроков

## Документация

- [Быстрый старт: Работа с историями](docs/QUICK_START.md)
- [Руководство по мультисторис](docs/MULTI_STORY_GUIDE.md)

## Полезные ресурсы

- [Svelte 5 Documentation](https://svelte.dev/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Rive Documentation](https://rive.app/community/doc)
- [Telegram Mini Apps](https://core.telegram.org/bots/webapps)
- [PWA Documentation](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN Web Docs - Service Worker](https://developer.mozilla.org/ru-RU/docs/Web/API/Service_Worker_API)
- [Vitest Documentation](https://vitest.dev/)
- [Yjs Documentation](https://docs.yjs.dev/)

---

**Последнее обновление:** Январь 2025
**Версия документации:** 4.2
