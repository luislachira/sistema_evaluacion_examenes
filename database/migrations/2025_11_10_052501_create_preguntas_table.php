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
        Schema::create('preguntas', function (Blueprint $table) {
            $table->increments('idPregunta');
            $table->unsignedInteger('idContexto')->nullable();
            $table->unsignedInteger('idCategoria');
            $table->string('codigo', 100)->unique();
            $table->longText('enunciado');
            $table->integer('ano');
            $table->timestamps();

            $table->foreign('idContexto')->references('idContexto')->on('contextos')->onDelete('set null');
            $table->foreign('idCategoria')->references('idCategoria')->on('categorias')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('preguntas');
    }
};
