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
        Schema::create('contextos', function (Blueprint $table) {
            $table->increments('idContexto');
            $table->unsignedInteger('idCategoria');
            $table->string('titulo', 255);
            $table->longText('texto');
            $table->integer('ano');
            $table->timestamps();

            $table->foreign('idCategoria')->references('idCategoria')->on('categorias')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('contextos');
    }
};
