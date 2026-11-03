<?php

namespace Espo\Custom\Tools\CaseObj;

use DateTimeImmutable;
use DateTimeZone;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Deja en la pestaña Comunicaciones de la solicitud el registro de cada comunicación del proceso
 * con los involucrados (citaciones, notificaciones, oficios), con su tipo, destinatario y contenido.
 */
class CaseComunicacionRegistrar
{
    public const TIPO_CITACION = 'Citación';
    public const TIPO_NOTIFICACION = 'Notificación al infractor';
    public const TIPO_OFICIO = 'Oficio';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function registrar(string $caseId, string $tipo, string $destinatario, string $asunto, string $contenido): void
    {
        if ($caseId === '' || !$this->entityManager->getEntityById('Case', $caseId)) {
            return;
        }

        $comunicacion = $this->entityManager->getNewEntity('ComunicacionCaso');
        $comunicacion->set([
            'caseId' => $caseId,
            'tipo' => $tipo,
            'destinatario' => $destinatario,
            'asunto' => mb_substr($asunto, 0, 255),
            'contenido' => $contenido,
        ]);
        $this->entityManager->saveEntity($comunicacion);
    }

    /**
     * @return string[] ids de las solicitudes que comparten el expediente
     */
    public function casosDelExpediente(string $expedienteId): array
    {
        if ($expedienteId === '') {
            return [];
        }

        $ids = [];

        foreach ($this->entityManager->getRDBRepository('Case')->where(['expedienteId' => $expedienteId])->find() as $case) {
            $ids[] = $case->getId();
        }

        return $ids;
    }

    /** Presunto infractor de la solicitud, que es a quien se dirigen las citaciones y notificaciones. */
    public function citado(Entity $case): string
    {
        $nombre = trim((string) $case->get('cNombrePerjudicante') . ' ' . (string) $case->get('cApellidoPerjudicante'));

        return $nombre !== '' && $nombre !== 'Seleccione una opción' ? $nombre : 'Presunto infractor';
    }

    /** Fecha y hora local (Bogotá) de un valor UTC. */
    public function fechaHora(?string $utc): string
    {
        if (!$utc) {
            return 'sin fecha';
        }

        return (new DateTimeImmutable($utc, new DateTimeZone('UTC')))
            ->setTimezone(new DateTimeZone('America/Bogota'))
            ->format('d/m/Y H:i');
    }
}
