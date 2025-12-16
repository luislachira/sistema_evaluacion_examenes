<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * RF-D.1.4: Actualizar IntentoExamen para usar idPostulacion en lugar de escala_postulada
     */
    public function up(): void
    {
        Schema::table('intento_examenes', function (Blueprint $table) {
            // Agregar idPostulacion como nullable primero
            $table->unsignedInteger('idPostulacion')->nullable()->after('idUsuario');
        });

        // Migrar datos existentes si es necesario (opcional)
        // Aquí se podría migrar escala_postulada a idPostulacion si hay datos

        // Eliminar escala_postulada después de migrar
        Schema::table('intento_examenes', function (Blueprint $table) {
            $table->dropColumn('escala_postulada');
        });

        // Agregar foreign key a postulaciones
        Schema::table('intento_examenes', function (Blueprint $table) {
            $table->foreign('idPostulacion')->references('idPostulacion')->on('postulaciones')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('intento_examenes', function (Blueprint $table) {
            $table->dropForeign(['idPostulacion']);
        });

        Schema::table('intento_examenes', function (Blueprint $table) {
            $table->string('escala_postulada', 100)->nullable();
            $table->dropColumn('idPostulacion');
        });
    }
};
