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
        Schema::create('examen_pregunta', function (Blueprint $table) {
            $table->increments('idExamenPregunta');
            $table->unsignedInteger('idExamen');
            $table->unsignedInteger('idPregunta');
            $table->integer('orden')->comment('Define el orden de la pregunta en el examen');
            $table->timestamps();

            $table->foreign('idExamen')->references('idExamen')->on('examenes')->onDelete('cascade');
            $table->foreign('idPregunta')->references('idPregunta')->on('preguntas')->onDelete('cascade');
            $table->unique(['idExamen', 'idPregunta']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examen_pregunta');
    }
};
