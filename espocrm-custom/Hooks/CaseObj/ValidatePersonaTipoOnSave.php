<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CaseRadicadoHelper;
use Espo\ORM\Entity;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Valida campos del formato de solicitud (peticionario y perjudicante).
 * Solo aplica cuando el caso ya tiene radicado completo (fase de radicación).
 */
class ValidatePersonaTipoOnSave implements BeforeSave
{
    public static int $order = 5;

    private const PERSONA_NATURAL = 'Persona natural';
    private const PERSONA_JURIDICA = 'Persona jurídica';
    private const NO_SE_CONOCE = 'No se conoce';
    private const PLACEHOLDER = 'Seleccione una opción';

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (!CaseRadicadoHelper::isRadicadoCompleto($entity)) {
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

        if ($tipo === self::NO_SE_CONOCE) {
            return;
        }

        $nombre = trim((string) $entity->get('cNombrePerjudicante'));
        $apellido = trim((string) $entity->get('cApellidoPerjudicante'));
        $documento = trim((string) $entity->get('cDocumentoPerjudicante'));
        $telefono = trim((string) $entity->get('cTelefonoPerjudicante'));
        $direccion = trim((string) $entity->get('cDireccionPerjudicante'));
        $barrio = trim((string) $entity->get('cBarrioPerjudicante'));

        $hasAny = $nombre !== ''
            || $apellido !== ''
            || $documento !== ''
            || $telefono !== ''
            || $direccion !== ''
            || ($barrio !== '' && $barrio !== self::PLACEHOLDER);

        if (!$hasAny) {
            return;
        }

        if ($tipo === '' || $tipo === self::PLACEHOLDER) {
            throw new BadRequest('Seleccione el tipo de perjudicante (persona natural o jurídica).');
        }

        if (!in_array($tipo, [self::PERSONA_NATURAL, self::PERSONA_JURIDICA], true)) {
            throw new BadRequest('Tipo de perjudicante no válido.');
        }

        if ($tipo === self::PERSONA_JURIDICA) {
            if ($nombre === '') {
                throw new BadRequest('Si registra datos del perjudicante, indique al menos la razón social.');
            }
        } elseif ($nombre === '' && $apellido === '') {
            throw new BadRequest('Si registra datos del perjudicante, indique al menos nombre y apellido.');
        }
    }
}
