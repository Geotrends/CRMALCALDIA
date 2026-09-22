<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\ORM\Entity;

/**
 * La radicación se formaliza con el número de radicado registrado manualmente.
 */
class CaseRadicadoHelper
{
    /** @var string[] Campos que identifican radicado persistido (no tocar enums de modo/siglas). */
    public const PERSISTED_FIELD_LIST = [
        'cNumeroRadicado',
    ];

    /** @var string[] Todos los campos de radicación (restaurar en edición restringida). */
    public const FIELD_LIST = [
        'cNumeroRadicado',
    ];

    public const STATUS_PENDIENTE_RADICACION = 'Pendiente de radicacion';

    public static function isRadicadoCompleto(Entity $entity): bool
    {
        return trim((string) $entity->get('cNumeroRadicado')) !== '';
    }

    public static function isPlaceholderExpediente(string $expediente): bool
    {
        $expediente = trim($expediente);

        return $expediente === '-' || $expediente === '—' || $expediente === '–';
    }

    public static function wasRadicadoCompleto(Entity $entity): bool
    {
        if ($entity->isNew()) {
            return false;
        }

        return trim((string) $entity->getFetched('cNumeroRadicado')) !== '';
    }

    public static function ensurePendienteRadicacionStatus(Entity $entity): void
    {
        $status = trim((string) $entity->get('status'));

        if ($status === '' || in_array($status, ['New', 'Pending', 'Assigned'], true)) {
            $entity->set('status', self::STATUS_PENDIENTE_RADICACION);
        }
    }

    public static function clearRadicadoFields(Entity $entity): void
    {
        foreach (self::PERSISTED_FIELD_LIST as $field) {
            $entity->set($field, null);
        }
    }

    public static function restoreRadicadoFromFetched(Entity $entity): void
    {
        if ($entity->isNew()) {
            return;
        }

        foreach (self::FIELD_LIST as $field) {
            if ($entity->isAttributeChanged($field)) {
                $entity->set($field, $entity->getFetched($field));
            }
        }
    }
}
