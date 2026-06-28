<?php

namespace Espo\Custom\Classes\Record\CaseObj;

use Espo\Core\Record\Input\Data;
use Espo\Core\Record\Input\Filter;
use Espo\Custom\Tools\CaseObj\InfractorUnknownHelper;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
use Espo\Entities\User;

class CreateInputFilter implements Filter
{
    /** @var string[] */
    private const RADICADO_FIELDS = [
        'cNumeroRadicado',
        'cExpediente',
        'cRadicadoModo',
        'cRadicadoSiglas',
        'cRadicadoAnio',
    ];

    public function __construct(
        private User $user,
        private AlcaldiaUserProfile $profile
    ) {}

    public function filter(Data $data): void
    {
        self::clearInfractorUnknownFields($data);
        $this->clearRadicadoFieldsForGestionUser($data);
    }

    public static function apply(Data $data): void
    {
        self::clearInfractorUnknownFields($data);
    }

    private function clearRadicadoFieldsForGestionUser(Data $data): void
    {
        if ($this->user->isAdmin() || $this->profile->isOperationalRadicacion($this->user)) {
            return;
        }

        foreach (self::RADICADO_FIELDS as $field) {
            if ($data->has($field)) {
                $data->clear($field);
            }
        }
    }

    private static function clearInfractorUnknownFields(Data $data): void
    {
        if (!$data->has('cTipoPersonaPerjudicante')) {
            return;
        }

        if (trim((string) $data->get('cTipoPersonaPerjudicante')) !== InfractorUnknownHelper::NO_SE_CONOCE) {
            return;
        }

        foreach (InfractorUnknownHelper::CLEAR_FIELDS as $field) {
            if ($data->has($field)) {
                $data->clear($field);
            }
        }

        foreach ([
            'cPerjudicanteContactId',
            'cPerjudicanteContactName',
            'cPerjudicanteCuentaId',
            'cPerjudicanteCuentaName',
        ] as $field) {
            if ($data->has($field)) {
                $data->clear($field);
            }
        }
    }
}
