<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Support\Facades\DB;

class VerificarBdPruebasTest extends TestCase
{
    /**
     * Test para verificar que los tests están usando la BD de pruebas
     */
    public function test_verifica_que_se_usa_bd_de_pruebas(): void
    {
        $currentDatabase = DB::getDatabaseName();
        $expectedDatabase = 'examen_ascenso_test';

        // En CI usamos :memory:, localmente usamos examen_ascenso_test
        $matches = ($currentDatabase === $expectedDatabase) || 
                   ($currentDatabase === ':memory:');

        $this->assertTrue(
            $matches,
            "Los tests deben usar la BD '{$expectedDatabase}' o ':memory:', pero están usando '{$currentDatabase}'. " .
                "Verifica phpunit.xml y ejecuta 'php artisan config:clear'"
        );

        // Verificar que NO es la BD de producción
        $this->assertNotEquals(
            'examen_ascenso',
            $currentDatabase,
            "ERROR CRÍTICO: Los tests están usando la BD de PRODUCCIÓN 'examen_ascenso'. " .
                "Esto es peligroso y puede eliminar datos de producción."
        );
    }

    /**
     * Test para verificar que todas las tablas usan InnoDB
     */
    public function test_verifica_que_todas_las_tablas_usan_innodb(): void
    {
        if (DB::getDriverName() !== 'mysql' && DB::getDriverName() !== 'mariadb') {
            $this->markTestSkipped('Solo se verifica en MySQL/MariaDB');
        }

        $tables = DB::select("SHOW TABLES");
        $databaseName = DB::getDatabaseName();
        $tableKey = "Tables_in_{$databaseName}";

        $myisamTables = [];

        foreach ($tables as $table) {
            $tableName = $table->$tableKey;

            $engine = DB::selectOne("
                SELECT ENGINE 
                FROM information_schema.TABLES 
                WHERE TABLE_SCHEMA = ? 
                AND TABLE_NAME = ?
            ", [$databaseName, $tableName]);

            if ($engine && $engine->ENGINE === 'MyISAM') {
                $myisamTables[] = $tableName;
            }
        }

        $this->assertEmpty(
            $myisamTables,
            "Las siguientes tablas usan MyISAM en lugar de InnoDB: " . implode(', ', $myisamTables) .
                ". Ejecuta 'php artisan migrate' para convertirlas."
        );
    }
}
