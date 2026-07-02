<?php

/**
 * Política de sesión: cierre por inactividad y limpieza de tokens en servidor.
 *
 * Variables opcionales:
 *   ESPO_SESSION_IDLE_MINUTES — minutos sin actividad (default: 10)
 *   ESPO_SESSION_MAX_HOURS    — vida máxima del token en horas (default: 8)
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

$idleMinutes = (int) (getenv('ESPO_SESSION_IDLE_MINUTES') ?: 10);
if ($idleMinutes < 1) {
    $idleMinutes = 10;
}

$maxHours = (int) (getenv('ESPO_SESSION_MAX_HOURS') ?: 8);
if ($maxHours < 1) {
    $maxHours = 8;
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
