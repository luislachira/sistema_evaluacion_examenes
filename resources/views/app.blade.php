<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" @class(['dark' => ($appearance ?? 'system') == 'dark'])>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">

        <title>{{ config('app.name', 'I.E. Leonor Cerna de Valdiviezo') }}</title>

        <link rel="shortcut icon" href="/logo_leonor_cerna 2.png?v=5" type="image/png">
        <link rel="icon" href="/logo_leonor_cerna 2.png?v=5" type="image/png">
        <link rel="icon" href="/logo_leonor_cerna 2.png?v=5" sizes="any">
        <link rel="apple-touch-icon" href="/logo_leonor_cerna 2.png?v=5">

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600" rel="stylesheet" />

        <!-- Carga los scripts y estilos de Vite -->
        @viteReactRefresh
        @vite('resources/js/app.tsx')
    </head>
    <body class="font-sans antialiased">
        {{-- Aquí es donde React montará toda la aplicación --}}
        <div id="root"></div>

        {{-- Pasar configuración de Laravel a React --}}
        <script>
            window.Laravel = {
                appName: @json(config('app.name')),
            };
        </script>

        {{-- Inline script to detect system dark mode preference and apply it immediately --}}
        <script defer>
            (function() {
                const appearance = '{{ $appearance ?? "system" }}';

                if (appearance === 'system') {
                    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

                    if (prefersDark) {
                        document.documentElement.classList.add('dark');
                    }
                }
            })();
        </script>
    </body>
</html>
