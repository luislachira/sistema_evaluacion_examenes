<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * RF-A.4.2: Agregar duracion_minutos y orden a Subpruebas
     */
    public function up(): void
    {
        Schema::table('subpruebas', function (Blueprint $table) {
            $table->integer('duracion_minutos')->nullable()->after('nombre')->comment('Tiempo límite para esta subprueba');
            $table->integer('orden')->nullable()->after('duracion_minutos')->comment('Orden de presentación (1, 2, 3...)');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subpruebas', function (Blueprint $table) {
            $table->dropColumn(['duracion_minutos', 'orden']);
        });
    }
};
