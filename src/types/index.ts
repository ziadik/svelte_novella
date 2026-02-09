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
  meta?: {
    version: string;
    title: string;
    description?: string;
  };
  chapters?: Chapter[];
  dialogues: Dialogue[];
  items?: Item[];
  miniGames?: any[];
}
export interface StoryInfo {
  id: string;
  name: string;
  bucket: string;
  defaultFile: string;
  description?: string;
  thumbnail?: string;
  lastModified?: Date;
}

export interface BucketInfo {
  name: string;
  size?: number;
  fileCount?: number;
  isPublic?: boolean;
  storyName?: string;
}
export interface Condition {
  type: "has_item" | "stat_greater" | "flag_true" | "always";
  itemId?: string;
  statName?: string;
  statValue?: number;
  flagName?: string;
}

export interface GameAction {
  type: string;
  id?: string;
  value?: any;
  stat?: string;
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
  onEnter?: GameAction[];
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

export interface StatusMessage {
  type: "success" | "error" | "loading" | "";
  text: string;
}

export interface PlayerState {
  inventory: string[];
  stats: { knowledge: number; courage: number; charisma: number };
}

export interface EditorState {
  showEditor: boolean;
  showItems: boolean;
  editingOptionIndex: number | null;
  editingItemIndex: number | null;
  selectedChapterId: string | null;
  selectedDialogueId: string | null;
  data: StoryData;
  storedFiles: StoredFile[];
  storiesList: string[];
  currentFileName: string;
  statusMessage: StatusMessage;
  bucketName: string;
}

export interface PlayerState {
  inventory: string[];
  stats: Record<string, number>;
  flags: Record<string, boolean>;
  progress: {
    currentChapter: string;
    completedDialogues: string[];
    score: number;
  };
}

export interface GameSession {
  id: string;
  storyId: string;
  playerState: PlayerState;
  createdAt: Date;
  lastPlayed: Date;
  bookmarks?: GameBookmark[];
}

export interface GameBookmark {
  dialogueId: string;
  timestamp: Date;
  notes?: string;
}