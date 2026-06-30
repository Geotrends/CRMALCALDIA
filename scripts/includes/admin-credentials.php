<?php

/**
 * Lee credenciales admin desde entorno (Dokploy / .env / docker-compose).
 */
function alcaldiaAdminUsername(): string
{
    return alcaldiaEnv('ESPOCRM_ADMIN_USERNAME', 'admin');
}

function alcaldiaAdminPassword(): string
{
    return alcaldiaEnv('ESPOCRM_ADMIN_PASSWORD', '');
}

function alcaldiaEnv(string $key, string $default = ''): string
{
    $value = getenv($key);

    if ($value !== false && $value !== '') {
        return trim((string) $value);
    }

    if (isset($_ENV[$key]) && $_ENV[$key] !== '') {
        return trim((string) $_ENV[$key]);
    }

    if (isset($_SERVER[$key]) && $_SERVER[$key] !== '') {
        return trim((string) $_SERVER[$key]);
    }

    return $default;
}
