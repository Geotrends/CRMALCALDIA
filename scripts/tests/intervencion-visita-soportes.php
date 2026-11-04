<?php
namespace Espo\ORM {
    class Entity {
        public function __construct(public array $data) {}
        public function get(string $key): mixed { return $this->data[$key] ?? null; }
        public function set(string $key, mixed $value): void { $this->data[$key] = $value; }
        public function getId(): string { return 'intervencion'; }
        public function isNew(): bool { return false; }
        public function getFetched(string $key): mixed { return null; }
    }
    class EntityManager {
        public ?Entity $acta = null;
        public function getEntityById(string $type, string $id): Entity { return new Entity(['id' => 'programacion', 'estado' => 'Programada', 'fechaProgramada' => '2026-11-04']); }
        public function getRDBRepository(string $type): object {
            return new class($this->acta) {
                public function __construct(private ?Entity $acta) {}
                public function where($where): self { return $this; }
                public function order(...$args): self { return $this; }
                public function findOne(): ?Entity { return $this->acta; }
                public function count(): int { return $this->acta ? 1 : 0; }
            };
        }
    }
}
namespace Espo\Custom\Tools\App {
    class AlcaldiaDateTimeHelper { public static function storageDateString(): string { return '2026-11-04'; } }
}
namespace Espo\Custom\Tools\CaseObj {
    class CaseActaVisitaHelper { public static function hasActaFirmadaAdjunta($acta): bool { return (bool) $acta->get('firmada'); } }
}
namespace {
    require $argv[1] ?? __DIR__ . '/../../espocrm-custom/Tools/CaseObj/IntervencionVisitaEstado.php';
    $em = new Espo\ORM\EntityManager();
    $service = new Espo\Custom\Tools\CaseObj\IntervencionVisitaEstado($em);
    foreach ([
        ['sin soportes', false, false, 'Programada'],
        ['solo informe', true, false, 'Pendiente de soporte'],
        ['solo acta firmada', false, true, 'En revisión técnica'],
        ['ambos documentos', true, true, 'En revisión técnica'],
    ] as [$name, $informe, $acta, $expected]) {
        $em->acta = $acta ? new Espo\ORM\Entity(['firmada' => true]) : null;
        $i = new Espo\ORM\Entity(['tipo' => 'Visita', 'programacionVisitaId' => 'programacion', 'informeTecnicoDocumentoId' => $informe ? 'informe' : null]);
        $service->aplicar($i);
        if ($i->get('estado') !== $expected) throw new RuntimeException('Estado incorrecto: ' . $name);
        if (($informe || $acta) && !$i->get('fechaEjecucion')) throw new RuntimeException('Falta fecha de ejecución');
        echo 'OK: ' . $name . ' → ' . $expected . "\n";
    }
}
