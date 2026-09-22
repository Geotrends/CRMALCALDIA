<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Acl;
use Espo\Core\Api\Request;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\InjectableFactory;
use Espo\Core\Record\CreateParamsFetcher;
use Espo\Core\Record\DeleteParamsFetcher;
use Espo\Core\Record\FindParamsFetcher;
use Espo\Core\Record\ReadParamsFetcher;
use Espo\Core\Record\SearchParamsFetcher;
use Espo\Core\Record\ServiceContainer as RecordServiceContainer;
use Espo\Core\Record\UpdateParamsFetcher;
use Espo\Core\Utils\Config;
use Espo\Custom\Tools\Party\PartyCasosService;
use Espo\Custom\Tools\Party\PartyExpedienteService;
use Espo\Entities\User;
use Espo\Modules\Crm\Controllers\Contact as BaseContact;
use Espo\ORM\EntityManager;

class Contact extends BaseContact
{
    /**
     * EspoCRM 10: `entityManager` ya no se inyecta como propiedad suelta;
     * se declara aquí (igual que en Controllers/CaseObj.php) y el resto de
     * dependencias se pasan al padre sin modificarlas.
     */
    public function __construct(
        SearchParamsFetcher $searchParamsFetcher,
        CreateParamsFetcher $createParamsFetcher,
        ReadParamsFetcher $readParamsFetcher,
        UpdateParamsFetcher $updateParamsFetcher,
        DeleteParamsFetcher $deleteParamsFetcher,
        RecordServiceContainer $recordServiceContainer,
        FindParamsFetcher $findParamsFetcher,
        Config $config,
        User $user,
        Acl $acl,
        InjectableFactory $injectableFactory,
        private EntityManager $entityManager
    ) {
        parent::__construct(
            $searchParamsFetcher,
            $createParamsFetcher,
            $readParamsFetcher,
            $updateParamsFetcher,
            $deleteParamsFetcher,
            $recordServiceContainer,
            $findParamsFetcher,
            $config,
            $user,
            $acl,
            $injectableFactory,
        );
    }

    /**
     * GET Contact/action/casosAsociados?contactId=...
     *
     * @return array<string, mixed>
     */
    public function getActionCasosAsociados(Request $request): array
    {
        if (!$this->acl->check('Contact', 'read')) {
            throw new Forbidden();
        }

        if (!$this->acl->check('Case', 'read')) {
            throw new Forbidden();
        }

        $contactId = trim((string) $request->getQueryParam('contactId'));

        if ($contactId === '') {
            throw new BadRequest('contactId requerido.');
        }

        if (!$this->entityManager->getEntityById('Contact', $contactId)) {
            throw new BadRequest('Persona natural no encontrada.');
        }

        $service = new PartyCasosService($this->entityManager);

        return $this->buildCaseListResponse($service->findCasosForContact($contactId));
    }

    /**
     * GET Contact/action/expediente?contactId=...
     *
     * @return array<string, mixed>
     */
    public function getActionExpediente(Request $request): array
    {
        if (!$this->acl->check('Contact', 'read')) {
            throw new Forbidden();
        }

        if (!$this->acl->check('Case', 'read')) {
            throw new Forbidden();
        }

        $contactId = trim((string) $request->getQueryParam('contactId'));

        if ($contactId === '') {
            throw new BadRequest('contactId requerido.');
        }

        if (!$this->entityManager->getEntityById('Contact', $contactId)) {
            throw new BadRequest('Persona natural no encontrada.');
        }

        $service = new PartyExpedienteService(
            $this->entityManager,
            new PartyCasosService($this->entityManager)
        );

        return $service->buildForContact(
            $contactId,
            fn ($entity) => $this->acl->checkEntityRead($entity),
            fn ($entity) => $this->acl->checkEntityRead($entity)
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function buildCaseListResponse(iterable $cases): array
    {
        $list = [];

        foreach ($cases as $case) {
            if (!$this->acl->checkEntityRead($case)) {
                continue;
            }

            $list[] = $case->getValueMap();
        }

        return [
            'total' => count($list),
            'list' => $list,
        ];
    }
}
