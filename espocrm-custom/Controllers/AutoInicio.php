<?php

namespace Espo\Custom\Controllers;

use Espo\Core\Acl;
use Espo\Core\Api\Request;
use Espo\Core\Controllers\Record;
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
use Espo\Custom\Tools\User\UserCargoResolver;
use Espo\Entities\User;

class AutoInicio extends Record
{
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
        private UserCargoResolver $cargoResolver
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
     * GET AutoInicio/action/cargoResponsable?userId=… Cargo del responsable elegido en el formulario
     * (el cliente no siempre puede leer el rol de otros usuarios).
     *
     * @return array{cargo: string}
     */
    public function getActionCargoResponsable(Request $request): array
    {
        if (!$this->acl->checkScope('AutoInicio', 'create') && !$this->acl->checkScope('AutoInicio', 'edit')) {
            throw new Forbidden();
        }

        $userId = trim((string) $request->getQueryParam('userId'));

        if ($userId === '') {
            throw new BadRequest('Responsable requerido.');
        }

        return ['cargo' => $this->cargoResolver->resolve($userId)];
    }
}
