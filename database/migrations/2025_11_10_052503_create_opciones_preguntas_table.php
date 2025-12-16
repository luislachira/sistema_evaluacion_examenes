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
        Schema::create('opciones_preguntas', function (Blueprint $table) {
            $table->increments('idOpcion');
            $table->unsignedInteger('idPregunta');
            $table->longText('contenido');
            $table->boolean('es_correcta')->default(false);
            $table->timestamps();

            $table->foreign('idPregunta')->references('idPregunta')->on('preguntas')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('opciones_preguntas');
    }
};
