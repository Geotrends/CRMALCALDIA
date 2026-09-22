<?php

/**
 * Restringe la visibilidad de menú por rol: los 5 roles "acceso completo"
 * (Inspección, Radicación, Asignación, Patrullaje, Jurídica) reciben acceso
 * de entidad a entidad desde configure-full-access-all-roles.php, lo que
 * hace que hoy vean TODO el menú nuevo (Gestión Técnica, PVA, Policía y
 * RNMC, Otras rutas). Este script se ejecuta DESPUÉS de los scripts
 * roles/configure-role-*.php (que ya afinan lo que cada rol sí necesita) y
 * pone en "sin acceso" los grupos de menú que NO le corresponden a cada
 * rol, sin tocar ninguna entidad que un script anterior ya haya configurado
 * explícitamente (para no pisar decisiones ya tomadas).
 *
 * EspoCRM oculta automáticamente del menú lateral cualquier tab donde el
 * usuario no tenga acceso de lectura — por eso basta con negar el ACL, no
 * hay que tocar el tabList por rol.
 *
 * Matriz de grupos visibles por rol (confirmada 2026-09-22):
 *   Inspección  → Gestión Técnica, Seguimiento
 *   Radicación  → Policía y RNMC (solo lo ya explícito: ActuacionRNMC,
 *                 OrdenComparendo), Seguimiento
 *   Asignación  → Seguimiento
 *   Patrullaje  → Gestión Técnica (solo Visitas ya explícitas), Policía y
 *                 RNMC (solo lo ya explícito), Seguimiento
 *   Jurídica    → Proceso Verbal Abreviado, Policía y RNMC, Otras rutas,
 *                 Seguimiento
 *
 * docker cp scripts/configure-menu-visibilidad-por-rol.php espocrm:/tmp/configure-menu-visibilidad-por-rol.php
 * docker exec espocrm php /tmp/configure-menu-visibilidad-por-rol.php
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

// Grupos de menú (mismas entidades que el tabList global, ver
// configure-full-access-all-roles.php).
$GESTION_TECNICA = [
    'GestionTecnica', 'IntervencionTecnica', 'ProgramacionVisita',
    'EvaluacionResultado', 'RecomendacionTecnica', 'Compromiso',
    'VerificacionCumplimiento',
];
$PVA = [
    'DecisionRutaJuridica', 'Audiencia', 'SuspensionAudiencia',
    'GrabacionAudiencia', 'OrdenPolicia', 'MedidaCorrectiva',
    'EjecucionMedidaCorrectiva', 'NotificacionActo', 'Recurso',
    'MovimientoExpediente',
];
$POLICIA_RNMC = ['OrdenComparendo', 'ActuacionPoliciaInmediata', 'ActuacionRNMC', 'ReporteRNMC'];
$OTRAS_RUTAS = [
    'RemisionAutoridad', 'RegistroCaninoManejoEspecial',
    'PermisoCaninoManejoEspecial', 'ActuacionMaltratoAnimal',
    'ObligacionPecuniaria',
];

/**
 * Por rol: lista de entidades a negar. Se excluyen deliberadamente las
 * entidades que un script roles/configure-role-*.php ya configuró de forma
 * explícita (ActaVisita para Jurídica, OrdenPolicia/MedidaCorrectiva/
 * OrdenComparendo/ActuacionPoliciaInmediata para Patrullaje,
 * ActuacionRNMC/OrdenComparendo para Radicación).
 */
$denyByRole = [
    'Inspección' => array_merge($PVA, $POLICIA_RNMC, $OTRAS_RUTAS),

    'Radicación' => array_merge(
        $GESTION_TECNICA,
        $PVA,
        ['ActuacionPoliciaInmediata', 'ReporteRNMC'], // resto de Policía y RNMC
        $OTRAS_RUTAS
    ),

    'Asignación' => array_merge($GESTION_TECNICA, $PVA, $POLICIA_RNMC, $OTRAS_RUTAS),

    'Patrullaje' => array_merge(
        ['DecisionRutaJuridica', 'Audiencia', 'SuspensionAudiencia', 'GrabacionAudiencia',
            'EjecucionMedidaCorrectiva', 'NotificacionActo', 'Recurso', 'MovimientoExpediente'], // PVA menos OrdenPolicia/MedidaCorrectiva
        ['ActuacionRNMC', 'ReporteRNMC'], // Policía y RNMC menos OrdenComparendo/ActuacionPoliciaInmediata
        $OTRAS_RUTAS
    ),

    'Jurídica' => $GESTION_TECNICA, // ActaVisita queda intacto (ya explícito, solo lectura)
];

// Alias de nombre real del rol en BD (algunos roles se renombraron a los
// nombres del modelo BPMN durante la sesión).
// IMPORTANTE: el orden importa. Debe coincidir EXACTO con el que usa cada
// roles/configure-role-*.php correspondiente, porque varios de estos roles
// tienen homónimos legado sin usar en la base de datos (p. ej. existe una
// fila "Radicación" vacía además de la real "Auxiliar Administrativo ·
// Radicador", que es la que de verdad tienen asignada los usuarios).
$roleAliases = [
    'Inspección' => ['Inspección', 'Inspeccion'],
    'Radicación' => ['Auxiliar Administrativo · Radicador', 'Radicación', 'Radicacion'],
    'Asignación' => ['Director Técnico', 'Asignación', 'Asignacion', 'Asignador'],
    'Patrullaje' => ['Patrullero Ambiental', 'Patrullaje', 'Patrullero'],
    'Jurídica' => ['Apoyo Jurídico', 'Jurídica', 'Juridica'],
];

$applied = 0;

foreach ($denyByRole as $label => $denyList) {
    $role = null;

    foreach ($roleAliases[$label] as $name) {
        $role = $em->getRDBRepository('Role')->where(['name' => $name])->findOne();

        if ($role) {
            break;
        }
    }

    if (!$role) {
        echo "AVISO: rol «{$label}» no encontrado.\n";
        continue;
    }

    $data = $role->get('data');

    if ($data instanceof stdClass) {
        $data = json_decode(json_encode($data), true);
    }

    if (!is_array($data)) {
        $data = [];
    }

    $denied = 0;

    foreach (array_unique($denyList) as $scope) {
        if (!$metadata->get(['scopes', $scope, 'entity'])) {
            continue;
        }

        $data[$scope] = $noAccess;
        $denied++;
    }

    $role->set('data', $data);
    $em->saveEntity($role);
    $applied++;

    echo "Rol «{$role->get('name')}»: {$denied} entidad(es) ocultadas del menú.\n";
}

echo "Listo. {$applied} rol(es) ajustados.\n";
