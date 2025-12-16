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
        Schema::create('tipo_concursos', function (Blueprint $table) {
            $table->increments('idTipoConcurso');
            $table->string('nombre', 191); // 191 es el máximo seguro para índices únicos en MySQL con utf8mb4
            $table->timestamps();

            // Crear índice único de forma explícita para evitar problemas con longitudes
            $table->unique('nombre', 'tipo_concursos_nombre_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tipo_concursos');
    }
};
