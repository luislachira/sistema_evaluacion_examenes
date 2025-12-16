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
        Schema::create('archivo_adjuntos', function (Blueprint $table) {
            $table->increments('idArchivoAdjunto');
            $table->string('nombre_original', 255);
            $table->string('ruta', 500);
            $table->string('tipo_recurso', 50)->comment('Ej: contexto_texto, pregunta_enunciado');
            $table->unsignedInteger('id_recurso')->nullable();
            $table->unsignedInteger('subido_por');
            $table->timestamp('fecha_subida')->nullable();
            $table->timestamps();

            $table->foreign('subido_por')->references('idUsuario')->on('usuarios')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('archivo_adjuntos');
    }
};
