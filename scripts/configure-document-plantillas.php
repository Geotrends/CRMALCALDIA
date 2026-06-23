<?php

/**
 * Carga las plantillas oficiales en Documentos (Formato solicitud, Acta de visita, Actuo archivo).
 *
 * docker cp scripts/configure-document-plantillas.php espocrm:/tmp/
 * docker exec espocrm php /tmp/configure-document-plantillas.php
 */

require_once '/var/www/html/bootstrap.php';

use Espo\Core\Application;
use Espo\Core\DataManager;
use Espo\Entities\Attachment;
use Espo\ORM\EntityManager;

$app = new Application();
$app->setupSystemUser();

/** @var EntityManager $em */
$em = $app->getContainer()->getByClass(EntityManager::class);

$templatesDir = '/var/www/html/custom/Espo/Custom/files/templates';

$plantillas = [
    [
        'name' => 'Formato de solicitud',
        'cCategoria' => 'Formato solicitud',
        'fileName' => 'FormatoSolicitud.doc',
        'mime' => 'application/msword',
        'description' => 'Plantilla oficial para la solicitud de queja o petición ciudadana.',
    ],
    [
        'name' => 'Acta de visita',
        'cCategoria' => 'Acta de visita',
        'fileName' => 'ActaVisita2.docx',
        'mime' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'description' => 'Plantilla oficial del acta de visita de inspección.',
    ],
    [
        'name' => 'Actuo archivo',
        'cCategoria' => 'Actuo archivo',
        'fileName' => 'ActuoArchivo.docx',
        'mime' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'description' => 'Plantilla oficial del auto de archivo del proceso.',
    ],
];

$today = date('Y-m-d');

foreach ($plantillas as $cfg) {
    $sourcePath = $templatesDir . '/' . $cfg['fileName'];

    if (!is_readable($sourcePath)) {
        echo "AVISO: no se encontró {$cfg['fileName']} en {$templatesDir}\n";
        continue;
    }

    $document = $em->getRDBRepository('Document')
        ->where([
            'cCategoria' => $cfg['cCategoria'],
            'name' => $cfg['name'],
        ])
        ->findOne();

    if (!$document) {
        $document = $em->getRDBRepository('Document')->getNew();
        $document->set('name', $cfg['name']);
        $document->set('cCategoria', $cfg['cCategoria']);
        $document->set('status', 'Active');
        $document->set('publishDate', $today);
        $document->set('description', $cfg['description']);
        $em->saveEntity($document);
        echo "Documento creado: {$cfg['name']}\n";
    } else {
        $document->set('status', 'Active');
        $document->set('description', $cfg['description']);

        if (!$document->get('publishDate')) {
            $document->set('publishDate', $today);
        }

        $em->saveEntity($document);
        echo "Documento actualizado: {$cfg['name']}\n";
    }

    $previousFileId = $document->get('fileId');

    if ($previousFileId) {
        $previous = $em->getEntityById(Attachment::ENTITY_TYPE, $previousFileId);

        if ($previous) {
            $em->removeEntity($previous);
        }
    }

    $contents = (string) file_get_contents($sourcePath);

    $attachment = $em->getRDBRepositoryByClass(Attachment::class)->getNew();
    $attachment
        ->setName($cfg['fileName'])
        ->setType($cfg['mime'])
        ->setRole(Attachment::ROLE_ATTACHMENT)
        ->setTargetField('file')
        ->set('parentType', 'Document')
        ->set('parentId', $document->getId())
        ->setContents($contents);

    $em->saveEntity($attachment);

    $document->set('fileId', $attachment->getId());
    $document->set('fileName', $attachment->getName());
    $em->saveEntity($document);

    echo "  → Archivo adjunto: {$cfg['fileName']}\n";
}

require_once __DIR__ . '/includes/deploy-rebuild.php';

deploy_maybe_rebuild($app);
echo "Plantillas de documentos listas.\n";
