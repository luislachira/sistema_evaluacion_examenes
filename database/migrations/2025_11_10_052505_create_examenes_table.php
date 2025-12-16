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
        Schema::create('examenes', function (Blueprint $table) {
            $table->increments('idExamen');
            $table->unsignedInteger('idTipoConcurso');
            $table->string('titulo', 255);
            $table->longText('descripcion');
            $table->integer('tiempo_limite')->comment('En minutos');
            $table->enum('tipo_acceso', ['publico', 'privado']);
            $table->enum('estado', ['0', '1'])->comment('0=Borrador, 1=Publicado');
            $table->decimal('puntaje_por_pregunta', 5, 2);
            $table->timestamps();

            $table->foreign('idTipoConcurso')->references('idTipoConcurso')->on('tipo_concursos')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examenes');
    }
};
