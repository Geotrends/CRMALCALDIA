<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Acl;
use Espo\Core\Exceptions\Error;
use Espo\Core\Exceptions\Forbidden;
use Espo\Core\Exceptions\NotFound;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;
use ZipArchive;

/**
 * Plantilla del informe técnico de una visita, prellenada con los datos de la solicitud. Es una
 * plantilla genérica (formatos/InformeTecnico.docx) hasta que se defina el formato oficial.
 */
class InformeTecnicoPlantilla
{
    private const NOMBRE_PLANTILLA = 'InformeTecnico.docx';

    public function __construct(
        private EntityManager $entityManager,
        private Acl $acl
    ) {}

    /**
     * @return array{path: string, name: string, type: string}
     * @throws Forbidden
     * @throws NotFound
     * @throws Error
     */
    public function generar(string $intervencionId): array
    {
        $intervencion = $this->entityManager->getEntityById('IntervencionTecnica', $intervencionId);

        if (!$intervencion) {
            throw new NotFound();
        }

        if (!$this->acl->checkEntityRead($intervencion)) {
            throw new Forbidden();
        }

        $plantilla = $this->rutaPlantilla();
        $dir = sys_get_temp_dir() . '/informe-tecnico-' . bin2hex(random_bytes(8));

        if (!mkdir($dir, 0770, true) && !is_dir($dir)) {
            throw new Error('No se pudo crear el directorio temporal.');
        }

        $nombre = 'Informe-tecnico-' . (preg_replace('/[^\w\-]+/u', '_', (string) $intervencion->get('name')) ?: 'visita') . '.docx';
        $salida = $dir . '/' . $nombre;

        if (!copy($plantilla, $salida)) {
            throw new Error('No se pudo preparar la plantilla.');
        }

        $zip = new ZipArchive();

        if ($zip->open($salida) !== true) {
            throw new Error('La plantilla del informe técnico no es válida.');
        }

        $xml = $zip->getFromName('word/document.xml');

        if ($xml === false) {
            $zip->close();

            throw new Error('La plantilla del informe técnico no es válida.');
        }

        $valores = $this->valores($intervencion);
        $reemplazos = [];

        foreach ($valores as $clave => $valor) {
            $reemplazos['{{' . $clave . '}}'] = htmlspecialchars($valor, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        }

        $zip->addFromString('word/document.xml', strtr($xml, $reemplazos));
        $zip->close();

        return [
            'path' => $salida,
            'name' => $nombre,
            'type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
    }

    /**
     * @return array<string, string>
     */
    private function valores(Entity $intervencion): array
    {
        $case = $this->caso($intervencion);
        $acta = $this->entityManager
            ->getRDBRepository('ActaVisita')
            ->where(['intervencionTecnicaId' => $intervencion->getId()])
            ->order('createdAt', 'DESC')
            ->findOne();
        $programacion = $intervencion->get('programacionVisitaId')
            ? $this->entityManager->getEntityById('ProgramacionVisita', $intervencion->get('programacionVisitaId'))
            : null;
        $fecha = $acta?->get('fechaVisita') ?: $intervencion->get('fechaEjecucion') ?: $intervencion->get('fechaProgramada');

        return [
            'RADICADO' => (string) ($case?->get('cNumeroRadicado') ?? ''),
            'VISITA' => (string) ($programacion?->get('name') ?? $intervencion->get('name')),
            'FECHA_VISITA' => $fecha ? (string) $fecha : '',
            'INSPECTOR' => (string) ($intervencion->get('responsableName') ?? ''),
            'DIRECCION' => (string) ($acta?->get('direccionAfectacion') ?: $case?->get('cDireccionPerjudicante') ?: $case?->get('cDireccionPeticionario') ?: ''),
            'PETICIONARIO' => $case ? CasePartyNameHelper::getPeticionarioFullName($case) : '',
        ];
    }

    private function caso(Entity $intervencion): ?Entity
    {
        $gestion = $intervencion->get('gestionTecnicaId')
            ? $this->entityManager->getEntityById('GestionTecnica', $intervencion->get('gestionTecnicaId'))
            : null;

        return $gestion?->get('caseId')
            ? $this->entityManager->getEntityById('Case', $gestion->get('caseId'))
            : null;
    }

    private function rutaPlantilla(): string
    {
        foreach ([
            __DIR__ . '/../../files/templates/' . self::NOMBRE_PLANTILLA,
            '/opt/bootstrap/repo/formatos/' . self::NOMBRE_PLANTILLA,
        ] as $ruta) {
            $real = realpath($ruta);

            if ($real && is_readable($real)) {
                return $real;
            }
        }

        throw new Error('No se encontró la plantilla del informe técnico.');
    }
}
