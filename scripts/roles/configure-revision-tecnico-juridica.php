<?php

/**
 * Permisos de la revisión técnico-jurídica en dos etapas (Director Técnico → Apoyo Jurídico).
 *
 *  - Inspector Ambiental (responsable de la visita): crea y corrige actas de visita, además de la
 *    programación e intervención técnica que ya tenía.
 *  - Director Técnico y Apoyo Jurídico: leen la intervención técnica (donde está el informe técnico)
 *    y la programación de la visita que revisan. Solo lectura: sus decisiones pasan por las acciones
 *    «revisionTecnica» y «revisionJuridica» de Case, que validan el rol en el servidor.
 *
 * Mezcla con los permisos que el rol ya tiene (nunca los reduce). Es idempotente.
 *
 * Ejecutar DENTRO del contenedor Docker:
 *   docker exec espocrm php /opt/bootstrap/repo/scripts/roles/configure-revision-tecnico-juridica.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$lectura = ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'all'];

$configs = [
    'Inspector Ambiental' => [
        'ActaVisita' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'all'],
        // La evaluación de resultado la completa cualquier Inspector Ambiental, no solo quien la creó.
        'EvaluacionResultado' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'all'],
    ],
    'Director Técnico' => [
        'IntervencionTecnica' => $lectura,
        'ProgramacionVisita' => $lectura,
    ],
    'Apoyo Jurídico' => [
        'IntervencionTecnica' => $lectura,
        'ProgramacionVisita' => $lectura,
    ],
];

// Orden de los niveles: un permiso existente más amplio se conserva.
$nivel = ['no' => 0, 'own' => 1, 'team' => 2, 'all' => 3, 'yes' => 3];
$acciones = ['create', 'read', 'edit', 'delete', 'stream'];

foreach ($configs as $roleName => $scopes) {
    $role = $em->getRDBRepository('Role')->where(['name' => $roleName])->findOne();

    if (!$role) {
        echo "AVISO: rol «{$roleName}» no encontrado.\n";

        continue;
    }

    $data = $role->get('data');

    if ($data instanceof stdClass) {
        $data = json_decode(json_encode($data), true);
    }

    $data = is_array($data) ? $data : [];

    foreach ($scopes as $scope => $perms) {
        $actual = is_array($data[$scope] ?? null) ? $data[$scope] : [];

        foreach ($acciones as $accion) {
            $nuevo = $perms[$accion] ?? 'no';
            $previo = $actual[$accion] ?? 'no';

            $actual[$accion] = ($nivel[$previo] ?? 0) >= ($nivel[$nuevo] ?? 0) ? $previo : $nuevo;
        }

        $data[$scope] = $actual;
    }

    $role->set('data', $data);
    $em->saveEntity($role);

    echo "Rol «{$roleName}»: permisos de la revisión técnico-jurídica aplicados.\n";
}
