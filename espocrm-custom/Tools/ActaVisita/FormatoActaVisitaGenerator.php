<?php

namespace Espo\Custom\Tools\ActaVisita;

use Espo\Core\Acl;
use Espo\Core\Exceptions\BadRequest;
use Espo\Core\Exceptions\Error;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Utils\Config;
use Espo\Entities\Role;
use Espo\Entities\User;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

class FormatoActaVisitaGenerator
{
    private const ROLE_INSPECCION = 'Inspección';
    private const ROLE_ASIGNADOR = 'Asignador';
    private const ROLE_PATRULLERO = 'Patrullero';

    public function __construct(
        private EntityManager $entityManager,
        private Config $config,
        private User $user,
        private Acl $acl
    ) {}

    /**
     * @return array{path: string, name: string, type: string}
     */
    public function generate(string $actaId, string $format, bool $internal = false): array
    {
        /** @var ?Entity $acta */
        $acta = $this->entityManager->getEntityById('ActaVisita', $actaId);

        if (!$acta) {
            throw new Forbidden();
        }

        if (!$internal && !$this->acl->checkEntityRead($acta)) {
            throw new Forbidden();
        }

        if (!$internal && !$this->canDownloadFormato($acta)) {
            throw new Forbidden();
        }

        if (!$internal && !$this->isFormatoActaHabilitado($acta)) {
            throw new Forbidden('El formato de acta de visita aún no está habilitado.');
        }

        $slug = preg_replace(
            '/[^\w\-]+/u',
            '_',
            trim((string) $acta->get('numeroRadicado')) ?: $actaId
        ) ?: 'acta';

        return $this->runGenerator($format, $this->buildPayload($acta), $slug);
    }

    /**
     * Genera el acta desde el caso (panel lateral del Case).
     *
     * @return array{path: string, name: string, type: string}
     */
    public function generateForCase(string $caseId, string $format, bool $internal = false): array
    {
        /** @var ?Entity $case */
        $case = $this->entityManager->getEntityById('Case', $caseId);

        if (!$case) {
            throw new Forbidden();
        }

        if (!$internal && !$this->acl->checkEntityRead($case)) {
            throw new Forbidden();
        }

        if (!$internal && !$this->canDownloadFormatoFromCase($case)) {
            throw new Forbidden();
        }

        $acta = $this->resolveActaForCase($caseId);

        if (!$internal && !$this->isFormatoActaHabilitado($acta)) {
            throw new Forbidden('El formato de acta de visita aún no está habilitado.');
        }

        $payload = $this->buildPayloadForCase($case);

        $slug = preg_replace(
            '/[^\w\-]+/u',
            '_',
            trim((string) $case->get('cNumeroRadicado')) ?: $caseId
        ) ?: 'caso';

        return $this->runGenerator($format, $payload, $slug);
    }

    public function isFormatoActaHabilitado(?Entity $acta): bool
    {
        if (!$acta) {
            return false;
        }

        if (trim((string) $acta->get('cFormatoActaVisitaPdfId')) !== '') {
            return true;
        }

        return $this->actaHasFormatoData($acta);
    }

    public function canDownloadFormatoFromCase(Entity $case): bool
    {
        if ($this->user->isAdmin()) {
            return true;
        }

        if (!$this->isCasePostRadicado($case)) {
            return false;
        }

        if ($this->userHasRole(self::ROLE_INSPECCION) || $this->userHasRole(self::ROLE_ASIGNADOR)) {
            return true;
        }

        return $case->get('assignedUserId') === $this->user->getId();
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{path: string, name: string, type: string}
     */
    private function runGenerator(string $format, array $payload, string $slug): array
    {
        $format = strtolower($format);

        if (!in_array($format, ['docx', 'pdf'], true)) {
            throw new BadRequest('Formato no válido. Use docx o pdf.');
        }

        $templatePath = $this->getTemplatePath();
        $scriptPath = $this->getScriptPath();

        if (!is_readable($templatePath)) {
            throw new Error('No se encontró la plantilla ActaVisita2.docx.');
        }

        if (!is_readable($scriptPath)) {
            throw new Error('No se encontró el script fill-formato-acta-visita.py.');
        }

        $workDir = sys_get_temp_dir() . '/formato-acta-visita-' . uniqid('', true);

        if (!is_dir($workDir) && !mkdir($workDir, 0770, true) && !is_dir($workDir)) {
            throw new Error('No se pudo crear el directorio temporal.');
        }

        $loProfile = $workDir . '/lo-profile';

        if (!is_dir($loProfile) && !mkdir($loProfile, 0770, true) && !is_dir($loProfile)) {
            throw new Error('No se pudo crear el perfil de LibreOffice.');
        }

        $outputFormat = $format === 'pdf' ? 'pdf' : 'docx';
        $outputPath = $workDir . '/ActaVisita-' . $slug . '.' . $outputFormat;

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
            throw new Error('No se pudo ejecutar el generador de acta de visita.');
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
                'No se pudo generar el acta de visita: ' . trim($stdout . "\n" . $stderr)
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

    private function buildPayloadForCase(Entity $case): array
    {
        $acta = $this->resolveActaForCase($case->getId());
        $fallback = $this->buildPayloadFromCase($case);

        if (!$acta) {
            return $fallback;
        }

        $payload = $this->buildPayload($acta);

        foreach ($payload as $key => $value) {
            if (is_string($value) && trim($value) === '' && is_string($fallback[$key] ?? null)) {
                $trimmed = trim($fallback[$key]);

                if ($trimmed !== '') {
                    $payload[$key] = $trimmed;
                }
            }
        }

        return $payload;
    }

    private function resolveActaForCase(string $caseId): ?Entity
    {
        $actas = $this->entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['caseId' => $caseId])
            ->order('modifiedAt', 'DESC')
            ->find();

        if ($actas === []) {
            return null;
        }

        foreach ($actas as $acta) {
            if ($this->actaHasFormatoData($acta)) {
                return $acta;
            }
        }

        return $actas[0];
    }

    private function actaHasFormatoData(Entity $acta): bool
    {
        $fields = [
            'objetoVisita',
            'situacionEncontrada',
            'analisisSituacion',
            'conclusion',
            'requerimientos',
            'posibleAfectante',
            'direccionAfectacion',
            'funcionarioNombre',
        ];

        foreach ($fields as $field) {
            if (trim((string) $acta->get($field)) !== '') {
                return true;
            }
        }

        return false;
    }

    private function isCasePostRadicado(Entity $case): bool
    {
        $numero = trim((string) $case->get('cNumeroRadicado'));
        $expediente = trim((string) $case->get('cExpediente'));

        return $numero !== '' && $expediente !== '';
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayloadFromCase(Entity $case): array
    {
        return [
            'anio' => (int) date('Y'),
            'posibleAfectante' => trim((string) ($case->get('cPerjudicante') ?: $case->get('cPeticionario'))),
            'numeroRadicado' => trim((string) $case->get('cNumeroRadicado')),
            'expediente' => trim((string) $case->get('cExpediente')),
            'direccionAfectacion' => trim((string) $case->get('cDireccion')),
            'telefono' => trim((string) $case->get('cTelefono')),
            'barrio' => trim((string) $case->get('cBarrio')),
            'zona' => '',
            'fechaVisita' => '',
            'objetoVisita' => trim((string) $case->get('description')),
            'situacionEncontrada' => '',
            'analisisSituacion' => '',
            'registroFotografico' => '',
            'conclusion' => '',
            'requerimientos' => trim((string) $case->get('cRespuestaInmediata')),
            'funcionarioNombre' => '',
            'funcionarioCedula' => '',
            'funcionarioCargo' => '',
            'establecimientoNombre' => '',
            'establecimientoCedula' => '',
            'establecimientoCargo' => '',
        ];
    }

    public function canDownloadFormato(Entity $acta): bool
    {
        if ($this->user->isAdmin()) {
            return true;
        }

        if ($this->userHasRole(self::ROLE_INSPECCION) || $this->userHasRole(self::ROLE_ASIGNADOR)) {
            return true;
        }

        if ($this->userHasRole(self::ROLE_PATRULLERO)) {
            return $acta->get('assignedUserId') === $this->user->getId();
        }

        return $acta->get('assignedUserId') === $this->user->getId();
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
        return realpath(__DIR__ . '/../../files/templates/ActaVisita2.docx') ?: '';
    }

    private function getScriptPath(): string
    {
        return realpath(__DIR__ . '/../../files/scripts/fill-formato-acta-visita.py') ?: '';
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayload(Entity $acta): array
    {
        $registroFotografico = '';

        if ($acta->get('registroFotograficoIds')) {
            $registroFotografico = 'Ver registro fotográfico adjunto en el CRM.';
        }

        return [
            'anio' => $acta->get('anio'),
            'posibleAfectante' => trim((string) $acta->get('posibleAfectante')),
            'numeroRadicado' => trim((string) $acta->get('numeroRadicado')),
            'expediente' => trim((string) $acta->get('expediente')),
            'direccionAfectacion' => trim((string) $acta->get('direccionAfectacion')),
            'telefono' => trim((string) $acta->get('telefono')),
            'barrio' => trim((string) $acta->get('barrio')),
            'zona' => trim((string) $acta->get('zona')),
            'fechaVisita' => $this->formatDate($acta->get('fechaVisita')),
            'objetoVisita' => trim((string) $acta->get('objetoVisita')),
            'situacionEncontrada' => trim((string) $acta->get('situacionEncontrada')),
            'analisisSituacion' => trim((string) $acta->get('analisisSituacion')),
            'registroFotografico' => $registroFotografico,
            'conclusion' => trim((string) $acta->get('conclusion')),
            'requerimientos' => trim((string) $acta->get('requerimientos')),
            'funcionarioNombre' => trim((string) $acta->get('funcionarioNombre')),
            'funcionarioCedula' => trim((string) $acta->get('funcionarioCedula')),
            'funcionarioCargo' => trim((string) $acta->get('funcionarioCargo')),
            'establecimientoNombre' => trim((string) $acta->get('establecimientoNombre')),
            'establecimientoCedula' => trim((string) $acta->get('establecimientoCedula')),
            'establecimientoCargo' => trim((string) $acta->get('establecimientoCargo')),
        ];
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
