<?php

/**
 * Actualiza notificaciones de casos existentes para usar como referencia
 * el número de radicado (si ya está radicado) o el nombre del peticionario.
 *
 * Uso en Dokploy (contenedor espocrm):
 *   php /opt/bootstrap/repo/scripts/fix-notification-reference-labels.php
 *   ESPO_CONFIRM_FIX=1 php /opt/bootstrap/repo/scripts/fix-notification-reference-labels.php
 */

declare(strict_types=1);

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Custom\Tools\CaseObj\AlcaldiaNotificationHtml;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Custom\Tools\CaseObj\CaseVencimientoHelper;
use Espo\Entities\Notification;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$apply = trim((string) getenv('ESPO_CONFIRM_FIX')) === '1';

$notifications = $em->getRDBRepositoryByClass(Notification::class)
    ->where([
        'relatedType' => 'Case',
        'type' => Notification::TYPE_MESSAGE,
    ])
    ->find();

$scanned = 0;
$updated = 0;
$skipped = 0;

foreach ($notifications as $notification) {
    $scanned++;
    $relatedId = $notification->get('relatedId');

    if (!$relatedId) {
        $skipped++;
        continue;
    }

    /** @var Entity|null $case */
    $case = $em->getEntityById('Case', $relatedId);

    if (!$case) {
        $skipped++;
        continue;
    }

    $data = normalizeNotificationData($notification->get('data'));
    $oldLabel = (string) ($data['entityName'] ?? '');
    $newLabel = CasePartyNameHelper::getNotificationReferenceLabel($case);
    $numero = trim((string) $case->get('cNumeroRadicado'));
    $changed = false;

    if ($oldLabel !== $newLabel) {
        $data['entityName'] = $newLabel;
        $changed = true;
    }

    if ((string) ($data['cNumeroRadicado'] ?? '') !== $numero) {
        $data['cNumeroRadicado'] = $numero;
        $changed = true;
    }

    $legacyNumero = (string) ($data['numeroRadicacion'] ?? '');

    if ($legacyNumero === 'sin número' || $legacyNumero !== $numero) {
        $data['numeroRadicacion'] = $numero;
        $changed = true;
    }

    if (array_key_exists('expediente', $data)) {
        unset($data['expediente']);
        $changed = true;
    }

    $newMessage = rebuildNotificationMessage($case, $data, $newLabel);

    if ($newMessage !== null && (string) $notification->get('message') !== $newMessage) {
        $notification->set('message', $newMessage);
        $changed = true;
    }

    if (!$changed) {
        continue;
    }

    $updated++;

    if ($apply) {
        $notification->set('data', $data);
        $em->saveEntity($notification, ['skipAll' => true]);
        continue;
    }

    echo sprintf(
        "  [%s] \"%s\" -> \"%s\"\n",
        substr((string) $relatedId, 0, 8),
        $oldLabel !== '' ? $oldLabel : '(vacío)',
        $newLabel
    );
}

echo "\nEscaneadas: {$scanned}, a actualizar: {$updated}, omitidas: {$skipped}\n";

if (!$apply) {
    echo "Modo vista previa. Ejecute con ESPO_CONFIRM_FIX=1 para aplicar.\n";
} else {
    echo "Actualizadas: {$updated}\n";
}

/** @return array<string, mixed> */
function normalizeNotificationData(mixed $data): array
{
    if ($data instanceof \stdClass) {
        $data = json_decode(json_encode($data), true);
    }

    return is_array($data) ? $data : [];
}

/** @param array<string, mixed> $data */
function rebuildNotificationMessage(Entity $case, array $data, string $linkLabel): ?string
{
    if (!empty($data['isVencimientoAlert'])) {
        $alertTipo = (string) ($data['alertTipo'] ?? '');
        $fecha = (string) ($case->get('cFechaVencimiento') ?? $data['fechaVencimiento'] ?? '');
        $fechaLabel = AlcaldiaNotificationHtml::text(substr($fecha, 0, 10));
        $caseLink = AlcaldiaNotificationHtml::caseLink($case->getId(), $linkLabel);

        if ($alertTipo === CaseVencimientoHelper::ALERT_VENCIDO) {
            return 'El caso ' . $caseLink . ' está vencido (vencía ' . $fechaLabel . ')';
        }

        $dias = isset($data['diasRestantes'])
            ? (int) $data['diasRestantes']
            : CaseVencimientoHelper::diasRestantes($fecha);
        $diasLabel = $dias === 0 ? 'hoy' : ('en ' . $dias . ' día(s)');

        return 'El caso ' . $caseLink . ' vence ' . $diasLabel . ' (' . $fechaLabel . ')';
    }

    if (!empty($data['isFinalizadoAlert'])) {
        $userId = $data['userId'] ?? null;
        $userName = $data['userName'] ?? null;
        $actorHtml = $userId
            ? AlcaldiaNotificationHtml::userLink((string) $userId, (string) $userName)
            : 'El CRM';

        return $actorHtml . ' finalizó el caso '
            . AlcaldiaNotificationHtml::caseLink($case->getId(), $linkLabel);
    }

    return null;
}
