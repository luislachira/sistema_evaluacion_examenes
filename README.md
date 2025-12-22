# 📚 Sistema de Gestión de Exámenes

Sistema web completo para la gestión y administración de exámenes de ascenso para docentes, desarrollado con Laravel 12 y React 19.2.

<img width="1905" height="918" alt="imagen" src="https://github.com/user-attachments/assets/4c40a42a-a775-47f8-8111-7851d6509d14" />

## ✨ Características Principales

### 🔐 Autenticación

- **Login manual** con email y contraseña
- **OAuth con Google** - Inicio de sesión con cuenta de Google
- **OAuth con Microsoft** - Inicio de sesión con cuenta de Microsoft (opcional)
- **Gestión de sesiones** con cierre automático por inactividad (10 minutos)
- **Sistema de roles**: Administrador y Docente

### 👨‍💼 Panel de Administración

- **Gestión de exámenes**: Crear, editar, visualizar y eliminar exámenes
- **Wizard de creación**: Proceso paso a paso para configurar exámenes
- **Gestión de usuarios**: CRUD completo de usuarios, suspensión y activación
- **Banco de preguntas**: Gestión de categorías, contextos y preguntas
- **Resultados**: Visualización detallada de resultados de exámenes
- **Subpruebas y postulaciones**: Configuración avanzada de exámenes
- **Reglas de puntaje**: Sistema flexible de calificación

### 👨‍🏫 Panel de Docente

- **Visualización de exámenes**: Lista de exámenes disponibles
- **Tomar exámenes**: Interfaz intuitiva para realizar exámenes
- **Historial**: Consulta de intentos anteriores
- **Resultados**: Visualización de calificaciones y detalles

### 🎯 Funcionalidades Técnicas

- **API RESTful** con Laravel Passport
- **Frontend React** con TypeScript
- **Carga progresiva de datos** para optimizar rendimiento
- **Code splitting** para mejorar tiempos de carga
- **Responsive design** con Tailwind CSS
- **Validación en tiempo real** de formularios

## 🛠️ Tecnologías

### Backend

- **Laravel 12** - Framework PHP
- **Laravel Passport** - Autenticación API
- **Laravel Socialite** - OAuth (Google/Microsoft)
- **MySQL/MariaDB** - Base de datos
- **PHP 8.2+** - Lenguaje de programación

### Frontend

- **React 19.2** - Biblioteca de UI
- **TypeScript** - Tipado estático
- **React Router DOM** - Enrutamiento
- **Axios** - Cliente HTTP
- **Tailwind CSS** - Framework CSS
- **Vite** - Build tool y dev server
- **Radix UI** - Componentes accesibles

## 📋 Requisitos del Sistema

### Servidor

- **PHP**: 8.2 o superior
- **Composer**: 2.x
- **Node.js**: 18.x o superior
- **npm**: 9.x o superior
- **Base de datos**: MySQL 8.0+ o MariaDB 10.3+
- **Servidor web**: Apache 2.4+ o Nginx 1.18+

### Extensiones PHP Requeridas

- BCMath
- Ctype
- cURL
- DOM
- Fileinfo
- JSON
- Mbstring
- OpenSSL
- PCRE
- PDO
- Tokenizer
- XML

## 🚀 Instalación

### 1. Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd examen_ascenso
```

### 2. Instalar Dependencias Backend

```bash
composer install
```

### 3. Instalar Dependencias Frontend

```bash
npm install
```

### 4. Configurar Variables de Entorno

```bash
cp .env.example .env
php artisan key:generate
```

Editar `.env` con tus configuraciones:

```env
APP_NAME="Sistema de examenes"
APP_URL=http://localhost
APP_ENV=local
APP_DEBUG=true

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=sistema_examenes
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_contraseña

# OAuth Google
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret
GOOGLE_REDIRECT_URI=/api/v1/oauth/callback/google

# OAuth Microsoft (Opcional)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=/api/v1/oauth/callback/microsoft
MICROSOFT_TENANT=common
```

### 5. Configurar Base de Datos

```bash
php artisan migrate
php artisan db:seed
```

### 6. Instalar Passport

```bash
php artisan passport:install
```

### 7. Compilar Assets Frontend

**Desarrollo:**

```bash
npm run dev
```

**Producción:**

```bash
npm run build
```

### 8. Iniciar Servidor

```bash
php artisan serve
```

O usar el comando de desarrollo que inicia todo:

```bash
composer dev
```

## ⚙️ Configuración

### Configurar OAuth con Google

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Habilita la API de Google+
4. Crea credenciales OAuth 2.0
5. Agrega las URIs autorizadas:
    - **Authorized JavaScript origins**: `http://tu-dominio.com`
    - **Authorized redirect URIs**: `http://tu-dominio.com/api/v1/oauth/callback/google`
6. Copia el Client ID y Client Secret a tu `.env`

### Configurar Permisos (Producción)

Establecer permisos manualmente:

```bash
chmod -R 775 storage bootstrap/cache
chmod 600 .env
chown -R www-data:www-data storage bootstrap/cache
```

## 📖 Uso

### Comandos Útiles

```bash
# Limpiar cachés
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

# Optimizar para producción
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan optimize

# Cambiar contraseña de administrador
php artisan admin:change-password

# Ver rutas disponibles
php artisan route:list
```

### Estructura de Roles

- **Rol 0**: Administrador - Acceso completo al sistema
- **Rol 1**: Docente - Acceso a exámenes y resultados propios

### 🔑 Credenciales de Acceso

**Administrador por defecto:**

- **Usuario**: `admin@institucion.edu.pe`
- **Contraseña**: `admin54321`

> ⚠️ **Importante**: Se recomienda cambiar la contraseña del administrador después de la primera instalación usando el comando `php artisan admin:change-password`

## 🔧 Solución de Problemas Comunes

### Error: "Personal access client not found"

Si encuentras este error al intentar generar tokens de acceso personal, es posible que la base de datos no tenga la estructura esperada por Laravel Passport (específicamente si falta la columna `personal_access_client`).

**Solución:**

1. Asegúrate de tener un cliente de acceso personal creado:
   ```bash
   php artisan passport:client --personal
   ```

2. Configura explícitamente el ID y Secret del cliente en tu archivo `.env`. Esto fuerza a la aplicación a usar el cliente específico sin depender de la consulta automática que falla.

   Agrega lo siguiente a tu archivo `.env`:
   ```env
   PASSPORT_PERSONAL_ACCESS_CLIENT_ID=tu_client_id_generado
   PASSPORT_PERSONAL_ACCESS_CLIENT_SECRET=tu_client_secret_generado
   ```

   > 💡 **Nota**: Puedes obtener estos valores de la tabla `oauth_clients` en tu base de datos buscando el cliente que acabas de crear.

## 🏗️ Estructura del Proyecto

```
examen_ascenso/
├── app/
│   ├── Console/Commands/      # Comandos Artisan personalizados
│   ├── Http/
│   │   ├── Controllers/       # Controladores API
│   │   ├── Middleware/        # Middleware personalizado
│   │   └── Requests/          # Form Requests
│   ├── Models/                # Modelos Eloquent
│   └── Services/              # Servicios de negocio
├── database/
│   ├── migrations/            # Migraciones de BD
│   └── seeders/               # Seeders de datos
├── public/                    # Punto de entrada público
├── resources/
│   ├── js/                    # Código React/TypeScript
│   │   ├── api/               # Cliente API
│   │   ├── components/        # Componentes React
│   │   ├── hooks/             # Custom hooks
│   │   ├── pages/             # Páginas/Views
│   │   └── router.tsx         # Configuración de rutas
│   └── views/                 # Blade templates
├── routes/
│   ├── api.php                # Rutas API
│   └── web.php                # Rutas web
├── storage/                   # Archivos de almacenamiento
└── tests/                     # Tests automatizados
```

## 🚀 Despliegue a Producción


### Pasos Básicos

1. **Configurar servidor** con PHP 8.2+, MySQL, y Node.js
2. **Clonar repositorio** en el servidor
3. **Instalar dependencias**: `composer install --no-dev` y `npm install`
4. **Configurar `.env`** con valores de producción
5. **Ejecutar migraciones**: `php artisan migrate --force`
6. **Instalar Passport**: `php artisan passport:install`
7. **Compilar assets**: `npm run build`
8. **Configurar permisos**: Ver sección "Configurar Permisos"
9. **Optimizar**: `php artisan optimize`
10. **Configurar servidor web** (Apache/Nginx) apuntando a `public/`

### Variables de Entorno de Producción

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tu-dominio.com

# Configurar HTTPS
FORCE_HTTPS=true

# Base de datos de producción
DB_DATABASE=examen_ascenso_prod
DB_USERNAME=usuario_prod
DB_PASSWORD=contraseña_segura
```

## 📚 Documentación Adicional

- `docs/PRUEBAS_AJUSTES_DESPLIEGUE.md` - **Pruebas, Ajustes Finales y Despliegue**
- `docs/OPTIMIZACION_API_RESTFUL.md` - Optimización de la API RESTful
- `docs/VERIFICAR_OPTIMIZACIONES_API.md` - Verificación de optimizaciones

- `database/seeders/README_SEEDERS.md` - Documentación de seeders

## 🧪 Testing

### Configuración de Tests

El proyecto incluye un archivo `phpunit.xml.dist` como plantilla de configuración. El archivo `phpunit.xml` con tu configuración local es ignorado por git para proteger credenciales sensibles.

Para configurar tu entorno de pruebas:
1. Copia el archivo de distribución: `cp phpunit.xml.dist phpunit.xml` (o manualmente).
2. Si es necesario, edita `phpunit.xml` con tus credenciales locales.

```bash
# Ejecutar tests
php artisan test

# Tests con cobertura
php artisan test --coverage
```

## 🔒 Seguridad

- ✅ Autenticación con tokens JWT (Laravel Passport)
- ✅ Cierre automático de sesión por inactividad
- ✅ Validación de entrada en todos los endpoints
- ✅ Protección CSRF
- ✅ Sanitización de datos
- ✅ Variables de entorno para credenciales
- ✅ Middleware de roles y permisos

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Es de codigo abierto y gratuito.

## 👥 Desarrollo

**Sistema desarrollado para:**  
Instituciones Educativas.

**Versión:** 1.0.0  
**Última actualización:** 2025

## 📞 Soporte

Para soporte técnico o consultas, contactar al equipo de desarrollo.
