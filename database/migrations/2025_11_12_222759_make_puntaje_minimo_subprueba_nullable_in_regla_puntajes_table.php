<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Hacer nullable el campo puntaje_minimo_subprueba en la tabla regla_puntajes
     */
    public function up(): void
    {
        Schema::table('regla_puntajes', function (Blueprint $table) {
            $table->decimal('puntaje_minimo_subprueba', 5, 2)->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('regla_puntajes', function (Blueprint $table) {
            // Primero actualizar los valores null a 0.00
            \DB::table('regla_puntajes')
                ->whereNull('puntaje_minimo_subprueba')
                ->update(['puntaje_minimo_subprueba' => 0.00]);

            // Luego hacer la columna NOT NULL
            $table->decimal('puntaje_minimo_subprueba', 5, 2)->nullable(false)->change();
        });
    }
};
