<?php

/**
 * Política de sesión en servidor (tokens de autenticación EspoCRM).
 *
 * El cierre automático por inactividad en el navegador (modal / toast) está deshabilitado;
 * solo aplica el tiempo de vida del token en servidor.
 *
 * Variables opcionales:
 *   ESPO_SESSION_IDLE_MINUTES — minutos sin actividad antes de invalidar token (default: 1440 = 24 h)
 *   ESPO_SESSION_MAX_HOURS    — vida máxima del token en horas (default: 168 = 7 días)
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\Utils\Config;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var Config $config */
$config = $app->getContainer()->getByClass(Config::class);

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$idleMinutes = (int) (getenv('ESPO_SESSION_IDLE_MINUTES') ?: 1440);
if ($idleMinutes < 1) {
    $idleMinutes = 1440;
}

$maxHours = (int) (getenv('ESPO_SESSION_MAX_HOURS') ?: 168);
if ($maxHours < 1) {
    $maxHours = 168;
}

$idleHours = round($idleMinutes / 60, 6);

$config->set('authTokenMaxIdleTime', $idleHours);
$config->set('authTokenLifetime', $maxHours);
$config->save();

$jobName = 'AuthTokenControl';
$scheduling = '*/5 * * * *';

$job = $em->getRDBRepository('ScheduledJob')
    ->where(['job' => $jobName])
    ->findOne();

if (!$job) {
    $job = $em->getRDBRepository('ScheduledJob')->getNew();
    $job->set('job', $jobName);
    $job->set('name', 'Auth Token Control');
    $job->set('isInternal', true);
    echo "Scheduled job creado: {$jobName}\n";
} else {
    echo "Scheduled job encontrado: {$jobName}\n";
}

$job->set('status', 'Active');
$job->set('scheduling', $scheduling);
$em->saveEntity($job);

echo "Sesión: inactividad máxima {$idleMinutes} min (authTokenMaxIdleTime={$idleHours} h)\n";
echo "Sesión: vida máxima del token {$maxHours} h (authTokenLifetime)\n";
echo "Job {$jobName}: status=Active scheduling={$scheduling}\n";
