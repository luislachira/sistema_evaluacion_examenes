<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Contracts\Auth\CanResetPassword;
use App\Notifications\ResetPasswordNotification;

class Usuario extends Authenticatable implements CanResetPassword
{
    use HasApiTokens, HasFactory, Notifiable;

    const ROL_ADMINISTRADOR = '0';
    const ROL_DOCENTE = '1';

    const ESTADO_SUSPENDIDO = '0';
    const ESTADO_ACTIVO = '1';
    const ESTADO_PENDIENTE = '2';

    protected $table = 'usuarios';
    protected $primaryKey = 'idUsuario';
    public $incrementing = true;

    protected $fillable = [
        'nombre',
        'apellidos',
        'correo',
        'password',
        'rol',
        'estado',
    ];

    protected $hidden = [
        'password',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    /**
     * Get the name of the unique identifier for the user (usará idUsuario).
     */
    public function getAuthIdentifierName()
    {
        return 'idUsuario'; // Para tokens, usar el ID numérico
    }

    /**
     * Get the column name for the "username" (para login usamos correo).
     */
    public function username()
    {
        return 'correo';
    }

    /**
     * Encuentra el usuario para Passport usando el correo electrónico
     */
    public function findForPassport($username)
    {
        return $this->where('correo', $username)->first();
    }

    /**
     * Obtener el email para el sistema de password reset
     */
    public function getEmailForPasswordReset()
    {
        return $this->correo;
    }

    /**
     * Enviar la notificación de reset password personalizada
     */
    public function sendPasswordResetNotification($token)
    {
        $this->notify(new ResetPasswordNotification($token));
    }

    /**
     * Get the name of the authentication provider for Passport
     */
    public function getProviderName()
    {
        return 'users';
    }

    // Relaciones
    public function intentos()
    {
        return $this->hasMany(IntentoExamen::class, 'idUsuario', 'idUsuario');
    }

    public function examenesAsignados()
    {
        return $this->hasMany(ExamenesUsuario::class, 'idUsuario', 'idUsuario');
    }

    public function asignacionesHechas()
    {
        return $this->hasMany(ExamenesUsuario::class, 'asignado_por', 'idUsuario');
    }

    public function archivosSubidos()
    {
        return $this->hasMany(ArchivoAdjunto::class, 'subido_por', 'idUsuario');
    }

    // Accessors
    public function getIdAttribute()
    {
        return $this->idUsuario;
    }

    public function getNombreCompletoAttribute()
    {
        return "{$this->nombre} {$this->apellidos}";
    }

    public function getRolNameAttribute()
    {
        return $this->rol === self::ROL_ADMINISTRADOR ? 'Administrador' : 'Docente';
    }

    public function getEstadoNameAttribute()
    {
        return match ($this->estado) {
            '0' => 'Inactivo',
            '1' => 'Activo',
            '2' => 'Suspendido',
            default => 'Desconocido'
        };
    }

    public function getIdUsuarioAttribute()
    {
        return $this->attributes['idUsuario'] ?? $this->attributes['id'];
    }

    // Scopes
    public function scopeActivos($query)
    {
        return $query->where('estado', self::ESTADO_ACTIVO);
    }

    public function scopeDocentes($query)
    {
        return $query->where('rol', self::ROL_DOCENTE);
    }

    public function scopeAdministradores($query)
    {
        return $query->where('rol', self::ROL_ADMINISTRADOR);
    }

    // Métodos de verificación
    public function esAdmin(): bool
    {
        return $this->rol === self::ROL_ADMINISTRADOR;
    }

    public function esDocente(): bool
    {
        return $this->rol === self::ROL_DOCENTE;
    }

    public function isActivo()
    {
        return $this->estado === self::ESTADO_ACTIVO;
    }
}
