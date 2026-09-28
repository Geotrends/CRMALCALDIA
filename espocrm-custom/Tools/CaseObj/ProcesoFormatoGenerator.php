<?php

namespace Espo\Custom\Tools\CaseObj;

use Espo\Core\Exceptions\Error;
use Espo\Entities\Attachment;
use Espo\ORM\Entity;
use Espo\ORM\EntityManager;

/**
 * Genera en Word los formatos del proceso del expediente (notificación personal,
 * notificación por aviso, proyecto de decisión) con files/scripts/fill-formato-proceso.py
 * y los guarda como adjunto del registro indicado.
 */
class ProcesoFormatoGenerator
{
    public const PLANTILLA_NOTIFICACION_PERSONAL = 'NotificacionPersonal.docx';
    public const PLANTILLA_NOTIFICACION_AVISO = 'NotificacionAviso.docx';
    public const PLANTILLA_CITACION = 'Citacion.docx';
    public const PLANTILLA_RESOLUCION = 'Resolucion117.docx';
    public const PLANTILLA_ARCHIVO = 'ActuoArchivo.docx';

    public function __construct(
        private EntityManager $entityManager
    ) {}

    /**
     * @param array<string, mixed> $payload
     */
    public function generar(string $tipo, array $payload, Entity $destino, string $field, string $nombreArchivo, ?string $plantilla = null): string
    {
        $script = realpath(__DIR__ . '/../../files/scripts/fill-formato-proceso.py');
        $template = $plantilla ? (realpath(__DIR__ . '/../../files/templates/' . $plantilla) ?: '') : '';

        if (!$script || ($plantilla && $template === '')) {
            throw new Error('No se encontró el generador o la plantilla del formato.');
        }

        $workDir = sys_get_temp_dir() . '/proceso-' . uniqid('', true);
        mkdir($workDir . '/lo-profile', 0770, true);
        $output = $workDir . '/' . (preg_replace('/[^A-Za-z0-9.-]/', '', $nombreArchivo) ?: 'formato.docx');

        $process = proc_open(
            array_values(array_filter(['python3', $script, $output, $tipo, $template], static fn ($v) => $v !== '')),
            [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes,
            $workDir,
            ['HOME' => $workDir, 'TMPDIR' => $workDir, 'LO_PROFILE' => $workDir . '/lo-profile', 'PATH' => getenv('PATH') ?: '/usr/local/bin:/usr/bin:/bin']
        );

        if (!is_resource($process)) {
            throw new Error('No se pudo ejecutar el generador del formato.');
        }

        fwrite($pipes[0], json_encode($payload, JSON_UNESCAPED_UNICODE));
        fclose($pipes[0]);
        $err = stream_get_contents($pipes[2]);
        fclose($pipes[1]);
        fclose($pipes[2]);

        if (proc_close($process) !== 0 || !is_readable($output)) {
            throw new Error('No se pudo generar el formato: ' . trim((string) $err));
        }

        $attachment = $this->entityManager->getNewEntity(Attachment::ENTITY_TYPE);
        $attachment->set([
            'name' => basename($output),
            'type' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'role' => 'Attachment',
            'relatedType' => $destino->getEntityType(),
            'relatedId' => $destino->getId(),
            'field' => $field,
            'contents' => file_get_contents($output),
        ]);
        $this->entityManager->saveEntity($attachment);

        array_map('unlink', glob($workDir . '/*.*') ?: []);

        return $attachment->getId();
    }

    /**
     * Copia de un adjunto (mismo archivo) para vincularlo a otro registro.
     */
    public function copiar(string $attachmentId, Entity $destino, string $field): ?string
    {
        $original = $attachmentId !== '' ? $this->entityManager->getEntityById(Attachment::ENTITY_TYPE, $attachmentId) : null;

        if (!$original) {
            return null;
        }

        $copia = $this->entityManager->getNewEntity(Attachment::ENTITY_TYPE);
        $copia->set([
            'name' => $original->get('name'),
            'type' => $original->get('type'),
            'size' => $original->get('size'),
            'role' => 'Attachment',
            'relatedType' => $destino->getEntityType(),
            'relatedId' => $destino->getId(),
            'field' => $field,
            'sourceId' => $original->get('sourceId') ?: $original->getId(),
            'storage' => $original->get('storage'),
        ]);
        $this->entityManager->saveEntity($copia);

        return $copia->getId();
    }
}
