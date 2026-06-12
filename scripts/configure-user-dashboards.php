<?php

/**
 * Configura el Home (dashboard) por perfil de usuario.
 *
 * docker cp scripts/configure-user-dashboards.php espocrm:/tmp/configure-user-dashboards.php
 * docker exec espocrm php /tmp/configure-user-dashboards.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

function dashId(string $prefix): string
{
    return $prefix . substr(uniqid('', true), -7);
}

function casesLayout(): array
{
    return [
        'rows' => [
            [
                ['name' => 'cNumeroRadicado', 'link' => true],
                ['name' => 'cPeticionario'],
                ['name' => 'status'],
            ],
            [
                ['name' => 'cExpediente'],
                ['name' => 'assignedUser'],
                ['name' => 'cFechaCaso'],
            ],
        ],
    ];
}

function casesOptions(string $title, string $primaryFilter, int $displayRecords = 10): array
{
    return [
        'title' => $title,
        'autorefreshInterval' => 0,
        'displayRecords' => $displayRecords,
        'includeShared' => false,
        'orderBy' => 'cFechaCaso',
        'order' => 'desc',
        'searchData' => [
            'primary' => $primaryFilter,
            'bool' => (object) [],
        ],
        'expandedLayout' => casesLayout(),
    ];
}

function iframeOptions(string $title, string $url, ?int $cacheBuster = null): array
{
    $v = $cacheBuster ?? time();
    $separator = str_contains($url, '?') ? '&' : '?';

    return [
        'title' => $title,
        'url' => $url . $separator . 'v=' . $v,
        'autorefreshInterval' => 0,
    ];
}

function buildDashboard(array $widgets): array
{
    $layout = [];
    $options = [];
    $y = 0;

    foreach ($widgets as $widget) {
        $id = dashId($widget['prefix'] ?? 'w');
        $height = $widget['height'] ?? 2;

        $layout[] = [
            'id' => $id,
            'name' => $widget['name'],
            'x' => 0,
            'y' => $y,
            'width' => 2,
            'height' => $height,
        ];

        $options[$id] = $widget['options'];
        $y += $height;
    }

    return [
        'dashboardLayout' => [
            [
                'name' => 'My Espo',
                'layout' => $layout,
            ],
        ],
        'dashletsOptions' => $options,
    ];
}

function detectProfile(string $userName, bool $isAdmin, string $userType): string
{
    if ($isAdmin || $userType === 'admin') {
        return 'gestion';
    }

    if (str_starts_with($userName, 'patrullero')) {
        return 'patrullero';
    }

    return match ($userName) {
        'edwin.radicacion' => 'radicacion',
        'julian.asignador' => 'asignador',
        'juan.inspeccion' => 'gestion',
        default => 'gestion',
    };
}

function profileWidgets(string $profile, string $userId): array
{
    return match ($profile) {
        'radicacion' => [
            [
                'prefix' => 'tablero',
                'name' => 'Iframe',
                'height' => 9,
                'options' => iframeOptions('Tablero de control', '/client/custom/dashboard.html'),
            ],
            [
                'prefix' => 'casos',
                'name' => 'Cases',
                'height' => 4,
                'options' => casesOptions('Pendientes de radicación', 'pendienteRadicacion', 15),
            ],
        ],
        'asignador' => [
            [
                'prefix' => 'tablero',
                'name' => 'Iframe',
                'height' => 9,
                'options' => iframeOptions('Tablero de control', '/client/custom/dashboard.html'),
            ],
            [
                'prefix' => 'asignar',
                'name' => 'Cases',
                'height' => 3,
                'options' => casesOptions('Pendientes de asignación', 'pendienteAsignacion', 10),
            ],
            [
                'prefix' => 'seguimiento',
                'name' => 'Cases',
                'height' => 3,
                'options' => casesOptions('En seguimiento', 'enSeguimiento', 10),
            ],
        ],
        'patrullero' => [
            [
                'prefix' => 'tablero',
                'name' => 'Iframe',
                'height' => 4,
                'options' => iframeOptions(
                    'Mi tablero',
                    '/client/custom/dashboard.html?assignedUserId=' . rawurlencode($userId)
                ),
            ],
            [
                'prefix' => 'casos',
                'name' => 'Cases',
                'height' => 3,
                'options' => casesOptions('Mis casos asignados', 'misCasos', 15),
            ],
        ],
        default => [
            [
                'prefix' => 'tablero',
                'name' => 'Iframe',
                'height' => 9,
                'options' => iframeOptions('Tablero de control', '/client/custom/dashboard.html'),
            ],
            [
                'prefix' => 'casos',
                'name' => 'Cases',
                'height' => 3,
                'options' => casesOptions('Todos los casos', 'todos', 15),
            ],
            [
                'prefix' => 'seguimiento',
                'name' => 'Cases',
                'height' => 3,
                'options' => casesOptions('En seguimiento', 'enSeguimiento', 10),
            ],
        ],
    };
}

$users = $em->getRDBRepository('User')
    ->where([
        'type' => ['regular', 'admin'],
        'isActive' => true,
        'deleted' => false,
    ])
    ->find();

$unwantedDashlets = ['Memo', 'Records'];

$sanitizeDashboard = static function (array $dashboardLayout) use ($unwantedDashlets): array {
    foreach ($dashboardLayout as &$tab) {
        if (!isset($tab['layout']) || !is_array($tab['layout'])) {
            $tab['layout'] = [];
            continue;
        }

        $tab['layout'] = array_values(array_filter(
            $tab['layout'],
            static function ($item) use ($unwantedDashlets): bool {
                $name = is_array($item) ? ($item['name'] ?? '') : '';

                return !in_array($name, $unwantedDashlets, true);
            }
        ));
    }
    unset($tab);

    return $dashboardLayout;
};

$sanitizeDashletsOptions = static function (array $dashboardLayout, array $dashletsOptions): array {
    $allowedIds = [];

    foreach ($dashboardLayout as $tab) {
        foreach ($tab['layout'] ?? [] as $item) {
            if (!empty($item['id'])) {
                $allowedIds[$item['id']] = true;
            }
        }
    }

    return array_intersect_key($dashletsOptions, $allowedIds);
};

foreach ($users as $user) {
    $userName = (string) $user->get('userName');
    $profile = detectProfile($userName, (bool) $user->get('isAdmin'), (string) $user->get('type'));

    $prefs = $em->getEntityById('Preferences', $user->getId());

    if (!$prefs) {
        echo "Sin preferencias: {$userName}\n";
        continue;
    }

    $layout = json_decode(json_encode($prefs->get('dashboardLayout') ?: []), true);

    if (!is_array($layout) || $layout === []) {
        $layout = [
            [
                'name' => 'My Espo',
                'layout' => [],
            ],
        ];
    }

    $options = json_decode(json_encode($prefs->get('dashletsOptions') ?: new stdClass()), true);

    if (!is_array($options)) {
        $options = [];
    }

    $layout = $sanitizeDashboard($layout);
    $options = $sanitizeDashletsOptions($layout, $options);

    $prefs->set('dashboardLayout', $layout);
    $prefs->set('dashletsOptions', $options);
    $prefs->set('dashboardLocked', false);
    $em->saveEntity($prefs);

    echo "{$userName} → perfil {$profile} (sin Memo/Record List)\n";
}

$statePath = '/var/www/html/data/state.php';

if (is_readable($statePath)) {
    $state = include $statePath;
    $state['appTimestamp'] = time();
    $state['cacheTimestamp'] = time();
    $state['microtimeState'] = microtime(true);
    file_put_contents($statePath, "<?php\nreturn " . var_export($state, true) . ";\n");
    echo "appTimestamp actualizado.\n";
}

echo "Listo. Recarga el navegador (Cmd+Shift+R).\n";
