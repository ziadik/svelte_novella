import { describe, it, expect } from 'vitest';
import {
  checkWinner,
  isBoardFull,
  canWinNextMove,
  getRandomEmptyIndex,
  createEmptyBoard,
  isValidMove,
  PLAYERS,
} from '../src/lib/minigames/utils/tictactoe';

describe('TicTacToe Utils', () => {
  describe('checkWinner', () => {
    it('должен возвращать null для пустой доски', () => {
      const board = createEmptyBoard();
      expect(checkWinner(board)).toBeNull();
    });

    it('должен определять победу по горизонтали (первая строка)', () => {
      const board: (typeof PLAYERS[number] | null)[] = ['❌', '❌', '❌', null, null, null, null, null, null];
      expect(checkWinner(board)).toBe('❌');
    });

    it('должен определять победу по горизонтали (вторая строка)', () => {
      const board: (typeof PLAYERS[number] | null)[] = [null, null, null, '⭕', '⭕', '⭕', null, null, null];
      expect(checkWinner(board)).toBe('⭕');
    });

    it('должен определять победу по вертикали (первый столбец)', () => {
      const board: (typeof PLAYERS[number] | null)[] = ['❌', null, null, '❌', null, null, '❌', null, null];
      expect(checkWinner(board)).toBe('❌');
    });

    it('должен определять победу по диагонали (главная)', () => {
      const board: (typeof PLAYERS[number] | null)[] = ['❌', null, null, null, '❌', null, null, null, '❌'];
      expect(checkWinner(board)).toBe('❌');
    });

    it('должен определять победу по диагонали (побочная)', () => {
      const board: (typeof PLAYERS[number] | null)[] = [null, null, '⭕', null, '⭕', null, '⭕', null, null];
      expect(checkWinner(board)).toBe('⭕');
    });

    it('должен возвращать null при отсутствии победителя', () => {
      const board: (typeof PLAYERS[number] | null)[] = ['❌', '⭕', '❌', '⭕', '⭕', '❌', '❌', '⭕', '⭕'];
      expect(checkWinner(board)).toBeNull();
    });

    it('должен возвращать null для доски с неполным размером', () => {
      const board = ['❌', '❌', '❌'];
      expect(checkWinner(board as any)).toBeNull();
    });
  });

  describe('isBoardFull', () => {
    it('должен возвращать false для пустой доски', () => {
      const board = createEmptyBoard();
      expect(isBoardFull(board)).toBe(false);
    });

    it('должен возвращать false для частично заполненной доски', () => {
      const board: (typeof PLAYERS[number] | null)[] = ['❌', '⭕', null, null, null, null, null, null, null];
      expect(isBoardFull(board)).toBe(false);
    });

    it('должен возвращать true для полностью заполненной доски', () => {
      const board: (typeof PLAYERS[number] | null)[] = ['❌', '⭕', '❌', '⭕', '⭕', '❌', '❌', '⭕', '⭕'];
      expect(isBoardFull(board)).toBe(true);
    });
  });

  describe('canWinNextMove', () => {
    it('должен находить выигрышный ход для игрока', () => {
      const board: typeof PLAYERS[] = ['❌', '❌', null, null, null, null, null, null, null];
      const winIndex = canWinNextMove([...board], '❌');
      expect(winIndex).toBe(2);
    });

    it('должен возвращать null если нет выигрышного хода', () => {
      const board: typeof PLAYERS[] = ['❌', null, null, null, null, null, null, null, null];
      const winIndex = canWinNextMove([...board], '❌');
      expect(winIndex).toBeNull();
    });

    it('должен блокировать выигрышный ход соперника', () => {
      const board: typeof PLAYERS[] = ['⭕', '⭕', null, null, null, null, null, null, null];
      const blockIndex = canWinNextMove([...board], '❌');
      expect(blockIndex).toBe(2);
    });
  });

  describe('getRandomEmptyIndex', () => {
    it('должен возвращать индекс для пустой доски', () => {
      const board = createEmptyBoard();
      const index = getRandomEmptyIndex(board);
      expect(index).toBeGreaterThanOrEqual(0);
      expect(index).toBeLessThan(9);
    });

    it('должен возвращать null для полной доски', () => {
      const board: (typeof PLAYERS[number] | null)[] = ['❌', '⭕', '❌', '⭕', '⭕', '❌', '❌', '⭕', '⭕'];
      expect(getRandomEmptyIndex(board)).toBeNull();
    });
  });

  describe('createEmptyBoard', () => {
    it('должен создавать массив из 9 элементов', () => {
      const board = createEmptyBoard();
      expect(board.length).toBe(9);
    });

    it('должен заполнять массив null значениями', () => {
      const board = createEmptyBoard();
      expect(board.every(cell => cell === null)).toBe(true);
    });
  });

  describe('isValidMove', () => {
    it('должен возвращать true для пустой клетки', () => {
      const board = createEmptyBoard();
      expect(isValidMove(board, 0)).toBe(true);
    });

    it('должен возвращать false для занятой клетки', () => {
      const board: (typeof PLAYERS[number] | null)[] = ['❌', null, null, null, null, null, null, null, null];
      expect(isValidMove(board, 0)).toBe(false);
    });

    it('должен возвращать false для индекса за пределами доски', () => {
      const board = createEmptyBoard();
      expect(isValidMove(board, 9)).toBe(false);
      expect(isValidMove(board, -1)).toBe(false);
    });
  });
});
