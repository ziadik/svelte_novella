import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Имя файла истории по умолчанию (используется для загрузки данных внутри bucket)
export const storyFileName = 'dracula_story.json';

// Кастомный fetch с логированием
const customFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method || 'GET';
    
    console.log(`[Supabase] ${method} ${url}`);
    
    const startTime = performance.now();
    
    try {
        const response = await fetch(input, init);
        const duration = (performance.now() - startTime).toFixed(2);
        
        console.log(`[Supabase] ${method} ${url} - ${response.status} (${duration}ms)`);
        
        return response;
    } catch (error) {
        const duration = (performance.now() - startTime).toFixed(2);
        console.error(`[Supabase] ${method} ${url} - ERROR (${duration}ms)`, error);
        throw error;
    }
};

// Инициализация клиента Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    global: {
        fetch: customFetch,
        headers: {
            'Content-Type': 'application/json',
        }
    }
})


export async function createSignedUrl(fileName: string, bucketName: string){
        const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(fileName, 3600); 

    if (data) {
     return data.signedUrl;
    }
    return null;
}

// Аутентификация через Edge Function
 //{ data, error: invokeError } 
 /**
 * @param {any} initData
 */
 export async function getTmaAuthInvoke(initData: any){
 await  supabase.functions.invoke(
              "tma-auth",
              { body: { initData } }
      )
    };

// Функция для проверки подключения
export async function checkSupabaseConnection() {
    try {
        const { data, error } = await supabase.from('_dummy').select('count').limit(1)
        if (error && error.code !== '42P01') { // Игнорируем ошибку отсутствия таблицы
            throw error
        }
        return true
    } catch (error) {
        console.error('Supabase connection error:', error)
        return false
    }
}

// Sign up a new user
export async function signUp(email: any, password: any) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
    });
    return data
    //if (error) console.error('Error signing up:', error.message);
    //else console.log('User signed up:', data.user);
}

// Sign in a user
export async function signIn(email: any, password: any) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (error) console.error('Error signing in:', error.message);
    else console.log('User signed in:', data.session);
}

// Get the current session
export async function getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) console.error('Error getting session:', error.message);
    else if (session) console.log('Current user:', session.user);
    else console.log('No active session.');
}
