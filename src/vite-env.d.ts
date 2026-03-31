/// <reference types="svelte" />
/// <reference types="vite/client" />

// =============================================================================
// Telegram WebApp types - ЗАКОММЕНТИРОВАНЫ
// Раскомментируйте для работы с Telegram Mini App
// =============================================================================

// interface TelegramWebAppUser {
//   id: number;
//   first_name: string;
//   last_name?: string;
//   username?: string;
//   language_code?: string;
//   is_bot?: boolean;
// }

// interface TelegramWebAppInitDataUnsafe {
//   user?: TelegramWebAppUser;
//   hash?: string;
//   auth_date?: string;
// }

// interface TelegramWebApp {
//   initDataUnsafe: TelegramWebAppInitDataUnsafe;
//   backgroundColor: string;
//   expand: () => void;
//   close: () => void;
//   ready: () => void;
//   sendData: (data: string) => void;
// }

// interface Window {
//   Telegram?: {
//     WebApp: TelegramWebApp;
//   };
// }

// =============================================================================
// Собственные типы приложения
// =============================================================================

// Глобальные переменные
declare global {
  interface Window {
    // Telegram отключён
    // Telegram?: { WebApp: TelegramWebApp };
  }
}
