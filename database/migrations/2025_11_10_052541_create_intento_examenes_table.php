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
        Schema::create('intento_examenes', function (Blueprint $table) {
            $table->increments('idIntento');
            $table->unsignedInteger('idExamen');
            $table->unsignedInteger('idUsuario');
            $table->dateTime('hora_inicio');
            $table->dateTime('hora_fin')->nullable();
            $table->enum('estado', ['iniciado', 'enviado']);
            $table->decimal('puntaje', 5, 2)->nullable();
            $table->boolean('es_aprobado')->nullable();
            $table->timestamps();

            $table->foreign('idExamen')->references('idExamen')->on('examenes')->onDelete('cascade');
            $table->foreign('idUsuario')->references('idUsuario')->on('usuarios')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('intento_examenes');
    }
};
