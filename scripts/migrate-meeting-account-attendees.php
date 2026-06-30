<?php

/**
 * Crea la relación Meeting ↔ Account (asistentes: personas jurídicas).
 * Idempotente: seguro en cada deploy.
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\DataManager;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
$pdo = $em->getPDO();

$tableExists = static function (string $table) use ($pdo): bool {
    $stmt = $pdo->prepare("
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = :table
        LIMIT 1
    ");
    $stmt->execute(['table' => $table]);

    return (bool) $stmt->fetchColumn();
};

if ($tableExists('account_meeting')) {
    echo "Tabla account_meeting ya existe.\n";
    exit(0);
}

echo "Tabla account_meeting no encontrada — ejecutando rebuild...\n";

/** @var DataManager $dataManager */
$dataManager = $app->getContainer()->getByClass(DataManager::class);
$dataManager->rebuild();

if ($tableExists('account_meeting')) {
    echo "Tabla account_meeting creada por rebuild.\n";
    exit(0);
}

echo "Rebuild no creó account_meeting — creando manualmente...\n";

$pdo->exec("
    CREATE TABLE IF NOT EXISTS account_meeting (
        id VARCHAR(24) NOT NULL,
        account_id VARCHAR(24) DEFAULT NULL,
        meeting_id VARCHAR(24) DEFAULT NULL,
        status VARCHAR(36) DEFAULT 'None',
        deleted BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
        modified_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NULL,
        PRIMARY KEY (id)
    )
");

$pdo->exec('CREATE INDEX IF NOT EXISTS idx_account_meeting_account_id ON account_meeting (account_id)');
$pdo->exec('CREATE INDEX IF NOT EXISTS idx_account_meeting_meeting_id ON account_meeting (meeting_id)');
$pdo->exec('CREATE INDEX IF NOT EXISTS idx_account_meeting_deleted ON account_meeting (deleted)');

if ($tableExists('account_meeting')) {
    echo "Tabla account_meeting creada manualmente.\n";
} else {
    fwrite(STDERR, "ERROR: no se pudo crear account_meeting.\n");
    exit(1);
}

echo "Listo. Reuniones con personas jurídicas habilitadas.\n";
