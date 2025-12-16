import React from 'react';
import { RouterProvider } from 'react-router-dom';
import router from '@/router'; // Importamos el router que define todas nuestras rutas
import { NotificationProvider } from '@/contexts/NotificationContext';

/**
 * Este es el componente raíz de la aplicación.
 * Provee el sistema de rutas y el contexto de notificaciones
 * a todos los componentes hijos.
 */
function App() {
    return (
        <NotificationProvider>
            <RouterProvider router={router} />
        </NotificationProvider>
    );
}

export default App;

