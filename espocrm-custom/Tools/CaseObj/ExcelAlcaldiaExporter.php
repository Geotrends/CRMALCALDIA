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
        $barrio = trim((string) ($case->get('cBarrioPerjudicante') ?: $case->get('cBarrioPeticionario')));

        return array_merge(
            $this->buildAddressPayload($case, 'quejoso', ''),
            $this->buildAddressPayload($case, 'infractor', 'Perjudicante'),
            [
            'consecutivo' => trim((string) $case->get('cExpediente')),
            'radicado' => trim((string) $case->get('cNumeroRadicado')),
            'solicitante' => CasePartyNameHelper::getPeticionarioFullName($case),
            'cedula_quejoso' => trim((string) $case->get('cDocumentoPeticionario')),
            'telefono_quejoso' => trim((string) $case->get('cTelefonoPeticionario')),
            'correo_quejoso' => trim((string) $case->get('cCorreoPeticionario')),
            'infractor' => CasePartyNameHelper::getPerjudicanteFullName($case),
            'cedula_infractor' => trim((string) $case->get('cDocumentoPerjudicante')),
            'telefono_infractor' => trim((string) $case->get('cTelefonoPerjudicante')),
            'correo_infractor' => '',
            'recurso_tema' => $this->cleanEnum($case->get('cRecursoTema')),
            'asunto' => $this->cleanEnum($case->get('cAsunto')),
            'barrio' => $this->cleanEnum($barrio),
            'zona' => $this->cleanEnum($case->get('cZonaAlcaldiaPeticionario')),
            'fecha_ingreso' => $this->formatDate($case->get('cFechaCaso')),
            'fecha_vencimiento' => $this->formatDate($case->get('cFechaVencimiento')),
            'ultima_actuacion' => $this->cleanEnum($case->get('cUltimaActuacion')),
            'inspector' => $this->resolveUserName($case->get('assignedUserId')),
            'proxima_actuacion' => $this->cleanEnum($case->get('cProximaActuacion')),
            'descripcion' => trim((string) $case->get('description')),
            'canal_reporte' => $this->cleanEnum($case->get('cCanalDeReportePeticionario')),
            ]
        );
    }

    /**
     * @return array<string, string>
     */
    private function buildAddressPayload(Entity $case, string $prefix, string $suffix): array
    {
        $map = $suffix === ''
            ? [
                'via_principal' => 'cViaPrincipalPeticionario',
                'num_via_principal' => 'cNumViaPrincipalPeticionario',
                'letra_via' => 'cLetraViaPrincipalPeticionario',
                'cuadrante_via' => 'cCuadranteViaPrincipalPeticionario',
                'generadora' => 'cGeneradoraPeticionario',
                'letra_generadora' => 'cLetraGeneradoraPeticionario',
                'cuadrante_generadora' => 'cCuadranteGeneradoraPeticionario',
                'placa' => 'cPlacaPeticionario',
                'bloque' => 'cBloquePeticionario',
                'interior' => 'cInteriorPeticionario',
                'direccion' => 'cDireccionPeticionario',
            ]
            : [
                'via_principal' => 'cViaPrincipalPerjudicante',
                'num_via_principal' => 'cNumViaPrincipalPerjudicante',
                'letra_via' => 'cLetraViaPrincipalPerjudicante',
                'cuadrante_via' => 'cCuadranteViaPrincipalPerjudicante',
                'generadora' => 'cGeneradoraPerjudicante',
                'letra_generadora' => 'cLetraGeneradoraPerjudicante',
                'cuadrante_generadora' => 'cCuadranteGeneradoraPerjudicante',
                'placa' => 'cPlacaPerjudicante',
                'bloque' => 'cBloquePerjudicante',
                'interior' => 'cInteriorPerjudicante',
                'direccion' => 'cDireccionPerjudicante',
            ];

        $payload = [];

        foreach ($map as $key => $field) {
            $payload[$key . '_' . $prefix] = $this->cleanEnum($case->get($field));
        }

        return $payload;
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

        $timezone = $this->config->get('timeZone') ?? 'America/Bogota';

        try {
            $dateTime = new \DateTime($value, new \DateTimeZone('UTC'));
            $dateTime->setTimezone(new \DateTimeZone($timezone));

            return $dateTime->format('d/m/Y');
        } catch (\Exception) {
            return (string) $value;
        }
    }
}
