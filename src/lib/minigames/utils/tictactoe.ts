// Утилиты для игры Крестики-нолики
// Вынесены для возможности unit-тестирования

export type Player = '❌' | '⭕';
export const PLAYERS: Player[] = ['❌', '⭕'];

export const SIZE = 3;

// Все выигрышные комбинации
export const WIN_PATTERNS = [
  [0, 1, 2], // горизонталь 1
  [3, 4, 5], // горизонталь 2
  [6, 7, 8], // горизонталь 3
  [0, 3, 6], // вертикаль 1
  [1, 4, 7], // вертикаль 2
  [2, 5, 8], // вертикаль 3
  [0, 4, 8], // диагональ 1
  [2, 4, 6], // диагональ 2
];

/**
 * Проверить есть ли победитель на поле
 * @param board - массив из 9 элементов (null | '❌' | '⭕')
 * @returns победитель (Player) или null
 */
export function checkWinner(board: (Player | null)[]): Player | null {
  if (!board || board.length !== SIZE * SIZE) {
    return null;
  }

  for (const pattern of WIN_PATTERNS) {
    const [a, b, c] = pattern;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

/**
 * Проверить, заполнена ли доска (ничья)
 */
export function isBoardFull(board: (Player | null)[]): boolean {
  return board.every(cell => cell !== null);
}

/**
 * Проверить, может ли игрок выиграть на следующем ходу
 */
export function canWinNextMove(board: Player[], player: Player): number | null {
  for (let i = 0; i < board.length; i++) {
    if (board[i] === null) {
      board[i] = player;
      if (checkWinner(board) === player) {
        board[i] = null;
        return i;
      }
      board[i] = null;
    }
  }
  return null;
}

/**
 * Получить индекс случайного пустого поля
 */
export function getRandomEmptyIndex(board: (Player | null)[]): number | null {
  const emptyIndices = board
    .map((cell, i) => (cell === null ? i : -1))
    .filter(i => i !== -1);
  
  if (emptyIndices.length === 0) return null;
  
  const randomIndex = Math.floor(Math.random() * emptyIndices.length);
  return emptyIndices[randomIndex];
}

/**
 * Создать пустую доску
 */
export function createEmptyBoard(): (Player | null)[] {
  return Array(SIZE * SIZE).fill(null);
}

/**
 * Проверить ход на допустимость
 */
export function isValidMove(board: (Player | null)[], index: number): boolean {
  return index >= 0 && index < board.length && board[index] === null;
}
