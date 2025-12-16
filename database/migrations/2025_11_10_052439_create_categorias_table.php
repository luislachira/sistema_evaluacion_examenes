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
        Schema::create('categorias', function (Blueprint $table) {
            $table->increments('idCategoria');
            $table->string('nombre', 191); // 191 es el máximo seguro para índices únicos en MySQL con utf8mb4
            $table->text('descripcion')->nullable();
            $table->timestamps();
            
            // Crear índice único de forma explícita para evitar problemas con longitudes
            $table->unique('nombre', 'categorias_nombre_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categorias');
    }
};
