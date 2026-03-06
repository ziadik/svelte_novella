import * as Y from "yjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

const GAME_STATE_TABLE = "game_state";

interface StoredState {
  room_id: string;
  state_data: string;
  updated_at: string;
}

// Функция для получения форматированного времени
function getTimestamp(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const ms = String(now.getMilliseconds()).padStart(3, '0');
  return `${hours}:${minutes}:${seconds}.${ms}`;
}

// Форматированный лог
function log(message: string, ...args: any[]) {
  console.log(`[Yjs] [${getTimestamp()}] ${message}`, ...args);
}

export class YjsSupabaseProvider {
  private channel: RealtimeChannel;
  private isDestroyed = false;
  private isInitialSync = true;
  private isApplyingFullState = false;
  private onStateLoaded: (() => void) | null = null;
  private onRemoteUpdate:
    | ((boardData?: (string | null)[] | null) => void)
    | null = null;
  private lastSavedTimestamp: number = 0;
  private updateTimeout: NodeJS.Timeout | null = null;
  private isResetting = false;

  // Получить текущее состояние board из Yjs
  private getBoardState(): { position: number; value: string | null }[] {
    try {
      const yBoard = this.doc.getArray<{
        position: number;
        value: string | null;
      }>("board");
      return yBoard.toArray();
    } catch (e) {
      console.error(`[Yjs] [${getTimestamp()}] Ошибка получения board:`, e);
      return [];
    }
  }

  // Логировать состояние board
  private logBoard(label: string) {
    const board = this.getBoardState();
    const sorted = [...board].sort((a, b) => a.position - b.position);
    log(`${label} Board:`, JSON.stringify(sorted));
  }

  constructor(
    public doc: Y.Doc,
    public roomId: string,
    onStateLoaded?: () => void,
    onRemoteUpdate?: (boardData?: (string | null)[] | null) => void,
  ) {
    this.onStateLoaded = onStateLoaded || null;
    this.onRemoteUpdate = onRemoteUpdate || null;

    const channelId = `tictactoe:${this.roomId}`;
    log("Создание канала:", channelId);
    this.channel = supabase.channel(channelId);

    // Подписываемся на сообщения
    this.channel
      .on("broadcast", { event: "yjs-update" }, (payload) => {
        log("📡 Получено broadcast event!", payload);

        if (this.isDestroyed) return;

        try {
          const payloadData = (payload as any).payload || (payload as any);

          if (!payloadData || !payloadData.update) {
            console.error(`[Yjs] [${getTimestamp()}] ❌ НЕТ update в payload!`);
            return;
          }

          const update = new Uint8Array(payloadData.update);

          // Если это полное состояние (сброс игры)
          if (payloadData.isFullState) {
            log("Это полное состояние - полная замена board");
            this.isApplyingFullState = true;

            // Очищаем существующий массив перед применением полного состояния
            const yBoard = this.doc.getArray<{
              position: number;
              value: string | null;
            }>("board");
            if (yBoard.length > 0) {
              yBoard.delete(0, yBoard.length);
            }

            // Применяем обновление
            Y.applyUpdate(this.doc, update, "remote");

            // Получаем обновленное состояние
            const boardArray = yBoard.toArray();
            log("📥 Размер boardArray после применения:", boardArray.length);
            
            // Ограничиваем до 64 элементов (для Reversi)
            const limitedArray = boardArray.slice(0, 64);
            const sorted = limitedArray.sort((a, b) => a.position - b.position);
            const simpleBoard = sorted.map((item) => item.value);
            log("📥 simpleBoard размер:", simpleBoard.length);

            // Вызываем колбэк с данными
            if (this.onRemoteUpdate) {
              this.onRemoteUpdate(simpleBoard);
            }

            // Сбрасываем флаг через некоторое время
            setTimeout(() => {
              this.isApplyingFullState = false;
            }, 200);
          } else {
            // Инкрементальное обновление
            log("Применяю инкрементальное обновление, размер:", update.length);
            Y.applyUpdate(this.doc, update, "remote");

            // Проверим состояние после применения
            const yBoard = this.doc.getArray<{
              position: number;
              value: string | null;
            }>("board");
            const boardArray = yBoard.toArray();
            log("📥 Состояние board после применения:", JSON.stringify(boardArray.sort((a,b) => a.position - b.position)));

            log("Инкрементальное обновление применено, вызываем sync");

            // Вызываем колбэк - он должен синхронизировать board из Yjs
            if (this.onRemoteUpdate) {
              this.onRemoteUpdate();
            }
          }
        } catch (e) {
          console.error(`[Yjs] [${getTimestamp()}] Error applying update:`, e);
        }
      })
      .subscribe((status, err) => {
        log(`Статус подписки: ${status}`);

        if (status === "SUBSCRIBED") {
          log("✅ Успешно подключено к каналу:", channelId);
          this.loadInitialState();
        }
      });

    // Отправляем локальные изменения
    this.doc.on("update", (update: Uint8Array, origin: any) => {
      if (this.isDestroyed) return;

      log("📝 Событие update от Yjs, origin:", origin, "размер:", update.length);

      // Не отправляем обновления из сети или при начальной синхронизации
      if (
        origin === "remote" ||
        this.isInitialSync ||
        this.isApplyingFullState
      ) {
        log("📝 Пропускаем отправку (remote/initial/reset)");
        return;
      }

      // Отменяем предыдущий таймаут
      if (this.updateTimeout) {
        clearTimeout(this.updateTimeout);
      }

      // Отправляем с задержкой, чтобы избежать множественных обновлений
      this.updateTimeout = setTimeout(() => {
        this.sendUpdate(update);
      }, 100);
    });
  }

  private async sendUpdate(update: Uint8Array) {
    try {
      // Отправляем ПОЛНОЕ состояние, а не инкрементальное
      // Это гарантирует корректную синхронизацию независимо от рассинхронизации
      const fullState = Y.encodeStateAsUpdate(this.doc);
      const updateArray = Array.from(fullState);

      log("📤 Отправляю ПОЛНОЕ состояние, размер:", fullState.length);

      const result = await this.channel.send({
        type: "broadcast",
        event: "yjs-update",
        payload: { update: updateArray, isFullState: true },
      });

      log("📤 Результат отправки:", result);
    } catch (err) {
      console.error(`[Yjs] [${getTimestamp()}] Ошибка отправки:`, err);
    }
  }

  // Загрузить начальное состояние
  private async loadInitialState() {
    try {
      const { data, error } = await supabase
        .from(GAME_STATE_TABLE)
        .select("state_data, updated_at")
        .eq("room_id", this.roomId)
        .maybeSingle();

      if (error) {
        log("Ошибка загрузки:", error.message);
        this.finishInitialSync();
        return;
      }

      if (data?.state_data) {
        try {
          const stateData = atob(data.state_data);
          const stateArray = new Uint8Array(stateData.length);
          for (let i = 0; i < stateArray.length; i++) {
            stateArray[i] = stateData.charCodeAt(i);
          }

          this.isInitialSync = true;

          // Очищаем массив board перед применением состояния из БД
          // чтобы избежать дублирования элементов
          try {
            const yBoard = this.doc.getArray<{
              position: number;
              value: string | null;
            }>("board");
            if (yBoard && yBoard.length > 0) {
              yBoard.delete(0, yBoard.length);
              log("Очищен массив board перед загрузкой из БД");
            }
          } catch (e) {
            log("Не удалось очистить board:", e);
          }

          Y.applyUpdate(this.doc, stateArray);
          this.lastSavedTimestamp = data.updated_at
            ? new Date(data.updated_at).getTime()
            : 0;
          log("Загружено состояние из БД");
        } catch (e) {
          console.error(`[Yjs] [${getTimestamp()}] Ошибка декодирования:`, e);
        }
      } else {
        log("Нет сохраненного состояния");
      }

      this.finishInitialSync();
    } catch (e) {
      console.error(`[Yjs] [${getTimestamp()}] Ошибка загрузки:`, e);
      this.finishInitialSync();
    }
  }

  // Сохранить состояние
  async saveState() {
    if (this.isDestroyed) return;

    try {
      const stateVector = Y.encodeStateAsUpdate(this.doc);
      const stateBase64 = btoa(String.fromCharCode(...stateVector));
      const now = new Date().toISOString();

      const { error: upsertError } = await supabase
        .from(GAME_STATE_TABLE)
        .upsert(
          {
            room_id: this.roomId,
            state_data: stateBase64,
            updated_at: now,
          },
          { onConflict: "room_id" },
        );

      if (!upsertError) {
        this.lastSavedTimestamp = new Date(now).getTime();
      }
    } catch (e) {
      console.error(`[Yjs] [${getTimestamp()}] Ошибка сохранения:`, e);
    }
  }

  // Специальный метод для сброса игры
  async resetGame(
    resetBoardData: { position: number; value: string | null }[],
  ) {
    if (this.isDestroyed || this.isResetting) return;

    this.isResetting = true;
    this.isApplyingFullState = true;

    try {
      // Получаем board массив
      const yBoard = this.doc.getArray<{
        position: number;
        value: string | null;
      }>("board");

      // Очищаем и вставляем новые данные
      if (yBoard.length > 0) {
        yBoard.delete(0, yBoard.length);
      }
      yBoard.insert(0, resetBoardData);

      // Сохраняем в БД
      await this.saveState();

      // Отправляем broadcast с полным состоянием
      const fullState = Y.encodeStateAsUpdate(this.doc);
      const updateArray = Array.from(fullState);

      await this.channel.send({
        type: "broadcast",
        event: "yjs-update",
        payload: { update: updateArray, isFullState: true },
      });

      log("Игра сброшена, broadcast отправлен");
    } catch (e) {
      console.error(`[Yjs] [${getTimestamp()}] Ошибка при сбросе игры:`, e);
    } finally {
      setTimeout(() => {
        this.isResetting = false;
        this.isApplyingFullState = false;
      }, 300);
    }
  }

  private finishInitialSync() {
    setTimeout(() => {
      this.isInitialSync = false;
      log("Начальная синхронизация завершена");
      if (this.onStateLoaded) {
        this.onStateLoaded();
      }
    }, 500);
  }

  destroy() {
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    this.isDestroyed = true;
    this.doc.off("update", () => {});
    this.channel.unsubscribe();
  }
}
