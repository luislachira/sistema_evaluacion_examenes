<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * RF-A.9: Crear tabla de Postulaciones
     */
    public function up(): void
    {
        Schema::create('postulaciones', function (Blueprint $table) {
            $table->increments('idPostulacion');
            $table->unsignedInteger('idExamen');
            $table->string('nombre', 255)->comment('Ej: Ascenso III Escala, Cargo Directivo');
            $table->text('descripcion')->nullable();
            $table->timestamps();

            $table->foreign('idExamen')->references('idExamen')->on('examenes')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('postulaciones');
    }
};
