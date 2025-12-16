<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * RF-A.8: Actualizar ReglaPuntaje para usar idPostulacion en lugar de nombre_escala
     */
    public function up(): void
    {
        Schema::table('regla_puntajes', function (Blueprint $table) {
            // Agregar idPostulacion como nullable primero
            $table->unsignedInteger('idPostulacion')->nullable()->after('idSubprueba');

            // Agregar campos de puntaje según RF-A.8.3
            $table->decimal('puntaje_correcto', 8, 2)->nullable()->after('idPostulacion');
            $table->decimal('puntaje_incorrecto', 8, 2)->nullable()->after('puntaje_correcto');
            $table->decimal('puntaje_en_blanco', 8, 2)->nullable()->after('puntaje_incorrecto');
        });

        // Migrar datos existentes si es necesario (opcional)
        // Aquí se podría migrar nombre_escala a idPostulacion si hay datos

        // Eliminar nombre_escala después de migrar
        Schema::table('regla_puntajes', function (Blueprint $table) {
            $table->dropColumn('nombre_escala');
        });

        // Agregar foreign key a postulaciones
        Schema::table('regla_puntajes', function (Blueprint $table) {
            $table->foreign('idPostulacion')->references('idPostulacion')->on('postulaciones')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('regla_puntajes', function (Blueprint $table) {
            $table->dropForeign(['idPostulacion']);
        });

        Schema::table('regla_puntajes', function (Blueprint $table) {
            $table->string('nombre_escala', 100)->nullable();
            $table->dropColumn(['idPostulacion', 'puntaje_correcto', 'puntaje_incorrecto', 'puntaje_en_blanco']);
        });
    }
};
