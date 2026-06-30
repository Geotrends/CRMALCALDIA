<?php

namespace Espo\Custom\Tools\App;

/**
 * Fecha y hora oficiales del CRM Alcaldía: Bogotá, hora militar (24 h).
 */
class AlcaldiaDateTimeHelper
{
    public const TIME_ZONE = AlcaldiaLocaleDefaults::TIME_ZONE;

    /** Formato EspoCRM (moment.js): DD.MM.YYYY */
    public const ESPO_DATE_FORMAT = AlcaldiaLocaleDefaults::DATE_FORMAT;

    /** Formato EspoCRM (moment.js): HH:mm — hora militar */
    public const ESPO_TIME_FORMAT = AlcaldiaLocaleDefaults::TIME_FORMAT;

    /** Almacenamiento interno / API */
    public const PHP_STORAGE_DATE = 'Y-m-d';

    public const PHP_STORAGE_DATETIME = 'Y-m-d H:i';

    /** Pantalla CRM (equivalente a DD.MM.YYYY) */
    public const PHP_DISPLAY_DATE = 'd.m.Y';

    /** Pantalla CRM con hora militar */
    public const PHP_DISPLAY_DATETIME = 'd.m.Y H:i';

    /** Documentos Word / Excel ciudadanos */
    public const PHP_DOCUMENT_DATE = 'd/m/Y';

    public const PHP_DOCUMENT_DATETIME = 'd/m/Y H:i';

    public static function timeZone(): \DateTimeZone
    {
        return new \DateTimeZone(self::TIME_ZONE);
    }

    public static function now(): \DateTimeImmutable
    {
        return new \DateTimeImmutable('now', self::timeZone());
    }

    public static function storageNowString(): string
    {
        return self::now()->format(self::PHP_STORAGE_DATETIME);
    }

    public static function storageDateString(): string
    {
        return self::now()->format(self::PHP_STORAGE_DATE);
    }

    public static function toStorageDateTime(mixed $value): ?string
    {
        $parsed = self::parse($value);

        if (!$parsed) {
            return null;
        }

        return $parsed->setTimezone(self::timeZone())->format(self::PHP_STORAGE_DATETIME);
    }

    public static function formatDisplayDate(mixed $value): string
    {
        $parsed = self::parse($value);

        return $parsed
            ? $parsed->setTimezone(self::timeZone())->format(self::PHP_DISPLAY_DATE)
            : '';
    }

    public static function formatDisplayDateTime(mixed $value): string
    {
        $parsed = self::parse($value);

        return $parsed
            ? $parsed->setTimezone(self::timeZone())->format(self::PHP_DISPLAY_DATETIME)
            : '';
    }

    public static function formatDocumentDate(mixed $value): string
    {
        $parsed = self::parse($value);

        return $parsed
            ? $parsed->setTimezone(self::timeZone())->format(self::PHP_DOCUMENT_DATE)
            : '';
    }

    public static function formatDocumentDateTime(mixed $value): string
    {
        $parsed = self::parse($value);

        return $parsed
            ? $parsed->setTimezone(self::timeZone())->format(self::PHP_DOCUMENT_DATETIME)
            : '';
    }

    public static function documentNowDate(): string
    {
        return self::now()->format(self::PHP_DOCUMENT_DATE);
    }

    public static function documentNowDateTime(): string
    {
        return self::now()->format(self::PHP_DOCUMENT_DATETIME);
    }

    private static function parse(mixed $value): ?\DateTimeImmutable
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return \DateTimeImmutable::createFromInterface($value);
        }

        $string = trim((string) $value);

        if ($string === '') {
            return null;
        }

        try {
            return new \DateTimeImmutable($string, new \DateTimeZone('UTC'));
        } catch (\Exception) {
            try {
                return new \DateTimeImmutable($string, self::timeZone());
            } catch (\Exception) {
                return null;
            }
        }
    }
}
