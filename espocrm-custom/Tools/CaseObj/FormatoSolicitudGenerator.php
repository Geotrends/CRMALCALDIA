<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Acl;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Error;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Utils\Config;
use Espo\Core\Utils\DateTime as DateTimeUtil;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class FormatoSolicitudGenerator
{
    private const ROLE_INSPECCION = 'Inspección';
    private const ROLE_RADICACION = 'Radicación';
    private const ROLE_ASIGNADOR = 'Asignador';

    public function __construct(
        private EntityManager $entityManager,
        private Config $config,
        private User $user,
        private Acl $acl
    ) {}

    /**
     * @return array{path: string, name: string, type: string}
     */
    public function generate(string $caseId, string $format, bool $internal = false): array
    {
        $format = strtolower($format);

        if ($format !== 'pdf') {
            throw new BadRequest('Formato no válido. Use pdf.');
        }

        /** @var ?Entity $case */
        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case) {
            throw new Forbidden();
        }

        if (!$internal && !$this->acl->checkEntityRead($case)) {
            throw new Forbidden();
        }

        if (!$internal && !$this->canDownloadFormato($case)) {
            throw new Forbidden();
        }

        if (!$internal && !$this->isFormatoHabilitado($case)) {
            throw new Forbidden('El formato de solicitud aún no está habilitado.');
        }

        $templatePath = $this->getTemplatePath();
        $scriptPath = $this->getScriptPath();

        if (!is_readable($templatePath)) {
            throw new Error('No se encontró la plantilla FormatoSolicitud.doc.');
        }

        if (!is_readable($scriptPath)) {
            throw new Error('No se encontró el script fill-formato-solicitud.py.');
        }

        $payload = $this->buildPayload($case);
        $workDir = sys_get_temp_dir() . '/formato-solicitud-' . uniqid('', true);

        if (!is_dir($workDir) && !mkdir($workDir, 0770, true) && !is_dir($workDir)) {
            throw new Error('No se pudo crear el directorio temporal.');
        }

        $loProfile = $workDir . '/lo-profile';

        if (!is_dir($loProfile) && !mkdir($loProfile, 0770, true) && !is_dir($loProfile)) {
            throw new Error('No se pudo crear el perfil de LibreOffice.');
        }

        $radicado = trim((string) $case->get('cNumeroRadicado'));
        $peticionario = trim((string) $case->get('cPeticionario'));
        $slugSource = $radicado !== '' ? $radicado : $peticionario;
        $safeRadicado = preg_replace('/[^\w\-]+/u', '_', $slugSource) ?: 'caso';
        $outputPath = $workDir . '/FormatoSolicitud-' . $safeRadicado . '.' . $format;
        $jsonPath = $workDir . '/payload.json';

        file_put_contents($jsonPath, json_encode($payload, JSON_UNESCAPED_UNICODE));

        $env = [
            'HOME' => $workDir,
            'TMPDIR' => $workDir,
            'LO_PROFILE' => $loProfile,
            'PATH' => getenv('PATH') ?: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
        ];

        $process = proc_open(
            [
                'python3',
                $scriptPath,
                $templatePath,
                $outputPath,
                $format,
            ],
            [
                0 => ['pipe', 'r'],
                1 => ['pipe', 'w'],
                2 => ['pipe', 'w'],
            ],
            $pipes,
            $workDir,
            $env
        );

        if (!is_resource($process)) {
            throw new Error('No se pudo ejecutar el generador de formato.');
        }

        fwrite($pipes[0], (string) file_get_contents($jsonPath));
        fclose($pipes[0]);

        $stdout = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);

        if ($exitCode !== 0 || !is_readable($outputPath)) {
            @unlink($jsonPath);
            @rmdir($workDir);

            throw new Error(
                'No se pudo generar el formato: ' . trim($stdout . "\n" . $stderr)
            );
        }

        @unlink($jsonPath);

        return [
            'path' => $outputPath,
            'name' => basename($outputPath),
            'type' => $format === 'pdf'
                ? 'application/pdf'
                : 'application/msword',
        ];
    }

    public function isFormatoHabilitado(Entity $case): bool
    {
        return $this->isPostRadicado($case);
    }

    private function canDownloadFormato(Entity $case): bool
    {
        if ($this->user->isAdmin()) {
            return true;
        }

        if (!$this->isPostRadicado($case)) {
            return false;
        }

        return $this->userHasRole(self::ROLE_INSPECCION)
            || $this->userHasRole(self::ROLE_RADICACION)
            || $this->userHasRole(self::ROLE_ASIGNADOR);
    }

    private function isPostRadicado(Entity $case): bool
    {
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));

        return $numero !== '' && $expediente !== '';
    }

    private function userHasRole(string $roleName): bool
    {
        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => $roleName])
            ->findOne();

        if (!$role) {
            return false;
        }

        $roles = $this->user->getLinkMultipleIdList('roles') ?? [];

        return in_array($role->getId(), $roles, true);
    }

    private function getTemplatePath(): string
    {
        return realpath(__DIR__ . '/../../files/templates/FormatoSolicitud.doc') ?: '';
    }

    private function getScriptPath(): string
    {
        return realpath(__DIR__ . '/../../files/scripts/fill-formato-solicitud.py') ?: '';
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(Entity $case): array
    {
        $recibidaPor = $this->resolveUserName($case->get('cRecibidaPorId'));
        $remitidoA = $this->resolveUserName($case->get('cRemitidoAId'));
        $correo = trim((string) $case->get('cCorreo'));

        return [
            'fecha' => $this->formatFechaCaso($case->get('cFechaCaso')),
            'radicado' => trim((string) $case->get('cNumeroRadicado')),
            'peticionario' => trim((string) $case->get('cPeticionario')),
            'cedula' => trim((string) $case->get('cCedula')),
            'direccion' => trim((string) $case->get('cDireccion')),
            'telefono' => trim((string) $case->get('cTelefono')),
            'barrio' => trim((string) $case->get('cBarrio')),
            'correo' => $correo,
            'aceptaCorreo' => $correo !== '',
            'perjudicante' => trim((string) $case->get('cPerjudicante')),
            'telPerjudicante' => trim((string) $case->get('cTelefonoPerjudicante')),
            'direccionPerjudicante' => trim((string) $case->get('cDireccionPerjudicante')),
            'barrioPerjudicante' => trim((string) $case->get('cBarrioPerjudicante')),
            'canalDeReporte' => trim((string) $case->get('cCanalDeReporte')),
            'descripcion' => trim((string) $case->get('description')),
            'respuestaInmediata' => trim((string) $case->get('cRespuestaInmediata')),
            'recibidaPor' => $recibidaPor,
            'remitidoA' => $remitidoA,
            'tipo' => trim((string) $case->get('cTipo')),
            'categoria' => $this->formatCategoria($case->get('cCategoria')),
        ];
    }

    private function formatCategoria(mixed $value): string
    {
        if (is_array($value)) {
            return implode(', ', array_filter(array_map('trim', $value)));
        }

        if (is_string($value) && str_starts_with($value, '[')) {
            $decoded = json_decode($value, true);

            if (is_array($decoded)) {
                return implode(', ', array_filter(array_map('trim', $decoded)));
            }
        }

        return trim((string) $value);
    }

    private function resolveUserName(?string $userId): string
    {
        if (!$userId) {
            return '';
        }

        $user = $this->entityManager->getEntityById(User::ENTITY_TYPE, $userId);

        return $user ? (string) $user->get('name') : '';
    }

    private function formatFechaCaso(mixed $value): string
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
}
