<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\ORM\Entity;

/**
 * Radicado válido = número y expediente con formato oficial (solo tras radicación).
 */
class CaseRadicadoHelper
{
    /** @var string[] Campos que identifican radicado persistido (no tocar enums de modo/siglas). */
    public const PERSISTED_FIELD_LIST = [
        'cNumeroRadicado',
        'cExpediente',
    ];

    /** @var string[] Todos los campos de radicación (restaurar en edición restringida). */
    public const FIELD_LIST = [
        'cNumeroRadicado',
        'cExpediente',
        'cRadicadoModo',
        'cRadicadoSiglas',
        'cRadicadoAnio',
    ];

    public const STATUS_PENDIENTE_RADICACION = 'Pendiente de radicacion';

    public static function isRadicadoCompleto(Entity $entity): bool
    {
        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $expediente = trim((string) $entity->get('cExpediente'));

        if ($numero === '' || $expediente === '') {
            return false;
        }

        if (self::isPlaceholderExpediente($expediente)) {
            return false;
        }

        return RadicadoCatalog::parseRadicado($numero) !== null
            && RadicadoCatalog::parseExpediente($expediente) !== null;
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

        $numero = trim((string) $entity->getFetched('cNumeroRadicado'));
        $expediente = trim((string) $entity->getFetched('cExpediente'));

        if ($numero === '' || $expediente === '') {
            return false;
        }

        if (self::isPlaceholderExpediente($expediente)) {
            return false;
        }

        return RadicadoCatalog::parseRadicado($numero) !== null
            && RadicadoCatalog::parseExpediente($expediente) !== null;
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
