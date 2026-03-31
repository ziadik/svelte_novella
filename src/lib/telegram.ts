// =============================================================================
// Telegram WebApp функции - ЗАКОММЕНТИРОВАНЫ
// Для включения раскомментируйте нужные функции
// =============================================================================

// export function initializeTelegram() {
//     if (window.Telegram?.WebApp) {
//         const tg = window.Telegram.WebApp
//         tg.expand()
//         tg.enableClosingConfirmation()
//         tg.ready()
//         return tg
//     }
//     return null
// }

// export function getTelegramUser(tg) {
//     return tg?.initDataUnsafe?.user || null
// }

// export function ifUseTelegram() {
//     return typeof window.Telegram !== 'undefined' && 
//          typeof window.Telegram.WebApp !== 'undefined' && 
//          window.Telegram.WebApp.initData !== '';
// }

// =============================================================================
// Эмуляция функций для работы без Telegram
// =============================================================================

/**
 * Эмуляция инициализации Telegram - всегда возвращает null
 * При необходимости работы с Telegram раскомментируйте функции выше
 */
export function initializeTelegram() {
    console.log('[Telegram] Функции Telegram отключены');
    return null;
}

/**
 * Эмуляция получения пользователя Telegram - всегда возвращает null
 */
export function getTelegramUser(tg: unknown) {
    return null;
}

/**
 * Проверка использования Telegram - всегда возвращает false
 */
export function ifUseTelegram() {
    return false;
}