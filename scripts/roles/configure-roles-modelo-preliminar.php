<?php

/**
 * ACL preliminar para los roles del modelo BPMN que todavía no tenían
 * permisos configurados (creados en seed-modelo-roles-bpmn.php).
 *
 * Fuente: InspeccionAmbiental-Workflow/90_MODELO_CRM/matriz_roles_v1.0.md,
 * sección "Hace / Puede / No puede" de cada rol, y la "Matriz resumida de
 * permisos" al final del documento.
 *
 * IMPORTANTE — esto es una PRIMERA APROXIMACIÓN, no el diseño final:
 * - Es a nivel de entidad (create/read/edit/delete/stream), sin las
 *   restricciones de campo que sí tiene, por ejemplo, Radicación (que solo
 *   puede editar 5 campos puntuales del Case). Afinar eso es trabajo aparte.
 * - No hay soporte todavía para filtrar Case por tipo de asunto (ej. que
 *   Dirección de Bienestar Animal solo vea casos de fauna) — se le dio
 *   lectura general y se deja anotado como pendiente.
 * - No cubre entidades del modelo que el CRM aún no implementa (Audiencia,
 *   OrdenPolicia, MedidaCorrectiva, Recurso, etc. — Fase 2/3 del plan).
 *
 * Ejecutar DENTRO del contenedor Docker:
 *   docker exec espocrm php /opt/bootstrap/repo/scripts/roles/configure-roles-modelo-preliminar.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\Utils\Metadata;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);
/** @var Metadata $metadata */
$metadata = $app->getContainer()->getByClass(Metadata::class);

$noAccess = ['create' => 'no', 'read' => 'no', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'];
$readOnlyAll = ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'no'];
$readOnlyAllStream = ['create' => 'no', 'read' => 'all', 'edit' => 'no', 'delete' => 'no', 'stream' => 'all'];

/**
 * @var array<string, array<string, array<string, string>>> $roleConfigs
 * Cada entrada: nombre del rol => [ scope => permisos ].
 */
$roleConfigs = [

    // Transversal: consulta todo, no autoría de informes/actos, no borra
    // documentos finales, no sustituye a ningún funcionario competente.
    'Superadministrador CRM' => [
        'User' => $readOnlyAll,
        'Contact' => $readOnlyAll,
        'Account' => $readOnlyAll,
        'Document' => $readOnlyAll,
        'Template' => $readOnlyAll,
        'Team' => $readOnlyAll,
        'Case' => $readOnlyAllStream,
        'ActaVisita' => $readOnlyAll,
        'ActuoArchivo' => $readOnlyAll,
        'AutoInicio' => $readOnlyAll,
        'Expediente' => $readOnlyAll,
        'GestionTecnica' => $readOnlyAll,
        'DecisionRutaJuridica' => $readOnlyAll,
        'Destino' => $readOnlyAll,
        'RelacionCasos' => $readOnlyAll,
        'ComunicacionCaso' => $readOnlyAll,
    ],

    // Mantenimiento de catálogos/plantillas y soporte funcional. No decide
    // de fondo ni firma actos.
    'Administrador funcional CRM' => [
        'Document' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'Template' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'Case' => $readOnlyAllStream,
        'ActaVisita' => $readOnlyAll,
        'ActuoArchivo' => $readOnlyAll,
        'AutoInicio' => $readOnlyAll,
        'Expediente' => $readOnlyAll,
        'GestionTecnica' => $readOnlyAll,
        'DecisionRutaJuridica' => $readOnlyAll,
    ],

    // Recibe la solicitud, crea el Case preliminar y transfiere al Radicador.
    'Auxiliar Administrativo · Receptor' => [
        'Case' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'all'],
        'Document' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'Contact' => $readOnlyAll,
        'Account' => $readOnlyAll,
        // Recibe/verifica requisitos de trámites administrativos como el
        // registro de canino de manejo especial (RPC02-RPC03 del BPMN).
        'RegistroCaninoManejoEspecial' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
    ],

    // Citaciones, notificaciones, remisiones, constancias; apoya el cierre
    // documental y el Auto de Archivo. No decide fondo jurídico.
    'Auxiliar Administrativo · Inspección' => [
        'Case' => $readOnlyAllStream,
        'ComunicacionCaso' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'ActuoArchivo' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'Document' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
    ],

    // Visita, medición, informe, recomendaciones/obligaciones técnicas,
    // verificación. No decide sanción/fallo.
    'Profesional Universitario' => [
        'Case' => $readOnlyAllStream,
        'ActaVisita' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'GestionTecnica' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'DecisionRutaJuridica' => $readOnlyAll,
        'EvaluacionResultado' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'IntervencionTecnica' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'ProgramacionVisita' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'RecomendacionTecnica' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'Compromiso' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'VerificacionCumplimiento' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'Document' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
    ],

    // Ejecución técnica de campo: visitas, mediciones, formatos de campo.
    'Técnico Operativo' => [
        'Case' => $readOnlyAllStream,
        'ActaVisita' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'GestionTecnica' => ['create' => 'no', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'IntervencionTecnica' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'ProgramacionVisita' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'Document' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
    ],

    // DecisionRutaJuridica, abre/autoriza el expediente, conduce audiencia,
    // decide/falla, resuelve reposición y ordena cierre cuando corresponde.
    'Inspector Ambiental' => [
        'Case' => ['create' => 'no', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'all'],
        'DecisionRutaJuridica' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'AutoInicio' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'Expediente' => [
            'create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no',
            'timeline' => 'yes', 'avanzarPaso' => 'yes',
        ],
        'GestionTecnica' => $readOnlyAll,
        'ComunicacionCaso' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'Document' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'RemisionAutoridad' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'Audiencia' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'SuspensionAudiencia' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'GrabacionAudiencia' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'OrdenPolicia' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'MedidaCorrectiva' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'EjecucionMedidaCorrectiva' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'NotificacionActo' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'Recurso' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'MovimientoExpediente' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'RegistroCaninoManejoEspecial' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'PermisoCaninoManejoEspecial' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'ActuacionMaltratoAnimal' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'EvaluacionResultado' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'IntervencionTecnica' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'ProgramacionVisita' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'RecomendacionTecnica' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'Compromiso' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'VerificacionCumplimiento' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'OrdenComparendo' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'ActuacionPoliciaInmediata' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'ObligacionPecuniaria' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
        'ActuacionRNMC' => ['create' => 'yes', 'read' => 'all', 'edit' => 'all', 'delete' => 'no', 'stream' => 'no'],
    ],

    // Supervisión y suplencia registrada del Director Técnico; revisión/firma
    // de informes cuando el procedimiento lo prevé.
    'Secretario de Despacho' => [
        'Case' => $readOnlyAllStream,
        'GestionTecnica' => ['create' => 'no', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
        'Expediente' => $readOnlyAll,
        'DecisionRutaJuridica' => $readOnlyAll,
        'EvaluacionResultado' => $readOnlyAll,
        'RemisionAutoridad' => $readOnlyAll,
        'Audiencia' => $readOnlyAll,
        'Document' => $readOnlyAll,
        'OrdenPolicia' => $readOnlyAll,
        'MedidaCorrectiva' => $readOnlyAll,
        'EjecucionMedidaCorrectiva' => $readOnlyAll,
        'NotificacionActo' => $readOnlyAll,
        'Recurso' => $readOnlyAll,
        'MovimientoExpediente' => $readOnlyAll,
        'IntervencionTecnica' => $readOnlyAll,
        'ProgramacionVisita' => $readOnlyAll,
        'RecomendacionTecnica' => $readOnlyAll,
        'Compromiso' => $readOnlyAll,
        'VerificacionCumplimiento' => $readOnlyAll,
        'OrdenComparendo' => $readOnlyAll,
        'ActuacionPoliciaInmediata' => $readOnlyAll,
        'ObligacionPecuniaria' => $readOnlyAll,
        'ActuacionRNMC' => $readOnlyAll,
    ],

    // Concepto especializado en casos con fauna. No sustituye la decisión
    // jurídica del Inspector.
    // Pendiente: filtrar Case solo a los de asunto/recurso animal (ACL de
    // EspoCRM no filtra por valor de campo sin una regla adicional).
    'Dirección de Bienestar Animal' => [
        'Case' => $readOnlyAll,
        'ComunicacionCaso' => $readOnlyAll,
        'Document' => ['create' => 'yes', 'read' => 'all', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'],
    ],
];

$applied = 0;

foreach ($roleConfigs as $roleName => $scopePermissions) {
    $role = $em->getRDBRepository('Role')->where(['name' => $roleName])->findOne();

    if (!$role) {
        echo "AVISO: rol «{$roleName}» no encontrado. Ejecute seed-modelo-roles-bpmn.php primero.\n";
        continue;
    }

    $data = $role->get('data');

    if ($data instanceof stdClass) {
        $data = json_decode(json_encode($data), true);
    }

    if (!is_array($data)) {
        $data = [];
    }

    foreach ($scopePermissions as $scope => $perms) {
        if (!$metadata->get(['scopes', $scope, 'entity'])) {
            continue;
        }

        $data[$scope] = $perms;
    }

    // Línea base que sí tienen los demás roles operativos (excluidos a
    // propósito de configure-{comunicacion-caso,task,meeting}-permissions.php
    // mientras no tenían ACL propio).
    $ownBaseline = ['create' => 'yes', 'read' => 'own', 'edit' => 'own', 'delete' => 'no', 'stream' => 'no'];

    if (!isset($data['ComunicacionCaso'])) {
        $data['ComunicacionCaso'] = $ownBaseline;
    }

    $data['Task'] = $ownBaseline;
    $data['Meeting'] = $ownBaseline;
    $data['Calendar'] = true;

    $role->set('data', $data);
    $role->set('tabList', null);
    $role->set('assignmentPermission', 'all');
    $role->set('userPermission', 'no');
    $role->set('messagePermission', 'all');
    $role->set('exportPermission', 'no');
    $role->set('portalPermission', 'no');

    $em->saveEntity($role);
    $applied++;

    echo "Rol «{$roleName}»: ACL preliminar aplicado.\n";
}

echo "Listo. {$applied} rol(es) configurados con permisos preliminares (revisar y afinar antes de producción).\n";
