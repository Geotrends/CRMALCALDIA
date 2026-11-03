<?php

// Regression test without a database: php scripts/tests/case-registros-tramite-ordinario.php
namespace Espo\Core\Exceptions {
    class BadRequest extends \RuntimeException {}
}

namespace Espo\ORM {
    class Entity
    {
        public function __construct(private array $attributes = []) {}
        public function get(string $name): mixed { return $this->attributes[$name] ?? null; }
        public function getId(): string { return 'test-case'; }
    }

    class EntityManager
    {
        public function __construct(private array $records) {}
        public function getRDBRepository(string $type): object
        {
            return new class($this->records[$type] ?? []) {
                public function __construct(private array $records) {}
                public function select(array $fields): self { return $this; }
                public function where(array $where): self { return $this; }
                public function find(): array { return $this->records; }
            };
        }
    }
}

namespace {
    use Espo\Core\Exceptions\BadRequest;
    use Espo\Custom\Tools\CaseObj\CaseRegistrosTramiteOrdinario;
    use Espo\ORM\Entity;
    use Espo\ORM\EntityManager;

    require $argv[1] ?? __DIR__ . '/../../espocrm-custom/Tools/CaseObj/CaseRegistrosTramiteOrdinario.php';

    function expectBlocked(callable $action, string $missing): void
    {
        try {
            $action();
        } catch (BadRequest $e) {
            if (!str_contains($e->getMessage(), $missing)) {
                throw new \RuntimeException('Unexpected validation: ' . $e->getMessage());
            }
            return;
        }
        throw new \RuntimeException('Expected missing prerequisite: ' . $missing);
    }

    $case = new Entity(['cCompetencia' => 'Total']);
    $records = array_fill_keys(['GestionTecnica', 'IntervencionTecnica', 'ProgramacionVisita', 'ActaVisita'], [new Entity()]);
    $service = new CaseRegistrosTramiteOrdinario(new EntityManager($records));

    // The inspector can define the procedure with the visit records, before any evaluation.
    $service->exigir($case, 'definir el trámite', incluirEvaluacion: false);
    echo "OK: permite definir el trámite sin evaluación.\n";

    // Closing and the closing checklist retain the evaluation requirement.
    expectBlocked(fn () => $service->exigir($case, 'cerrarla'), 'Evaluación de resultado');
    $evaluation = array_values(array_filter($service->requisitos($case), fn ($r) => $r['key'] === 'evaluacionResultado'));
    if (count($evaluation) !== 1 || $evaluation[0]['ok'] !== false) {
        throw new \RuntimeException('La lista de cierre debe conservar la evaluación pendiente.');
    }
    echo "OK: cierre y lista de requisitos siguen exigiendo evaluación.\n";

    foreach (['GestionTecnica' => 'Gestión técnica', 'IntervencionTecnica' => 'Intervención técnica', 'ProgramacionVisita' => 'Programación de visita', 'ActaVisita' => 'Acta de visita'] as $type => $label) {
        $incomplete = $records;
        unset($incomplete[$type]);
        $check = new CaseRegistrosTramiteOrdinario(new EntityManager($incomplete));
        expectBlocked(fn () => $check->exigir($case, 'definir el trámite', incluirEvaluacion: false), $label);
    }
    echo "OK: conserva los requisitos previos de gestión, intervención, programación y acta.\n";

    $records['EvaluacionResultado'] = [new Entity()];
    (new CaseRegistrosTramiteOrdinario(new EntityManager($records)))->exigir($case, 'cerrarla');
    $service->exigir(new Entity(['cCompetencia' => 'Ninguna']), 'cerrarla');
    echo "OK: permite cierre con evaluación y conserva la excepción sin competencia.\n";
}
