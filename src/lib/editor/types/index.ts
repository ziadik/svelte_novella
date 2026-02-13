// --- Базовые интерфейсы ---
export interface Condition {
  type: "has_item" | "stat_greater" | "flag_true" | "always";
  itemId?: string;
  statName?: string;
  statValue?: number;
  flagName?: string;
}

export interface Option {
  text: string;
  nextDialogueId?: string;
  miniGame?: {
    id: string;
    onWinDialogueId: string;
    onLoseDialogueId: string;
  };
  actions?: Array<{ type: string; id?: string; value?: any }>;
  enabled: boolean;
  visible: boolean;
  visibilityCondition?: Condition;
}

export interface Dialogue {
  id: string;
  chapterId: string;
  text: string;
  backgroundImage?: string;
  characterImage?: string;
  stateMachineCharacterRive?: string;
  smTriggerBackgroundRive?: string;
  nextDialogueId?: string;
  options?: Option[];
  onEnter?: Array<{ type: string; id?: string; value?: any }>;
}

export interface Chapter {
  id: string;
  title: string;
  description?: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: "tool" | "key" | "consumable" | "quest" | "misc";
}

export interface StoryData {
  meta?: { version: string; title: string };
  chapters?: Chapter[];
  dialogues: Dialogue[];
  items?: Item[];
  miniGames?: any[];
}

export interface StoredFile {
  name: string;
  id: string;
  updated_at: string;
}

export interface BucketInfo {
  id: string;
  name: string;
  public: boolean;
  file_count: number;
  created_at: string;
}

export interface StatusMessage {
  type: "success" | "error" | "loading" | "";
  text: string;
}
