import MemoMonsters from './MemoMonsters.svelte';
import OnetMonsters from './OnetMonsters.svelte';
import OnetMonsters144 from './OnetMonsters144.svelte';
import Evolution2048 from './Evolution2048.svelte';
import WhisperOfSpiders from './WhisperOfSpiders.svelte';
import TowerOfSouls from './TowerOfSouls.svelte';
import SoulCycle from './SoulCycle.svelte';
import LabyrinthOfMinotaur from './LabyrinthOfMinotaur.svelte';
import CursedCrypts from './CursedCrypts.svelte';
import BrokenMirror from './BrokenMirror.svelte';
import AlchemistsCross from './AlchemistsCross.svelte';
import LightOut from './LightOut.svelte';
import FloodIt from './FloodIt.svelte';
import Bones421 from './Bones421.svelte';
import CrystalsOfTime from './CrystalsOfTime.svelte';
import RunesOfFate from './RunesOfFate.svelte';
import WitchesCauldrons from './WitchesCauldrons.svelte';
import AlchemicalCalculator from './AlchemicalCalculator.svelte';

export interface GameInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  filename: string;
  category: 'puzzle' | 'memory' | 'logic' | 'arcade' | 'board' | 'other';
}

// Карта компонентов игр для динамического рендеринга
export const gameComponents: Record<string, any> = {
  'memo_monsters': MemoMonsters,
  'onet_monsters': OnetMonsters,
  'onet_monsters_144': OnetMonsters144,
  'evolution_2048': Evolution2048,
  'whisper_of_spiders': WhisperOfSpiders,
  'tower_of_souls': TowerOfSouls,
  'soul_cycle': SoulCycle,
  'labyrinth_of_minotaur': LabyrinthOfMinotaur,
  'cursed_crypts': CursedCrypts,
  'broken_mirror': BrokenMirror,
  'alchemists_cross': AlchemistsCross,
  'light_out': LightOut,
  'flood_it': FloodIt,
  'bones_421': Bones421,
  'crystals_of_time': CrystalsOfTime,
  'runes_of_fate': RunesOfFate,
  'witches_cauldrons': WitchesCauldrons,
  'alchemical_calculator': AlchemicalCalculator,
};

export const gamesList: GameInfo[] = [
  {
    id: 'memo_monsters',
    name: 'Память монстров',
    description: 'Найди все пары одинаковых монстров',
    icon: '👾',
    filename: 'MemoMonsters.svelte',
    category: 'memory'
  },
  {
    id: 'onet_monsters',
    name: 'Связь монстров min',
    description: 'Соедини одинаковых монстров линией',
    icon: '🔗',
    filename: 'OnetMonsters.svelte',
    category: 'puzzle'
  },
  {
    id: 'onet_monsters_144',
    name: 'Связь монстров middle',
    description: 'Соедини одинаковых монстров линией (144 плитки)',
    icon: '🔗',
    filename: 'OnetMonsters144.svelte',
    category: 'puzzle'
  },
  {
    id: 'evolution_2048',
    name: 'Эволюция 2048',
    description: 'Объединяй плитки и достигни 2048',
    icon: '🎲',
    filename: 'Evolution2048.svelte',
    category: 'puzzle'
  },
  {
    id: 'whisper_of_spiders',
    name: 'Шёпот пауков',
    description: 'Реши математические примеры за 30 секунд',
    icon: '🕷️',
    filename: 'WhisperOfSpiders.svelte',
    category: 'arcade'
  },
  {
    id: 'tower_of_souls',
    name: 'Башня душ',
    description: 'Классический пасьянс - собери карты по мастям',
    icon: '🃏',
    filename: 'TowerOfSouls.svelte',
    category: 'board'
  },
  {
    id: 'soul_cycle',
    name: 'Цикл душ',
    description: 'Повторяй последовательность символов',
    icon: '🔥',
    filename: 'SoulCycle.svelte',
    category: 'memory'
  },
  {
    id: 'labyrinth_of_minotaur',
    name: 'Лабиринт Минотавра',
    description: 'Найди выход из лабиринта',
    icon: '🌀',
    filename: 'LabyrinthOfMinotaur.svelte',
    category: 'puzzle'
  },
  {
    id: 'cursed_crypts',
    name: 'Проклятые склепы',
    description: 'Сапёр - найди все безопасные ячейки',
    icon: '💀',
    filename: 'CursedCrypts.svelte',
    category: 'puzzle'
  },
  {
    id: 'broken_mirror',
    name: 'Разбитое зеркало',
    description: 'Собери числа от 1 до 15',
    icon: '🪞',
    filename: 'BrokenMirror.svelte',
    category: 'puzzle'
  },
  {
    id: 'alchemists_cross',
    name: 'Алхимический крестик',
    description: 'Крестики-нолики - первым выстрой 3 в ряд',
    icon: '🧪',
    filename: 'AlchemistsCross.svelte',
    category: 'board'
  },
  {
    id: 'light_out',
    name: 'Погаси свет',
    description: 'Погаси все клетки на поле',
    icon: '💡',
    filename: 'LightOut.svelte',
    category: 'logic'
  },
  {
    id: 'flood_it',
    name: 'Затопи поле',
    description: 'Заливай поле одним цветом за минимальное количество ходов',
    icon: '🌊',
    filename: 'FloodIt.svelte',
    category: 'logic'
  },
  {
    id: 'bones_421',
    name: 'Кости 4-2-1',
    description: 'Брось кости и набери комбинацию 4-2-1',
    icon: '🎴',
    filename: 'Bones421.svelte',
    category: 'board'
  },
  {
    id: 'crystals_of_time',
    name: 'Кристаллы времени',
    description: 'Повтори последовательность кристаллов',
    icon: '💎',
    filename: 'CrystalsOfTime.svelte',
    category: 'memory'
  },
  {
    id: 'runes_of_fate',
    name: 'Руны судьбы',
    description: 'Победи духа в поединке рун',
    icon: '🔮',
    filename: 'RunesOfFate.svelte',
    category: 'board'
  },
  {
    id: 'witches_cauldrons',
    name: 'Котёл ведьмы',
    description: 'Собери ингредиенты для зелья',
    icon: '🧙',
    filename: 'WitchesCauldrons.svelte',
    category: 'arcade'
  },
  {
    id: 'alchemical_calculator',
    name: 'Алхимический калькулятор',
    description: 'Получи целевое число используя все числа',
    icon: '⚗️',
    filename: 'AlchemicalCalculator.svelte',
    category: 'logic'
  }
];

export function getGameById(id: string): GameInfo | undefined {
  return gamesList.find(game => game.id === id);
}

export function getGamesByCategory(category: GameInfo['category']): GameInfo[] {
  return gamesList.filter(game => game.category === category);
}

export const categoryNames: Record<GameInfo['category'], string> = {
  puzzle: 'Головоломки',
  memory: 'Память',
  logic: 'Логика',
  arcade: 'Аркады',
  board: 'Настольные',
  other: 'Другие'
};
