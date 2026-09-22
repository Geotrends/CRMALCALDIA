<?php

/**
 * Crea los roles internos definidos en 90_MODELO_CRM/matriz_roles_v1.0.md
 * (repo InspeccionAmbiental-Workflow) que todavía no existen en el CRM,
 * sin tocar los 5 roles operativos ya creados por seed-alcaldia-roles.php.
 *
 * De los 4 con equivalente funcional claro (Auxiliar Administrativo ·
 * Radicador, Patrullero Ambiental, Apoyo Jurídico, Director Técnico), sus
 * permisos los aplican los scripts roles/configure-role-*.php (ya
 * actualizados para reconocer el nombre nuevo). Los demás quedan creados
 * sin permisos configurados todavía — existen para poder asignarlos a
 * usuarios, pero su ACL es una tarea aparte.
 *
 * No se crean roles para actores explícitamente externos según el modelo
 * (Autoridad Ambiental competente, Policía Nacional, Secretaría de
 * Hacienda/Tesorería): el modelo indica que normalmente no requieren
 * usuario interno completo.
 *
 * Idempotente: seguro ejecutarlo en cada deploy.
 *
 * docker cp scripts/seed-modelo-roles-bpmn.php espocrm:/tmp/seed-modelo-roles-bpmn.php
 * docker exec espocrm php /tmp/seed-modelo-roles-bpmn.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$roles = [
    'Superadministrador CRM',
    'Administrador funcional CRM',
    'Auxiliar Administrativo · Receptor',
    'Auxiliar Administrativo · Radicador',
    'Auxiliar Administrativo · Inspección',
    'Director Técnico',
    'Profesional Universitario',
    'Técnico Operativo',
    'Patrullero Ambiental',
    'Inspector Ambiental',
    'Secretario de Despacho',
    'Apoyo Jurídico',
    'Dirección de Bienestar Animal',
];

foreach ($roles as $name) {
    $role = $em->getRDBRepository('Role')->where(['name' => $name])->findOne();

    if ($role) {
        echo "Rol ya existe: {$name} (id={$role->getId()})" . PHP_EOL;
        continue;
    }

    $role = $em->getRDBRepository('Role')->getNew();
    $role->set('name', $name);
    $role->set('data', (object) []);
    $em->saveEntity($role);

    echo "Rol creado: {$name} (id={$role->getId()})" . PHP_EOL;
}

echo 'Listo. Roles del modelo (90_MODELO_CRM/matriz_roles_v1.0.md) sincronizados.' . PHP_EOL;
