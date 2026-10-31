<?php

namespace Espo\Custom\Classes\Select\CaseObj\AccessControlFilters;

use Espo\Modules\Crm\Classes\Select\Case\AccessControlFilters\Mandatory as BaseMandatory;

/**
 * Conserva los filtros nativos de acceso sin restringir Radicación por estado:
 * los casos radicados deben seguir disponibles para consulta histórica.
 */
class Mandatory extends BaseMandatory
{
}
