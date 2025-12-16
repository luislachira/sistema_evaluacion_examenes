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
        Schema::create('respuesta_intentos', function (Blueprint $table) {
            $table->increments('idRespuesta');
            $table->unsignedInteger('idIntento');
            $table->unsignedInteger('idPregunta');
            $table->unsignedInteger('idOpcionSeleccionada')->nullable();
            $table->timestamps();

            $table->foreign('idIntento')->references('idIntento')->on('intento_examenes')->onDelete('cascade');
            $table->foreign('idPregunta')->references('idPregunta')->on('preguntas')->onDelete('cascade');
            $table->foreign('idOpcionSeleccionada')->references('idOpcion')->on('opciones_preguntas')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('respuesta_intentos');
    }
};
