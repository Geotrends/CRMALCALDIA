<?php

namespace Espo\Custom\Tools\Party;

class DocumentNormalizer
{
    public static function normalize(string $document): string
    {
        $document = trim($document);

        if ($document === '') {
            return '';
        }

        return preg_replace('/[\s.\-]/', '', $document) ?? '';
    }

    /**
     * @return string[]
     */
    public static function candidates(string $document): array
    {
        $document = trim($document);
        $normalized = self::normalize($document);

        $list = [];

        if ($document !== '') {
            $list[] = $document;
        }

        if ($normalized !== '' && $normalized !== $document) {
            $list[] = $normalized;
        }

        return array_values(array_unique($list));
    }
}
