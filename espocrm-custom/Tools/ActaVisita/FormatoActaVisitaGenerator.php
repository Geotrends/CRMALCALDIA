<?php

namespace Espo\Custom\Tools\ActaVisita;

use Espo\Custom\Tools\App\AlcaldiaDateTimeHelper;
use Espo\Custom\Tools\CaseObj\CasePartyNameHelper;
use Espo\Custom\Tools\User\AlcaldiaUserProfile;
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
    private const ROLE_RADICACION = 'Radicación';
    private const ROLE_ASIGNADOR = 'Asignador';
    private const ROLE_PATRULLERO = 'Patrullero';

    public function __construct(
        private EntityManager $entityManager,
        private Config $config,
        private User $user,
        private Acl $acl,
        private AlcaldiaUserProfile $profile
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

        $case = $this->resolveCaseForActa($acta);

        return $this->runGenerator(
            $format,
            $case ? $this->enrichPayloadWithCase($this->buildPayload($acta), $case) : $this->buildPayload($acta),
            $slug
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayloadManualFromCase(Entity $case): array
    {
        $payload = $this->buildPayloadFromCase($case);
        $payload['modoDiligenciamiento'] = 'manual';
        $payload['modo'] = 'manual';
        $payload['fecha'] = AlcaldiaDateTimeHelper::storageDateString();
        $payload['fechaVisita'] = AlcaldiaDateTimeHelper::documentNowDate();
        $payload['fechaHora'] = AlcaldiaDateTimeHelper::documentNowDateTime();
        $payload['funcionarioNombre'] = $this->resolveFuncionarioNombre($case);
        $payload['posibleAfectante'] = $payload['posibleAfectante'] ?: CasePartyNameHelper::getPeticionarioFullName($case);
        $payload['direccionAfectacion'] = $payload['direccionAfectacion'] ?: trim((string) $case->get('cDireccionPeticionario'));
        $payload['telefono'] = $payload['telefono'] ?: trim((string) $case->get('cTelefonoPeticionario'));
        $payload['barrio'] = $payload['barrio'] ?: trim((string) $case->get('cBarrioPeticionario'));
        $payload['objetoVisita'] = '';
        $payload['situacionEncontrada'] = '';
        $payload['analisisSituacion'] = '';
        $payload['registroFotografico'] = '';
        $payload['conclusion'] = '';
        $payload['requerimientos'] = '';
        $payload['funcionarioCedula'] = '';
        $payload['funcionarioCargo'] = '';
        $payload['establecimientoNombre'] = '';
        $payload['establecimientoCedula'] = '';
        $payload['establecimientoCargo'] = '';

        return $payload;
    }

    private function resolveFuncionarioNombre(Entity $case): string
    {
        $assignedUserId = $case->get('assignedUserId');

        if ($assignedUserId) {
            $user = $this->entityManager->getEntityById(User::ENTITY_TYPE, $assignedUserId);

            if ($user) {
                return trim((string) $user->get('name'));
            }
        }

        return trim((string) $this->user->get('name'));
    }

    /**
     * Genera el acta desde el caso (panel lateral del Case).
     *
     * @return array{path: string, name: string, type: string}
     */
    public function generateForCase(string $caseId, string $format, bool $internal = false, string $modo = 'digital'): array
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

        $modo = strtolower($modo) === 'manual' ? 'manual' : 'digital';
        $acta = $this->resolveActaForCase($caseId);

        if (!$internal && $modo === 'digital' && !$this->isFormatoActaHabilitadoForCase($case, $acta)) {
            $hasActaData = $acta && $this->actaHasFormatoData($acta);

            if (!$hasActaData
                && !$this->profile->isInspeccion($this->user)
                && !$this->profile->isPatrullero($this->user)) {
                throw new Forbidden('El formato de acta de visita aún no está habilitado.');
            }
        }

        if ($modo === 'manual') {
            $payload = $this->buildPayloadManualFromCase($case);
        } else {
            $payload = $this->enrichPayloadWithCase($this->buildPayloadForCase($case), $case);
            $payload['modoDiligenciamiento'] = 'digital';
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
        if (!$this->isCaseReadyForActa($case)) {
            return false;
        }

        if ($this->user->isAdmin()) {
            return true;
        }

        return $this->acl->checkEntityRead($case);
    }

    private function isFormatoActaHabilitadoForCase(Entity $case, ?Entity $acta): bool
    {
        if ($acta && $this->isFormatoActaHabilitado($acta)) {
            return true;
        }

        return $this->isPostVisitaStatus($case);
    }

    private function isPostVisitaStatus(Entity $case): bool
    {
        $status = trim((string) $case->get('status'));

        return in_array($status, [
            'Visita realizada',
            'Visita aprobada',
            'Finalizado',
            'Proceso cerrado',
        ], true);
    }

    /**
     * @param array<string, mixed> $payload
     * @return array{path: string, name: string, type: string}
     */
    private function runGenerator(string $format, array $payload, string $slug): array
    {
        $format = strtolower($format);

        if ($format !== 'pdf') {
            throw new BadRequest('Formato no válido. Use pdf.');
        }

        $templatePath = $this->getTemplatePath();
        $scriptPath = $this->getScriptPath();

        if (!is_readable($templatePath)) {
            throw new Error('No se encontró la plantilla ActaVisita2 (PDF o DOCX).');
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
            ->order('numeroVisita', 'DESC')
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

    private function isCaseReadyForActa(Entity $case): bool
    {
        if ($this->isCasePostRadicado($case)) {
            return true;
        }

        return trim((string) $case->get('assignedUserId')) !== '';
    }

    /**
     * @return array<string, mixed>
     */
    private function buildPayloadFromCase(Entity $case): array
    {
        return [
            'fecha' => AlcaldiaDateTimeHelper::storageDateString(),
            'fechaVisita' => '',
            'fechaHora' => '',
            'posibleAfectante' => CasePartyNameHelper::getPerjudicanteFullName($case) ?: CasePartyNameHelper::getPeticionarioFullName($case),
            'acompanante' => CasePartyNameHelper::getPeticionarioFullName($case),
            'acompananteCedula' => trim((string) $case->get('cDocumentoPeticionario')),
            'acompananteCorreo' => trim((string) $case->get('cCorreoPeticionario')),
            'acompananteTelefono' => trim((string) $case->get('cTelefonoPeticionario')),
            'acompananteDireccion' => trim((string) $case->get('cDireccionPeticionario')),
            'infractor' => CasePartyNameHelper::getPerjudicanteFullName($case),
            'infractorDocumento' => trim((string) $case->get('cDocumentoPerjudicante')),
            'infractorCorreo' => '',
            'infractorTelefono' => trim((string) $case->get('cTelefonoPerjudicante')),
            'infractorDireccion' => trim((string) $case->get('cDireccionPerjudicante')),
            'recursoTema' => trim((string) $case->get('cRecursoTema')),
            'numeroRadicado' => trim((string) $case->get('cNumeroRadicado')),
            'expediente' => trim((string) $case->get('cExpediente')),
            'direccionAfectacion' => trim((string) $case->get('cDireccionPeticionario')),
            'ubicacionHechos' => trim((string) $case->get('cDireccionPeticionario')),
            'telefono' => trim((string) $case->get('cTelefonoPeticionario')),
            'barrio' => trim((string) $case->get('cBarrioPeticionario')),
            'zona' => '',
            'coordenadas' => '',
            'objetoVisita' => '',
            'situacionEncontrada' => '',
            'descripcionHecho' => '',
            'analisisSituacion' => '',
            'registroFotografico' => '',
            'conclusion' => '',
            'procedimiento' => '',
            'requerimientos' => '',
            'observaciones' => '',
            'accionesRecomendadas' => ['Verificación'],
            'funcionarioNombre' => '',
            'funcionarioCedula' => '',
            'funcionarioCargo' => '',
            'establecimientoNombre' => '',
            'establecimientoCedula' => '',
            'establecimientoCargo' => '',
            'acompananteNombre' => '',
            'acompananteCedulaFirma' => '',
            'acompananteCargo' => '',
        ];
    }

    public function canDownloadFormato(Entity $acta): bool
    {
        return true;
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
        $pdf = realpath(__DIR__ . '/../../files/templates/ActaVisita2-template.pdf');
        if ($pdf) {
            return $pdf;
        }

        return realpath(__DIR__ . '/../../files/templates/ActaVisita2.docx') ?: '';
    }

    private function resolveCaseForActa(Entity $acta): ?Entity
    {
        $caseId = $acta->get('caseId');

        if (!$caseId) {
            return null;
        }

        /** @var ?Entity $case */
        $case = $this->entityManager->getEntityById('Case', $caseId);

        return $case;
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function enrichPayloadWithCase(array $payload, Entity $case): array
    {
        $payload['recursoTema'] = trim((string) $case->get('cRecursoTema'));

        if (trim((string) ($payload['acompanante'] ?? '')) === '') {
            $payload['acompanante'] = CasePartyNameHelper::getPeticionarioFullName($case);
        }

        if (trim((string) ($payload['acompananteCedula'] ?? '')) === '') {
            $payload['acompananteCedula'] = trim((string) $case->get('cDocumentoPeticionario'));
        }

        if (trim((string) ($payload['acompananteCorreo'] ?? '')) === '') {
            $payload['acompananteCorreo'] = trim((string) $case->get('cCorreoPeticionario'));
        }

        if (trim((string) ($payload['acompananteTelefono'] ?? '')) === '') {
            $payload['acompananteTelefono'] = trim((string) $case->get('cTelefonoPeticionario'));
        }

        if (trim((string) ($payload['acompananteDireccion'] ?? '')) === '') {
            $payload['acompananteDireccion'] = trim((string) $case->get('cDireccionPeticionario'));
        }

        if (trim((string) ($payload['infractor'] ?? '')) === '') {
            $payload['infractor'] = CasePartyNameHelper::getPerjudicanteFullName($case);
        }

        if (trim((string) ($payload['infractorDocumento'] ?? '')) === '') {
            $payload['infractorDocumento'] = trim((string) $case->get('cDocumentoPerjudicante'));
        }

        if (trim((string) ($payload['infractorTelefono'] ?? '')) === '') {
            $payload['infractorTelefono'] = trim((string) $case->get('cTelefonoPerjudicante'));
        }

        if (trim((string) ($payload['infractorDireccion'] ?? '')) === '') {
            $payload['infractorDireccion'] = trim((string) $case->get('cDireccionPerjudicante'));
        }

        if (trim((string) ($payload['barrio'] ?? '')) === '') {
            $payload['barrio'] = trim((string) $case->get('cBarrioPeticionario'));
        }

        if (trim((string) ($payload['numeroRadicado'] ?? '')) === '') {
            $payload['numeroRadicado'] = trim((string) $case->get('cNumeroRadicado'));
        }

        if (trim((string) ($payload['expediente'] ?? '')) === '') {
            $payload['expediente'] = trim((string) $case->get('cExpediente'));
        }

        if (trim((string) ($payload['ubicacionHechos'] ?? '')) === '') {
            $payload['ubicacionHechos'] = trim((string) $case->get('cDireccionPeticionario'));
        }

        return $payload;
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
            'fecha' => $this->formatDate($acta->get('fecha')),
            'fechaVisita' => $this->formatDateTime($acta->get('fechaVisita')),
            'fechaHora' => $this->formatDateTime($acta->get('fechaVisita')),
            'modoDiligenciamiento' => trim((string) $acta->get('modoDiligenciamiento')) ?: 'Digital',
            'modo' => strtolower(trim((string) $acta->get('modoDiligenciamiento')) ?: 'digital') === 'manual'
                ? 'manual'
                : 'digital',
            'posibleAfectante' => trim((string) $acta->get('posibleAfectante')),
            'acompanante' => trim((string) $acta->get('posibleAfectante')),
            'acompananteCedula' => '',
            'acompananteCorreo' => '',
            'acompananteTelefono' => trim((string) $acta->get('telefono')),
            'acompananteDireccion' => trim((string) $acta->get('direccionAfectacion')),
            'infractor' => '',
            'infractorDocumento' => '',
            'infractorCorreo' => '',
            'infractorTelefono' => '',
            'infractorDireccion' => '',
            'recursoTema' => '',
            'numeroRadicado' => trim((string) $acta->get('numeroRadicado')),
            'expediente' => trim((string) $acta->get('expediente')),
            'direccionAfectacion' => trim((string) $acta->get('direccionAfectacion')),
            'ubicacionHechos' => trim((string) $acta->get('direccionAfectacion')),
            'telefono' => trim((string) $acta->get('telefono')),
            'barrio' => trim((string) $acta->get('barrio')),
            'zona' => trim((string) $acta->get('zona')),
            'coordenadas' => '',
            'objetoVisita' => trim((string) $acta->get('objetoVisita')),
            'situacionEncontrada' => trim((string) $acta->get('situacionEncontrada')),
            'descripcionHecho' => '',
            'analisisSituacion' => trim((string) $acta->get('analisisSituacion')),
            'registroFotografico' => $registroFotografico,
            'conclusion' => trim((string) $acta->get('conclusion')),
            'procedimiento' => '',
            'requerimientos' => trim((string) $acta->get('requerimientos')),
            'observaciones' => '',
            'accionesRecomendadas' => ['Verificación'],
            'funcionarioNombre' => trim((string) $acta->get('funcionarioNombre')),
            'funcionarioCedula' => trim((string) $acta->get('funcionarioCedula')),
            'funcionarioCargo' => trim((string) $acta->get('funcionarioCargo')),
            'establecimientoNombre' => trim((string) $acta->get('establecimientoNombre')),
            'establecimientoCedula' => trim((string) $acta->get('establecimientoCedula')),
            'establecimientoCargo' => trim((string) $acta->get('establecimientoCargo')),
            'acompananteNombre' => trim((string) $acta->get('establecimientoNombre')),
            'acompananteCedulaFirma' => trim((string) $acta->get('establecimientoCedula')),
            'acompananteCargo' => trim((string) $acta->get('establecimientoCargo')),
        ];
    }

    private function formatDate(mixed $value): string
    {
        if (!$value) {
            return '';
        }

        $formatted = AlcaldiaDateTimeHelper::formatDocumentDate($value);

        return $formatted !== '' ? $formatted : (string) $value;
    }

    private function formatDateTime(mixed $value): string
    {
        if (!$value) {
            return '';
        }

        $formatted = AlcaldiaDateTimeHelper::formatDocumentDateTime($value);

        return $formatted !== '' ? $formatted : (string) $value;
    }
}
