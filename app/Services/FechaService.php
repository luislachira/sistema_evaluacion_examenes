<?php

namespace App\Services;

use Carbon\Carbon;

/**
 * Servicio centralizado para el manejo de fechas y zonas horarias
 *
 * Este servicio asegura que todas las fechas se manejen de manera consistente
 * usando la zona horaria configurada en la aplicación (America/Lima).
 *
 * IMPORTANTE: Todas las fechas se almacenan en la base de datos como strings
 * en formato 'Y-m-d H:i:s' representando la hora local de America/Lima.
 * No se usa UTC para evitar confusiones y mantener consistencia.
 */
class FechaService
{
    /**
     * Obtiene la fecha/hora actual en la zona horaria de la aplicación
     *
     * @return Carbon
     */
    public static function ahora(): Carbon
    {
        return Carbon::now(self::getTimezone());
    }

    /**
     * Obtiene la fecha/hora actual formateada como string para comparaciones
     *
     * @return string Formato: 'Y-m-d H:i:s'
     */
    public static function ahoraString(): string
    {
        return self::ahora()->format('Y-m-d H:i:s');
    }

    /**
     * Obtiene la zona horaria configurada en la aplicación
     *
     * @return string
     */
    public static function getTimezone(): string
    {
        return config('app.timezone', 'America/Lima');
    }

    /**
     * Convierte una fecha string a Carbon usando la zona horaria de la aplicación
     *
     * @param string|null $fecha Fecha en formato 'Y-m-d H:i:s'
     * @return Carbon|null
     */
    public static function parsearFecha(?string $fecha): ?Carbon
    {
        if (!$fecha) {
            return null;
        }

        // Las fechas en la BD están en formato 'Y-m-d H:i:s' y representan hora local
        return Carbon::createFromFormat('Y-m-d H:i:s', $fecha, self::getTimezone());
    }

    /**
     * Formatea una fecha Carbon a string para almacenar en BD
     *
     * @param Carbon|null $fecha
     * @return string|null Formato: 'Y-m-d H:i:s'
     */
    public static function formatearParaBD(?Carbon $fecha): ?string
    {
        if (!$fecha) {
            return null;
        }

        // Asegurar que la fecha esté en la zona horaria correcta antes de formatear
        return $fecha->setTimezone(self::getTimezone())->format('Y-m-d H:i:s');
    }

    /**
     * Compara dos fechas como strings (formato 'Y-m-d H:i:s')
     * Útil para comparar fechas de la BD sin problemas de zona horaria
     *
     * @param string|null $fecha1
     * @param string|null $fecha2
     * @return int -1 si fecha1 < fecha2, 0 si son iguales, 1 si fecha1 > fecha2
     */
    public static function compararFechas(?string $fecha1, ?string $fecha2): ?int
    {
        if (!$fecha1 && !$fecha2) {
            return 0;
        }
        if (!$fecha1) {
            return -1;
        }
        if (!$fecha2) {
            return 1;
        }

        return strcmp($fecha1, $fecha2);
    }

    /**
     * Verifica si una fecha ya pasó (comparando con la hora actual)
     *
     * @param string|null $fecha Fecha en formato 'Y-m-d H:i:s'
     * @return bool
     */
    public static function yaPaso(?string $fecha): bool
    {
        if (!$fecha) {
            return false;
        }

        $ahora = self::ahoraString();
        return strcmp($ahora, $fecha) >= 0;
    }

    /**
     * Verifica si una fecha aún no ha llegado (comparando con la hora actual)
     *
     * @param string|null $fecha Fecha en formato 'Y-m-d H:i:s'
     * @return bool
     */
    public static function aunNoLlega(?string $fecha): bool
    {
        if (!$fecha) {
            return false;
        }

        $ahora = self::ahoraString();
        return strcmp($ahora, $fecha) < 0;
    }

    /**
     * Verifica si una fecha está dentro del rango (entre inicio y fin)
     *
     * @param string|null $fechaInicio
     * @param string|null $fechaFin
     * @return bool
     */
    public static function estaEnRango(?string $fechaInicio, ?string $fechaFin): bool
    {
        $ahora = self::ahoraString();

        // Si hay fecha de inicio, debe haber pasado
        if ($fechaInicio && strcmp($ahora, $fechaInicio) < 0) {
            return false;
        }

        // Si hay fecha de fin, no debe haber pasado
        if ($fechaFin && strcmp($ahora, $fechaFin) >= 0) {
            return false;
        }

        return true;
    }

    /**
     * Obtiene información sobre la configuración de zona horaria
     * Útil para debugging y logs
     *
     * @return array
     */
    public static function getInfoTimezone(): array
    {
        $ahora = self::ahora();

        return [
            'timezone' => self::getTimezone(),
            'hora_actual' => $ahora->format('Y-m-d H:i:s'),
            'timestamp' => $ahora->timestamp,
            'offset' => $ahora->format('P'),
            'timezone_abbr' => $ahora->format('T'),
        ];
    }
}

