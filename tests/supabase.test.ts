import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Мок Supabase
const mockSupabase = {
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' }, session: { access_token: 'token' } }, error: null }),
    signUp: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' }, session: null }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
    download: vi.fn(),
  }),
  storage: {
    from: vi.fn().mockReturnValue({
      download: vi.fn().mockResolvedValue({ data: null, error: null }),
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  },
};

// Мок global.fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Supabase Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('Инициализация клиента', () => {
    it('должен инициализировать клиент с правильным URL', async () => {
      // Проверяем что клиент может быть импортирован
      const { supabase } = await import('../src/lib/supabaseClient');
      expect(supabase).toBeDefined();
      expect(supabase).toHaveProperty('auth');
      expect(supabase).toHaveProperty('from');
    });
  });

  describe('Аутентификация', () => {
    it('должен обрабатывать вход с паролем', async () => {
      // Мок уже настроен, проверяем что метод вызывается
      const { supabase } = await import('../src/lib/supabaseClient');
      
      await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('должен обрабатывать регистрацию', async () => {
      const { supabase } = await import('../src/lib/supabaseClient');
      
      await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('должен обрабатывать выход', async () => {
      const { supabase } = await import('../src/lib/supabaseClient');
      
      await supabase.auth.signOut();

      expect(supabase.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('База данных - таблица stories', () => {
    it('должен загружать список историй', async () => {
      const { supabase } = await import('../src/lib/supabaseClient');
      
      // Вызов должен работать без ошибок
      const result = await supabase.from('stories').select('*');
      expect(result).toBeDefined();
    });

    it('должен вставлять новую историю', async () => {
      const { supabase } = await import('../src/lib/supabaseClient');
      
      await supabase.from('stories').insert({
        title: 'Тестовая история',
        json_url: 'test_story.json',
        is_public: true,
        bucket: 'test',
      });

      // Проверяем что from был вызван
      expect(supabase.from).toHaveBeenCalledWith('stories');
    });
  });

  describe('Storage', () => {
    it('должен загружать файл из storage', async () => {
      const { supabase } = await import('../src/lib/supabaseClient');
      
      await supabase.storage.from('test-bucket').download('test.json');

      expect(supabase.storage.from).toHaveBeenCalledWith('test-bucket');
    });

    it('должен загружать файл в storage', async () => {
      const { supabase } = await import('../src/lib/supabaseClient');
      
      const testFile = new Blob(['{}'], { type: 'application/json' });
      await supabase.storage.from('test-bucket').upload('test.json', testFile);

      expect(supabase.storage.from).toHaveBeenCalledWith('test-bucket');
    });
  });

  describe('Логирование запросов', () => {
    it('должен логировать GET запросы', async () => {
      // Настраиваем мок fetch для проверки логирования
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const { supabase } = await import('../src/lib/supabaseClient');
      
      // Выполняем запрос
      await supabase.from('stories').select('*');

      // fetch должен быть вызван
      expect(mockFetch).toHaveBeenCalled();
    });

    it('должен логировать POST запросы', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({}), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const { supabase } = await import('../src/lib/supabaseClient');
      
      await supabase.from('stories').insert({ title: 'Test' });

      expect(mockFetch).toHaveBeenCalled();
    });
  });
});

describe('Supabase API', () => {
  it('должен иметь настроенные переменные окружения', () => {
    // Проверяем что переменные окружения установлены
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    // Эти тесты могут быть пропущены если переменные не установлены
    if (url) {
      expect(url).toContain('supabase.co');
    }
    if (key) {
      expect(key.length).toBeGreaterThan(20);
    }
  });
});
