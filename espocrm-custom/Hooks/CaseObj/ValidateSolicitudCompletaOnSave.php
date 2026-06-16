<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Exige todos los campos del formato de solicitud antes de radicar
 * (misma información que los casos ya registrados).
 */
class ValidateSolicitudCompletaOnSave implements BeforeSave
{
    public static int $order = 6;

    private const PLACEHOLDER = 'Seleccione una opción';

    /** @var array<string, string> */
    private const TEXT_FIELDS = [
        'cDireccion' => 'Indique la dirección del peticionario.',
        'cTelefono' => 'Indique el teléfono del peticionario.',
        'cCorreo' => 'Indique el correo electrónico del peticionario.',
        'cPerjudicante' => 'Indique el nombre o razón social del infractor.',
        'cDocumentoPerjudicante' => 'Indique la cédula o NIT del infractor.',
        'cTelefonoPerjudicante' => 'Indique el teléfono del infractor.',
        'cDireccionPerjudicante' => 'Indique la dirección del infractor.',
        'cRespuestaInmediata' => 'Indique la respuesta inmediata.',
        'description' => 'Indique la descripción de la queja.',
    ];

    /** @var array<string, string> */
    private const ENUM_FIELDS = [
        'cBarrio' => 'Seleccione el barrio del peticionario.',
        'cZonaAlcaldia' => 'Seleccione la zona del peticionario.',
        'cCanalDeReporte' => 'Seleccione el canal de reporte.',
        'cBarrioPerjudicante' => 'Seleccione el barrio del infractor.',
        'cRecursoTema' => 'Seleccione el recurso / tema.',
        'cAsunto' => 'Seleccione el asunto.',
        'cUltimaActuacion' => 'Seleccione la última actuación.',
        'cProximaActuacion' => 'Seleccione la próxima actuación.',
    ];

    /** @var array<string, string> */
    private const LINK_FIELDS = [
        'cRecibidaPorId' => 'Indique quién recibió la solicitud.',
        'cRemitidoAId' => 'Indique a quién se remitió la solicitud.',
    ];

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipSolicitudValidation')) {
            return;
        }

        if (!$this->needsFullSolicitud($entity)) {
            return;
        }

        foreach (self::TEXT_FIELDS as $field => $message) {
            $this->requireNonEmpty($entity, $field, $message);
        }

        foreach (self::ENUM_FIELDS as $field => $message) {
            $this->requireEnum($entity, $field, $message);
        }

        foreach (self::LINK_FIELDS as $field => $message) {
            if (!$entity->get($field)) {
                throw new BadRequest($message);
            }
        }
    }

    private function needsFullSolicitud(Entity $entity): bool
    {
        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $expediente = trim((string) $entity->get('cExpediente'));

        return $numero === '' || $expediente === '';
    }

    private function requireNonEmpty(Entity $entity, string $field, string $message): void
    {
        if (trim((string) $entity->get($field)) === '') {
            throw new BadRequest($message);
        }
    }

    private function requireEnum(Entity $entity, string $field, string $message): void
    {
        $value = trim((string) $entity->get($field));

        if ($value === '' || $value === self::PLACEHOLDER) {
            throw new BadRequest($message);
        }
    }
}
