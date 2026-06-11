<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Utils\Config;
use Espo\Core\Utils\DateTime as DateTimeUtil;
use Espo\Core\Utils\Log;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class ExcelAlcaldiaExporter
{
    public const EXPORT_FILENAME = 'excelAlcaldia.xlsx';

    public function __construct(
        private EntityManager $entityManager,
        private Config $config,
        private Log $log
    ) {}

    public function exportCase(Entity $case): bool
    {
        if (!$case->getId()) {
            return false;
        }

        $radicado = trim((string) $case->get('cNumeroRadicado'));
        $consecutivo = trim((string) $case->get('cExpediente'));

        if ($radicado === '' && $consecutivo === '') {
            return false;
        }

        try {
            $scriptPath = realpath(__DIR__ . '/../../files/scripts/upsert-excel-alcaldia.py') ?: '';

            if (!is_readable($scriptPath)) {
                throw new \RuntimeException('No se encontró upsert-excel-alcaldia.py.');
            }

            $excelPath = $this->getExcelPath();

            if (!is_file($excelPath)) {
                throw new \RuntimeException('No existe excelAlcaldia.xlsx en ' . $excelPath);
            }

            $payload = $this->buildPayload($case);

            $process = proc_open(
                ['python3', $scriptPath, $excelPath],
                [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
                $pipes
            );

            if (!is_resource($process)) {
                throw new \RuntimeException('No se pudo ejecutar upsert-excel-alcaldia.py.');
            }

            fwrite($pipes[0], json_encode($payload, JSON_UNESCAPED_UNICODE));
            fclose($pipes[0]);

            $stdout = stream_get_contents($pipes[1]);
            fclose($pipes[1]);
            $stderr = stream_get_contents($pipes[2]);
            fclose($pipes[2]);

            if (proc_close($process) !== 0) {
                throw new \RuntimeException(trim($stdout . "\n" . $stderr) ?: 'Error al escribir Excel oficial.');
            }

            @chmod($excelPath, 0660);

            return true;
        } catch (\Throwable $e) {
            $this->log->error('Export Excel Alcaldía: {message}', [
                'message' => $e->getMessage(),
                'caseId' => $case->getId(),
            ]);

            return false;
        }
    }

    public function getExcelPath(): string
    {
        $dataPath = $this->config->get('dataPath') ?? '/var/www/html/data';

        return rtrim($dataPath, '/') . '/exports/' . self::EXPORT_FILENAME;
    }

    /**
     * @return array<string, string>
     */
    private function buildPayload(Entity $case): array
    {
        $barrio = trim((string) ($case->get('cBarrioPerjudicante') ?: $case->get('cBarrio')));

        return [
            'consecutivo' => trim((string) $case->get('cExpediente')),
            'radicado' => trim((string) $case->get('cNumeroRadicado')),
            'solicitante' => trim((string) $case->get('cPeticionario')),
            'direccion_quejoso' => trim((string) $case->get('cDireccion')),
            'cedula_quejoso' => trim((string) $case->get('cCedula')),
            'telefono_quejoso' => trim((string) $case->get('cTelefono')),
            'correo_quejoso' => trim((string) $case->get('cCorreo')),
            'infractor' => trim((string) $case->get('cPerjudicante')),
            'direccion_infractor' => trim((string) $case->get('cDireccionPerjudicante')),
            'cedula_infractor' => trim((string) $case->get('cDocumentoPerjudicante')),
            'telefono_infractor' => trim((string) $case->get('cTelefonoPerjudicante')),
            'correo_infractor' => '',
            'recurso_tema' => $this->cleanEnum($case->get('cRecursoTema')),
            'asunto' => $this->cleanEnum($case->get('cAsunto')),
            'barrio' => $this->cleanEnum($barrio),
            'zona' => $this->cleanEnum($case->get('cZonaAlcaldia')),
            'fecha_ingreso' => $this->formatDate($case->get('cFechaCaso')),
            'fecha_vencimiento' => $this->formatDate($case->get('cFechaVencimiento')),
            'ultima_actuacion' => $this->cleanEnum($case->get('cUltimaActuacion')),
            'inspector' => $this->resolveUserName($case->get('assignedUserId')),
            'proxima_actuacion' => $this->cleanEnum($case->get('cProximaActuacion')),
            'descripcion' => trim((string) $case->get('description')),
            'canal_reporte' => $this->cleanEnum($case->get('cCanalDeReporte')),
        ];
    }

    private function cleanEnum(mixed $value): string
    {
        $value = trim((string) $value);

        if ($value === '' || $value === 'Seleccione una opción') {
            return '';
        }

        return $value;
    }

    private function resolveUserName(?string $userId): string
    {
        if (!$userId) {
            return '';
        }

        $user = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

        return $user ? trim((string) $user->get('name')) : '';
    }

    private function formatDate(mixed $value): string
    {
        if (!$value) {
            return '';
        }

        $timezone = $this->config->get('timeZone') ?? 'UTC';

        try {
            $dateTime = new \DateTime($value, new \DateTimeZone('UTC'));
            $dateTime->setTimezone(new \DateTimeZone($timezone));

            return $dateTime->format('d/m/Y');
        } catch (\Exception) {
            return (string) $value;
        }
    }
}
