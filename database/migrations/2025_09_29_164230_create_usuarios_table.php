<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('usuarios', function (Blueprint $table) {
            $table->increments('idUsuario');
            $table->string('nombre', 200);
            $table->string('apellidos',250);
            $table->string('correo', 250)->unique('correo');
            $table->string('password', 200);
            $table->enum('rol', ['0', '1']);
            $table->enum('estado', ['0', '1', '2']);
            $table->timestamps();
        });

        // Solo ejecutar en MySQL/MariaDB, no en SQLite (usado en tests)
        if (DB::getDriverName() !== 'sqlite') {
            DB::statement('ALTER TABLE usuarios ENGINE = InnoDB');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('usuarios');
    }
};
