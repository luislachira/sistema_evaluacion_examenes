<?php

namespace App\Providers;

use Illuminate\Auth\EloquentUserProvider;
use Illuminate\Contracts\Auth\Authenticatable;

class UsuarioUserProvider extends EloquentUserProvider
{
    /**
     * Retrieve a user by the given credentials.
     *
     * @param  array  $credentials
     * @return \Illuminate\Contracts\Auth\Authenticatable|null
     */
    public function retrieveByCredentials(array $credentials)
    {
        if (empty($credentials) ||
           (count($credentials) === 1 &&
            array_key_exists('password', $credentials))) {
            return;
        }

        // Build the query to find the user.
        $query = $this->createModel()->newQuery();

        foreach ($credentials as $key => $value) {
            if ($key === 'email') {
                // Map 'email' to 'correo' for our custom table
                $query->where('correo', $value);
            } elseif (!in_array($key, ['password', 'password_confirmation'])) {
                // Exclude password and password_confirmation from WHERE clause
                $query->where($key, $value);
            }
        }

        return $query->first();
    }
}