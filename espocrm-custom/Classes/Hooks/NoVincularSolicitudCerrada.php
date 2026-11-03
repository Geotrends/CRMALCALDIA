<?php

namespace Espo\Custom\Classes\Hooks;

use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Custom\Tools\CaseObj\CaseVencimientoHelper;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

/**
 * Una solicitud cerrada del todo (Finalizado / Proceso cerrado) no recibe nuevas gestiones,
 * intervenciones, visitas, actas ni seguimientos: ni creándolos ni cambiando su vínculo. La
 * solicitud se resuelve por el vínculo directo o subiendo por gestión, intervención, recomendación
 * o compromiso. Lo ya vinculado se puede seguir guardando.
 */
abstract class NoVincularSolicitudCerrada implements BeforeSave
{
    public static int $order = 3;

    /** Atributo de vínculo => entidad a la que apunta, en orden de prioridad. */
    private const VINCULOS = [
        'caseId' => 'Case',
        'gestionTecnicaId' => 'GestionTecnica',
        'intervencionTecnicaId' => 'IntervencionTecnica',
        'intervencionOrigenId' => 'IntervencionTecnica',
        'recomendacionTecnicaId' => 'RecomendacionTecnica',
        'compromisoId' => 'Compromiso',
    ];

    public function __construct(
        private EntityManager $entityManager
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        foreach (self::VINCULOS as $atributo => $tipo) {
            if (!$entity->hasAttribute($atributo) || !$entity->get($atributo)) {
                continue;
            }

            if (!$entity->isNew() && !$entity->isAttributeChanged($atributo)) {
                continue;
            }

            $case = $this->findCase($tipo, $entity->get($atributo));

            if ($case && CaseVencimientoHelper::isEstadoFinal($case->get('status'))) {
                throw new Forbidden(sprintf(
                    'La solicitud %s está cerrada (%s): no se le pueden vincular nuevos registros.',
                    $case->get('cNumeroRadicado') ?: $case->get('name'),
                    $case->get('status')
                ));
            }
        }
    }

    private function findCase(string $tipo, string $id, int $nivel = 0): ?Entity
    {
        $registro = $nivel < 5 ? $this->entityManager->getEntityById($tipo, $id) : null;

        if (!$registro || $tipo === 'Case') {
            return $registro;
        }

        foreach (self::VINCULOS as $atributo => $siguiente) {
            if ($registro->hasAttribute($atributo) && $registro->get($atributo)) {
                return $this->findCase($siguiente, $registro->get($atributo), $nivel + 1);
            }
        }

        return null;
    }
}
