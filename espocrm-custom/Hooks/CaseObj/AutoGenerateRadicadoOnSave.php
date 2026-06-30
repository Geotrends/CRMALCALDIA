<?php

namespace Espo\Custom\Hooks\CaseObj;

use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Hook\Hook\BeforeSave;
use Espo\Core\InjectableFactory;
use Espo\Custom\Tools\CaseObj\RadicadoCatalog;
use Espo\Custom\Tools\CaseObj\RadicadoConsecutivoService;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use Espo\ORM\Repository\Option\SaveOptions;

class AutoGenerateRadicadoOnSave implements BeforeSave
{
    public static int $order = 0;

    public function __construct(
        private EntityManager $entityManager,
        private InjectableFactory $injectableFactory,
        private User $user
    ) {}

    public function beforeSave(Entity $entity, SaveOptions $options): void
    {
        if ($entity->isNew()) {
            return;
        }

        if (!$this->canEditRadicado($this->user)) {
            return;
        }

        $existingRadicado = trim((string) $entity->getFetched('cNumeroRadicado'));

        if ($existingRadicado !== '') {
            $metadataChanged = $entity->isAttributeChanged('cRadicadoSiglas')
                || $entity->isAttributeChanged('cRadicadoAnio')
                || $entity->isAttributeChanged('cRadicadoModo');

            if (!$metadataChanged) {
                return;
            }
        }

        $modo = trim((string) $entity->get('cRadicadoModo'));

        if ($modo === '') {
            $modo = RadicadoCatalog::MODO_AUTOMATICO;
            $entity->set('cRadicadoModo', $modo);
        }

        if (!RadicadoCatalog::isModoAutomatico($modo)) {
            return;
        }

        $fromRecurso = $this->resolveSiglasFromRecurso($entity);
        $siglas = strtoupper(trim((string) $entity->get('cRadicadoSiglas')));

        if ($fromRecurso !== null && $fromRecurso !== '') {
            $siglas = $fromRecurso;
        }

        if ($siglas === '') {
            throw new BadRequest('Seleccione el recurso/tema para generar el radicado.');
        }

        $anio = (int) $entity->get('cRadicadoAnio');

        if ($anio < 1900 || $anio > 9999) {
            $anio = (int) date('Y');
            $entity->set('cRadicadoAnio', (string) $anio);
        }

        if (!in_array($siglas, RadicadoCatalog::getSiglasList(), true)) {
            throw new BadRequest('Siglas de radicado no válidas.');
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
        ) {
            $consecutivo = $parsedCurrent['consecutivo'];
        } else {
            $consecutivo = $service->getNextConsecutivo($siglas, $anio, $excludeId);
        }

        $entity->set('cNumeroRadicado', RadicadoCatalog::buildRadicado($siglas, $consecutivo, $anio));
        $entity->set('cExpediente', $this->resolveExpediente($entity, $service, $anio, $excludeId));
    }

    private function resolveExpediente(
        Entity $entity,
        RadicadoConsecutivoService $service,
        int $anio,
        ?string $excludeId
    ): string {
        $manualExpediente = trim((string) $entity->get('cExpediente'));

        if ($manualExpediente !== '') {
            $parsed = RadicadoCatalog::parseExpediente($manualExpediente);

            if (!$parsed) {
                throw new BadRequest('Formato de expediente no válido. Use AÑO-NÚMERO (ej. 2026-1).');
            }

            return RadicadoCatalog::buildExpediente($parsed['anio'], $parsed['consecutivo']);
        }

        $expedienteConsecutivo = $service->getNextExpedienteConsecutivo($anio, $excludeId);

        return RadicadoCatalog::buildExpediente($anio, $expedienteConsecutivo);
    }

    private function resolveSiglasFromRecurso(Entity $entity): ?string
    {
        $recurso = trim((string) $entity->get('cRecursoTema'));

        if ($recurso === '') {
            return null;
        }

        return RadicadoCatalog::getSiglasForRecurso($recurso);
    }

    private function canEditRadicado(User $user): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        return $this->injectableFactory
            ->create(\Espo\Custom\Tools\User\AlcaldiaUserProfile::class)
            ->canEditRadicado($user);
    }
}
