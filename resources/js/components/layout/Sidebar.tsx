import React from 'react';
import { NavLink, useLocation } from 'react-router-dom'; // <-- Usamos NavLink para la navegación
import '@css/Sidebar.css';
import logo from '@img/logo_leonor_cerna 2.png';
import { FaTachometerAlt, FaUsers, FaBook, FaClipboardList, FaChartBar, FaCogs, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
    user: {
        fullName: string;
        role: 'admin' | 'docente';
    };
}

const adminLinks = [
    { text: 'Dashboard', icon: <FaTachometerAlt />, href: '/admin/dashboard' },
    { text: 'Usuarios', icon: <FaUsers />, href: '/admin/usuarios' },
    { text: 'Banco de Preguntas', icon: <FaBook />, href: '/admin/banco-preguntas' },
    { text: 'Gestión de Exámenes', icon: <FaClipboardList />, href: '/admin/examenes' },
    { text: 'Resultados', icon: <FaChartBar />, href: '/admin/resultados' },
];

const docenteLinks = [
    { text: 'Examenes', icon: <FaClipboardList />, href: '/docente/examenes' },
    { text: 'Resultados', icon: <FaChartBar />, href: '/docente/historial' },
];

const Sidebar: React.FC<SidebarProps> = ({ user }) => {
    const { logout } = useAuth();
    const location = useLocation();
    const links = user.role === 'admin' ? adminLinks : docenteLinks;

    const handleLogout = async () => {
        try {
            await logout(); // Espera a que se complete el logout

            // Navega DESPUÉS de que el logout termine
            // Usa setTimeout para asegurar que el estado se limpió primero
            window.location.href = '/login';

        } catch {
            // Navegar al login de todas formas
            window.location.href = '/login';
        }
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <img src={logo} alt="Logo" className="sidebar-logo" />
                <span>LEONOR CERNA DE VALDIVIEZO</span>
            </div>
            <nav className="sidebar-nav">
                {links.map((link) => {
                    // Mejorar la lógica de isActive para rutas de exámenes
                    // Solo marcar como activo si la ruta coincide exactamente o es una subruta válida
                    const getClassName = ({ isActive }: { isActive: boolean }): string => {
                        if (link.href === '/admin/examenes') {
                            // Para "Gestión de Exámenes", solo activo si es exactamente /admin/examenes
                            // o si es una subruta válida como /admin/examenes/crear, /admin/examenes/:id/wizard, etc.
                            const pathname = location.pathname;
                            let shouldBeActive = false;

                            if (pathname === '/admin/examenes') {
                                shouldBeActive = true;
                            }
                            // Verificar si es una subruta válida (crear, editar, wizard)
                            else if (pathname.startsWith('/admin/examenes/crear') ||
                                pathname.match(/^\/admin\/examenes\/\d+\/(editar|wizard)$/)) {
                                shouldBeActive = true;
                            }
                            // Si es solo /admin/examenes/:id (sin /editar o /wizard), también activo
                            // porque se redirigirá al wizard
                            else if (pathname.match(/^\/admin\/examenes\/\d+$/)) {
                                shouldBeActive = true;
                            }

                            return shouldBeActive ? 'active' : '';
                        }
                        // Para otras rutas, usar la lógica estándar
                        return isActive ? 'active' : '';
                    };

                    return (
                        <NavLink
                            to={link.href}
                            key={link.href}
                            className={getClassName}
                        >
                            {link.icon}
                            <span>{link.text}</span>
                        </NavLink>
                    );
                })}
            </nav>
            <div className="sidebar-footer">
                <NavLink to="/profile" className={({ isActive }) =>
                    `user-profile block p-3 text-center transition-colors hover:bg-slate-700 cursor-pointer ${isActive ? 'bg-slate-800' : ''}`
                }>
                    <span>{user.fullName}</span>
                </NavLink>
                <NavLink
                    to={user.role === 'admin' ? '/admin/configuracion' : '/docente/configuracion'}
                    className={({ isActive }) => (isActive ? 'active' : '')}
                >
                    <FaCogs />
                    <span>Configuración</span>
                </NavLink>
                <button onClick={handleLogout} className="logout-button">
                    <FaSignOutAlt />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
