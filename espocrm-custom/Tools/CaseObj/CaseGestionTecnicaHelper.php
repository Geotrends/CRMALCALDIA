<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Crea/reabre y localiza la GestionTecnica vigente de un Case.
 *
 * El detalle fino de la gestión técnica (visitas, resultado, programación) vive en
 * GestionTecnica/ActaVisita; Case.status solo refleja el estado de cara al ciudadano
 * ("En gestión técnica" agrupa lo que antes eran "En proceso", "Visita realizada" y
 * "En proceso de otra visita").
 */
class CaseGestionTecnicaHelper
{
    public const ESTADO_SOLICITADA = 'Solicitada';
    public const ESTADO_ASIGNADA = 'Asignada';
    public const ESTADO_PROGRAMADA = 'Programada';
    public const ESTADO_EN_EJECUCION = 'En ejecución';
    public const ESTADO_RESULTADO_REGISTRADO = 'Resultado registrado';
    public const ESTADO_CERRADA = 'Cerrada';
    public const ESTADO_NO_REALIZADA = 'No realizada';
    public const ESTADO_REPROGRAMADA = 'Reprogramada';
    public const ESTADO_CANCELADA = 'Cancelada';

    /** @var string[] Estados que ya no cuentan como gestión técnica "abierta". */
    private const ESTADOS_CERRADOS = [
        self::ESTADO_CERRADA,
        self::ESTADO_NO_REALIZADA,
        self::ESTADO_CANCELADA,
    ];

    public static function isEstadoAbierto(string $estado): bool
    {
        return !in_array(trim($estado), self::ESTADOS_CERRADOS, true);
    }

    /**
     * Última GestionTecnica del caso cuyo estado no esté en Cerrada/No realizada/Cancelada.
     */
    public static function findOpenGestionTecnicaForCase(EntityManager $entityManager, string $caseId): ?Entity
    {
        if ($caseId === '') {
            return null;
        }

        $gestiones = $entityManager
            ->getRDBRepository('GestionTecnica')
            ->where(['caseId' => $caseId])
            ->order('createdAt', 'DESC')
            ->limit(0, 20)
            ->find();

        foreach ($gestiones as $gestionTecnica) {
            if (self::isEstadoAbierto((string) $gestionTecnica->get('estado'))) {
                return $gestionTecnica;
            }
        }

        return null;
    }

    public static function findLatestGestionTecnicaForCase(EntityManager $entityManager, string $caseId): ?Entity
    {
        if ($caseId === '') {
            return null;
        }

        return $entityManager
            ->getRDBRepository('GestionTecnica')
            ->where(['caseId' => $caseId])
            ->order('createdAt', 'DESC')
            ->findOne();
    }

    /**
     * Busca la GestionTecnica abierta del caso; si no existe, crea una nueva.
     * En ambos casos, le aplica el estado recibido y la persiste.
     */
    public static function openOrUpdateGestionTecnica(
        EntityManager $entityManager,
        string $caseId,
        string $estado
    ): Entity {
        $gestionTecnica = self::findOpenGestionTecnicaForCase($entityManager, $caseId);

        if (!$gestionTecnica) {
            $gestionTecnica = $entityManager->getNewEntity('GestionTecnica');
            $gestionTecnica->set([
                'caseId' => $caseId,
                'estado' => $estado,
                'fechaSolicitud' => date('Y-m-d H:i:s'),
            ]);
        } else {
            $gestionTecnica->set('estado', $estado);
        }

        $entityManager->saveEntity($gestionTecnica, ['skipAll' => true]);

        return $gestionTecnica;
    }

    /**
     * True si el caso ya tiene una GestionTecnica abierta en curso de una ronda
     * adicional de visita (preparada/solicitada) cuya acta aún no se diligenció.
     */
    public static function isPreparingNuevaVisita(EntityManager $entityManager, string $caseId): bool
    {
        $gestionTecnica = self::findOpenGestionTecnicaForCase($entityManager, $caseId);

        if (!$gestionTecnica) {
            return false;
        }

        return in_array(
            trim((string) $gestionTecnica->get('estado')),
            [self::ESTADO_EN_EJECUCION, self::ESTADO_REPROGRAMADA],
            true
        );
    }

    /**
     * Reabre (o crea) la GestionTecnica del caso para registrar una ronda adicional
     * de visita ("agregar visita"). Si ya existía una GestionTecnica previa cerrada
     * para el caso, la nueva queda como Reprogramada; si no existía ninguna, como
     * En ejecución.
     */
    public static function reopenOrCreateForNuevaVisita(EntityManager $entityManager, string $caseId): Entity
    {
        $gestionTecnica = self::findOpenGestionTecnicaForCase($entityManager, $caseId);

        if ($gestionTecnica) {
            $gestionTecnica->set('estado', self::ESTADO_EN_EJECUCION);
            $entityManager->saveEntity($gestionTecnica, ['skipAll' => true]);

            return $gestionTecnica;
        }

        $existiaCerrada = self::findLatestGestionTecnicaForCase($entityManager, $caseId) !== null;

        $gestionTecnica = $entityManager->getNewEntity('GestionTecnica');
        $gestionTecnica->set([
            'caseId' => $caseId,
            'estado' => $existiaCerrada ? self::ESTADO_REPROGRAMADA : self::ESTADO_EN_EJECUCION,
            'fechaSolicitud' => date('Y-m-d H:i:s'),
        ]);

        $entityManager->saveEntity($gestionTecnica, ['skipAll' => true]);

        return $gestionTecnica;
    }
}
