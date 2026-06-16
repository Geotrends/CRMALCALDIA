<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

class NormalizeCaseEnumPlaceholders implements BeforeSave
{
    public const PLACEHOLDER = 'Seleccione una opción';

    /** @var string[] */
    private const ENUM_FIELDS = [
        'cTipoPersonaPeticionario',
        'cTipoPersonaPerjudicante',
        'cCanalDeReporte',
        'cBarrio',
        'cBarrioPerjudicante',
        'cRecursoTema',
        'cAsunto',
        'cZonaAlcaldia',
        'cUltimaActuacion',
        'cProximaActuacion',
        'cRadicadoSiglas',
    ];

    /** @var array<string, string> */
    private const REQUIRED_MESSAGES = [
        'cTipoPersonaPeticionario' => 'Seleccione el tipo de peticionario.',
        'cTipoPersonaPerjudicante' => 'Seleccione el tipo de infractor.',
        'cCanalDeReporte' => 'Seleccione el canal de reporte.',
        'cBarrio' => 'Seleccione el barrio del peticionario.',
        'cZonaAlcaldia' => 'Seleccione la zona del peticionario.',
        'cBarrioPerjudicante' => 'Seleccione el barrio del infractor.',
        'cRecursoTema' => 'Seleccione el recurso / tema.',
        'cAsunto' => 'Seleccione el asunto.',
        'cUltimaActuacion' => 'Seleccione la última actuación.',
        'cProximaActuacion' => 'Seleccione la próxima actuación.',
    ];

    public static int $order = 1;

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        foreach (self::ENUM_FIELDS as $field) {
            if (!$entity->has($field)) {
                continue;
            }

            $value = trim((string) $entity->get($field));

            if ($value === '' || $value === self::PLACEHOLDER) {
                $entity->set($field, null);
                $value = '';
            }

            if ($value === '' && isset(self::REQUIRED_MESSAGES[$field]) && $this->needsFullSolicitud($entity)) {
                throw new BadRequest(self::REQUIRED_MESSAGES[$field]);
            }
        }
    }

    private function needsFullSolicitud(Entity $entity): bool
    {
        $numero = trim((string) $entity->get('cNumeroRadicado'));
        $expediente = trim((string) $entity->get('cExpediente'));

        return $numero === '' || $expediente === '';
    }
}
