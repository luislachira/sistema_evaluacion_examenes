<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('postulaciones', function (Blueprint $table) {
            // 'conjunta': Todas las subpruebas con puntaje mínimo deben aprobarse
            // 'independiente': Solo se evalúa la subprueba seleccionada
            $table->enum('tipo_aprobacion', ['conjunta', 'independiente'])->default('conjunta')->after('descripcion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('postulaciones', function (Blueprint $table) {
            $table->dropColumn('tipo_aprobacion');
        });
    }
};
