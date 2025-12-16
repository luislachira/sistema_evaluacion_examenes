import { useSyncExternalStore } from 'react';
import { authStore, apiLogin, apiLogout, apiRegister, UsuarioDTO } from '../store/authStore';

export function useAuth() {
    const state = useSyncExternalStore(
        authStore.subscribe,
        authStore.getState,
        authStore.getState
    );


    const updateUser = (newUserData: Partial<UsuarioDTO>) => {
        if (state.user) {
            authStore.setState({
                user: { ...state.user, ...newUserData }
            });
        }
    };

    return {
        user: state.user as UsuarioDTO | null,
        token: state.token,
        login: apiLogin,
        logout: apiLogout,
        register: apiRegister,
        updateUser,
        isAdmin: state.user?.rol === '0',
        isDocente: state.user?.rol === '1',
        isAuthenticated: Boolean(state.token),
        isInitialized: state.isInitialized,

    };
}
