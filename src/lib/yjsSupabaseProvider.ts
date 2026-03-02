import * as Y from "yjs";
import { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";

export class YjsSupabaseProvider {
  private channel: RealtimeChannel;

  constructor(
    public doc: Y.Doc,
    public roomId: string,
  ) {
    // Создаём канал Realtime для комнаты
    this.channel = supabase.channel(`game:${roomId}`);

    // Подписываемся на сообщения типа 'yjs-update'
    this.channel
      .on("broadcast", { event: "yjs-update" }, ({ payload }) => {
        // Применяем полученное обновление к локальному документу
        const update = new Uint8Array(payload.update);
        Y.applyUpdate(this.doc, update);
      })
      .subscribe();

    // Отправляем локальные изменения всем подписчикам
    this.doc.on("update", (update: Uint8Array) => {
      this.channel.send({
        type: "broadcast",
        event: "yjs-update",
        payload: { update: Array.from(update) },
      });
    });
  }

  destroy() {
    this.doc.destroy();//off("update");
    this.channel.unsubscribe();
  }
}
