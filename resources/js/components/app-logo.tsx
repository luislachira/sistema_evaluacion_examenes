import AppLogoIcon from './app-logo-icon';

// Declarar el tipo para window.Laravel
declare global {
    interface Window {
        Laravel?: {
            appName?: string;
        };
    }
}

export default function AppLogo() {
    // Obtener el nombre de la app desde Laravel o usar un valor por defecto
    const appName = window.Laravel?.appName || 'I.E. Leonor Cerna de Valdiviezo';

    return (
        <>
            <div className="flex aspect-square size-12 items-center justify-center rounded-md bg-transparent">
                <AppLogoIcon className="h-full w-full object-contain" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-tight font-semibold">
                    {appName}
                </span>
            </div>
        </>
    );
}
