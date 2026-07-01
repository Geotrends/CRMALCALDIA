<?php

/**
 * Menú lateral global (como admin) + permisos amplios en todos los roles operativos.
 *
 * docker cp scripts/configure-full-access-all-roles.php espocrm:/tmp/configure-full-access-all-roles.php
 * docker exec espocrm php /tmp/configure-full-access-all-roles.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\Utils\Config;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

/** @var Config $config */
$config = $app->getContainer()->getByClass(Config::class);

$globalTabList = [
    [
        'type' => 'divider',
        'text' => 'Gestión',
        'id' => 'alcaldia-gestion',
    ],
    'Case',
    'User',
    'Contact',
    'Account',
    'Document',
    'Template',
    [
        'type' => 'divider',
        'text' => 'Actividades',
        'id' => 'alcaldia-actividades',
    ],
    'Calendar',
    'Task',
    'Team',
];

$config->set('tabList', $globalTabList);
$config->set('navbar', 'side');
$config->save();

echo "tabList global actualizado (" . count($globalTabList) . " entradas).\n";

$scopes = [
    'Case',
    'User',
    'Contact',
    'Account',
    'Document',
    'Template',
    'Task',
    'Team',
    'Email',
    'Meeting',
    'Call',
    'ActaVisita',
    'ActuoArchivo',
];

$fullScope = static function (string $scope = ''): array {
    $ownActivityScopes = ['Task', 'Meeting', 'ComunicacionCaso'];

    if (in_array($scope, $ownActivityScopes, true)) {
        return [
            'create' => 'yes',
            'read' => 'own',
            'edit' => 'own',
            'delete' => 'no',
            'stream' => 'no',
        ];
    }

    $perms = [
        'create' => 'yes',
        'read' => 'all',
        'edit' => 'all',
        'delete' => 'yes',
        'stream' => 'all',
    ];

    if ($scope === 'Case') {
        $perms['alcaldiaProfile'] = 'yes';
        $perms['createDefaults'] = 'yes';
        $perms['buscarParte'] = 'yes';
        $perms['radicadoConsecutivo'] = 'yes';
        $perms['calendarEvents'] = 'yes';
        $perms['timeline'] = 'yes';
        $perms['cronograma'] = 'yes';
        $perms['panelesDetalle'] = 'yes';
        $perms['confirmarVisitaRealizada'] = 'yes';
    }

    return $perms;
};

$restrictedCaseRoles = [
    'Inspección',
    'Inspeccion',
    'Radicación',
    'Radicacion',
    'Asignación',
    'Asignacion',
    'Asignador',
    'Patrullaje',
    'Patrullero',
];

foreach ($em->getRDBRepository('Role')->find() as $role) {
    $name = (string) $role->get('name');

    if ($name === '') {
        continue;
    }

    $data = $role->get('data');

    if ($data instanceof stdClass) {
        $data = json_decode(json_encode($data), true);
    }

    if (!is_array($data)) {
        $data = [];
    }

    foreach ($scopes as $scope) {
        if ($scope === 'Case' && in_array($name, $restrictedCaseRoles, true)) {
            continue;
        }

        $data[$scope] = $fullScope($scope);
    }

    $data['Calendar'] = true;

    $role->set('data', $data);
    $role->set('tabList', null);
    $role->set('assignmentPermission', 'all');
    $role->set('userPermission', 'all');
    $role->set('messagePermission', 'all');
    $role->set('portalPermission', 'no');

    $em->saveEntity($role);

    echo "Rol {$name}: acceso completo en menú y entidades.\n";
}

foreach ($em->getRDBRepository('User')->where(['isActive' => true])->find() as $user) {
    $prefs = $em->getEntityById('Preferences', $user->getId());

    if (!$prefs) {
        continue;
    }

    $prefs->set('tabList', null);
    $prefs->set('useCustomTabList', false);
    $prefs->set('navbarIsCollapsed', false);
    $em->saveEntity($prefs);

    echo "Usuario {$user->get('userName')}: usa menú global.\n";
}

require_once __DIR__ . '/includes/deploy-rebuild.php';

echo "Listo. Cierra sesión y vuelve a entrar con cada usuario.\n";

if (getenv('ESPO_DEPLOY_BATCH') !== '1') {
    chdir('/var/www/html');
    passthru('php command.php rebuild');
}
