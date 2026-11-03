<?php

namespace Espo\Custom\Hooks\Audiencia;

use DateTimeImmutable;
use DateTimeZone;
use Espo\Core\Hook\Hook\AfterSave;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * La historia del Auto de Inicio recoge lo que pasa con las citaciones del expediente: cuándo se
 * programa cada audiencia, si cambia de fecha u hora, si se suspende o reprograma, y cuándo se
 * genera la citación y se registra su entrega.
 */
class RegistrarHistorialEnAuto implements AfterSave
{
    public static int $order = 60;

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function afterSave(Entity $entity, SaveOptions $options): void
    {
        if ($options->get('skipAll')) {
            return;
        }

        try {
            $this->run($entity);
        } catch (\Throwable) {
            // No bloquear el guardado de la audiencia por fallos de historial.
        }
    }

    private function run(Entity $audiencia): void
    {
        $auto = $this->findAuto($audiencia);

        if (!$auto) {
            return;
        }

        $n = 'la audiencia N.º ' . (int) $audiencia->get('numero');

        if ($audiencia->isNew()) {
            $this->nota($auto, 'Programó ' . $n . ' para el ' . $this->fecha((string) $audiencia->get('fechaInicio'))
                . ($audiencia->get('autoInicioId') ? ' (fecha tentativa fijada en el Auto de Inicio).' : '.'));

            return;
        }

        if ($audiencia->isAttributeChanged('fechaInicio')) {
            $this->nota($auto, 'Cambió la fecha de ' . $n . ': del ' . $this->fecha((string) $audiencia->getFetched('fechaInicio'))
                . ' al ' . $this->fecha((string) $audiencia->get('fechaInicio')) . '.');
        }

        if ($audiencia->isAttributeChanged('estado')) {
            $this->nota($auto, ucfirst($n) . ' pasó a «' . $audiencia->get('estado') . '».');
        }

        if ($audiencia->isAttributeChanged('citacionDocumentoId') && $audiencia->get('citacionDocumentoId')) {
            $medio = trim((string) $audiencia->get('citacionMedio'));

            $this->nota($auto, 'Generó la citación de ' . $n . ($medio !== '' ? ' (medio: ' . $medio . ')' : '') . '.');
        }

        if ($audiencia->isAttributeChanged('citacionSoporteId') && $audiencia->get('citacionSoporteId')) {
            $this->nota($auto, 'Registró la entrega de la citación de ' . $n . ' y cargó su soporte.');
        }
    }

    private function findAuto(Entity $audiencia): ?Entity
    {
        if ($audiencia->get('autoInicioId')) {
            return $this->entityManager->getEntityById('AutoInicio', $audiencia->get('autoInicioId'));
        }

        if (!$audiencia->get('expedienteId')) {
            return null;
        }

        return $this->entityManager->getRDBRepository('AutoInicio')
            ->where(['expedienteId' => $audiencia->get('expedienteId')])
            ->order('createdAt', 'DESC')
            ->findOne();
    }

    private function fecha(string $utc): string
    {
        if ($utc === '') {
            return 'sin fecha';
        }

        return (new DateTimeImmutable($utc, new DateTimeZone('UTC')))
            ->setTimezone(new DateTimeZone('America/Bogota'))
            ->format('d/m/Y H:i');
    }

    private function nota(Entity $auto, string $texto): void
    {
        $nota = $this->entityManager->getNewEntity('Note');
        $nota->set(['type' => 'Post', 'parentType' => 'AutoInicio', 'parentId' => $auto->getId(), 'post' => $texto]);
        $this->entityManager->saveEntity($nota);
    }
}
