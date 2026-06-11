<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Utils\Config;
use Espo\Core\Utils\DateTime as DateTimeUtil;
use Espo\Core\Utils\Log;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Un solo Excel maestro (casos-solicitud.xlsx): una fila por caso.
 */
class CrmRegistroExcelExporter
{
    public const EXPORT_FILENAME = 'casos-solicitud.xlsx';

    private const SOLICITUD_FIELDS = [
        'cFechaCaso',
        'cNumeroRadicado',
        'cExpediente',
        'cPeticionario',
        'cCedula',
        'cDireccion',
        'cTelefono',
        'cBarrio',
        'cCorreo',
        'cCanalDeReporte',
        'cRecursoTema',
        'cAsunto',
        'cZonaAlcaldia',
        'cFechaVencimiento',
        'cUltimaActuacion',
        'cProximaActuacion',
        'cPerjudicante',
        'cDocumentoPerjudicante',
        'cTelefonoPerjudicante',
        'cDireccionPerjudicante',
        'cBarrioPerjudicante',
        'description',
        'cRespuestaInmediata',
        'cRecibidaPor',
        'cRemitidoA',
        'assignedUser',
    ];

    private const ACTA_FIELDS = [
        'fechaVisita',
        'fecha',
        'autorizacionDatos',
        'posibleAfectante',
        'direccionAfectacion',
        'telefono',
        'barrio',
        'zona',
        'objetoVisita',
        'situacionEncontrada',
        'analisisSituacion',
        'conclusion',
        'requerimientos',
        'funcionarioNombre',
        'funcionarioCedula',
        'funcionarioCargo',
        'establecimientoNombre',
        'establecimientoCedula',
        'establecimientoCargo',
    ];

    public function __construct(
        private EntityManager $entityManager,
        private Config $config,
        private Log $log
    ) {}

    public function exportCase(Entity $case): bool
    {
        if (!$case->getId() || !$this->isPostRadicado($case)) {
            return false;
        }

        $fields = [];

        foreach (self::SOLICITUD_FIELDS as $code) {
            $fields[$code] = $this->resolveCaseField($case, $code);
        }

        $internalOk = $this->runUpsert($case->getId(), $fields);

        $alcaldiaOk = (new ExcelAlcaldiaExporter(
            $this->entityManager,
            $this->config,
            $this->log
        ))->exportCase($case);

        return $internalOk || $alcaldiaOk;
    }

    public function exportActa(Entity $acta): bool
    {
        $caseId = $acta->get('caseId');

        if (!$caseId) {
            return false;
        }

        /** @var ?Entity $case */
        $case = $this->entityManager->getEntityById('Case', $caseId);

        if ($case && $this->isPostRadicado($case)) {
            $this->exportCase($case);
        }

        $fields = [];

        foreach (self::ACTA_FIELDS as $code) {
            $fields[$code] = $this->resolveActaField($acta, $code);
        }

        return $this->runUpsert($caseId, $fields);
    }

    public function isPostRadicado(Entity $case): bool
    {
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));

        return $numero !== '' && $expediente !== '';
    }

    public function getExcelPath(): string
    {
        $dataPath = $this->config->get('dataPath') ?? '/var/www/html/data';

        return rtrim($dataPath, '/') . '/exports/' . self::EXPORT_FILENAME;
    }

    /**
     * @param array<string, string> $fields
     */
    private function runUpsert(string $caseId, array $fields): bool
    {
        try {
            $scriptPath = realpath(__DIR__ . '/../../files/scripts/upsert-crm-excel.py') ?: '';

            if (!is_readable($scriptPath)) {
                throw new \RuntimeException('No se encontró upsert-crm-excel.py.');
            }

            $excelPath = $this->getExcelPath();

            $process = proc_open(
                ['python3', $scriptPath, $excelPath],
                [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
                $pipes
            );

            if (!is_resource($process)) {
                throw new \RuntimeException('No se pudo ejecutar upsert-crm-excel.py.');
            }

            fwrite($pipes[0], json_encode(['id' => $caseId, 'fields' => $fields], JSON_UNESCAPED_UNICODE));
            fclose($pipes[0]);

            $stdout = stream_get_contents($pipes[1]);
            fclose($pipes[1]);
            $stderr = stream_get_contents($pipes[2]);
            fclose($pipes[2]);

            if (proc_close($process) !== 0 || !is_file($excelPath)) {
                throw new \RuntimeException(trim($stdout . "\n" . $stderr) ?: 'Error al escribir Excel.');
            }

            @chmod($excelPath, 0660);

            return true;
        } catch (\Throwable $e) {
            $this->log->error('Export Excel registro CRM: {message}', [
                'message' => $e->getMessage(),
                'caseId' => $caseId,
            ]);

            return false;
        }
    }

    private function resolveCaseField(Entity $case, string $code): string
    {
        return match ($code) {
            'cFechaCaso' => $this->formatDateTime($case->get('cFechaCaso')),
            'cFechaVencimiento' => $this->formatDate($case->get('cFechaVencimiento')),
            'cRecibidaPor', 'cRemitidoA', 'assignedUser' => $this->resolveCaseUserName($case, $code),
            'cRecursoTema', 'cAsunto', 'cZonaAlcaldia', 'cUltimaActuacion', 'cProximaActuacion', 'cCanalDeReporte', 'cBarrio', 'cBarrioPerjudicante' => $this->cleanEnum($case->get($code)),
            default => trim((string) $case->get($code)),
        };
    }

    private function resolveActaField(Entity $acta, string $code): string
    {
        return match ($code) {
            'fechaVisita' => $this->formatDate($acta->get('fechaVisita')),
            'fecha' => $this->formatDate($acta->get('fecha')),
            'autorizacionDatos' => $acta->get('autorizacionDatos') ? 'Sí' : 'No',
            default => trim((string) $acta->get($code)),
        };
    }

    private function resolveCaseUserName(Entity $case, string $field): string
    {
        $linkField = $field === 'assignedUser' ? 'assignedUserId' : $field . 'Id';
        $userId = $case->get($linkField);

        if (!$userId) {
            return trim((string) $case->get($field . 'Name'));
        }

        $user = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

        return $user ? trim((string) $user->get('name')) : '';
    }

    private function formatDateTime(mixed $value): string
    {
        if (!$value) {
            return '';
        }

        $timezone = $this->config->get('timeZone') ?? 'UTC';

        try {
            $dateTime = new \DateTime($value, new \DateTimeZone('UTC'));
            $dateTime->setTimezone(new \DateTimeZone($timezone));

            return $dateTime->format(DateTimeUtil::SYSTEM_DATE_TIME_FORMAT);
        } catch (\Exception) {
            return (string) $value;
        }
    }

    private function formatDate(mixed $value): string
    {
        if (!$value) {
            return '';
        }

        try {
            return (new \DateTime($value))->format('Y-m-d');
        } catch (\Exception) {
            return (string) $value;
        }
    }

    private function cleanEnum(mixed $value): string
    {
        $value = trim((string) $value);

        if ($value === '' || $value === 'Seleccione una opción') {
            return '';
        }

        return $value;
    }
}
