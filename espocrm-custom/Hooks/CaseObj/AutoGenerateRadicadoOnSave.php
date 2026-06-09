<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Core\InjectableFactory;
use Espo\Custom\Tools\CaseObj\RadicadoCatalog;
use Espo\Custom\Tools\CaseObj\RadicadoConsecutivoService;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

class AutoGenerateRadicadoOnSave implements BeforeSave
{
    public static int $order = 5;

    public function __construct(
        private EntityManager $entityManager,
        private InjectableFactory $injectableFactory,
        private User $user
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if (!$this->canEditRadicado($this->user)) {
            return;
        }

        $modo = trim((string) $entity->get('cRadicadoModo'));

        if ($modo === '') {
            $modo = RadicadoCatalog::MODO_AUTOMATICO;
            $entity->set('cRadicadoModo', $modo);
        }

        if (!RadicadoCatalog::isModoAutomatico($modo)) {
            return;
        }

        $siglas = strtoupper(trim((string) $entity->get('cRadicadoSiglas')));
        $anio = (int) $entity->get('cRadicadoAnio');

        if ($siglas === '') {
            $siglas = $this->resolveSiglasFromCategoria($entity) ?? '';
        }

        if ($siglas === '') {
            throw BadRequest::create('Seleccione las siglas de categoría para generar el radicado.');
        }

        if ($anio < 1900 || $anio > 9999) {
            $anio = (int) date('Y');
            $entity->set('cRadicadoAnio', (string) $anio);
        }

        if (!in_array($siglas, RadicadoCatalog::getSiglasList(), true)) {
            throw BadRequest::create('Siglas de radicado no válidas.');
        }

        $entity->set('cRadicadoSiglas', $siglas);

        $service = $this->injectableFactory->create(RadicadoConsecutivoService::class);
        $excludeId = $entity->isNew() ? null : $entity->getId();

        $currentRadicado = trim((string) $entity->get('cNumeroRadicado'));
        $parsedCurrent = RadicadoCatalog::parseRadicado($currentRadicado);

        if (
            $parsedCurrent
            && $parsedCurrent['siglas'] === $siglas
            && $parsedCurrent['anio'] === $anio
            && !$entity->isAttributeChanged('cRadicadoSiglas')
            && !$entity->isAttributeChanged('cRadicadoAnio')
            && !$entity->isNew()
        ) {
            $consecutivo = $parsedCurrent['consecutivo'];
        } else {
            $consecutivo = $service->getNextConsecutivo($siglas, $anio, $excludeId);
        }

        $entity->set('cNumeroRadicado', RadicadoCatalog::buildRadicado($siglas, $consecutivo, $anio));
        $entity->set('cExpediente', RadicadoCatalog::buildExpediente($anio, $consecutivo));
    }

    private function resolveSiglasFromCategoria(Entity $entity): ?string
    {
        $categorias = $entity->get('cCategoria');

        if (!is_array($categorias)) {
            $categorias = array_filter([trim((string) $categorias)]);
        }

        foreach ($categorias as $categoria) {
            $siglas = RadicadoCatalog::getSiglasForCategoria((string) $categoria);

            if ($siglas) {
                return $siglas;
            }
        }

        return null;
    }

    private function canEditRadicado(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($user->getUserName() === 'edwin.radicacion') {
            return true;
        }

        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => 'Radicación'])
            ->findOne();

        if (!$role) {
            return false;
        }

        $roles = $user->getLinkMultipleIdList('roles') ?? [];

        return in_array($role->getId(), $roles, true);
    }
}
