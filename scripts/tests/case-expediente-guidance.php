<?php

namespace Espo\ORM {
    class Entity {
        public function __construct(public array $values = []) {}
        public function get(string $key): mixed { return $this->values[$key] ?? null; }
        public function getId(): string { return $this->get('id') ?? 'case'; }
    }
    class EntityManager {
        public array $entities = [];
        public bool $respuestaFinal = false;
        public function getEntityById(string $type, string $id): ?Entity { return $this->entities[$type][$id] ?? null; }
        public function getRDBRepository(string $type): object {
            return new class($this->respuestaFinal) {
                public function __construct(private bool $exists) {}
                public function where(array $where): self { return $this; }
                public function findOne(): ?Entity { return $this->exists ? new Entity() : null; }
            };
        }
    }
}
namespace Espo\Entities {
    class User extends \Espo\ORM\Entity {
        public function isAdmin(): bool { return false; }
    }
}
namespace Espo\Custom\Tools\User {
    class AlcaldiaUserProfile {
        public const ROLE_AUX_INSPECCION = 'Auxiliar Administrativo · Inspección';
        public function canFirmarAutoInicio($u): bool { return $u->get('rol') === 'inspector'; }
        public function isJuridica($u): bool { return $u->get('rol') === 'juridica'; }
        public function isInspeccion($u): bool { return $u->get('rol') === 'inspeccion'; }
        public function getAssignedRoleNames($u): array { return []; }
        public function canDecidirApertura($u): bool { return $this->canFirmarAutoInicio($u); }
        public function canGestionarProceso($u): bool { return $this->canFirmarAutoInicio($u); }
    }
}
namespace Espo\Custom\Tools\CaseObj {
    class CaseProcesoLectura {
        public string $current = 'Audiencia pública';
        public string $phase = 'audiencia';
        public bool $archived = false;
        public array $audiences = [];
        public array $decision = [];
        public ?\Espo\ORM\Entity $suspension = null;
        public function archivado($e): bool { return $this->archived; }
        public function pasoActual($e): string { return $this->current; }
        public function audiencias($e): array { return $this->audiences; }
        public function fase($p, $a, $e): string { return $this->phase; }
        public function datosDecision($e): array { return $this->decision; }
        public function ultimaSuspension($a): ?\Espo\ORM\Entity { return $this->suspension; }
    }
    class CaseCumplimientoService {
        public array $state = [];
        public function estado($e): array { return $this->state; }
    }
}
namespace {
    use Espo\ORM\Entity;
    use Espo\ORM\EntityManager;
    use Espo\Entities\User;
    use Espo\Custom\Tools\CaseObj\CaseExpedienteGuidance;
    use Espo\Custom\Tools\CaseObj\CaseProcesoLectura;
    use Espo\Custom\Tools\CaseObj\CaseCumplimientoService;
    use Espo\Custom\Tools\User\AlcaldiaUserProfile;

    require $argv[1] ?? __DIR__ . '/../../espocrm-custom/Tools/CaseObj/CaseExpedienteGuidance.php';
    function verify(bool $condition, string $message): void {
        if (!$condition) throw new \RuntimeException($message);
        echo 'OK: ' . $message . "\n";
    }
    $em = new EntityManager(); $lectura = new CaseProcesoLectura(); $cumplimiento = new CaseCumplimientoService();
    $service = new CaseExpedienteGuidance($em, $lectura, $cumplimiento, new AlcaldiaUserProfile());
    $case = new Entity(['expedienteId' => 'exp', 'assignedUserName' => 'Profesional']);
    $em->entities['Expediente']['exp'] = new Entity(['assignedUserId' => 'inspector', 'assignedUserName' => 'Inspector Ambiental']);
    $inspector = new User(['id' => 'inspector', 'rol' => 'inspector']);
    $profesional = new User(['id' => 'profesional', 'rol' => 'profesional']);
    $apertura = ['aplica' => true, 'fase' => 'abierto'];
    verify($service->estado($case, $inspector, ['aplica' => false]) === null, 'los casos ordinarios conservan su flujo');
    $lectura->audiences = [new Entity(['assignedUserId' => 'juridica', 'assignedUserName' => 'Apoyo Jurídico', 'autoridadId' => 'inspector', 'autoridadName' => 'Inspector Ambiental'])];
    $r = $service->estado($case, $inspector, $apertura);
    verify($r['actor'] === 'Inspector Ambiental' && $r['mio'], 'la audiencia corresponde a su autoridad y no al profesional del caso');
    $lectura->phase = 'soporteCitacion';
    verify($service->estado($case, $profesional, $apertura)['actor'] === 'Apoyo Jurídico', 'el soporte de citación usa su responsable documental');
    $lectura->phase = 'soportePrueba';
    $lectura->suspension = new Entity(['assignedUserId' => 'profesional', 'assignedUserName' => 'Profesional de la prueba']);
    $r = $service->estado($case, $profesional, $apertura);
    verify($r['mio'] && $r['actor'] === 'Profesional de la prueba', 'la prueba delegada identifica a la persona designada');
    $lectura->phase = 'justificacion';
    verify($service->estado($case, $inspector, $apertura)['actor'] === 'Persona citada', 'esperar una justificación no asigna al inspector la tarea del citado');
    $lectura->suspension->values['justificacionDocumentoId'] = 'doc';
    verify($service->estado($case, $inspector, $apertura)['mio'], 'la justificación recibida pasa al inspector para su evaluación');
    foreach (['reposicion', 'apelacionRemitir', 'apelacionEspera', 'notificar', 'recursos', 'decision', 'archivo', 'reprogramar', 'soportes', 'cumplirPaso'] as $fase) {
        $lectura->phase = $fase;
        verify($service->estado($case, $inspector, $apertura)['accion'] !== '', 'acción definida para ' . $fase);
    }
    $lectura->phase = 'cumplimiento';
    $cumplimiento->state = ['orden' => ['id' => 'orden', 'cerrada' => false]];
    $em->entities['OrdenPolicia']['orden'] = new Entity(['assignedUserId' => 'profesional', 'assignedUserName' => 'Verificador']);
    verify($service->estado($case, $profesional, $apertura)['actor'] === 'Verificador', 'cumplimiento usa el responsable de la orden');
    $lectura->archived = true;
    $r = $service->estado($case, $inspector, $apertura);
    verify(str_contains($r['accion'], 'respuesta final') && $r['actor'] === 'Inspección', 'archivar no oculta la respuesta final pendiente');
    $em->respuestaFinal = true;
    verify($service->estado($case, $inspector, $apertura)['actor'] === 'Sin acciones pendientes', 'registrada la respuesta final se completa el seguimiento');
    $em->entities['AutoInicio']['auto'] = new Entity(['assignedUserName' => 'Jurídica', 'assignedUserId' => 'juridica', 'inspectorId' => 'inspector', 'inspectorName' => 'Inspector Ambiental']);
    $sinAuto = $service->estado($case, $inspector, ['aplica' => true, 'fase' => 'preparar']);
    verify($sinAuto['accion'] === 'Elaborar el Auto de Inicio', 'sin auto, la alerta es elaborarlo');
    $conAuto = $service->estado($case, $inspector, ['aplica' => true, 'fase' => 'preparar', 'auto' => ['id' => 'auto']]);
    verify($conAuto['accion'] === 'Enviar a firma el Auto de Inicio', 'con auto creado, la alerta es enviarlo a firma');
    verify(str_contains($conAuto['detalle'] ?? '', 'N.º de expediente'), 'sin N.º de expediente se avisa antes de enviar a firma');
    foreach (['preparar', 'devuelto', 'firma', 'decidir'] as $fase) {
        verify($service->estado($case, $inspector, ['aplica' => true, 'fase' => $fase, 'auto' => ['id' => 'auto']])['accion'] !== '', 'seguimiento de apertura: ' . $fase);
    }
}
