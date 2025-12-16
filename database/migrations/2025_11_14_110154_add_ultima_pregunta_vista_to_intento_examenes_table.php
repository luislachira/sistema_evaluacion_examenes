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
        Schema::table('intento_examenes', function (Blueprint $table) {
            $table->unsignedInteger('ultima_pregunta_vista')->nullable()->after('idPostulacion');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('intento_examenes', function (Blueprint $table) {
            $table->dropColumn('ultima_pregunta_vista');
        });
    }
};
