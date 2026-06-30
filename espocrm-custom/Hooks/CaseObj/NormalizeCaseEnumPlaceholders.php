<?php

namespace Espo\Custom\Hooks\CaseObj;

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
        'cCanalDeReportePeticionario',
        'cBarrioPeticionario',
        'cBarrioPerjudicante',
        'cRecursoTema',
        'cAsunto',
        'cZonaAlcaldiaPeticionario',
        'cUltimaActuacion',
        'cProximaActuacion',
        'cRadicadoSiglas',
    ];

    public static int $order = 2;

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        foreach (self::ENUM_FIELDS as $field) {
            if (!$entity->has($field)) {
                continue;
            }

            $value = trim((string) $entity->get($field));

            if ($value === '' || $value === self::PLACEHOLDER) {
                $entity->set($field, null);
            }
        }
    }
}
