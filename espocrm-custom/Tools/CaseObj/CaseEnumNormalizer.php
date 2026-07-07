<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Utils\Metadata;
use Espo\ORM\Entity;

/**
 * Normaliza enums del Case antes de la validación del servidor.
 */
class CaseEnumNormalizer
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

    /** @var string[] */
    private const BARRIO_FIELDS = [
        'cBarrioPeticionario',
        'cBarrioPerjudicante',
    ];

    /** @var array<string, string> */
    private const BARRIO_ALIASES = [
        'Bosques de Zuñiga' => 'Bosques de Zúñiga',
        'Las Orquideas' => 'Las Orquídeas',
        'Milan- Vallejuelos' => 'Milán- Vallejuelos',
    ];

    public function __construct(
        private Metadata $metadata
    ) {}

    public function apply(Entity $entity): void
    {
        $barrioOptions = $this->getEnumOptions('cBarrioPeticionario');

        foreach (self::ENUM_FIELDS as $field) {
            if (!$entity->has($field)) {
                continue;
            }

            $value = trim((string) $entity->get($field));

            if ($value === '' || $value === self::PLACEHOLDER) {
                $entity->set($field, null);

                continue;
            }

            if (!in_array($field, self::BARRIO_FIELDS, true)) {
                continue;
            }

            $entity->set($field, $this->normalizeBarrio($value, $barrioOptions));
        }
    }

    /**
     * @param string[] $validOptions
     */
    public function normalizeBarrio(string $value, array $validOptions): ?string
    {
        $value = trim($value);

        if ($value === '' || $value === self::PLACEHOLDER) {
            return null;
        }

        if (isset(self::BARRIO_ALIASES[$value])) {
            $value = self::BARRIO_ALIASES[$value];
        }

        if (in_array($value, $validOptions, true)) {
            return $value;
        }

        foreach ($validOptions as $option) {
            if ($option === self::PLACEHOLDER) {
                continue;
            }

            if (mb_strtolower($option) === mb_strtolower($value)) {
                return $option;
            }
        }

        return null;
    }

    /**
     * @return string[]
     */
    private function getEnumOptions(string $field): array
    {
        $options = $this->metadata->get(['entityDefs', 'Case', 'fields', $field, 'options']);

        return is_array($options) ? $options : [];
    }
}
