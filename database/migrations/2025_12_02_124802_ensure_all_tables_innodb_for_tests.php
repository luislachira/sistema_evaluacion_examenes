<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * 
     * Asegura que TODAS las tablas usen InnoDB.
     * Esta migración debe ejecutarse después de todas las demás.
     */
    public function up(): void
    {
        // Solo ejecutar en MySQL/MariaDB, no en SQLite
        if (DB::getDriverName() !== 'mysql' && DB::getDriverName() !== 'mariadb') {
            return;
        }

        // Obtener todas las tablas de la base de datos actual
        $tables = DB::select("SHOW TABLES");
        $databaseName = DB::getDatabaseName();
        $tableKey = "Tables_in_{$databaseName}";

        foreach ($tables as $table) {
            $tableName = $table->$tableKey;

            // Verificar el engine actual
            $engine = DB::selectOne("
                SELECT ENGINE 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = ? 
                AND TABLE_NAME = ?
            ", [$databaseName, $tableName]);

            // Si no es InnoDB, convertir
            if ($engine && $engine->ENGINE !== 'InnoDB') {
                try {
                    DB::statement("ALTER TABLE `{$tableName}` ENGINE = InnoDB");
                } catch (\Exception $e) {
                    // Continuar si hay algún error
                    // Algunas tablas pueden tener restricciones que impidan la conversión
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No revertimos la conversión a InnoDB ya que es la configuración deseada
    }
};
