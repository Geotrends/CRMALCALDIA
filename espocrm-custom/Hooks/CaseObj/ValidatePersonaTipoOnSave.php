<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\ORM\Entity;
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

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        $this->validatePeticionario($entity);
        $this->validatePerjudicante($entity);
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
            return;
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
}
