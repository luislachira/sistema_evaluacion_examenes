import clienteApi from '../api/clienteApi';

// --- Interfaces y Tipos ---
export interface UsuarioDTO {
    idUsuario: number;
    nombre: string;
    apellidos: string;
    correo: string;
    rol: '0' | '1';
}

interface AuthState {
    user: UsuarioDTO | null;
    token: string | null;
    isInitialized: boolean; // <-- NUEVO: Para saber si ya se verificó la sesión inicial
}

export interface LoginCredentials {
    correo: string;
    password: string;
}

export interface RegisterData {
    nombre: string;
    apellidos: string;
    correo: string;
    password: string;
    password_confirmation: string;
}

// --- Implementación del Store ---

const STORAGE_KEY = 'auth_state_v1';

// El estado ahora comienza como "no inicializado".
let state: AuthState = {
    user: null,
    token: null,
    isInitialized: false,
};

const listeners = new Set<() => void>();

const emitChange = () => {
    listeners.forEach(listener => listener());
}

function persistState() {
    // Solo guardamos el usuario y el token, no el estado de inicialización.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: state.user, token: state.token }));
}

// --- ¡NUEVA FUNCIÓN DE INICIALIZACIÓN! ---
/**
 * Se debe llamar una sola vez al arrancar la aplicación.
 * Carga el estado desde localStorage y marca la autenticación como "inicializada".
 */
// --- Inicialización con validación de token ---
export async function initializeAuth() {
    try {
        const rawState = localStorage.getItem(STORAGE_KEY);

        if (!rawState || rawState === 'undefined') {
            state = { user: null, token: null, isInitialized: true };
            emitChange();
            return;
        }

        const parsed = JSON.parse(rawState);
        const token = parsed.token;

        if (!token) {
            state = { user: null, token: null, isInitialized: true };
            emitChange();
            return;
        }

        try {
            // Verificar si el token sigue siendo válido
            const response = await clienteApi.get<UsuarioDTO>('/user', {
                headers: { Authorization: `Bearer ${token}` }
            });

            state = {
                user: response.data,
                token: token,
                isInitialized: true,
            };
            persistState();
        } catch {
            // Token inválido: limpiar todo
            localStorage.removeItem(STORAGE_KEY);
            state = { user: null, token: null, isInitialized: true };
        }
    } catch {
        state = { user: null, token: null, isInitialized: true };
    }

    emitChange();
}

// --- Store ---
export const authStore = {
    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    getState() {
        return state;
    },
    setState(newState: Partial<AuthState>) {
        state = { ...state, ...newState };
        persistState();
        emitChange();
    },
    clear() {
        state = { token: null, user: null, isInitialized: true };
        localStorage.removeItem(STORAGE_KEY);
        emitChange();
    }
};

// --- Funciones de API ---
export const apiLogin = async (credentials: LoginCredentials) => {
    const response = await clienteApi.post('/login', credentials);
    const { access_token, usuario } = response.data;

    // Actualizar estado
    state = {
        token: access_token,
        user: usuario,
        isInitialized: true
    };

    // Persistir inmediatamente
    persistState();

    // Emitir cambios
    emitChange();

    // Pequeño delay para asegurar que el estado se propague
    await new Promise(resolve => setTimeout(resolve, 100));

    return { access_token, usuario };
};

export const apiRegister = async (data: RegisterData) => {
    return await clienteApi.post('/register', data);
};

export const apiLogout = async () => {
    const token = state.token;

    // Notificar al backend ANTES de limpiar el estado
    if (token) {
        try {
            await clienteApi.post('/logout', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch {
            // Continuar con el logout local aunque falle el backend
        }
    }

    // Limpiar el estado local
    authStore.clear();
};
