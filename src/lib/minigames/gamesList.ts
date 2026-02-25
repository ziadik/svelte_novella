export interface GameInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  filename: string;
  category: 'puzzle' | 'memory' | 'logic' | 'arcade' | 'board' | 'other';
}

export const gamesList: GameInfo[] = [
  {
    id: 'memo-monsters',
    name: 'Память монстров',
    description: 'Найди все пары одинаковых монстров',
    icon: '👾',
    filename: 'MemoMonsters.svelte',
    category: 'memory'
  },
  {
    id: 'onet-monsters',
    name: 'Связь монстров',
    description: 'Соедини одинаковых монстров линией',
    icon: '🔗',
    filename: 'OnetMonsters.svelte',
    category: 'puzzle'
  },
  {
    id: 'evolution-2048',
    name: 'Эволюция 2048',
    description: 'Объединяй плитки и достигни 2048',
    icon: '🎲',
    filename: 'Evolution2048.svelte',
    category: 'puzzle'
  },
  {
    id: 'whisper-of-spiders',
    name: 'Шёпот пауков',
    description: 'Реши математические примеры за 30 секунд',
    icon: '🕷️',
    filename: 'WhisperOfSpiders.svelte',
    category: 'arcade'
  },
  {
    id: 'tower-of-souls',
    name: 'Башня душ',
    description: 'Классический пасьянс - собери карты по мастям',
    icon: '🃏',
    filename: 'TowerOfSouls.svelte',
    category: 'board'
  },
  {
    id: 'soul-cycle',
    name: 'Цикл душ',
    description: 'Повторяй последовательность символов',
    icon: '🔥',
    filename: 'SoulCycle.svelte',
    category: 'memory'
  },
  {
    id: 'labyrinth-of-minotaur',
    name: 'Лабиринт Минотавра',
    description: 'Найди выход из лабиринта',
    icon: '🌀',
    filename: 'LabyrinthOfMinotaur.svelte',
    category: 'puzzle'
  },
  {
    id: 'cursed-crypts',
    name: 'Проклятые склепы',
    description: 'Сапёр - найди все безопасные ячейки',
    icon: '💀',
    filename: 'CursedCrypts.svelte',
    category: 'puzzle'
  },
  {
    id: 'broken-mirror',
    name: 'Разбитое зеркало',
    description: 'Собери числа от 1 до 15',
    icon: '🪞',
    filename: 'BrokenMirror.svelte',
    category: 'puzzle'
  },
  {
    id: 'alchemists-cross',
    name: 'Алхимический крестик',
    description: 'Крестики-нолики - первым выстрой 3 в ряд',
    icon: '🧪',
    filename: 'AlchemistsCross.svelte',
    category: 'board'
  },
  {
    id: 'light-out',
    name: 'Погаси свет',
    description: 'Погаси все клетки на поле',
    icon: '💡',
    filename: 'LightOut.svelte',
    category: 'logic'
  },
  {
    id: 'flood-it',
    name: 'Затопи поле',
    description: 'Заливай поле одним цветом за минимальное количество ходов',
    icon: '🌊',
    filename: 'FloodIt.svelte',
    category: 'logic'
  },
  {
    id: 'bones-421',
    name: 'Кости 4-2-1',
    description: 'Брось кости и набери комбинацию 4-2-1',
    icon: '🎴',
    filename: 'Bones421.svelte',
    category: 'board'
  },
  {
    id: 'crystals-of-time',
    name: 'Кристаллы времени',
    description: 'Повтори последовательность кристаллов',
    icon: '💎',
    filename: 'CrystalsOfTime.svelte',
    category: 'memory'
  },
  {
    id: 'runes-of-fate',
    name: 'Руны судьбы',
    description: 'Победи духа в поединке рун',
    icon: '🔮',
    filename: 'RunesOfFate.svelte',
    category: 'board'
  },
  {
    id: 'witches-cauldrons',
    name: 'Котёл ведьмы',
    description: 'Собери ингредиенты для зелья',
    icon: '🧙',
    filename: 'WitchesCauldrons.svelte',
    category: 'arcade'
  },
  {
    id: 'alchemical-calculator',
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
