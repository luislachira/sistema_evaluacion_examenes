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
        // Primero agregar la columna idSubprueba como nullable
        Schema::table('regla_puntajes', function (Blueprint $table) {
            $table->unsignedInteger('idSubprueba')->nullable()->after('idRegla');
        });

        // Renombrar la columna puntaje_minimo
        Schema::table('regla_puntajes', function (Blueprint $table) {
            $table->renameColumn('puntaje_minimo', 'puntaje_minimo_subprueba');
        });

        // Eliminar foreign key y columna idExamen
        Schema::table('regla_puntajes', function (Blueprint $table) {
            $table->dropForeign(['idExamen']);
            $table->dropColumn('idExamen');
        });

        // Agregar foreign key a subpruebas
        Schema::table('regla_puntajes', function (Blueprint $table) {
            $table->foreign('idSubprueba')->references('idSubprueba')->on('subpruebas')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Eliminar foreign key a subpruebas
        Schema::table('regla_puntajes', function (Blueprint $table) {
            $table->dropForeign(['idSubprueba']);
        });

        // Agregar columna idExamen
        Schema::table('regla_puntajes', function (Blueprint $table) {
            $table->unsignedInteger('idExamen')->nullable()->after('idRegla');
        });

        // Renombrar puntaje_minimo_subprueba a puntaje_minimo
        Schema::table('regla_puntajes', function (Blueprint $table) {
            $table->renameColumn('puntaje_minimo_subprueba', 'puntaje_minimo');
        });

        // Agregar foreign key a examenes y eliminar idSubprueba
        Schema::table('regla_puntajes', function (Blueprint $table) {
            $table->foreign('idExamen')->references('idExamen')->on('examenes')->onDelete('cascade');
            $table->dropColumn('idSubprueba');
        });
    }
};
