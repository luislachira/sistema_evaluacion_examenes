# Seeders del Sistema de Exámenes

## Orden de Ejecución

Los seeders deben ejecutarse en el siguiente orden para mantener las dependencias:

### 1. UsuarioSeeder
Crea usuarios administradores y docentes necesarios para el sistema.

```bash
php artisan db:seed --class=UsuarioSeeder
```

### 2. TemasSeeder
Crea los temas (categorías) de preguntas.

```bash
php artisan db:seed --class=TemasSeeder
```

### 3. PreguntasSeeder
Crea preguntas de ejemplo con sus opciones y contextos asociados.

**Requisitos:**
- Debe ejecutarse después de `TemasSeeder` y `UsuarioSeeder`

```bash
php artisan db:seed --class=PreguntasSeeder
```

### 4. ExamenesSeeder
Crea exámenes de ejemplo con preguntas asociadas.

**Requisitos:**
- Debe ejecutarse después de `TemasSeeder`, `PreguntasSeeder` y `UsuarioSeeder`

```bash
php artisan db:seed --class=ExamenesSeeder
```

## Ejecutar Todos los Seeders

Para ejecutar todos los seeders en el orden correcto:

```bash
php artisan db:seed --class=UsuarioSeeder
php artisan db:seed --class=TemasSeeder
php artisan db:seed --class=PreguntasSeeder
php artisan db:seed --class=ExamenesSeeder
```

O ejecutar todos de una vez (si están configurados en DatabaseSeeder):

```bash
php artisan db:seed
```

## Datos Creados

### TemasSeeder
- 6 temas: Matemáticas, Ciencias, Historia, Geografía, Literatura, Lenguaje

### PreguntasSeeder
- 14 preguntas distribuidas en diferentes temas:
  - Matemáticas: 4 preguntas (dificultades: 0, 1, 2)
  - Ciencias: 3 preguntas
  - Historia: 2 preguntas
  - Geografía: 3 preguntas
  - Literatura: 1 pregunta
- 1 contexto de ejemplo para matemáticas
- Cada pregunta tiene 4 opciones con letras (A, B, C, D)

### ExamenesSeeder
- 3 exámenes de ejemplo:
  1. **Examen General de Prueba** (Publicado): 9 preguntas de múltiples temas
  2. **Examen de Matemáticas** (Publicado): 4 preguntas de matemáticas
  3. **Examen en Borrador**: 4 preguntas de ciencias y geografía

## Notas

- Los seeders usan `firstOrCreate` para evitar duplicados, por lo que pueden ejecutarse múltiples veces.
- Los IDs de preguntas y contextos son strings (ej: 'PREG-MATH-001', 'CTX-MATH-001').
- Los exámenes tienen códigos únicos que se validan antes de crear.
- Las preguntas se asocian a los exámenes mediante la tabla pivot `examenes_preguntas`.

