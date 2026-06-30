<?php

use Espo\Core\Utils\Metadata;

/**
 * Permisos de Task para todos los roles operativos.
 *
 * @param array<string, mixed> $data
 * @param array<string, mixed> $fieldData
 */
function alcaldiaApplyTaskPermissions(
    Metadata $metadata,
    array &$data,
    array &$fieldData,
    string $read = 'own',
    string $edit = 'own'
): void {
    if (!$metadata->get(['scopes', 'Task', 'entity'])) {
        return;
    }

    $data['Task'] = [
        'create' => 'yes',
        'read' => $read,
        'edit' => $edit,
        'delete' => 'no',
        'stream' => 'no',
    ];

    $fields = array_keys($metadata->get(['entityDefs', 'Task', 'fields']) ?? []);

    if ($fields === []) {
        return;
    }

    $fieldData['Task'] = [];

    foreach ($fields as $field) {
        $fieldData['Task'][$field] = [
            'read' => 'yes',
            'edit' => 'yes',
        ];
    }
}
