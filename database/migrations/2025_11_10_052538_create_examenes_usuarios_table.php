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
        Schema::create('examenes_usuarios', function (Blueprint $table) {
            $table->increments('idExamenUsuario');
            $table->unsignedInteger('idExamen');
            $table->unsignedInteger('idUsuario');
            $table->unsignedInteger('asignado_por');
            $table->timestamp('fecha_asignacion')->nullable();
            $table->text('observaciones')->nullable();
            $table->timestamps();

            $table->foreign('idExamen')->references('idExamen')->on('examenes')->onDelete('cascade');
            $table->foreign('idUsuario')->references('idUsuario')->on('usuarios')->onDelete('cascade');
            $table->foreign('asignado_por')->references('idUsuario')->on('usuarios')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examenes_usuarios');
    }
};
