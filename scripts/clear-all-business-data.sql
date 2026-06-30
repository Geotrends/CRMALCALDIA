-- Reset TOTAL de datos (PostgreSQL). Solo emergencia manual.
-- En deploy normal usa scripts/wipe-business-data.php (automático).
--
-- BORRA: usuarios, roles, equipos, casos, contactos, todo.
-- CONSERVA: layouts, plantillas, scheduled_job, configuración del sistema.
-- Tras deploy: solo queda el usuario admin del .env

BEGIN;

DO $$
DECLARE
    r RECORD;
    keep_tables TEXT[] := ARRAY[
        'scheduled_job', 'extension', 'integration', 'system_data',
        'layout_record', 'layout_set',
        'currency', 'currency_record', 'currency_record_rate', 'address_country',
        'authentication_provider', 'o_auth_provider',
        'email_template', 'email_template_category', 'email_template_category_path',
        'template', 'inbound_email', 'email_account', 'email_filter',
        'webhook', 'dashboard_template',
        'working_time_calendar', 'working_time_range', 'working_time_calendar_working_time_range',
        'next_number', 'unique_id', 'app_secret',
        'group_email_folder', 'group_email_folder_team',
        'portal', 'portal_role', 'portal_portal_role'
    ];
    table_list TEXT := '';
BEGIN
    FOR r IN
        SELECT tablename FROM pg_tables
        WHERE schemaname = 'public'
          AND NOT (tablename = ANY (keep_tables))
        ORDER BY tablename
    LOOP
        IF table_list <> '' THEN
            table_list := table_list || ', ';
        END IF;

        table_list := table_list || format('%I', r.tablename);
    END LOOP;

    IF table_list <> '' THEN
        EXECUTE 'TRUNCATE TABLE ' || table_list || ' RESTART IDENTITY CASCADE';
    END IF;
END $$;

UPDATE public.next_number SET value = 1;

COMMIT;
