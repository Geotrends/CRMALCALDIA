<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CaseRadicadoHelper;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Valida peticionario/perjudicante cuando Inspección edita la solicitud en casos radicados.
 * Radicación y Asignación no revalidan esos campos al radicar o asignar patrullero.
 */
class ValidatePersonaTipoOnSave implements BeforeSave
{
    public static int $order = 5;

    private const PERSONA_NATURAL = 'Persona natural';
    private const PERSONA_JURIDICA = 'Persona jurídica';
    private const NO_SE_CONOCE = 'No se conoce';
    private const PLACEHOLDER = 'Seleccione una opción';

    public function __construct(
        private User $user,
        private AlcaldiaUserProfile $profile
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (!CaseRadicadoHelper::isRadicadoCompleto($entity)) {
            return;
        }

        if ($this->user->isAdmin()) {
            $this->validatePeticionario($entity);
            $this->validatePerjudicante($entity);

            return;
        }

        if ($this->profile->isOperationalRadicacion($this->user)) {
            return;
        }

        if ($this->profile->resolveHomeProfile($this->user) === 'asignador') {
            return;
        }

        if ($this->profile->isPatrullero($this->user)) {
            return;
        }

        $this->validatePeticionario($entity);
        $this->validatePerjudicante($entity);
    }

    private function validatePeticionario(Entity $entity): void
    {
        $tipo = trim((string) $entity->get('cTipoPersonaPeticionario'));
        $nombre = trim((string) $entity->get('cNombrePeticionario'));
        $apellido = trim((string) $entity->get('cApellidoPeticionario'));
        $documento = trim((string) $entity->get('cDocumentoPeticionario'));

        if ($tipo === '' || $tipo === self::PLACEHOLDER) {
            throw new BadRequest('Seleccione el tipo de peticionario (persona natural o jurídica).');
        }

        if (!in_array($tipo, [self::PERSONA_NATURAL, self::PERSONA_JURIDICA], true)) {
            throw new BadRequest('Tipo de peticionario no válido.');
        }

        if ($tipo === self::PERSONA_JURIDICA) {
            if ($nombre === '') {
                throw new BadRequest('Indique la razón social del peticionario.');
            }
        } elseif ($nombre === '' || $apellido === '') {
            throw new BadRequest('Indique nombre y apellido del peticionario.');
        }

        if ($documento === '') {
            throw new BadRequest('Indique el documento del peticionario.');
        }
    }

    private function validatePerjudicante(Entity $entity): void
    {
        $tipo = trim((string) $entity->get('cTipoPersonaPerjudicante'));

        if ($tipo === '' || $tipo === self::PLACEHOLDER || $tipo === self::NO_SE_CONOCE) {
            return;
        }

        if (!in_array($tipo, [self::PERSONA_NATURAL, self::PERSONA_JURIDICA], true)) {
            throw new BadRequest('Tipo de perjudicante no válido.');
        }

        $nombre = trim((string) $entity->get('cNombrePerjudicante'));
        $apellido = trim((string) $entity->get('cApellidoPerjudicante'));

        if ($tipo === self::PERSONA_JURIDICA) {
            if ($nombre === '') {
                throw new BadRequest('Si registra datos del perjudicante, indique al menos la razón social.');
            }
        } elseif ($nombre === '' && $apellido === '') {
            throw new BadRequest('Si registra datos del perjudicante, indique al menos nombre y apellido.');
        }
    }
}
