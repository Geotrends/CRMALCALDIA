<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Valida tipo de persona y documento (cédula/NIT) antes de sincronizar Contacto/Cuenta.
 */
class ValidatePersonaTipoOnSave implements BeforeSave
{
    public static int $order = 5;

    private const PERSONA_NATURAL = 'Persona natural';
    private const PERSONA_JURIDICA = 'Persona jurídica';
    private const PLACEHOLDER = 'Seleccione una opción';
    private const ROLE_INSPECCION = 'Inspección';
    private const ROLE_INSPECCION_ALT = 'Inspeccion';
    private const USER_INSPECCION = 'juan.inspeccion';

    public function __construct(
        private User $user,
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($this->isInspeccionUser() || $this->user->isAdmin()) {
            $this->validatePeticionario($entity);
            $this->validatePerjudicante($entity);

            return;
        }

        if (!$this->needsFullSolicitud($entity)) {
            return;
        }
    }

    private function validatePeticionario(Entity $entity): void
    {
        $tipo = trim((string) $entity->get('cTipoPersonaPeticionario'));
        $nombre = trim((string) $entity->get('cPeticionario'));
        $documento = trim((string) $entity->get('cCedula'));

        if ($tipo === '' || $tipo === self::PLACEHOLDER) {
            throw new BadRequest('Seleccione el tipo de peticionario (persona natural o jurídica).');
        }

        if (!in_array($tipo, [self::PERSONA_NATURAL, self::PERSONA_JURIDICA], true)) {
            throw new BadRequest('Tipo de peticionario no válido.');
        }

        if ($nombre === '') {
            throw new BadRequest('Indique el nombre o la razón social del peticionario.');
        }

        if ($documento === '') {
            $label = $tipo === self::PERSONA_JURIDICA ? 'NIT' : 'cédula';

            throw new BadRequest('Indique la ' . $label . ' del peticionario.');
        }
    }

    private function validatePerjudicante(Entity $entity): void
    {
        $nombre = trim((string) $entity->get('cPerjudicante'));
        $documento = trim((string) $entity->get('cDocumentoPerjudicante'));
        $tipo = trim((string) $entity->get('cTipoPersonaPerjudicante'));

        if ($nombre === '' && $documento === '') {
            if (!$this->needsFullSolicitud($entity)) {
                return;
            }

            throw new BadRequest('Indique los datos del infractor.');
        }

        if ($tipo === '' || $tipo === self::PLACEHOLDER) {
            throw new BadRequest('Seleccione el tipo de infractor (persona natural o jurídica).');
        }

        if (!in_array($tipo, [self::PERSONA_NATURAL, self::PERSONA_JURIDICA], true)) {
            throw new BadRequest('Tipo de infractor no válido.');
        }

        if ($nombre === '') {
            throw new BadRequest('Indique el nombre o la razón social del infractor.');
        }

        if ($documento === '') {
            $label = $tipo === self::PERSONA_JURIDICA ? 'NIT' : 'cédula';

            throw new BadRequest('Indique la ' . $label . ' del infractor.');
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
