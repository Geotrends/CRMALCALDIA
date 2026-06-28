<?php

/**
 * Sincroniza equipos homónimos a los roles de cada usuario activo (utilidad EspoCRM interna).
 * La lógica de negocio del CRM Alcaldía identifica perfiles solo por rol asignado, no por equipo.
 *
 * docker exec espocrm php /tmp/sync-user-teams-from-roles.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Custom\Tools\User\TeamRoleSync;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$sync = new TeamRoleSync($em);
$updated = $sync->syncAllActiveUsers();

echo "Equipos sincronizados desde roles: {$updated} usuario(s).\n";
