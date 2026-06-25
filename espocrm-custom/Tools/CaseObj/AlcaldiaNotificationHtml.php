<?php

namespace Espo\Custom\Tools\CaseObj;

/**
 * Enlaces HTML para mensajes de notificación en campana (EspoCRM).
 */
class AlcaldiaNotificationHtml
{
    public static function userLink(?string $userId, ?string $name): string
    {
        $label = self::text($name !== null && trim($name) !== '' ? $name : 'Usuario');

        if (!$userId) {
            return $label;
        }

        return '<a href="#User/view/' . rawurlencode($userId) . '">' . $label . '</a>';
    }

    public static function caseLink(?string $caseId, ?string $label): string
    {
        $text = self::text($label !== null && trim($label) !== '' ? $label : 'Caso');

        if (!$caseId) {
            return $text;
        }

        return '<a href="#Case/view/' . rawurlencode($caseId) . '">' . $text . '</a>';
    }

    public static function text(?string $value): string
    {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
    }
}
