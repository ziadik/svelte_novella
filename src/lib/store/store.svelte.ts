import { readable, writable } from 'svelte/store'

export const currentDialogueIndex = writable(0)
export const dialogues = writable([])
export const isLoading = writable(true)
export const error = writable('')
// export const defaultAssetsUrl = '/assets/';
export const bucketName = 'dracula';
export const storyName = "dracula_story_v3.json";
export const supabaseUrlFile =  import.meta.env.VITE_SUPABASE_URL_FILE;
// export const defaultAssetsUrl = '/svelte_novella/assets/';
