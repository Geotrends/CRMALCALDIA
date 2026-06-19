<?php
/**
 * Restaura tabList global del CRM (menú lateral).
 * Sin esto, EspoCRM solo muestra "Inicio" en el sidebar.
 */
require '/var/www/html/bootstrap.php';

$app = new Espo\Core\Application();
$app->setupSystemUser();

$config = $app->getContainer()->getByClass(Espo\Core\Utils\Config::class);

$tabList = [
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

$config->set('tabList', $tabList);
$config->set('navbar', 'side');
$config->set('baseCurrency', $config->get('baseCurrency') ?: 'COP');
$config->save();

$em = $app->getContainer()->getByClass(Espo\ORM\EntityManager::class);

foreach ($em->getRDBRepository('User')->where(['isActive' => true])->find() as $user) {
    $prefs = $em->getEntityById('Preferences', $user->getId());
    if (!$prefs) {
        continue;
    }
    $prefs->set('tabList', null);
    $prefs->set('useCustomTabList', false);
    $prefs->set('navbarIsCollapsed', false);
    $em->saveEntity($prefs);
    echo $user->get('userName') . " → usa tabList global\n";
}

echo "tabList global configurado (" . count($tabList) . " entradas).\n";
