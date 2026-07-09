<?php

/**
 * Asegura tabla visita_historial y rellena entradas faltantes desde actas diligenciadas.
 *
 *   php scripts/ensure-visita-historial.php
 */

declare(strict_types=1);

require_once '/var/www/html/bootstrap.php';
require_once __DIR__ . '/includes/deploy-rebuild.php';

use Espo\Core\Application;
use Espo\Core\DataManager;
use Espo\Core\InjectableFactory;
use Espo\Custom\Tools\CaseObj\CaseActaVisitaHelper;
use Espo\Custom\Tools\CaseObj\VisitaHistorialLogger;
use Espo\Entities\User;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
/** @var InjectableFactory $injectableFactory */
$injectableFactory = $app->getContainer()->getByClass(InjectableFactory::class);
$pdo = $em->getPDO();

$tableExists = static function (string $table) use ($pdo): bool {
    $stmt = $pdo->prepare('
        SELECT 1 FROM information_schema.tables
        WHERE table_name = :table
        LIMIT 1
    ');
    $stmt->execute(['table' => $table]);

    return (bool) $stmt->fetchColumn();
};

if (!$tableExists('visita_historial')) {
    echo "Tabla visita_historial ausente; ejecutando rebuild...\n";
    $app->getContainer()->getByClass(DataManager::class)->rebuild();
}

if (!$tableExists('visita_historial')) {
    fwrite(STDERR, "ERROR: visita_historial sigue ausente tras rebuild.\n");
    exit(1);
}

echo "Tabla visita_historial OK.\n";

$logger = $injectableFactory->create(VisitaHistorialLogger::class);
$created = 0;

$actas = $em->getRDBRepository('ActaVisita')
    ->where(['deleted' => false])
    ->order('createdAt', 'ASC')
    ->find();

foreach ($actas as $acta) {
    if (!CaseActaVisitaHelper::isActaWithContent($acta)) {
        continue;
    }

    $caseId = (string) $acta->get('caseId');

    if ($caseId === '') {
        continue;
    }

    if ($logger->existsForActa((string) $acta->getId())) {
        continue;
    }

    $case = $em->getEntityById('Case', $caseId);

    if (!$case) {
        continue;
    }

    $userId = (string) ($acta->get('createdById') ?: $acta->get('modifiedById'));

    if ($userId === '') {
        $userId = (string) $case->get('assignedUserId');
    }

    $user = $userId !== ''
        ? $em->getEntityById(User::ENTITY_TYPE, $userId)
        : null;

    if (!$user) {
        $user = $em->getRDBRepositoryByClass(User::class)
            ->where(['type' => User::TYPE_ADMIN, 'isActive' => true])
            ->findOne();
    }

    if (!$user) {
        continue;
    }

    $logger->logVisitaRegistrada($case, $acta, $user);
    $created++;
}

echo "Entradas de historial creadas desde actas: {$created}\n";

chdir('/var/www/html');
passthru(PHP_BINARY . ' command.php clear-cache', $cacheCode);

echo "Listo.\n";

if ($cacheCode !== 0) {
    exit(1);
}
