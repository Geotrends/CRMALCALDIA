<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Custom\Tools\CaseObj\InfractorUnknownHelper;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Exige todos los campos del formato de solicitud antes de radicar.
 * Solo aplica a Inspección: Edwin (Radicación) radica sin revalidar todo el formulario.
 */
class ValidateSolicitudCompletaOnSave implements BeforeSave
{
    public static int $order = 6;

    private const PLACEHOLDER = 'Seleccione una opción';

    private const ROLE_INSPECCION = 'Inspección';
    private const ROLE_INSPECCION_ALT = 'Inspeccion';
    private const USER_INSPECCION = 'juan.inspeccion';

    /** @var array<string, string> */
    private const TEXT_FIELDS = [
        'cTelefonoPeticionario' => 'Indique el teléfono del peticionario.',
        'cDocumentoPerjudicante' => 'Indique el documento del perjudicante.',
        'cTelefonoPerjudicante' => 'Indique el teléfono del perjudicante.',
        'cRespuestaInmediata' => 'Indique la respuesta inmediata.',
        'description' => 'Indique la descripción de la queja.',
    ];

    /** @var array<string, string> */
    private const ENUM_FIELDS = [
        'cBarrioPeticionario' => 'Seleccione el barrio del peticionario.',
        'cZonaAlcaldiaPeticionario' => 'Seleccione la zona del peticionario.',
        'cCanalDeReportePeticionario' => 'Seleccione el canal de reporte.',
        'cBarrioPerjudicante' => 'Seleccione el barrio del perjudicante.',
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

    public function __construct(
        private User $user,
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipSolicitudValidation')) {
            return;
        }

        if (!$this->needsFullSolicitud($entity)) {
            return;
        }

        if (!$this->isInspeccionUser()) {
            return;
        }

        foreach (self::TEXT_FIELDS as $field => $message) {
            if ($this->shouldSkipInfractorField($entity, $field)) {
                continue;
            }

            $this->requireNonEmpty($entity, $field, $message);
        }

        foreach (self::ENUM_FIELDS as $field => $message) {
            if ($this->shouldSkipInfractorField($entity, $field)) {
                continue;
            }

            $this->requireEnum($entity, $field, $message);
        }

        foreach (self::LINK_FIELDS as $field => $message) {
            if (!$entity->get($field)) {
                throw new BadRequest($message);
            }
        }

        if (!InfractorUnknownHelper::isUnknown($entity) && !CasePartyNameHelper::hasPerjudicanteName($entity)) {
            throw new BadRequest('Indique el nombre o la razón social del perjudicante.');
        }
    }

    private function shouldSkipInfractorField(Entity $entity, string $field): bool
    {
        if (!InfractorUnknownHelper::isUnknown($entity)) {
            return false;
        }

        return in_array($field, InfractorUnknownHelper::SKIP_VALIDATION_FIELDS, true);
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
