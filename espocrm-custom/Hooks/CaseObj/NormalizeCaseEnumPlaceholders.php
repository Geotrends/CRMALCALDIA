<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\InfractorUnknownHelper;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

class NormalizeCaseEnumPlaceholders implements BeforeSave
{
    public const PLACEHOLDER = 'Seleccione una opción';

    private const ROLE_INSPECCION = 'Inspección';
    private const ROLE_INSPECCION_ALT = 'Inspeccion';
    private const USER_INSPECCION = 'juan.inspeccion';

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

    /** @var array<string, string> */
    private const REQUIRED_MESSAGES = [
        'cTipoPersonaPeticionario' => 'Seleccione el tipo de peticionario.',
        'cTipoPersonaPerjudicante' => 'Seleccione el tipo de perjudicante.',
        'cCanalDeReportePeticionario' => 'Seleccione el canal de reporte.',
        'cBarrioPeticionario' => 'Seleccione el barrio del peticionario.',
        'cZonaAlcaldiaPeticionario' => 'Seleccione la zona del peticionario.',
        'cBarrioPerjudicante' => 'Seleccione el barrio del perjudicante.',
        'cRecursoTema' => 'Seleccione el recurso / tema.',
        'cAsunto' => 'Seleccione el asunto.',
        'cUltimaActuacion' => 'Seleccione la última actuación.',
        'cProximaActuacion' => 'Seleccione la próxima actuación.',
    ];

    public static int $order = 2;

    public function __construct(
        private User $user,
        private EntityManager $entityManager
    ) {}

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
                if (!$this->isInspeccionUser()) {
                    continue;
                }

                if (InfractorUnknownHelper::isUnknown($entity)
                    && in_array($field, InfractorUnknownHelper::SKIP_VALIDATION_FIELDS, true)) {
                    continue;
                }

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

    private function isInspeccionUser(): bool
    {
        if ($this->user->isAdmin()) {
            return false;
        }

        if ($this->user->getUserName() === self::USER_INSPECCION) {
            return true;
        }

        foreach ([self::ROLE_INSPECCION, self::ROLE_INSPECCION_ALT] as $roleName) {
            $role = $this->entityManager
                ->getRDBRepositoryByClass(Role::class)
                ->where(['name' => $roleName])
                ->findOne();

            if (!$role) {
                continue;
            }

            $roles = $this->user->getLinkMultipleIdList('roles') ?? [];

            if (in_array($role->getId(), $roles, true)) {
                return true;
            }
        }

        return false;
    }
}
