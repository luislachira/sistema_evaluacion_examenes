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
        Schema::create('resultado_subpruebas', function (Blueprint $table) {
            $table->increments('idResultado');
            $table->unsignedInteger('idIntento');
            $table->unsignedInteger('idSubprueba');
            $table->decimal('puntaje_obtenido', 5, 2);
            $table->decimal('puntaje_minimo_requerido', 5, 2);
            $table->boolean('es_aprobado');
            $table->timestamps();

            $table->foreign('idIntento')->references('idIntento')->on('intento_examenes')->onDelete('cascade');
            $table->foreign('idSubprueba')->references('idSubprueba')->on('subpruebas')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('resultado_subpruebas');
    }
};

