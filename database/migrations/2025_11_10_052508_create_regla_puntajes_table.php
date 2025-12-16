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
        Schema::create('regla_puntajes', function (Blueprint $table) {
            $table->increments('idRegla');
            $table->unsignedInteger('idExamen');
            $table->string('nombre_escala', 100);
            $table->decimal('puntaje_minimo', 5, 2);
            $table->timestamps();

            $table->foreign('idExamen')->references('idExamen')->on('examenes')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('regla_puntajes');
    }
};
