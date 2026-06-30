<?php

use Espo\Core\Utils\Metadata;

/**
 * Permisos de Meeting para todos los roles operativos.
 *
 * @param array<string, mixed> $data
 * @param array<string, mixed> $fieldData
 */
function alcaldiaApplyMeetingPermissions(
    Metadata $metadata,
    array &$data,
    array &$fieldData,
    string $read = 'own',
    string $edit = 'own'
): void {
    if (!$metadata->get(['scopes', 'Meeting', 'entity'])) {
        return;
    }

    $data['Meeting'] = [
        'create' => 'yes',
        'read' => $read,
        'edit' => $edit,
        'delete' => 'no',
        'stream' => 'no',
    ];

    $fields = array_keys($metadata->get(['entityDefs', 'Meeting', 'fields']) ?? []);

    if ($fields === []) {
        return;
    }

    if (!isset($fieldData['Meeting']) || !is_array($fieldData['Meeting'])) {
        $fieldData['Meeting'] = [];
    }

    foreach ($fields as $field) {
        $fieldData['Meeting'][$field] = [
            'read' => 'yes',
            'edit' => 'yes',
        ];
    }
}
