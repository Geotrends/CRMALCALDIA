<?php

namespace Espo\ORM {
    class Entity {
        public function __construct(public array $values = []) {}
        public function get(string $key): mixed { return $this->values[$key] ?? null; }
    }
    class EntityManager {}
}
namespace Espo\Entities {
    class User extends \Espo\ORM\Entity {}
}
namespace Espo\Custom\Tools\User {
    class AlcaldiaUserProfile {}
}
namespace {
    use Espo\ORM\Entity;
    use Espo\Custom\Tools\CaseObj\CasePerjudicanteService;

    require $argv[1] ?? __DIR__ . '/../../espocrm-custom/Tools/CaseObj/CasePerjudicanteService.php';

    function verify(bool $condition, string $message): void {
        if (!$condition) { throw new \RuntimeException($message); }
        echo 'OK: ' . $message . "\n";
    }

    verify(CasePerjudicanteService::faltantes(new Entity([])) !== [], 'sin datos del perjudicante, falta todo');
    verify(CasePerjudicanteService::faltantes(new Entity(['cTipoPersonaPerjudicante' => 'No se conoce', 'cNombrePerjudicante' => 'X'])) !== [], '«No se conoce» no cuenta como perjudicante identificado');
    verify(CasePerjudicanteService::faltantes(new Entity(['cTipoPersonaPerjudicante' => 'Seleccione una opción'])) !== [], 'el marcador de selección no cuenta');
    verify(CasePerjudicanteService::faltantes(new Entity(['cTipoPersonaPerjudicante' => 'Persona natural', 'cNombrePerjudicante' => 'Ana'])) === ['el apellido'], 'persona natural sin apellido: falta el apellido');
    verify(CasePerjudicanteService::faltantes(new Entity(['cTipoPersonaPerjudicante' => 'Persona natural', 'cNombrePerjudicante' => 'Ana', 'cApellidoPerjudicante' => 'Ríos'])) === [], 'persona natural con nombre y apellido: completo');
    verify(CasePerjudicanteService::faltantes(new Entity(['cTipoPersonaPerjudicante' => 'Persona jurídica'])) === ['la razón social'], 'persona jurídica sin razón social');
    verify(CasePerjudicanteService::faltantes(new Entity(['cTipoPersonaPerjudicante' => 'Persona jurídica', 'cNombrePerjudicante' => 'ACME SAS'])) === [], 'persona jurídica con razón social: completo (no pide apellido)');
}
