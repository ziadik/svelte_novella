export function initializeTelegram() {
    if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp
        tg.expand()
        tg.enableClosingConfirmation()
        tg.ready()
        return tg
    }
    return null
}

export function getTelegramUser(tg) {
    return tg?.initDataUnsafe?.user || null
}

export function ifUseTelegram() {
    return typeof window.Telegram !== 'undefined' && 
         typeof window.Telegram.WebApp !== 'undefined' && 
         window.Telegram.WebApp.initData !== '';
//     try {
//     // Попытка вызвать метод, специфичный для Telegram
//     if (typeof window.Telegram !== 'undefined' && 
//         typeof window.Telegram.WebApp !== 'undefined') {
//       // Например, запрос темы
//       await new Promise((resolve, reject) => {
//         // Используем таймаут для проверки доступности метода
//         setTimeout(() => {
//           if (window.Telegram.WebApp.themeParams) {
//             resolve(true);
//           } else {
//             reject(new Error('Метод недоступен'));
//           }
//         }, 100);
//       });
//       return true;
//     } else {
//       return false;
//     }
//   } catch (e) {
//     return false;
//   }
}