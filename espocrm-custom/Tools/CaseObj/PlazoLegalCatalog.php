<?php

namespace Espo\Custom\Tools\CaseObj;

/**
 * Plazos de referencia (en días) por paso del caso, tomados de las tablas
 * "Flujos de trabajo y actividades del proceso" de los procedimientos
 * oficiales (IV-P-004 general; IV-P-028 y IV-P-021 para la rama jurídica).
 *
 * Son valores fijos por ahora — el mapeo de Case.status a un paso concreto
 * de un procedimiento es aproximado (los procedimientos no numeran sus
 * pasos igual que los estados del caso). Un módulo futuro para que un
 * administrador los configure debe reemplazar únicamente `getDiasForStatus`,
 * sin cambiar cómo lo consume CaseTimelineService.
 */
class PlazoLegalCatalog
{
    /** @var array<string, int> status del Case => días de referencia */
    private const DIAS_POR_STATUS = [
        // IV-P-004, paso 1 "Atender solicitud del usuario": 1 día.
        'Pendiente de radicacion' => 1,
        // IV-P-004, paso 2 "Recepción, selección y ordenamiento interno": 5 días (Radicación revisa antes de asignar).
        'Radicado' => 5,
        // IV-P-004, paso 3 "Realizar visita de inspección": 10 días.
        'Asignado' => 10,
        // IV-P-004, paso 4 "Elaboración de informe de visita": 10 días.
        CaseActaVisitaHelper::STATUS_EN_GESTION_TECNICA => 10,
        // IV-P-004, paso 5 / IV-P-028, IV-P-021 "Respuesta a peticionario": 15 a 30 días (se usa el mínimo).
        'Visita aprobada' => 15,
    ];

    public function getDiasForStatus(string $status, ?string $tipoTramite = null): ?int
    {
        return self::DIAS_POR_STATUS[trim($status)] ?? null;
    }
}
