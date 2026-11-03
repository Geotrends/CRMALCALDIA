<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/** Seguimiento de la actuación concreta del expediente, sin cambiar estados ni requisitos. */
class CaseExpedienteGuidance
{
    public function __construct(
        private EntityManager $entityManager,
        private CaseProcesoLectura $lectura,
        private CaseCumplimientoService $cumplimiento,
        private AlcaldiaUserProfile $profile
    ) {}

    public function estado(Entity $case, User $user, array $apertura): ?array
    {
        if (empty($apertura['aplica'])) {
            return null;
        }

        $inspector = $this->profile->canFirmarAutoInicio($user);
        $juridica = $user->isAdmin() || $this->profile->isJuridica($user);
        $inspeccion = $user->isAdmin() || $this->profile->isInspeccion($user)
            || in_array(AlcaldiaUserProfile::ROLE_AUX_INSPECCION, $this->profile->getAssignedRoleNames($user), true);

        // Con un responsable concreto se identifica a esa persona, no al asignado del caso.
        $paso = function (string $estado, string $accion, string $rol, bool $puede, ?Entity $responsable = null, string $campo = 'assignedUser') use ($user): array {
            $id = $responsable?->get($campo . 'Id');
            $nombre = $responsable?->get($campo . 'Name');
            if ($id && !$nombre) {
                $nombre = $this->entityManager->getEntityById('User', $id)?->get('name');
            }
            return ['estado' => $estado, 'accion' => $accion, 'actor' => $nombre ?: $rol,
                'mio' => $id ? $id === $user->getId() : $puede];
        };

        $fase = $apertura['fase'] ?? '';
        if ($fase === 'decidir') {
            return $paso('Apertura por definir', 'Seleccionar la ruta y crear o vincular el expediente',
                'Inspector Ambiental, Director Técnico o Apoyo Jurídico', $this->profile->canDecidirApertura($user));
        }

        $expediente = $this->entityManager->getEntityById('Expediente', $case->get('expedienteId'));
        if (!$expediente) {
            return null;
        }

        if ($fase !== 'abierto') {
            $autoId = $apertura['auto']['id'] ?? null;
            $auto = $autoId ? $this->entityManager->getEntityById('AutoInicio', $autoId) : null;
            if ($fase === 'firma') {
                // Quien firma es el Inspector Ambiental: el responsable del Auto solo se nombra si realmente puede firmar
                // (por defecto es quien lo elaboró, p. ej. Apoyo Jurídico, y a esa persona ya no le toca).
                $responsableId = $auto?->get('inspectorId');
                $responsable = $responsableId ? $this->entityManager->getEntityById('User', $responsableId) : null;
                $firma = $responsable && $this->profile->canFirmarAutoInicio($responsable) ? $auto : null;

                return $paso('Auto de Inicio pendiente de firma', 'Cargar el Auto de Inicio firmado', 'Inspector Ambiental', $inspector, $firma, 'inspector');
            }
            if ($fase === 'devuelto') {
                return $paso('Auto de Inicio devuelto', 'Corregir el Auto de Inicio y enviarlo nuevamente a firma', 'Apoyo Jurídico', $juridica, $auto);
            }
            // Dos alertas seguidas: primero elaborar el Auto; ya creado, enviarlo a firma.
            if (!$auto) {
                // Sin los datos del perjudicante no hay Auto de Inicio: primero se registran.
                if (!empty($apertura['perjudicante']) && empty($apertura['perjudicante']['completo'])) {
                    $alerta = $paso('Expediente en preparación', 'Registrar los datos del perjudicante', 'Apoyo Jurídico', $juridica);
                    $alerta['detalle'] = 'Sin ellos no se puede crear el Auto de Inicio. Falta: ' . implode(', ', (array) ($apertura['perjudicante']['faltantes'] ?? [])) . '.';

                    return $alerta;
                }

                return $paso('Expediente en preparación', 'Elaborar el Auto de Inicio', 'Apoyo Jurídico', $juridica);
            }
            $alerta = $paso('Auto de Inicio elaborado', 'Enviar a firma el Auto de Inicio', 'Apoyo Jurídico', $juridica, $auto);
            if (!trim((string) $expediente->get('numeroOficial'))) {
                $alerta['detalle'] = 'Antes de enviarlo, registre el N.º de expediente en «Apertura de expediente».';
            }
            return $alerta;
        }

        if ($this->lectura->archivado($expediente)) {
            $respuesta = $this->entityManager->getRDBRepository('ComunicacionCaso')
                ->where(['caseId' => $case->getId(), 'esRespuestaFinal' => true])->findOne();
            return $respuesta
                ? $paso('Expediente archivado · Solicitud finalizada', 'Ninguna: expediente archivado y respuesta final registrada', 'Sin acciones pendientes', false)
                : $paso('Expediente archivado · Respuesta final pendiente de registrar', 'Registrar la respuesta final al peticionario en Comunicaciones', 'Inspección', $inspeccion);
        }

        $actual = $this->lectura->pasoActual($expediente);
        $audiencias = $this->lectura->audiencias($expediente);
        $audiencia = $audiencias ? end($audiencias) : null;
        $fase = $this->lectura->fase($actual, $audiencia, $expediente);
        $datos = $this->lectura->datosDecision($expediente);

        if ($fase === 'citar' || $fase === 'soporteCitacion') {
            return $paso($actual, $fase === 'citar' ? 'Programar la audiencia y generar la citación' : 'Registrar la entrega de la citación y adjuntar su soporte',
                'Apoyo Jurídico o auxiliar de Inspección', $juridica || $inspeccion, $audiencia);
        }
        if ($fase === 'audiencia') {
            return $paso($actual, 'Celebrar la audiencia y registrar su resultado', 'Inspector Ambiental', $inspector, $audiencia, 'autoridad');
        }
        if ($fase === 'soportes') {
            return $paso('Audiencia realizada · Soportes pendientes', 'Adjuntar el acta, la grabación y los soportes pendientes',
                'Responsable documental de la audiencia', $juridica || $inspeccion, $audiencia);
        }
        if (in_array($fase, ['justificacion', 'soportePrueba', 'reprogramar'], true)) {
            $suspension = $audiencia ? $this->lectura->ultimaSuspension($audiencia) : null;
            if ($fase === 'justificacion') {
                $recibida = (bool) $suspension?->get('justificacionDocumentoId');
                $etapa = $paso('Audiencia suspendida · Justificación', $recibida ? 'Evaluar la justificación recibida' : 'Esperar la justificación de la inasistencia',
                    $recibida ? 'Inspector Ambiental' : 'Persona citada', $recibida && $inspector,
                    $recibida ? $audiencia : null, 'autoridad');
                $etapa['detalle'] = 'Fecha límite: ' . ($suspension?->get('fechaLimiteJustificacion') ?: 'por definir');
                return $etapa;
            }
            return $fase === 'soportePrueba'
                ? $paso('Audiencia suspendida · Prueba pendiente', 'Elaborar y adjuntar el soporte de la prueba solicitada', 'Responsable de la prueba', false, $suspension)
                : $paso('Audiencia suspendida · Reprogramación', 'Reprogramar la audiencia y registrar la nueva citación', 'Inspector Ambiental / apoyo de Inspección', $inspector || $inspeccion, $audiencia);
        }
        if ($fase === 'decision') {
            return $paso($actual, !empty($datos['borradorId']) ? 'Revisar y adjuntar la decisión de fondo firmada' : 'Preparar la decisión de fondo',
                'Inspector Ambiental', $inspector, $expediente);
        }
        if (in_array($fase, ['notificar', 'recursos', 'reposicion', 'apelacionRemitir', 'apelacionEspera'], true)) {
            $acciones = ['notificar' => 'Registrar la notificación y adjuntar su soporte', 'recursos' => 'Registrar los recursos o la firmeza de la decisión',
                'reposicion' => 'Resolver el recurso de reposición', 'apelacionRemitir' => 'Remitir la apelación a segunda instancia',
                'apelacionEspera' => 'Esperar la decisión de segunda instancia'];
            if ($fase === 'apelacionEspera') {
                return $paso($actual, $acciones[$fase], $datos['recursos']['autoridad'] ?? 'Autoridad de segunda instancia', false);
            }
            $notificacionId = $datos['notificacion']['notificacionActoId'] ?? null;
            $notificacion = $notificacionId ? $this->entityManager->getEntityById('NotificacionActo', $notificacionId) : null;
            return $paso($actual, $acciones[$fase], $fase === 'reposicion' ? 'Inspector Ambiental' : 'Apoyo Jurídico o auxiliar de Inspección',
                $fase === 'reposicion' ? $inspector : $juridica || $inspeccion,
                $fase === 'reposicion' ? $expediente : $notificacion);
        }
        if ($fase === 'cumplimiento') {
            $estado = $this->cumplimiento->estado($expediente);
            if (!empty($estado['orden']) && empty($estado['orden']['cerrada'])) {
                $orden = $this->entityManager->getEntityById('OrdenPolicia', $estado['orden']['id']);
                return $paso($actual, 'Registrar o verificar el cumplimiento de la orden de Policía', 'Responsable de la orden', false, $orden);
            }
            return $paso($actual, 'Completar el cumplimiento de las medidas y los soportes o reportes pendientes', 'Responsable del expediente', $inspector, $expediente);
        }
        if ($fase === 'archivo') {
            return $paso('Archivo pendiente', empty($datos['archivo']['formatoId']) ? 'Generar el Auto de Archivo' : 'Revisar y cargar el Auto de Archivo firmado',
                empty($datos['archivo']['formatoId']) ? 'Apoyo Jurídico / Inspector Ambiental' : 'Inspector Ambiental', $inspector || $juridica, $expediente);
        }
        // Cada ruta conserva sus propios pasos; no se fuerza el recorrido del PVA.
        return $paso($actual, 'Completar «' . $actual . '» y registrar sus soportes', 'Responsable del expediente', $this->profile->canGestionarProceso($user), $expediente);
    }
}
