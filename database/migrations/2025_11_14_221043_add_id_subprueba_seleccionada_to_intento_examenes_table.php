<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Eliminar foreign key si existe (solo en MySQL/MariaDB)
        if (DB::getDriverName() !== 'sqlite') {
            $foreignKeys = DB::select("
                SELECT CONSTRAINT_NAME
                FROM information_schema.KEY_COLUMN_USAGE
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'intento_examenes'
                AND COLUMN_NAME = 'idSubpruebaSeleccionada'
                AND REFERENCED_TABLE_NAME IS NOT NULL
            ");

            foreach ($foreignKeys as $fk) {
                DB::statement("ALTER TABLE intento_examenes DROP FOREIGN KEY {$fk->CONSTRAINT_NAME}");
            }
        } else {
            // En SQLite, intentar eliminar la foreign key usando el Schema Builder
            // SQLite no soporta DROP FOREIGN KEY directamente, pero Laravel lo maneja
            try {
                Schema::table('intento_examenes', function (Blueprint $table) {
                    $table->dropForeign(['idSubpruebaSeleccionada']);
                });
            } catch (\Exception $e) {
                // La foreign key puede no existir, continuar
            }
        }

        // Eliminar columna si existe
        if (Schema::hasColumn('intento_examenes', 'idSubpruebaSeleccionada')) {
            Schema::table('intento_examenes', function (Blueprint $table) {
                $table->dropColumn('idSubpruebaSeleccionada');
            });
        }

        // Crear columna con el tipo correcto
        Schema::table('intento_examenes', function (Blueprint $table) {
            // Solo se usa cuando tipo_aprobacion = 'independiente'
            $table->unsignedInteger('idSubpruebaSeleccionada')->nullable()->after('idPostulacion');
        });

        // Agregar foreign key
        Schema::table('intento_examenes', function (Blueprint $table) {
            $table->foreign('idSubpruebaSeleccionada')->references('idSubprueba')->on('subpruebas')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('intento_examenes', function (Blueprint $table) {
            $table->dropForeign(['idSubpruebaSeleccionada']);
            $table->dropColumn('idSubpruebaSeleccionada');
        });
    }
};
