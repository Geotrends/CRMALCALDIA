<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Record\Input\Data;
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
        'Bosques de Zúñiga' => 'Bosques de Zuñiga',
        'Las Orquideas' => 'Las Orquídeas',
        'Las Orquídeas' => 'Las Orquideas',
        'Milan- Vallejuelos' => 'Milán- Vallejuelos',
        'Milán- Vallejuelos' => 'Milan- Vallejuelos',
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

            $normalized = $this->normalizeFieldValue($field, (string) $entity->get($field), $barrioOptions);

            if ($normalized === null) {
                $entity->clear($field);

                continue;
            }

            $entity->set($field, $normalized);
        }
    }

    public function applyToInput(Data $data): void
    {
        $barrioOptions = $this->getEnumOptions('cBarrioPeticionario');

        foreach (self::ENUM_FIELDS as $field) {
            if (!$data->has($field)) {
                continue;
            }

            $normalized = $this->normalizeFieldValue($field, (string) $data->get($field), $barrioOptions);

            if ($normalized === null) {
                $data->clear($field);

                continue;
            }

            $data->set($field, $normalized);
        }
    }

    /**
     * @param string[] $barrioOptions
     */
    private function normalizeFieldValue(string $field, string $value, array $barrioOptions): ?string
    {
        $value = trim($value);

        if ($value === '' || $value === self::PLACEHOLDER) {
            return null;
        }

        if (in_array($field, self::BARRIO_FIELDS, true)) {
            return $this->normalizeBarrio($value, $barrioOptions);
        }

        return $this->normalizeEnumValue($field, $value);
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

        $needle = $this->normalizeKey($value);

        foreach ($validOptions as $option) {
            if ($option === self::PLACEHOLDER) {
                continue;
            }

            if ($this->normalizeKey((string) $option) === $needle) {
                return $option;
            }
        }

        return null;
    }

    private function normalizeEnumValue(string $field, string $value): ?string
    {
        $options = $this->getEnumOptions($field);

        if ($options === []) {
            return $value;
        }

        if (in_array($value, $options, true)) {
            return $value;
        }

        $needle = $this->normalizeKey($value);

        foreach ($options as $option) {
            if ($option === self::PLACEHOLDER) {
                continue;
            }

            if ($this->normalizeKey((string) $option) === $needle) {
                return $option;
            }
        }

        return null;
    }

    private function normalizeKey(string $value): string
    {
        $value = mb_strtolower(trim($value));

        return strtr($value, [
            'á' => 'a',
            'é' => 'e',
            'í' => 'i',
            'ó' => 'o',
            'ú' => 'u',
            'ñ' => 'n',
            'ü' => 'u',
        ]);
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
