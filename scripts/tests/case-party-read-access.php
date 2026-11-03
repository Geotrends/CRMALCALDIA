<?php

namespace Espo\ORM {
    class Entity {
        public function __construct(private array $attributes) {}
        public function get(string $name): mixed { return $this->attributes[$name] ?? null; }
        public function getId(): string { return $this->get('id'); }
    }
    class EntityManager {
        public function __construct(public array $cases) {}
        public function getRDBRepository(string $type): object {
            return new class($this->cases) {
                private array $where = [];
                public function __construct(private array $cases) {}
                public function where(array $where): self { $this->where = $where; return $this; }
                public function find(): array {
                    return array_filter($this->cases, fn ($case) => !isset($this->where['assignedUserId']) || $case->get('assignedUserId') === $this->where['assignedUserId']);
                }
            };
        }
    }
}
namespace Espo\Entities {
    class User extends \Espo\ORM\Entity {
        public function isAdmin(): bool { return (bool) $this->get('admin'); }
        public function isPortal(): bool { return (bool) $this->get('portal'); }
    }
}
namespace Espo\Core {
    class AclManager {
        public function check($user, $case, $action): bool { return $case->getId() !== 'unreadable'; }
    }
}
namespace Espo\Custom\Tools\User {
    class AlcaldiaUserProfile {
        public function getAssignedRoleNames($user): array { return $user->get('roles') ?? []; }
        public function isInspectorAmbiental($user): bool { return in_array('Inspector Ambiental', $this->getAssignedRoleNames($user), true); }
    }
}
namespace {
    use Espo\ORM\Entity;
    use Espo\Entities\User;
    use Espo\Custom\Tools\Party\CasePartyReadAccess;
    require $argv[1] ?? __DIR__ . '/../../espocrm-custom/Tools/Party/CasePartyReadAccess.php';
    $cases = [
        new Entity(['id' => 'own', 'assignedUserId' => 'pro', 'contactId' => 'peticionario', 'cPerjudicanteContactId' => 'perjudicante', 'accountId' => 'empresa', 'cPerjudicanteCuentaId' => 'empresa-infractora']),
        new Entity(['id' => 'other', 'assignedUserId' => 'other', 'contactId' => 'otra-persona', 'accountId' => 'otra-empresa']),
        new Entity(['id' => 'unreadable', 'assignedUserId' => 'pro', 'contactId' => 'oculto']),
    ];
    $access = new CasePartyReadAccess(new Espo\ORM\EntityManager($cases), new Espo\Custom\Tools\User\AlcaldiaUserProfile(), new Espo\Core\AclManager());
    $pro = new User(['id' => 'pro', 'roles' => ['Profesional Universitario']]);
    $inspector = new User(['id' => 'inspector', 'roles' => ['Inspector Ambiental']]);
    function verify(bool $ok, string $message): void { if (!$ok) throw new RuntimeException($message); echo "OK: $message\n"; }
    verify($access->restricted($pro) && $access->restricted($inspector), 'ambos roles se limitan por caso');
    verify($access->ids($pro, 'Contact') === ['peticionario', 'perjudicante'], 'el profesional ve ambas personas de su caso y excluye otros casos o casos sin lectura');
    verify($access->ids($pro, 'Account') === ['empresa', 'empresa-infractora'], 'incluye personas jurídicas vinculadas');
    verify($access->ids($inspector, 'Contact') === ['peticionario', 'perjudicante', 'otra-persona'], 'el inspector ve solo personas vinculadas a casos que puede leer');
    verify(!in_array('oculto', $access->ids($inspector, 'Contact'), true), 'no se expone una persona de un caso sin acceso');
    verify(!$access->restricted(new User(['id' => 'admin', 'admin' => true])), 'conserva acceso del administrador');
    verify(!$access->restricted(new User(['id' => 'director', 'roles' => ['Director Técnico']])), 'no cambia otros roles');
    verify(!$access->restricted(new User(['id' => 'mixed', 'roles' => ['Inspector Ambiental', 'Apoyo Jurídico']])), 'conserva permisos propios de roles adicionales');
}
