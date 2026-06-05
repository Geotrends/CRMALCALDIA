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

    public function __construct(
        private EntityManager $entityManager,
        private Config $config,
        private User $user,
        private Acl $acl
    ) {}

    /**
     * @return array{path: string, name: string, type: string}
     */
    public function generate(string $caseId, string $format): array
    {
        $format = strtolower($format);

        if (!in_array($format, ['doc', 'pdf'], true)) {
            throw new BadRequest("Formato no válido. Use doc o pdf.");
        }

        if (!$this->userHasInspeccionRole()) {
            throw new Forbidden();
        }

        /** @var ?Entity $case */
        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case || !$this->acl->checkEntityRead($case)) {
            throw new Forbidden();
        }

        $radicado = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));

        if ($radicado === '' || $expediente === '') {
            throw new BadRequest('El caso debe tener número de radicado y expediente.');
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

        $safeRadicado = preg_replace('/[^\w\-]+/', '_', $radicado) ?: 'caso';
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

    private function userHasInspeccionRole(): bool
    {
        $role = $this->entityManager
            ->getRDBRepositoryByClass(Role::class)
            ->where(['name' => self::ROLE_INSPECCION])
            ->findOne();

        if (!$role) {
            return false;
        }

        $roles = $this->user->getLinkMultipleIdList('roles') ?? [];

        return in_array($role->getId(), $roles, true);
    }

    private function getTemplatePath(): string
    {
        return realpath(__DIR__ . '/../files/templates/FormatoSolicitud.doc') ?: '';
    }

    private function getScriptPath(): string
    {
        return realpath(__DIR__ . '/../files/scripts/fill-formato-solicitud.py') ?: '';
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
        ];
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
