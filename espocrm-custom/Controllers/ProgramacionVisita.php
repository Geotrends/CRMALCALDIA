<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Acl;
use Espo\Core\Api\Request;
use Espo\Core\Controllers\Record;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\NotFound;
use Espo\Core\InjectableFactory;
use Espo\Core\Record\CreateParamsFetcher;
use Espo\Core\Record\DeleteParamsFetcher;
use Espo\Core\Record\FindParamsFetcher;
use Espo\Core\Record\ReadParamsFetcher;
use Espo\Core\Record\SearchParamsFetcher;
use Espo\Core\Record\ServiceContainer as RecordServiceContainer;
use Espo\Core\Record\UpdateParamsFetcher;
use Espo\Core\Utils\Config;
use Espo\Custom\Hooks\ProgramacionVisita\ProtegerReprogramacion;
use Espo\Entities\User;
use Espo\ORM\EntityManager;

class ProgramacionVisita extends Record
{
    private const CAMPOS_REPROGRAMACION = [
        'fechaObjetivo',
        'fechaProgramada',
        'horaInicio',
        'horaFin',
        'motivoReprogramacion',
    ];

    public function __construct(
        SearchParamsFetcher $searchParamsFetcher,
        CreateParamsFetcher $createParamsFetcher,
        ReadParamsFetcher $readParamsFetcher,
        UpdateParamsFetcher $updateParamsFetcher,
        DeleteParamsFetcher $deleteParamsFetcher,
        RecordServiceContainer $recordServiceContainer,
        FindParamsFetcher $findParamsFetcher,
        Config $config,
        User $user,
        Acl $acl,
        InjectableFactory $injectableFactory,
        private EntityManager $entityManager
    ) {
        parent::__construct(
            $searchParamsFetcher,
            $createParamsFetcher,
            $readParamsFetcher,
            $updateParamsFetcher,
            $deleteParamsFetcher,
            $recordServiceContainer,
            $findParamsFetcher,
            $config,
            $user,
            $acl,
            $injectableFactory,
        );
    }

    /**
     * POST ProgramacionVisita/action/reprogramar  {id, fechaObjetivo, fechaProgramada, horaInicio,
     * horaFin, motivoReprogramacion}. Cambia las fechas y horas de la misma programación, que pasa
     * a tipo "Reprogramación" y estado "Reprogramada"; los valores anteriores quedan en la historia.
     *
     * @return array<string, mixed>
     */
    public function postActionReprogramar(Request $request): array
    {
        $body = (array) $request->getParsedBody();
        $id = trim((string) ($body['id'] ?? ''));

        if ($id === '') {
            throw new BadRequest('ID requerido.');
        }

        $programacion = $this->entityManager->getEntityById('ProgramacionVisita', $id);

        if (!$programacion) {
            throw new NotFound();
        }

        if (!$this->acl->checkEntityEdit($programacion)) {
            throw new Forbidden('No tiene permiso para reprogramar esta visita.');
        }

        if ($programacion->get('estado') === 'Cancelada') {
            throw new BadRequest('No se puede reprogramar una visita cancelada.');
        }

        $valores = [];

        foreach (self::CAMPOS_REPROGRAMACION as $campo) {
            $valor = trim((string) ($body[$campo] ?? ''));
            $valores[$campo] = $valor === '' ? null : $valor;
        }

        if ($valores['fechaProgramada'] === null) {
            throw new BadRequest('Indique la nueva fecha programada.');
        }

        if ($valores['motivoReprogramacion'] === null) {
            throw new BadRequest('Indique el motivo de la reprogramación.');
        }

        foreach (['fechaObjetivo', 'fechaProgramada'] as $campo) {
            if ($valores[$campo] !== null && !\DateTime::createFromFormat('!Y-m-d', $valores[$campo])) {
                throw new BadRequest('Fecha no válida.');
            }
        }

        $programacion->set($valores);
        $programacion->set([
            'tipoProgramacion' => 'Reprogramación',
            'estado' => 'Reprogramada',
        ]);

        $this->entityManager->saveEntity($programacion, [ProtegerReprogramacion::OPCION => true]);

        return (array) $programacion->getValueMap();
    }
}
