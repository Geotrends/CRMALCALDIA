<?php

namespace Espo\Custom\Tools\ActuoArchivo;

use Espo\Core\Acl;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Error;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Utils\Config;
use Espo\Custom\Tools\App\AlcaldiaDateTimeHelper;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class FormatoActuoArchivoGenerator
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
    public function generate(string $actuoId, string $format, bool $internal = false): array
    {
        /** @var ?Entity $actuo */
        $actuo = $this->entityManager->getEntityById('ActuoArchivo', $actuoId);

        if (!$actuo) {
            throw new Forbidden();
        }

        if (!$internal && !$this->acl->checkEntityRead($actuo)) {
            throw new Forbidden();
        }

        if (!$internal && !$this->canDownloadFormato($actuo)) {
            throw new Forbidden();
        }

        if (!$internal && !$this->isFormatoHabilitado($actuo)) {
            throw new Forbidden('El formato de auto de archivo aún no está habilitado.');
        }

        $slug = preg_replace(
            '/[^\w\-]+/u',
            '_',
            trim((string) $actuo->get('numeroRadicado')) ?: $actuoId
        ) ?: 'actuo';

        return $this->runGenerator($format, $this->buildPayload($actuo), $slug);
    }

    /**
     * @return array{path: string, name: string, type: string}
     */
    public function generateForCase(
        string $caseId,
        string $format,
        bool $internal = false,
        string $modo = 'digital'
    ): array {
        /** @var ?Entity $case */
        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case) {
            throw new Forbidden();
        }

        if (!$internal && !$this->acl->checkEntityRead($case)) {
            throw new Forbidden();
        }

        $modo = strtolower($modo) === 'manual' ? 'manual' : 'digital';

        if ($modo === 'manual') {
            $payload = $this->buildPayloadManualFromCase($case);
        } else {
            if (!$internal && !$this->canDownloadFormatoFromCase($case)) {
                throw new Forbidden();
            }

            $actuo = $this->resolveActuoForCase($caseId);

            if (!$actuo) {
                throw new Forbidden('No hay auto de archivo diligenciado para este caso.');
            }

            if (!$internal && !$this->isFormatoHabilitado($actuo)) {
                throw new Forbidden('El formato de auto de archivo aún no está habilitado.');
            }

            $payload = $this->buildPayload($actuo);
        }

        $slug = preg_replace(
            '/[^\w\-]+/u',
            '_',
            trim((string) $case->get('cNumeroRadicado')) ?: $caseId
        ) ?: 'caso';

        if ($modo === 'manual') {
            $slug .= '-manual';
        }

        return $this->runGenerator($format, $payload, $slug);
    }

    public function isFormatoHabilitado(?Entity $actuo): bool
    {
        if (!$actuo) {
            return false;
        }

        if (trim((string) $actuo->get('cFormatoActuoArchivoPdfId')) !== '') {
            return true;
        }

        return $this->actuoHasFormatoData($actuo);
    }

    public function canDownloadFormatoFromCase(Entity $case): bool
    {
        return $case->get('status') === 'Finalizado';
    }

    public function canDownloadFormato(Entity $actuo): bool
    {
        return true;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{path: string, name: string, type: string}
     */
    private function runGenerator(string $format, array $payload, string $slug): array
    {
        $format = strtolower($format);

        if (!in_array($format, ['pdf', 'docx'], true)) {
            throw new BadRequest('Formato no válido. Use pdf o docx.');
        }

        $templatePath = $this->getTemplatePath();
        $scriptPath = $this->getScriptPath();

        if (!is_readable($templatePath)) {
            throw new Error('No se encontró la plantilla ActuoArchivo.docx.');
        }

        if (!is_readable($scriptPath)) {
            throw new Error('No se encontró el script fill-formato-actuo-archivo.py.');
        }

        $workDir = sys_get_temp_dir() . '/formato-actuo-archivo-' . uniqid('', true);

        if (!is_dir($workDir) && !mkdir($workDir, 0770, true) && !is_dir($workDir)) {
            throw new Error('No se pudo crear el directorio temporal.');
        }

        $loProfile = $workDir . '/lo-profile';

        if (!is_dir($loProfile) && !mkdir($loProfile, 0770, true) && !is_dir($loProfile)) {
            throw new Error('No se pudo crear el perfil de LibreOffice.');
        }

        $outputFormat = $format === 'pdf' ? 'pdf' : 'docx';
        $outputPath = $workDir . '/ActuoArchivo-' . $slug . '.' . $outputFormat;

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
                $outputFormat,
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
            throw new Error('No se pudo ejecutar el generador de auto de archivo.');
        }

        fwrite($pipes[0], json_encode($payload, JSON_UNESCAPED_UNICODE));
        fclose($pipes[0]);

        $stdout = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[2]);

        $exitCode = proc_close($process);

        if ($exitCode !== 0 || !is_readable($outputPath)) {
            throw new Error(
                'No se pudo generar el auto de archivo: ' . trim($stdout . "\n" . $stderr)
            );
        }

        return [
            'path' => $outputPath,
            'name' => basename($outputPath),
            'type' => $format === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
    }

    private function resolveActuoForCase(string $caseId): ?Entity
    {
        $actuos = $this->entityManager
            ->getRDBRepository('ActuoArchivo')
            ->where(['caseId' => $caseId])
            ->order('modifiedAt', 'DESC')
            ->find();

        if ($actuos === []) {
            return null;
        }

        foreach ($actuos as $actuo) {
            if ($this->actuoHasFormatoData($actuo)) {
                return $actuo;
            }
        }

        return $actuos[0];
    }

    private function actuoHasFormatoData(Entity $actuo): bool
    {
        if (trim((string) $actuo->get('estado')) === 'Diligenciada') {
            return true;
        }

        return trim((string) $actuo->get('motivoArchivo')) !== ''
            && trim((string) $actuo->get('referencia')) !== '';
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
        return realpath(__DIR__ . '/../../files/templates/ActuoArchivo.docx') ?: '';
    }

    private function getScriptPath(): string
    {
        return realpath(__DIR__ . '/../../files/scripts/fill-formato-actuo-archivo.py') ?: '';
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayloadManualFromCase(Entity $case): array
    {
        return [
            'modo' => 'manual',
            'preserveBlanks' => true,
            'fechaAuto' => AlcaldiaDateTimeHelper::storageDateString(),
            'fechaDada' => AlcaldiaDateTimeHelper::storageDateString(),
            'numeroRadicado' => trim((string) $case->get('cNumeroRadicado')),
            'consecutivoInterno' => trim((string) $case->get('cExpediente')),
            'referencia' => $this->buildReferenciaFromCase($case),
            'motivoArchivo' => '',
            'inspectorNombre' => trim((string) $this->user->get('name')),
            'inspectorCargo' => 'Inspector de Policía para Asuntos Ambientales',
        ];
    }

    private function buildReferenciaFromCase(Entity $case): string
    {
        $parts = array_filter([
            trim((string) $case->get('cRecursoTema')),
            trim((string) $case->get('cAsunto')),
        ], static fn (string $value): bool => $value !== '' && $value !== 'Seleccione una opción');

        if ($parts !== []) {
            return implode(' — ', $parts);
        }

        $description = trim((string) $case->get('description'));

        if ($description !== '') {
            return mb_substr($description, 0, 500);
        }

        return '';
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(Entity $actuo): array
    {
        return [
            'fechaAuto' => $this->formatDate($actuo->get('fechaAuto')),
            'numeroRadicado' => trim((string) $actuo->get('numeroRadicado')),
            'consecutivoInterno' => trim((string) $actuo->get('consecutivoInterno')),
            'referencia' => trim((string) $actuo->get('referencia')),
            'motivoArchivo' => trim((string) $actuo->get('motivoArchivo')),
            'fechaDada' => $this->formatDate($actuo->get('fechaDada')),
            'inspectorNombre' => $this->resolveInspectorNombre($actuo),
            'inspectorCargo' => trim((string) $actuo->get('inspectorCargo')),
        ];
    }

    private function resolveInspectorNombre(Entity $actuo): string
    {
        $inspectorId = $actuo->get('inspectorId');

        if ($inspectorId) {
            /** @var ?Entity $inspector */
            $inspector = $this->entityManager->getEntityById('User', $inspectorId);

            if ($inspector) {
                return trim((string) $inspector->get('name'));
            }
        }

        return trim((string) $actuo->get('inspectorName'));
    }

    private function formatDate(mixed $value): string
    {
        if (!$value) {
            return '';
        }

        try {
            $dateTime = new \DateTime($value);

            return $dateTime->format('Y-m-d');
        } catch (\Exception) {
            return (string) $value;
        }
    }
}
