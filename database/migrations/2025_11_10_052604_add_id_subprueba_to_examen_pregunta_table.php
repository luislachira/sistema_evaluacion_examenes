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
        Schema::table('examen_pregunta', function (Blueprint $table) {
            $table->unsignedInteger('idSubprueba')->nullable()->after('idPregunta')->comment('Define a qué subprueba pertenece la pregunta');
            $table->foreign('idSubprueba')->references('idSubprueba')->on('subpruebas')->onDelete('cascade');
        });

        // Actualizar comentario del campo orden
        Schema::table('examen_pregunta', function (Blueprint $table) {
            // Laravel no permite cambiar comentarios directamente, pero podemos hacerlo con DB::statement
            // Por ahora solo agregamos la columna y la foreign key
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('examen_pregunta', function (Blueprint $table) {
            $table->dropForeign(['idSubprueba']);
            $table->dropColumn('idSubprueba');
        });
    }
};

