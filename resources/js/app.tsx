import '../css/app.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { initializeTheme } from './hooks/use-appearance';
import App from '@/AppComponent'; // Importamos nuestro componente principal que contiene el router
import { initializeAuth } from './store/authStore';

// CRÍTICO: Inicializar autenticación ANTES de montar React
// Esto asegura que isInitialized sea true cuando React renderice

// Inicializar autenticación de forma asíncrona y luego montar React
initializeAuth().then(() => {
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}).catch(() => {
    // Aún así montar React para mostrar la página de login
    ReactDOM.createRoot(document.getElementById('root')!).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
});

// This will set light / dark mode on load...
initializeTheme();
