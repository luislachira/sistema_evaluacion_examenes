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
        // Primero, convertir los datos existentes: 'conjunta' -> '0', 'independiente' -> '1'
        DB::statement("UPDATE postulaciones SET tipo_aprobacion = '0' WHERE tipo_aprobacion = 'conjunta' OR tipo_aprobacion IS NULL");
        DB::statement("UPDATE postulaciones SET tipo_aprobacion = '1' WHERE tipo_aprobacion = 'independiente'");

        // Eliminar la columna antigua
        Schema::table('postulaciones', function (Blueprint $table) {
            $table->dropColumn('tipo_aprobacion');
        });

        // Crear la nueva columna con enum('0', '1')
        Schema::table('postulaciones', function (Blueprint $table) {
            // 0 = conjunta, 1 = independiente
            $table->enum('tipo_aprobacion', ['0', '1'])->default('0')->after('descripcion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Convertir los datos de vuelta: '0' -> 'conjunta', '1' -> 'independiente'
        DB::statement("UPDATE postulaciones SET tipo_aprobacion = 'conjunta' WHERE tipo_aprobacion = '0'");
        DB::statement("UPDATE postulaciones SET tipo_aprobacion = 'independiente' WHERE tipo_aprobacion = '1'");

        // Eliminar la columna actual
        Schema::table('postulaciones', function (Blueprint $table) {
            $table->dropColumn('tipo_aprobacion');
        });

        // Restaurar la columna antigua con enum('conjunta', 'independiente')
        Schema::table('postulaciones', function (Blueprint $table) {
            $table->enum('tipo_aprobacion', ['conjunta', 'independiente'])->default('conjunta')->after('descripcion');
        });
    }
};
