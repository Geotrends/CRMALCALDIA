<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Datos mínimos del perjudicante para poder abrir el Auto de Inicio y su registro posterior: si al crear
 * la solicitud no se conocían, se completan después y entonces se puede abrir el Auto.
 */
class CasePerjudicanteService
{
    public const PERSONA_NATURAL = 'Persona natural';
    public const PERSONA_JURIDICA = 'Persona jurídica';
    private const PLACEHOLDER = 'Seleccione una opción';
    private const TIPOS_DOCUMENTO = ['CC', 'CE', 'Pasaporte', 'PPT', 'NIT'];

    /** Campos que se pueden registrar desde el formulario del Auto de Inicio. */
    public const CAMPOS = [
        'cTipoPersonaPerjudicante',
        'cTipoDocumentoPerjudicante',
        'cDocumentoPerjudicante',
        'cNombrePerjudicante',
        'cApellidoPerjudicante',
        'cTelefonoPerjudicante',
        'cCorreoPerjudicante',
    ];

    public function __construct(
        private EntityManager $entityManager,
        private AlcaldiaUserProfile $profile
    ) {}

    /**
     * Qué falta para tener identificado al perjudicante (vacío = completo).
     *
     * @return string[]
     */
    public static function faltantes(Entity $case): array
    {
        $texto = static function (string $campo) use ($case): string {
            $valor = trim((string) $case->get($campo));

            return $valor === self::PLACEHOLDER ? '' : $valor;
        };
        $tipo = $texto('cTipoPersonaPerjudicante');
        $faltan = [];

        if (!in_array($tipo, [self::PERSONA_NATURAL, self::PERSONA_JURIDICA], true)) {
            return ['el tipo de persona (natural o jurídica)', 'el nombre'];
        }

        if ($texto('cNombrePerjudicante') === '') {
            $faltan[] = $tipo === self::PERSONA_JURIDICA ? 'la razón social' : 'el nombre';
        }

        if ($tipo === self::PERSONA_NATURAL && $texto('cApellidoPerjudicante') === '') {
            $faltan[] = 'el apellido';
        }

        return $faltan;
    }

    /**
     * @return array<string, mixed>
     */
    public function estado(Entity $case, User $user): array
    {
        $faltantes = self::faltantes($case);
        $datos = [];

        foreach (self::CAMPOS as $campo) {
            $valor = trim((string) $case->get($campo));
            $datos[$campo] = $valor === self::PLACEHOLDER ? '' : $valor;
        }

        return [
            'completo' => $faltantes === [],
            'faltantes' => $faltantes,
            'datos' => $datos,
            'puedeEditar' => $this->puedeEditar($user),
        ];
    }

    public function puedeEditar(User $user): bool
    {
        return $user->isAdmin()
            || $this->profile->canManageAutoInicio($user)
            || $this->profile->canFirmarAutoInicio($user)
            || $this->profile->isInspeccion($user);
    }

    /**
     * @param array<string, mixed> $data
     * @return array<string, mixed>
     */
    public function guardar(Entity $case, User $user, array $data): array
    {
        if (!$this->puedeEditar($user)) {
            throw new Forbidden('Solo Apoyo Jurídico, el Inspector o Inspección registran los datos del perjudicante.');
        }

        if (trim((string) $case->get('status')) === 'Proceso cerrado' || trim((string) $case->get('status')) === 'Finalizado') {
            throw new BadRequest('La solicitud está cerrada.');
        }

        $valores = [];

        foreach (self::CAMPOS as $campo) {
            $valores[$campo] = trim((string) ($data[$campo] ?? ''));
        }

        if (!in_array($valores['cTipoPersonaPerjudicante'], [self::PERSONA_NATURAL, self::PERSONA_JURIDICA], true)) {
            throw new BadRequest('Indique si el perjudicante es persona natural o jurídica.');
        }

        if ($valores['cNombrePerjudicante'] === '') {
            throw new BadRequest($valores['cTipoPersonaPerjudicante'] === self::PERSONA_JURIDICA ? 'Indique la razón social del perjudicante.' : 'Indique el nombre del perjudicante.');
        }

        if ($valores['cTipoPersonaPerjudicante'] === self::PERSONA_NATURAL && $valores['cApellidoPerjudicante'] === '') {
            throw new BadRequest('Indique el apellido del perjudicante.');
        }

        if ($valores['cTipoPersonaPerjudicante'] === self::PERSONA_JURIDICA) {
            $valores['cApellidoPerjudicante'] = '';
        }

        if ($valores['cTipoDocumentoPerjudicante'] !== '' && !in_array($valores['cTipoDocumentoPerjudicante'], self::TIPOS_DOCUMENTO, true)) {
            throw new BadRequest('Tipo de documento no válido.');
        }

        $case->set($valores);
        // Es una corrección acotada a estos campos: no pasa por los límites de edición por rol ni por la validación completa de las partes.
        $this->entityManager->saveEntity($case, ['skipAsignadorLimit' => true, 'skipPartyValidation' => true]);

        $nota = $this->entityManager->getNewEntity('Note');
        $nota->set([
            'type' => 'Post',
            'parentType' => 'Case',
            'parentId' => $case->getId(),
            'post' => 'Registró los datos del perjudicante: ' . trim($valores['cNombrePerjudicante'] . ' ' . $valores['cApellidoPerjudicante']) . '.',
        ]);
        $this->entityManager->saveEntity($nota);

        return ['success' => true];
    }
}
