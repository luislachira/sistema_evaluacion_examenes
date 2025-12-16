<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Convierte todas las tablas a InnoDB y agrega las claves foráneas faltantes
     * para que las relaciones aparezcan en el diagrama de la base de datos.
     */
    public function up(): void
    {
        // Solo ejecutar en MySQL/MariaDB, no en SQLite (usado en tests)
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // Lista de todas las tablas que deben usar InnoDB
        $tables = [
            'usuarios',
            'categorias',
            'contextos',
            'preguntas',
            'opciones_preguntas',
            'tipo_concursos',
            'examenes',
            'subpruebas',
            'examen_pregunta',
            'regla_puntajes',
            'intento_examenes',
            'respuesta_intentos',
            'resultado_subpruebas',
            'examenes_usuarios',
            'postulaciones',
            'archivo_adjuntos',
            'migrations',
            'personal_access_tokens',
            'password_resets',
            'sessions',
            'oauth_access_tokens',
            'oauth_auth_codes',
            'oauth_clients',
            'oauth_refresh_tokens',
            'oauth_device_codes',
            'cache',
            'cache_locks',
        ];

        // Paso 1: Convertir todas las tablas a InnoDB
        foreach ($tables as $table) {
            if (Schema::hasTable($table)) {
                try {
                    DB::statement("ALTER TABLE `{$table}` ENGINE = InnoDB");
                } catch (\Exception $e) {
                    // Continuar si hay algún error (tabla puede no existir o ya ser InnoDB)
                }
            }
        }

        // Paso 2: Agregar claves foráneas que deberían existir
        // Nota: Solo agregamos si no existen para evitar errores

        // Tabla: preguntas
        $this->addForeignKeyIfNotExists('preguntas', 'idContexto', 'contextos', 'idContexto', 'set null');
        $this->addForeignKeyIfNotExists('preguntas', 'idCategoria', 'categorias', 'idCategoria', 'cascade');

        // Tabla: opciones_preguntas
        $this->addForeignKeyIfNotExists('opciones_preguntas', 'idPregunta', 'preguntas', 'idPregunta', 'cascade');

        // Tabla: examenes
        $this->addForeignKeyIfNotExists('examenes', 'idTipoConcurso', 'tipo_concursos', 'idTipoConcurso', 'cascade');

        // Tabla: subpruebas
        $this->addForeignKeyIfNotExists('subpruebas', 'idExamen', 'examenes', 'idExamen', 'cascade');

        // Tabla: contextos
        $this->addForeignKeyIfNotExists('contextos', 'idCategoria', 'categorias', 'idCategoria', 'cascade');

        // Tabla: examen_pregunta
        $this->addForeignKeyIfNotExists('examen_pregunta', 'idExamen', 'examenes', 'idExamen', 'cascade');
        $this->addForeignKeyIfNotExists('examen_pregunta', 'idPregunta', 'preguntas', 'idPregunta', 'cascade');
        $this->addForeignKeyIfNotExists('examen_pregunta', 'idSubprueba', 'subpruebas', 'idSubprueba', 'cascade');

        // Tabla: regla_puntajes
        $this->addForeignKeyIfNotExists('regla_puntajes', 'idSubprueba', 'subpruebas', 'idSubprueba', 'cascade');
        $this->addForeignKeyIfNotExists('regla_puntajes', 'idPostulacion', 'postulaciones', 'idPostulacion', 'cascade');

        // Tabla: intento_examenes
        $this->addForeignKeyIfNotExists('intento_examenes', 'idExamen', 'examenes', 'idExamen', 'cascade');
        $this->addForeignKeyIfNotExists('intento_examenes', 'idUsuario', 'usuarios', 'idUsuario', 'cascade');
        $this->addForeignKeyIfNotExists('intento_examenes', 'idPostulacion', 'postulaciones', 'idPostulacion', 'cascade');
        $this->addForeignKeyIfNotExists('intento_examenes', 'idSubpruebaSeleccionada', 'subpruebas', 'idSubprueba', 'set null');

        // Tabla: respuesta_intentos
        $this->addForeignKeyIfNotExists('respuesta_intentos', 'idIntento', 'intento_examenes', 'idIntento', 'cascade');
        $this->addForeignKeyIfNotExists('respuesta_intentos', 'idPregunta', 'preguntas', 'idPregunta', 'cascade');
        $this->addForeignKeyIfNotExists('respuesta_intentos', 'idOpcionSeleccionada', 'opciones_preguntas', 'idOpcion', 'set null');

        // Tabla: resultado_subpruebas
        $this->addForeignKeyIfNotExists('resultado_subpruebas', 'idIntento', 'intento_examenes', 'idIntento', 'cascade');
        $this->addForeignKeyIfNotExists('resultado_subpruebas', 'idSubprueba', 'subpruebas', 'idSubprueba', 'cascade');

        // Tabla: examenes_usuarios
        $this->addForeignKeyIfNotExists('examenes_usuarios', 'idExamen', 'examenes', 'idExamen', 'cascade');
        $this->addForeignKeyIfNotExists('examenes_usuarios', 'idUsuario', 'usuarios', 'idUsuario', 'cascade');
        $this->addForeignKeyIfNotExists('examenes_usuarios', 'asignado_por', 'usuarios', 'idUsuario', 'cascade');

        // Tabla: postulaciones
        $this->addForeignKeyIfNotExists('postulaciones', 'idExamen', 'examenes', 'idExamen', 'cascade');

        // Tabla: archivo_adjuntos
        $this->addForeignKeyIfNotExists('archivo_adjuntos', 'subido_por', 'usuarios', 'idUsuario', 'cascade');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No revertimos la conversión a InnoDB ya que es la configuración deseada
        // Solo eliminamos las claves foráneas si es necesario
        if (DB::getDriverName() === 'sqlite') {
            return;
        }

        // Eliminar claves foráneas en orden inverso
        $foreignKeys = [
            ['archivo_adjuntos', 'subido_por'],
            ['postulaciones', 'idExamen'],
            ['examenes_usuarios', 'asignado_por'],
            ['examenes_usuarios', 'idUsuario'],
            ['examenes_usuarios', 'idExamen'],
            ['resultado_subpruebas', 'idSubprueba'],
            ['resultado_subpruebas', 'idIntento'],
            ['respuesta_intentos', 'idOpcionSeleccionada'],
            ['respuesta_intentos', 'idPregunta'],
            ['respuesta_intentos', 'idIntento'],
            ['intento_examenes', 'idSubpruebaSeleccionada'],
            ['intento_examenes', 'idPostulacion'],
            ['intento_examenes', 'idUsuario'],
            ['intento_examenes', 'idExamen'],
            ['regla_puntajes', 'idPostulacion'],
            ['regla_puntajes', 'idSubprueba'],
            ['examen_pregunta', 'idSubprueba'],
            ['examen_pregunta', 'idPregunta'],
            ['examen_pregunta', 'idExamen'],
            ['contextos', 'idCategoria'],
            ['subpruebas', 'idExamen'],
            ['examenes', 'idTipoConcurso'],
            ['opciones_preguntas', 'idPregunta'],
            ['preguntas', 'idCategoria'],
            ['preguntas', 'idContexto'],
        ];

        foreach ($foreignKeys as $fk) {
            $this->dropForeignKeyIfExists($fk[0], $fk[1]);
        }
    }

    /**
     * Agrega una clave foránea si no existe
     */
    private function addForeignKeyIfNotExists(string $table, string $column, string $referencedTable, string $referencedColumn, string $onDelete = 'cascade'): void
    {
        if (!Schema::hasTable($table) || !Schema::hasTable($referencedTable)) {
            return;
        }

        if (!Schema::hasColumn($table, $column)) {
            return;
        }

        // Verificar si la clave foránea ya existe
        $exists = DB::select("
            SELECT CONSTRAINT_NAME
            FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = ?
            AND COLUMN_NAME = ?
            AND REFERENCED_TABLE_NAME = ?
            AND REFERENCED_COLUMN_NAME = ?
        ", [$table, $column, $referencedTable, $referencedColumn]);

        if (empty($exists)) {
            try {
                Schema::table($table, function (Blueprint $table) use ($column, $referencedTable, $referencedColumn, $onDelete) {
                    $table->foreign($column)
                        ->references($referencedColumn)
                        ->on($referencedTable)
                        ->onDelete($onDelete);
                });
            } catch (\Exception $e) {
                // Continuar si hay algún error (puede ser que los datos no permitan la FK)
            }
        }
    }

    /**
     * Elimina una clave foránea si existe
     */
    private function dropForeignKeyIfExists(string $table, string $column): void
    {
        if (!Schema::hasTable($table)) {
            return;
        }

        try {
            $foreignKeys = DB::select("
                SELECT CONSTRAINT_NAME
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = ?
                AND COLUMN_NAME = ?
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ", [$table, $column]);

            foreach ($foreignKeys as $fk) {
                DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$fk->CONSTRAINT_NAME}`");
            }
        } catch (\Exception $e) {
            // Continuar si hay algún error
        }
    }
};
