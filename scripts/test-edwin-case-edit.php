<?php

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\Acl\Table;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$user = $em->getRDBRepository('User')
    ->where(['userName' => 'edwin.radicacion'])
    ->findOne();

if (!$user) {
    echo "Usuario edwin.radicacion no encontrado.\n";
    exit(1);
}

$case = $em->getRDBRepository('Case')
    ->where(['deleted' => false])
    ->order('createdAt', 'DESC')
    ->findOne();

if (!$case) {
    echo "No hay casos.\n";
    exit(1);
}

/** @var Table $table */
$table = $app->getContainer()->getByClass(Table::class, null, $user);

echo 'Caso: ' . ($case->get('cNumeroRadicado') ?: $case->getId()) . ' status=' . $case->get('status') . "\n";
echo 'entityRead=' . ($table->checkEntityRead($case) ? 'yes' : 'no') . "\n";
echo 'entityEdit=' . ($table->checkEntityEdit($case) ? 'yes' : 'no') . "\n";

$fields = [
    'cNumeroRadicado',
    'cExpediente',
    'cRecursoTema',
    'cNombrePeticionario',
    'cDireccionPeticionario',
    'cZonaAlcaldiaPeticionario',
    'status',
    'description',
];

foreach ($fields as $field) {
    echo $field . ' edit=' . ($table->checkFieldEdit($case, $field) ? 'yes' : 'no') . "\n";
}
