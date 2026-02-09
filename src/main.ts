import "./styles/global.css";
import App from "./App.svelte";

const app = new App({
  target: document.getElementById("app")!,
});

export default app;
// import { init, miniApp } from '@telegram-apps/sdk-svelte';

// const initializeTelegramSDK = async () => {
//   try {
//     // await init();
//     //
//     // if (miniApp?.ready) {
//     //   await miniApp.ready();
//     //   console.log('Mini Main готово');
//     // }
//   } catch (error) {
//     console.error('Ошибка инициализации:', error);
//   }
// };

// Initialize Telegram SDK
// initializeTelegramSDK();
