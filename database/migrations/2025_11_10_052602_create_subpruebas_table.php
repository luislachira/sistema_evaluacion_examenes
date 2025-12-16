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
        Schema::create('subpruebas', function (Blueprint $table) {
            $table->increments('idSubprueba');
            $table->unsignedInteger('idExamen');
            $table->string('nombre', 255)->comment('Ej: Conocimientos Pedagógicos, Comprensión Lectora');
            $table->decimal('puntaje_por_pregunta', 5, 2)->comment('El puntaje variable por pregunta en esta subprueba');
            $table->timestamps();

            $table->foreign('idExamen')->references('idExamen')->on('examenes')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('subpruebas');
    }
};

