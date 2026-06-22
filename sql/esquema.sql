--
-- PostgreSQL database dump
--

\restrict Aqjd9ROayMckjlkHWqdpYmtSGZfqFrtnDqw4yzXV5TrEGAO4Htp1RU6fDqTR2ma

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    id character varying(17) NOT NULL,
    name character varying(249) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    website character varying(255) DEFAULT NULL::character varying,
    type character varying(255) DEFAULT NULL::character varying,
    industry character varying(255) DEFAULT NULL::character varying,
    sic_code character varying(40) DEFAULT NULL::character varying,
    billing_address_street character varying(255) DEFAULT NULL::character varying,
    billing_address_city character varying(100) DEFAULT NULL::character varying,
    billing_address_state character varying(100) DEFAULT NULL::character varying,
    billing_address_country character varying(100) DEFAULT NULL::character varying,
    billing_address_postal_code character varying(40) DEFAULT NULL::character varying,
    shipping_address_street character varying(255) DEFAULT NULL::character varying,
    shipping_address_city character varying(100) DEFAULT NULL::character varying,
    shipping_address_state character varying(100) DEFAULT NULL::character varying,
    shipping_address_country character varying(100) DEFAULT NULL::character varying,
    shipping_address_postal_code character varying(40) DEFAULT NULL::character varying,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    stream_updated_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    campaign_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    version_number bigint,
    c_sector_economico character varying(100) DEFAULT NULL::character varying,
    c_nit character varying(100) DEFAULT NULL::character varying
);


--
-- Name: account_contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_contact (
    id bigint NOT NULL,
    account_id character varying(17) DEFAULT NULL::character varying,
    contact_id character varying(17) DEFAULT NULL::character varying,
    role character varying(100) DEFAULT NULL::character varying,
    is_inactive boolean DEFAULT false,
    deleted boolean DEFAULT false
);


--
-- Name: account_contact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_contact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_contact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_contact_id_seq OWNED BY public.account_contact.id;


--
-- Name: account_document; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_document (
    id bigint NOT NULL,
    account_id character varying(17) DEFAULT NULL::character varying,
    document_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: account_document_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_document_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_document_id_seq OWNED BY public.account_document.id;


--
-- Name: account_portal_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_portal_user (
    id bigint NOT NULL,
    user_id character varying(17) DEFAULT NULL::character varying,
    account_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: account_portal_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_portal_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_portal_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_portal_user_id_seq OWNED BY public.account_portal_user.id;


--
-- Name: account_target_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_target_list (
    id bigint NOT NULL,
    account_id character varying(17) DEFAULT NULL::character varying,
    target_list_id character varying(17) DEFAULT NULL::character varying,
    opted_out boolean DEFAULT false,
    deleted boolean DEFAULT false
);


--
-- Name: account_target_list_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_target_list_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_target_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_target_list_id_seq OWNED BY public.account_target_list.id;


--
-- Name: acta_visita; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.acta_visita (
    id character varying(17) NOT NULL,
    name character varying(200) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    autorizacion_datos boolean DEFAULT false NOT NULL,
    posible_afectante character varying(255) DEFAULT NULL::character varying,
    numero_radicado character varying(100) DEFAULT NULL::character varying,
    direccion_afectacion character varying(500) DEFAULT NULL::character varying,
    telefono character varying(50) DEFAULT NULL::character varying,
    barrio character varying(150) DEFAULT NULL::character varying,
    zona character varying(255) DEFAULT NULL::character varying,
    fecha_visita date,
    objeto_visita text,
    situacion_encontrada text,
    analisis_situacion text,
    conclusion text,
    requerimientos text,
    funcionario_firma character varying(255) DEFAULT NULL::character varying,
    funcionario_nombre character varying(150) DEFAULT NULL::character varying,
    funcionario_cedula character varying(50) DEFAULT NULL::character varying,
    funcionario_cargo character varying(150) DEFAULT NULL::character varying,
    establecimiento_firma character varying(255) DEFAULT NULL::character varying,
    establecimiento_nombre character varying(150) DEFAULT NULL::character varying,
    establecimiento_cedula character varying(50) DEFAULT NULL::character varying,
    establecimiento_cargo character varying(150) DEFAULT NULL::character varying,
    estado character varying(255) DEFAULT 'Pendiente'::character varying,
    visto_bueno boolean DEFAULT false NOT NULL,
    observaciones_revision text,
    fecha_aprobacion date,
    registro_oficial boolean DEFAULT false NOT NULL,
    case_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    expediente character varying(100) DEFAULT NULL::character varying,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    c_formato_acta_visita_pdf_id character varying(17) DEFAULT NULL::character varying,
    fecha date,
    modo_diligenciamiento character varying(255) DEFAULT 'Digital'::character varying
);


--
-- Name: action_history_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.action_history_record (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    number bigint NOT NULL,
    target_type character varying(100) DEFAULT NULL::character varying,
    data text,
    action character varying(255) DEFAULT NULL::character varying,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    ip_address character varying(39) DEFAULT NULL::character varying,
    target_id character varying(17) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying,
    auth_token_id character varying(17) DEFAULT NULL::character varying,
    auth_log_record_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: action_history_record_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.action_history_record_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: action_history_record_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.action_history_record_number_seq OWNED BY public.action_history_record.number;


--
-- Name: actuo_archivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.actuo_archivo (
    id character varying(17) NOT NULL,
    name character varying(200) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    fecha_auto date,
    numero_radicado character varying(100) DEFAULT NULL::character varying,
    consecutivo_interno character varying(100) DEFAULT NULL::character varying,
    referencia text,
    motivo_archivo text,
    fecha_dada date,
    inspector_nombre character varying(150) DEFAULT NULL::character varying,
    inspector_cargo character varying(200) DEFAULT 'Inspector de Policía para Asuntos Ambientales'::character varying,
    estado character varying(255) DEFAULT 'Pendiente'::character varying,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    case_id character varying(17) DEFAULT NULL::character varying,
    c_formato_actuo_archivo_pdf_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    inspector_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: address_country; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.address_country (
    id character varying(17) NOT NULL,
    name character varying(100) DEFAULT NULL::character varying,
    code character varying(2) DEFAULT NULL::character varying,
    is_preferred boolean DEFAULT false NOT NULL
);


--
-- Name: app_log_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_log_record (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    number bigint NOT NULL,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    message text,
    level character varying(9) DEFAULT NULL::character varying,
    code integer,
    exception_class character varying(512) DEFAULT NULL::character varying,
    file character varying(512) DEFAULT NULL::character varying,
    line integer,
    request_method character varying(7) DEFAULT NULL::character varying,
    request_resource_path character varying(255) DEFAULT NULL::character varying,
    request_url character varying(512) DEFAULT NULL::character varying
);


--
-- Name: app_log_record_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.app_log_record_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: app_log_record_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.app_log_record_number_seq OWNED BY public.app_log_record.number;


--
-- Name: app_secret; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.app_secret (
    id character varying(17) NOT NULL,
    name character varying(100) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    value text,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    delete_id character varying(17) DEFAULT '0'::character varying NOT NULL,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: array_value; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.array_value (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    value character varying(100) DEFAULT NULL::character varying,
    attribute character varying(100) DEFAULT NULL::character varying,
    entity_id character varying(17) DEFAULT NULL::character varying,
    entity_type character varying(100) DEFAULT NULL::character varying
);


--
-- Name: asignacion_historial; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asignacion_historial (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    numero_radicado character varying(100) DEFAULT NULL::character varying,
    fecha timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    motivo text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    case_id character varying(17) DEFAULT NULL::character varying,
    asignado_por_id character varying(17) DEFAULT NULL::character varying,
    responsable_anterior_id character varying(17) DEFAULT NULL::character varying,
    responsable_nuevo_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: attachment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attachment (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    type character varying(100) DEFAULT NULL::character varying,
    size bigint,
    field character varying(255) DEFAULT NULL::character varying,
    is_being_uploaded boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    role character varying(36) DEFAULT NULL::character varying,
    storage character varying(24) DEFAULT NULL::character varying,
    storage_file_path character varying(260) DEFAULT NULL::character varying,
    global boolean DEFAULT false NOT NULL,
    parent_id character varying(17) DEFAULT NULL::character varying,
    parent_type character varying(100) DEFAULT NULL::character varying,
    related_id character varying(17) DEFAULT NULL::character varying,
    related_type character varying(100) DEFAULT NULL::character varying,
    source_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: auth_log_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_log_record (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    username character varying(100) DEFAULT NULL::character varying,
    ip_address character varying(45) DEFAULT NULL::character varying,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    is_denied boolean DEFAULT false NOT NULL,
    denial_reason character varying(255) DEFAULT NULL::character varying,
    request_time double precision,
    request_url character varying(255) DEFAULT NULL::character varying,
    request_method character varying(15) DEFAULT NULL::character varying,
    authentication_method character varying(255) DEFAULT NULL::character varying,
    portal_id character varying(17) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying,
    auth_token_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: auth_token; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_token (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    token character varying(36) DEFAULT NULL::character varying,
    hash character varying(150) DEFAULT NULL::character varying,
    secret character varying(36) DEFAULT NULL::character varying,
    ip_address character varying(45) DEFAULT NULL::character varying,
    is_active boolean DEFAULT true NOT NULL,
    last_access timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    user_id character varying(17) DEFAULT NULL::character varying,
    portal_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: authentication_provider; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.authentication_provider (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    method character varying(255) DEFAULT NULL::character varying,
    oidc_client_id character varying(255) DEFAULT NULL::character varying,
    oidc_client_secret character varying(255) DEFAULT NULL::character varying,
    oidc_authorization_endpoint character varying(255) DEFAULT NULL::character varying,
    oidc_user_info_endpoint character varying(255) DEFAULT NULL::character varying,
    oidc_token_endpoint character varying(255) DEFAULT NULL::character varying,
    oidc_jwks_endpoint character varying(255) DEFAULT NULL::character varying,
    oidc_jwt_signature_algorithm_list text DEFAULT '["RS256"]'::text,
    oidc_scopes text DEFAULT '["profile","email","phone"]'::text,
    oidc_create_user boolean DEFAULT false NOT NULL,
    oidc_username_claim character varying(255) DEFAULT 'sub'::character varying,
    oidc_sync boolean DEFAULT false NOT NULL,
    oidc_logout_url character varying(255) DEFAULT NULL::character varying,
    oidc_authorization_prompt character varying(14) DEFAULT NULL::character varying
);


--
-- Name: autofollow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.autofollow (
    id integer NOT NULL,
    deleted boolean DEFAULT false,
    entity_type character varying(100) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: autofollow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.autofollow_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: autofollow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.autofollow_id_seq OWNED BY public.autofollow.id;


--
-- Name: c_case_document; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.c_case_document (
    id bigint NOT NULL,
    case_id character varying(17) DEFAULT NULL::character varying,
    document_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: c_location; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.c_location (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: call; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    status character varying(255) DEFAULT 'Planned'::character varying,
    date_start timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    date_end timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    direction character varying(255) DEFAULT 'Outbound'::character varying,
    description text,
    uid character varying(255) DEFAULT NULL::character varying,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    parent_id character varying(17) DEFAULT NULL::character varying,
    parent_type character varying(100) DEFAULT NULL::character varying,
    account_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: call_contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_contact (
    id bigint NOT NULL,
    call_id character varying(17) DEFAULT NULL::character varying,
    contact_id character varying(17) DEFAULT NULL::character varying,
    status character varying(36) DEFAULT 'None'::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: call_contact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.call_contact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: call_contact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.call_contact_id_seq OWNED BY public.call_contact.id;


--
-- Name: call_lead; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_lead (
    id bigint NOT NULL,
    call_id character varying(17) DEFAULT NULL::character varying,
    lead_id character varying(17) DEFAULT NULL::character varying,
    status character varying(36) DEFAULT 'None'::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: call_lead_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.call_lead_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: call_lead_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.call_lead_id_seq OWNED BY public.call_lead.id;


--
-- Name: call_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.call_user (
    id bigint NOT NULL,
    user_id character varying(17) DEFAULT NULL::character varying,
    call_id character varying(17) DEFAULT NULL::character varying,
    status character varying(36) DEFAULT 'None'::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: call_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.call_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: call_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.call_user_id_seq OWNED BY public.call_user.id;


--
-- Name: campaign; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    status character varying(255) DEFAULT 'Planning'::character varying,
    type character varying(64) DEFAULT 'Email'::character varying,
    start_date date,
    end_date date,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    budget double precision,
    mail_merge_only_with_address boolean DEFAULT true NOT NULL,
    budget_currency character varying(3) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    contacts_template_id character varying(17) DEFAULT NULL::character varying,
    leads_template_id character varying(17) DEFAULT NULL::character varying,
    accounts_template_id character varying(17) DEFAULT NULL::character varying,
    users_template_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: campaign_log_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_log_record (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    action character varying(50) DEFAULT NULL::character varying,
    action_date timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    data text,
    string_data character varying(100) DEFAULT NULL::character varying,
    string_additional_data character varying(100) DEFAULT NULL::character varying,
    application character varying(36) DEFAULT 'Espo'::character varying,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    is_test boolean DEFAULT false NOT NULL,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    campaign_id character varying(17) DEFAULT NULL::character varying,
    parent_id character varying(17) DEFAULT NULL::character varying,
    parent_type character varying(100) DEFAULT NULL::character varying,
    object_id character varying(17) DEFAULT NULL::character varying,
    object_type character varying(100) DEFAULT NULL::character varying,
    queue_item_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: campaign_target_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_target_list (
    id bigint NOT NULL,
    campaign_id character varying(17) DEFAULT NULL::character varying,
    target_list_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: campaign_target_list_excluding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_target_list_excluding (
    id bigint NOT NULL,
    campaign_id character varying(17) DEFAULT NULL::character varying,
    target_list_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: campaign_target_list_excluding_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaign_target_list_excluding_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaign_target_list_excluding_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaign_target_list_excluding_id_seq OWNED BY public.campaign_target_list_excluding.id;


--
-- Name: campaign_target_list_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.campaign_target_list_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: campaign_target_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.campaign_target_list_id_seq OWNED BY public.campaign_target_list.id;


--
-- Name: campaign_tracking_url; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.campaign_tracking_url (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    url character varying(255) DEFAULT NULL::character varying,
    action character varying(12) DEFAULT 'Redirect'::character varying,
    message text,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    campaign_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: case; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."case" (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    number integer NOT NULL,
    status character varying(255) DEFAULT 'Pendiente de radicacion'::character varying,
    priority character varying(255) DEFAULT 'Normal'::character varying,
    type character varying(255) DEFAULT NULL::character varying,
    description text,
    is_internal boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    stream_updated_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    account_id character varying(17) DEFAULT NULL::character varying,
    lead_id character varying(17) DEFAULT NULL::character varying,
    contact_id character varying(17) DEFAULT NULL::character varying,
    inbound_email_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    version_number bigint,
    c_canal_de_reporte character varying(100) DEFAULT 'Seleccione una opción'::character varying,
    c_nombre_del_peticionario character varying(100),
    c_apellido character varying(150),
    c_tipo_de_documento character varying(100) DEFAULT 'CC'::character varying,
    c_numero_de_documento character varying(50),
    c_telefono character varying(100),
    c_correo character varying(200) DEFAULT NULL::character varying,
    c_barrio_residencia character varying(150),
    c_direccion character varying(100) DEFAULT NULL::character varying,
    c_municipio character varying(100) DEFAULT 'Envigado'::character varying,
    c_numero_radicacion character varying(100) DEFAULT NULL::character varying,
    c_expediente character varying(100) DEFAULT NULL::character varying,
    c_fecha_vencimiento date,
    c_fecha_caso timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    c_numero_radicado character varying(100) DEFAULT NULL::character varying,
    c_peticionario character varying(100) DEFAULT NULL::character varying,
    c_cedula character varying(100) DEFAULT NULL::character varying,
    c_barrio character varying(100) DEFAULT 'Seleccione una opción'::character varying,
    c_perjudicante character varying(200) DEFAULT NULL::character varying,
    c_telefono_perjudicante character varying(100) DEFAULT NULL::character varying,
    c_direccion_perjudicante character varying(100) DEFAULT NULL::character varying,
    c_barrio_perjudicante character varying(100) DEFAULT 'Seleccione una opción'::character varying,
    c_respuesta_inmediata character varying(1000) DEFAULT NULL::character varying,
    c_recibida_por_id character varying(17) DEFAULT NULL::character varying,
    c_remitido_a_id character varying(17) DEFAULT NULL::character varying,
    c_formato_solicitud_pdf_id character varying(17) DEFAULT NULL::character varying,
    c_tipo_persona_peticionario character varying(255) DEFAULT 'Seleccione una opción'::character varying,
    c_tipo_persona_perjudicante character varying(255) DEFAULT 'Seleccione una opción'::character varying,
    c_documento_perjudicante character varying(100) DEFAULT NULL::character varying,
    c_perjudicante_contact_id character varying(17) DEFAULT NULL::character varying,
    c_perjudicante_cuenta_id character varying(17) DEFAULT NULL::character varying,
    c_radicado_modo character varying(255) DEFAULT 'Automático'::character varying,
    c_radicado_siglas character varying(255) DEFAULT 'Seleccione una opción'::character varying,
    c_radicado_anio character varying(4) DEFAULT ''::character varying,
    c_recurso_tema character varying(255) DEFAULT 'Seleccione una opción'::character varying,
    c_asunto character varying(255) DEFAULT 'Seleccione una opción'::character varying,
    c_zona_alcaldia character varying(255) DEFAULT 'Seleccione una opción'::character varying,
    c_ultima_actuacion character varying(255) DEFAULT 'Seleccione una opción'::character varying,
    c_proxima_actuacion character varying(255) DEFAULT 'Seleccione una opción'::character varying,
    c_motivo_reasignacion text
);


--
-- Name: case_contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_contact (
    id bigint NOT NULL,
    case_id character varying(17) DEFAULT NULL::character varying,
    contact_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: case_contact_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.case_contact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: case_contact_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.case_contact_id_seq OWNED BY public.case_contact.id;


--
-- Name: case_knowledge_base_article; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.case_knowledge_base_article (
    id bigint NOT NULL,
    case_id character varying(17) DEFAULT NULL::character varying,
    knowledge_base_article_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: case_knowledge_base_article_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.case_knowledge_base_article_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: case_knowledge_base_article_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.case_knowledge_base_article_id_seq OWNED BY public.case_knowledge_base_article.id;


--
-- Name: case_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.case_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: case_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.case_number_seq OWNED BY public."case".number;


--
-- Name: comunicacion_caso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comunicacion_caso (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    numero_radicado character varying(100) DEFAULT NULL::character varying,
    tipo character varying(255) DEFAULT NULL::character varying,
    fecha timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    destinatario character varying(255) DEFAULT NULL::character varying,
    asunto character varying(255) DEFAULT NULL::character varying,
    contenido text,
    es_respuesta_final boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    case_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    destinatario_tercero_id character varying(17) DEFAULT NULL::character varying,
    destinatario_tercero_type character varying(100) DEFAULT NULL::character varying
);


--
-- Name: contact; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    salutation_name character varying(255) DEFAULT NULL::character varying,
    first_name character varying(100) DEFAULT NULL::character varying,
    last_name character varying(100) DEFAULT NULL::character varying,
    description text,
    do_not_call boolean DEFAULT false NOT NULL,
    address_street character varying(255) DEFAULT NULL::character varying,
    address_city character varying(100) DEFAULT NULL::character varying,
    address_state character varying(100) DEFAULT NULL::character varying,
    address_country character varying(100) DEFAULT NULL::character varying,
    address_postal_code character varying(40) DEFAULT NULL::character varying,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    middle_name character varying(100) DEFAULT NULL::character varying,
    stream_updated_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    account_id character varying(17) DEFAULT NULL::character varying,
    campaign_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    c_tipo_de_documento character varying(100) DEFAULT 'CC'::character varying,
    c_numero_de_documento character varying(50) DEFAULT NULL::character varying,
    c_barrio_residencia character varying(150) DEFAULT NULL::character varying,
    c_municipio character varying(100) DEFAULT 'Envigado'::character varying
);


--
-- Name: contact_document; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_document (
    id bigint NOT NULL,
    contact_id character varying(17) DEFAULT NULL::character varying,
    document_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: contact_document_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contact_document_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contact_document_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contact_document_id_seq OWNED BY public.contact_document.id;


--
-- Name: contact_meeting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_meeting (
    id bigint NOT NULL,
    contact_id character varying(17) DEFAULT NULL::character varying,
    meeting_id character varying(17) DEFAULT NULL::character varying,
    status character varying(36) DEFAULT 'None'::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: contact_meeting_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contact_meeting_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contact_meeting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contact_meeting_id_seq OWNED BY public.contact_meeting.id;


--
-- Name: contact_opportunity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_opportunity (
    id bigint NOT NULL,
    contact_id character varying(17) DEFAULT NULL::character varying,
    opportunity_id character varying(17) DEFAULT NULL::character varying,
    role character varying(50) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: contact_opportunity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contact_opportunity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contact_opportunity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contact_opportunity_id_seq OWNED BY public.contact_opportunity.id;


--
-- Name: contact_target_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contact_target_list (
    id bigint NOT NULL,
    contact_id character varying(17) DEFAULT NULL::character varying,
    target_list_id character varying(17) DEFAULT NULL::character varying,
    opted_out boolean DEFAULT false,
    deleted boolean DEFAULT false
);


--
-- Name: contact_target_list_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.contact_target_list_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: contact_target_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.contact_target_list_id_seq OWNED BY public.contact_target_list.id;


--
-- Name: currency; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.currency (
    id character varying(3) NOT NULL,
    rate double precision
);


--
-- Name: currency_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.currency_record (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    code character varying(3) DEFAULT NULL::character varying,
    status character varying(8) DEFAULT 'Active'::character varying,
    delete_id character varying(17) DEFAULT '0'::character varying NOT NULL
);


--
-- Name: currency_record_rate; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.currency_record_rate (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    base_code character varying(3) DEFAULT NULL::character varying,
    date date,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    delete_id character varying(17) DEFAULT '0'::character varying NOT NULL,
    record_id character varying(17) DEFAULT NULL::character varying,
    rate numeric(20,8) DEFAULT NULL::numeric,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: dashboard_template; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_template (
    id character varying(17) NOT NULL,
    name character varying(100) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    layout text,
    dashlets_options text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: document; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    status character varying(255) DEFAULT 'Active'::character varying,
    type character varying(255) DEFAULT NULL::character varying,
    publish_date date,
    expiration_date date,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    file_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    folder_id character varying(17) DEFAULT NULL::character varying,
    c_categoria character varying(255) DEFAULT 'Formato solicitud'::character varying
);


--
-- Name: document_folder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_folder (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    parent_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: document_folder_path; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_folder_path (
    id integer NOT NULL,
    ascendor_id character varying(17) DEFAULT NULL::character varying,
    descendor_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: document_folder_path_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_folder_path_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_folder_path_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_folder_path_id_seq OWNED BY public.document_folder_path.id;


--
-- Name: document_lead; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_lead (
    id bigint NOT NULL,
    document_id character varying(17) DEFAULT NULL::character varying,
    lead_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: document_lead_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_lead_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_lead_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_lead_id_seq OWNED BY public.document_lead.id;


--
-- Name: document_opportunity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_opportunity (
    id bigint NOT NULL,
    document_id character varying(17) DEFAULT NULL::character varying,
    opportunity_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: document_opportunity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_opportunity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_opportunity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_opportunity_id_seq OWNED BY public.document_opportunity.id;


--
-- Name: email; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    from_string character varying(255) DEFAULT NULL::character varying,
    reply_to_string character varying(255) DEFAULT NULL::character varying,
    address_name_map text,
    is_replied boolean DEFAULT false NOT NULL,
    message_id character varying(255) DEFAULT NULL::character varying,
    message_id_internal character varying(300) DEFAULT NULL::character varying,
    body_plain text,
    body text,
    is_html boolean DEFAULT true NOT NULL,
    status character varying(255) DEFAULT 'Archived'::character varying,
    has_attachment boolean DEFAULT false NOT NULL,
    date_sent timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    delivery_date timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    send_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    is_auto_reply boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    is_system boolean DEFAULT false NOT NULL,
    ics_contents text,
    ics_event_uid character varying(255) DEFAULT NULL::character varying,
    group_status_folder character varying(7) DEFAULT NULL::character varying,
    from_email_address_id character varying(17) DEFAULT NULL::character varying,
    parent_id character varying(17) DEFAULT NULL::character varying,
    parent_type character varying(100) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    sent_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    replied_id character varying(17) DEFAULT NULL::character varying,
    created_event_id character varying(17) DEFAULT NULL::character varying,
    created_event_type character varying(100) DEFAULT NULL::character varying,
    group_folder_id character varying(17) DEFAULT NULL::character varying,
    account_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: email_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_account (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    email_address character varying(100) DEFAULT NULL::character varying,
    status character varying(255) DEFAULT 'Active'::character varying,
    host character varying(255) DEFAULT NULL::character varying,
    port integer DEFAULT 993,
    security character varying(255) DEFAULT 'SSL'::character varying,
    username character varying(255) DEFAULT NULL::character varying,
    password character varying(255) DEFAULT NULL::character varying,
    monitored_folders text DEFAULT '["INBOX"]'::text,
    sent_folder character varying(255) DEFAULT NULL::character varying,
    folder_map text,
    store_sent_emails boolean DEFAULT false NOT NULL,
    keep_fetched_emails_unread boolean DEFAULT false NOT NULL,
    fetch_since date,
    fetch_data text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    connected_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    use_imap boolean DEFAULT true NOT NULL,
    use_smtp boolean DEFAULT false NOT NULL,
    smtp_host character varying(255) DEFAULT NULL::character varying,
    smtp_port integer DEFAULT 587,
    smtp_auth boolean DEFAULT true NOT NULL,
    smtp_security character varying(255) DEFAULT 'TLS'::character varying,
    smtp_username character varying(255) DEFAULT NULL::character varying,
    smtp_password character varying(255) DEFAULT NULL::character varying,
    smtp_auth_mechanism character varying(255) DEFAULT 'login'::character varying,
    imap_handler character varying(255) DEFAULT NULL::character varying,
    smtp_handler character varying(255) DEFAULT NULL::character varying,
    email_folder_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: email_address; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_address (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    lower character varying(255) DEFAULT NULL::character varying,
    invalid boolean DEFAULT false NOT NULL,
    opt_out boolean DEFAULT false NOT NULL
);


--
-- Name: email_email_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_email_account (
    id bigint NOT NULL,
    email_id character varying(17) DEFAULT NULL::character varying,
    email_account_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: email_email_account_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_email_account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_email_account_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_email_account_id_seq OWNED BY public.email_email_account.id;


--
-- Name: email_email_address; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_email_address (
    id bigint NOT NULL,
    email_id character varying(17) DEFAULT NULL::character varying,
    email_address_id character varying(17) DEFAULT NULL::character varying,
    address_type character varying(4) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: email_email_address_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_email_address_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_email_address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_email_address_id_seq OWNED BY public.email_email_address.id;


--
-- Name: email_filter; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_filter (
    id character varying(17) NOT NULL,
    name character varying(100) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    "from" character varying(255) DEFAULT NULL::character varying,
    "to" character varying(255) DEFAULT NULL::character varying,
    subject character varying(255) DEFAULT NULL::character varying,
    body_contains text,
    body_contains_all text,
    is_global boolean DEFAULT false NOT NULL,
    action character varying(255) DEFAULT 'Skip'::character varying,
    mark_as_read boolean DEFAULT false NOT NULL,
    skip_notification boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    parent_id character varying(17) DEFAULT NULL::character varying,
    parent_type character varying(100) DEFAULT NULL::character varying,
    email_folder_id character varying(17) DEFAULT NULL::character varying,
    group_email_folder_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: email_folder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_folder (
    id character varying(17) NOT NULL,
    name character varying(64) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    "order" integer,
    skip_notifications boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: email_inbound_email; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_inbound_email (
    id bigint NOT NULL,
    email_id character varying(17) DEFAULT NULL::character varying,
    inbound_email_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: email_inbound_email_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_inbound_email_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_inbound_email_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_inbound_email_id_seq OWNED BY public.email_inbound_email.id;


--
-- Name: email_queue_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_queue_item (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    status character varying(255) DEFAULT NULL::character varying,
    attempt_count integer DEFAULT 0,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    sent_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    email_address character varying(255) DEFAULT NULL::character varying,
    is_test boolean DEFAULT false NOT NULL,
    mass_email_id character varying(17) DEFAULT NULL::character varying,
    target_id character varying(17) DEFAULT NULL::character varying,
    target_type character varying(100) DEFAULT NULL::character varying
);


--
-- Name: email_template; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_template (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    subject character varying(255) DEFAULT NULL::character varying,
    body text,
    is_html boolean DEFAULT true NOT NULL,
    status character varying(8) DEFAULT 'Active'::character varying,
    one_off boolean DEFAULT false NOT NULL,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    category_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    version_number bigint
);


--
-- Name: email_template_category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_template_category (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    "order" integer,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    parent_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: email_template_category_path; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_template_category_path (
    id integer NOT NULL,
    ascendor_id character varying(17) DEFAULT NULL::character varying,
    descendor_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: email_template_category_path_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_template_category_path_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_template_category_path_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_template_category_path_id_seq OWNED BY public.email_template_category_path.id;


--
-- Name: email_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_user (
    id bigint NOT NULL,
    email_id character varying(17) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying,
    is_read boolean DEFAULT false,
    is_important boolean DEFAULT false,
    in_trash boolean DEFAULT false,
    in_archive boolean DEFAULT false,
    folder_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: email_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.email_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: email_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.email_user_id_seq OWNED BY public.email_user.id;


--
-- Name: entity_email_address; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_email_address (
    id bigint NOT NULL,
    entity_id character varying(17) DEFAULT NULL::character varying,
    email_address_id character varying(17) DEFAULT NULL::character varying,
    entity_type character varying(100) DEFAULT NULL::character varying,
    "primary" boolean DEFAULT false,
    deleted boolean DEFAULT false
);


--
-- Name: entity_email_address_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_email_address_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_email_address_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_email_address_id_seq OWNED BY public.entity_email_address.id;


--
-- Name: entity_phone_number; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_phone_number (
    id bigint NOT NULL,
    entity_id character varying(17) DEFAULT NULL::character varying,
    phone_number_id character varying(17) DEFAULT NULL::character varying,
    entity_type character varying(100) DEFAULT NULL::character varying,
    "primary" boolean DEFAULT false,
    deleted boolean DEFAULT false
);


--
-- Name: entity_phone_number_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_phone_number_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_phone_number_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_phone_number_id_seq OWNED BY public.entity_phone_number.id;


--
-- Name: entity_team; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_team (
    id bigint NOT NULL,
    entity_id character varying(17) DEFAULT NULL::character varying,
    team_id character varying(17) DEFAULT NULL::character varying,
    entity_type character varying(100) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: entity_team_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_team_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_team_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_team_id_seq OWNED BY public.entity_team.id;


--
-- Name: entity_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.entity_user (
    id bigint NOT NULL,
    entity_id character varying(17) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying,
    entity_type character varying(100) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: entity_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.entity_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: entity_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.entity_user_id_seq OWNED BY public.entity_user.id;


--
-- Name: export; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.export (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    status character varying(255) DEFAULT 'Pending'::character varying,
    params text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    notify_on_finish boolean DEFAULT false NOT NULL,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    attachment_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: extension; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.extension (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    version character varying(50) DEFAULT NULL::character varying,
    file_list text,
    license_status character varying(36) DEFAULT NULL::character varying,
    license_status_message character varying(255) DEFAULT NULL::character varying,
    description text,
    is_installed boolean DEFAULT false NOT NULL,
    check_version_url character varying(255) DEFAULT NULL::character varying,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: external_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_account (
    id character varying(64) NOT NULL,
    deleted boolean DEFAULT false,
    data text,
    enabled boolean DEFAULT false NOT NULL,
    is_locked boolean DEFAULT false NOT NULL
);


--
-- Name: group_email_folder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_email_folder (
    id character varying(17) NOT NULL,
    name character varying(64) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    "order" integer,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: group_email_folder_team; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.group_email_folder_team (
    id bigint NOT NULL,
    group_email_folder_id character varying(17) DEFAULT NULL::character varying,
    team_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: group_email_folder_team_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.group_email_folder_team_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: group_email_folder_team_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.group_email_folder_team_id_seq OWNED BY public.group_email_folder_team.id;


--
-- Name: import; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    entity_type character varying(255) DEFAULT NULL::character varying,
    status character varying(255) DEFAULT NULL::character varying,
    last_index integer,
    params text,
    attribute_list text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    file_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: import_entity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_entity (
    id bigint NOT NULL,
    deleted boolean DEFAULT false,
    is_imported boolean DEFAULT false NOT NULL,
    is_updated boolean DEFAULT false NOT NULL,
    is_duplicate boolean DEFAULT false NOT NULL,
    entity_id character varying(17) DEFAULT NULL::character varying,
    entity_type character varying(100) DEFAULT NULL::character varying,
    import_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: import_entity_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.import_entity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: import_entity_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.import_entity_id_seq OWNED BY public.import_entity.id;


--
-- Name: import_error; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_error (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    row_index integer,
    export_row_index integer,
    type character varying(255) DEFAULT NULL::character varying,
    validation_failures text,
    "row" text,
    import_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: inbound_email; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inbound_email (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    email_address character varying(100) DEFAULT NULL::character varying,
    status character varying(255) DEFAULT 'Active'::character varying,
    host character varying(255) DEFAULT NULL::character varying,
    port integer DEFAULT 993,
    security character varying(255) DEFAULT 'SSL'::character varying,
    username character varying(255) DEFAULT NULL::character varying,
    password character varying(255) DEFAULT NULL::character varying,
    monitored_folders text DEFAULT '["INBOX"]'::text,
    fetch_since date,
    fetch_data text,
    add_all_team_users boolean DEFAULT true NOT NULL,
    sent_folder character varying(255) DEFAULT NULL::character varying,
    store_sent_emails boolean DEFAULT false NOT NULL,
    keep_fetched_emails_unread boolean DEFAULT false NOT NULL,
    connected_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    exclude_from_reply boolean DEFAULT false NOT NULL,
    use_imap boolean DEFAULT true NOT NULL,
    use_smtp boolean DEFAULT false NOT NULL,
    smtp_is_shared boolean DEFAULT false NOT NULL,
    smtp_is_for_mass_email boolean DEFAULT false NOT NULL,
    smtp_host character varying(255) DEFAULT NULL::character varying,
    smtp_port integer DEFAULT 587,
    smtp_auth boolean DEFAULT true NOT NULL,
    smtp_security character varying(255) DEFAULT 'TLS'::character varying,
    smtp_username character varying(255) DEFAULT NULL::character varying,
    smtp_password character varying(255) DEFAULT NULL::character varying,
    smtp_auth_mechanism character varying(255) DEFAULT 'login'::character varying,
    create_case boolean DEFAULT false NOT NULL,
    case_distribution character varying(255) DEFAULT 'Direct-Assignment'::character varying,
    target_user_position character varying(255) DEFAULT NULL::character varying,
    reply boolean DEFAULT false NOT NULL,
    reply_from_address character varying(255) DEFAULT NULL::character varying,
    reply_to_address character varying(255) DEFAULT NULL::character varying,
    reply_from_name character varying(255) DEFAULT NULL::character varying,
    from_name character varying(255) DEFAULT NULL::character varying,
    imap_handler character varying(255) DEFAULT NULL::character varying,
    smtp_handler character varying(255) DEFAULT NULL::character varying,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    assign_to_user_id character varying(17) DEFAULT NULL::character varying,
    team_id character varying(17) DEFAULT NULL::character varying,
    reply_email_template_id character varying(17) DEFAULT NULL::character varying,
    group_email_folder_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: inbound_email_team; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inbound_email_team (
    id bigint NOT NULL,
    inbound_email_id character varying(17) DEFAULT NULL::character varying,
    team_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: inbound_email_team_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inbound_email_team_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inbound_email_team_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inbound_email_team_id_seq OWNED BY public.inbound_email_team.id;


--
-- Name: integration; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.integration (
    id character varying(24) NOT NULL,
    deleted boolean DEFAULT false,
    data text,
    enabled boolean DEFAULT false NOT NULL
);


--
-- Name: job; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    status character varying(16) DEFAULT 'Pending'::character varying,
    execute_time timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    number bigint NOT NULL,
    class_name character varying(255) DEFAULT NULL::character varying,
    service_name character varying(100) DEFAULT NULL::character varying,
    method_name character varying(100) DEFAULT NULL::character varying,
    job character varying(255) DEFAULT NULL::character varying,
    data text,
    queue character varying(36) DEFAULT NULL::character varying,
    "group" character varying(128) DEFAULT NULL::character varying,
    target_group character varying(128) DEFAULT NULL::character varying,
    started_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    executed_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    pid integer,
    attempts integer,
    target_id character varying(48) DEFAULT NULL::character varying,
    target_type character varying(64) DEFAULT NULL::character varying,
    failed_attempts integer,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    scheduled_job_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: job_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.job_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: job_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.job_number_seq OWNED BY public.job.number;


--
-- Name: kanban_order; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kanban_order (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    "order" smallint,
    "group" character varying(100) DEFAULT NULL::character varying,
    entity_id character varying(17) DEFAULT NULL::character varying,
    entity_type character varying(100) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: knowledge_base_article; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_base_article (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    status character varying(255) DEFAULT 'Draft'::character varying,
    language character varying(255) DEFAULT NULL::character varying,
    type character varying(255) DEFAULT 'Article'::character varying,
    publish_date date,
    expiration_date date,
    "order" integer,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    body text,
    body_plain text,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    version_number bigint
);


--
-- Name: knowledge_base_article_knowledge_base_category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_base_article_knowledge_base_category (
    id bigint NOT NULL,
    knowledge_base_article_id character varying(17) DEFAULT NULL::character varying,
    knowledge_base_category_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: knowledge_base_article_knowledge_base_category_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knowledge_base_article_knowledge_base_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knowledge_base_article_knowledge_base_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knowledge_base_article_knowledge_base_category_id_seq OWNED BY public.knowledge_base_article_knowledge_base_category.id;


--
-- Name: knowledge_base_article_portal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_base_article_portal (
    id bigint NOT NULL,
    portal_id character varying(17) DEFAULT NULL::character varying,
    knowledge_base_article_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: knowledge_base_article_portal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knowledge_base_article_portal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knowledge_base_article_portal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knowledge_base_article_portal_id_seq OWNED BY public.knowledge_base_article_portal.id;


--
-- Name: knowledge_base_category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_base_category (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    "order" integer,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    parent_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: knowledge_base_category_path; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_base_category_path (
    id integer NOT NULL,
    ascendor_id character varying(17) DEFAULT NULL::character varying,
    descendor_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: knowledge_base_category_path_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.knowledge_base_category_path_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: knowledge_base_category_path_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.knowledge_base_category_path_id_seq OWNED BY public.knowledge_base_category_path.id;


--
-- Name: layout_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.layout_record (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    data text,
    layout_set_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: layout_set; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.layout_set (
    id character varying(17) NOT NULL,
    name character varying(100) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    layout_list text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone
);


--
-- Name: lead; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    salutation_name character varying(255) DEFAULT NULL::character varying,
    first_name character varying(100) DEFAULT NULL::character varying,
    last_name character varying(100) DEFAULT NULL::character varying,
    title character varying(100) DEFAULT NULL::character varying,
    status character varying(255) DEFAULT 'New'::character varying,
    source character varying(255) DEFAULT NULL::character varying,
    industry character varying(255) DEFAULT NULL::character varying,
    opportunity_amount double precision,
    website character varying(255) DEFAULT NULL::character varying,
    address_street character varying(255) DEFAULT NULL::character varying,
    address_city character varying(100) DEFAULT NULL::character varying,
    address_state character varying(100) DEFAULT NULL::character varying,
    address_country character varying(100) DEFAULT NULL::character varying,
    address_postal_code character varying(40) DEFAULT NULL::character varying,
    do_not_call boolean DEFAULT false NOT NULL,
    description text,
    converted_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    account_name character varying(255) DEFAULT NULL::character varying,
    middle_name character varying(100) DEFAULT NULL::character varying,
    opportunity_amount_currency character varying(3) DEFAULT NULL::character varying,
    stream_updated_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    campaign_id character varying(17) DEFAULT NULL::character varying,
    created_account_id character varying(17) DEFAULT NULL::character varying,
    created_contact_id character varying(17) DEFAULT NULL::character varying,
    created_opportunity_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: lead_capture; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_capture (
    id character varying(17) NOT NULL,
    name character varying(100) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    is_active boolean DEFAULT true NOT NULL,
    subscribe_to_target_list boolean DEFAULT true NOT NULL,
    subscribe_contact_to_target_list boolean DEFAULT true NOT NULL,
    field_list text DEFAULT '["firstName","lastName","emailAddress"]'::text,
    field_params text,
    duplicate_check boolean DEFAULT true NOT NULL,
    opt_in_confirmation boolean DEFAULT false NOT NULL,
    opt_in_confirmation_lifetime integer DEFAULT 48,
    opt_in_confirmation_success_message text,
    create_lead_before_opt_in_confirmation boolean DEFAULT false NOT NULL,
    skip_opt_in_confirmation_if_subscribed boolean DEFAULT false NOT NULL,
    lead_source character varying(255) DEFAULT 'Web Site'::character varying,
    api_key character varying(36) DEFAULT NULL::character varying,
    form_id character varying(17) DEFAULT NULL::character varying,
    form_enabled boolean DEFAULT false NOT NULL,
    form_title character varying(80) DEFAULT NULL::character varying,
    form_theme character varying(64) DEFAULT NULL::character varying,
    form_text text,
    form_success_text text,
    form_success_redirect_url character varying(255) DEFAULT NULL::character varying,
    form_language character varying(5) DEFAULT NULL::character varying,
    form_frame_ancestors text,
    form_captcha boolean DEFAULT false NOT NULL,
    phone_number_country character varying(2) DEFAULT NULL::character varying,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    campaign_id character varying(17) DEFAULT NULL::character varying,
    target_list_id character varying(17) DEFAULT NULL::character varying,
    opt_in_confirmation_email_template_id character varying(17) DEFAULT NULL::character varying,
    target_team_id character varying(17) DEFAULT NULL::character varying,
    inbound_email_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: lead_capture_log_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_capture_log_record (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    number integer NOT NULL,
    data text,
    is_created boolean DEFAULT false NOT NULL,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    lead_capture_id character varying(17) DEFAULT NULL::character varying,
    target_id character varying(17) DEFAULT NULL::character varying,
    target_type character varying(100) DEFAULT NULL::character varying
);


--
-- Name: lead_capture_log_record_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lead_capture_log_record_number_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lead_capture_log_record_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lead_capture_log_record_number_seq OWNED BY public.lead_capture_log_record.number;


--
-- Name: lead_meeting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_meeting (
    id bigint NOT NULL,
    lead_id character varying(17) DEFAULT NULL::character varying,
    meeting_id character varying(17) DEFAULT NULL::character varying,
    status character varying(36) DEFAULT 'None'::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: lead_meeting_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lead_meeting_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lead_meeting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lead_meeting_id_seq OWNED BY public.lead_meeting.id;


--
-- Name: lead_target_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_target_list (
    id bigint NOT NULL,
    lead_id character varying(17) DEFAULT NULL::character varying,
    target_list_id character varying(17) DEFAULT NULL::character varying,
    opted_out boolean DEFAULT false,
    deleted boolean DEFAULT false
);


--
-- Name: lead_target_list_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lead_target_list_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lead_target_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lead_target_list_id_seq OWNED BY public.lead_target_list.id;


--
-- Name: mass_action; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mass_action (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    entity_type character varying(255) DEFAULT NULL::character varying,
    action character varying(255) DEFAULT NULL::character varying,
    status character varying(255) DEFAULT 'Pending'::character varying,
    data text,
    params text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    processed_count integer,
    notify_on_finish boolean DEFAULT false NOT NULL,
    created_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: mass_email; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mass_email (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    status character varying(255) DEFAULT 'Pending'::character varying,
    store_sent_emails boolean DEFAULT false NOT NULL,
    opt_out_entirely boolean DEFAULT false NOT NULL,
    from_address character varying(255) DEFAULT NULL::character varying,
    from_name character varying(255) DEFAULT NULL::character varying,
    reply_to_address character varying(255) DEFAULT NULL::character varying,
    reply_to_name character varying(255) DEFAULT NULL::character varying,
    start_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    email_template_id character varying(17) DEFAULT NULL::character varying,
    campaign_id character varying(17) DEFAULT NULL::character varying,
    inbound_email_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: mass_email_target_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mass_email_target_list (
    id bigint NOT NULL,
    mass_email_id character varying(17) DEFAULT NULL::character varying,
    target_list_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: mass_email_target_list_excluding; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mass_email_target_list_excluding (
    id bigint NOT NULL,
    mass_email_id character varying(17) DEFAULT NULL::character varying,
    target_list_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: mass_email_target_list_excluding_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mass_email_target_list_excluding_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mass_email_target_list_excluding_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mass_email_target_list_excluding_id_seq OWNED BY public.mass_email_target_list_excluding.id;


--
-- Name: mass_email_target_list_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mass_email_target_list_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mass_email_target_list_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mass_email_target_list_id_seq OWNED BY public.mass_email_target_list.id;


--
-- Name: meeting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    status character varying(255) DEFAULT 'Planned'::character varying,
    date_start timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    date_end timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    is_all_day boolean DEFAULT false NOT NULL,
    description text,
    uid character varying(255) DEFAULT NULL::character varying,
    join_url text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    date_start_date date,
    date_end_date date,
    stream_updated_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    parent_id character varying(17) DEFAULT NULL::character varying,
    parent_type character varying(100) DEFAULT NULL::character varying,
    account_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    c_urlreunion character varying(300) DEFAULT NULL::character varying
);


--
-- Name: meeting_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.meeting_user (
    id bigint NOT NULL,
    user_id character varying(17) DEFAULT NULL::character varying,
    meeting_id character varying(17) DEFAULT NULL::character varying,
    status character varying(36) DEFAULT 'None'::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: meeting_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.meeting_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: meeting_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.meeting_user_id_seq OWNED BY public.meeting_user.id;


--
-- Name: next_number; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.next_number (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    entity_type character varying(100) DEFAULT NULL::character varying,
    field_name character varying(100) DEFAULT NULL::character varying,
    value integer DEFAULT 1
);


--
-- Name: note; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    post text,
    data text,
    type character varying(24) DEFAULT 'Post'::character varying,
    target_type character varying(7) DEFAULT NULL::character varying,
    number bigint NOT NULL,
    is_global boolean DEFAULT false NOT NULL,
    is_internal boolean DEFAULT false NOT NULL,
    is_pinned boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    parent_id character varying(17) DEFAULT NULL::character varying,
    parent_type character varying(100) DEFAULT NULL::character varying,
    related_id character varying(17) DEFAULT NULL::character varying,
    related_type character varying(100) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    super_parent_id character varying(17) DEFAULT NULL::character varying,
    super_parent_type character varying(100) DEFAULT NULL::character varying
);


--
-- Name: note_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.note_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: note_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.note_number_seq OWNED BY public.note.number;


--
-- Name: note_portal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_portal (
    id bigint NOT NULL,
    note_id character varying(17) DEFAULT NULL::character varying,
    portal_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: note_portal_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.note_portal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: note_portal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.note_portal_id_seq OWNED BY public.note_portal.id;


--
-- Name: note_team; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_team (
    id bigint NOT NULL,
    note_id character varying(17) DEFAULT NULL::character varying,
    team_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: note_team_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.note_team_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: note_team_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.note_team_id_seq OWNED BY public.note_team.id;


--
-- Name: note_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.note_user (
    id bigint NOT NULL,
    note_id character varying(17) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: note_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.note_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: note_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.note_user_id_seq OWNED BY public.note_user.id;


--
-- Name: notification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notification (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    number bigint NOT NULL,
    data text,
    type character varying(255) DEFAULT NULL::character varying,
    read boolean DEFAULT false NOT NULL,
    email_is_processed boolean DEFAULT false NOT NULL,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    message text,
    action_id character varying(36) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying,
    related_id character varying(17) DEFAULT NULL::character varying,
    related_type character varying(100) DEFAULT NULL::character varying,
    related_parent_id character varying(17) DEFAULT NULL::character varying,
    related_parent_type character varying(100) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: notification_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notification_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notification_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notification_number_seq OWNED BY public.notification.number;


--
-- Name: o_auth_account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.o_auth_account (
    id character varying(17) NOT NULL,
    name character varying(100) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    access_token text,
    refresh_token text,
    description text,
    expires_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    provider_id character varying(17) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: o_auth_provider; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.o_auth_provider (
    id character varying(17) NOT NULL,
    name character varying(100) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    is_active boolean DEFAULT true NOT NULL,
    client_id character varying(150) DEFAULT NULL::character varying,
    client_secret text,
    authorization_endpoint text,
    token_endpoint text,
    authorization_prompt character varying(14) DEFAULT 'none'::character varying,
    scopes text,
    authorization_params text,
    scope_separator character varying(1) DEFAULT NULL::character varying,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: opportunity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunity (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    amount double precision,
    stage character varying(255) DEFAULT 'Prospecting'::character varying,
    last_stage character varying(255) DEFAULT NULL::character varying,
    probability integer,
    lead_source character varying(255) DEFAULT NULL::character varying,
    close_date date,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    amount_currency character varying(3) DEFAULT NULL::character varying,
    stream_updated_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    account_id character varying(17) DEFAULT NULL::character varying,
    contact_id character varying(17) DEFAULT NULL::character varying,
    campaign_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    version_number bigint
);


--
-- Name: password_change_request; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_change_request (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    request_id character varying(64) DEFAULT NULL::character varying,
    url character varying(255) DEFAULT NULL::character varying,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    user_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: phone_number; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.phone_number (
    id character varying(17) NOT NULL,
    name character varying(36) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    type character varying(255) DEFAULT NULL::character varying,
    "numeric" character varying(36) DEFAULT NULL::character varying,
    invalid boolean DEFAULT false NOT NULL,
    opt_out boolean DEFAULT false NOT NULL
);


--
-- Name: portal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal (
    id character varying(17) NOT NULL,
    name character varying(100) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    custom_id character varying(36) DEFAULT NULL::character varying,
    is_active boolean DEFAULT true NOT NULL,
    tab_list text,
    quick_create_list text,
    application_name character varying(255) DEFAULT NULL::character varying,
    theme character varying(255) DEFAULT NULL::character varying,
    theme_params text,
    language character varying(255) DEFAULT NULL::character varying,
    time_zone character varying(255) DEFAULT NULL::character varying,
    date_format character varying(255) DEFAULT NULL::character varying,
    time_format character varying(255) DEFAULT NULL::character varying,
    week_start integer DEFAULT '-1'::integer,
    default_currency character varying(255) DEFAULT NULL::character varying,
    dashboard_layout text,
    dashlets_options text,
    custom_url character varying(255) DEFAULT NULL::character varying,
    auth_token_lifetime double precision,
    auth_token_max_idle_time double precision,
    description text,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    logo_id character varying(17) DEFAULT NULL::character varying,
    company_logo_id character varying(17) DEFAULT NULL::character varying,
    layout_set_id character varying(17) DEFAULT NULL::character varying,
    authentication_provider_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: portal_portal_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_portal_role (
    id bigint NOT NULL,
    portal_id character varying(17) DEFAULT NULL::character varying,
    portal_role_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: portal_portal_role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portal_portal_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portal_portal_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portal_portal_role_id_seq OWNED BY public.portal_portal_role.id;


--
-- Name: portal_role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_role (
    id character varying(17) NOT NULL,
    name character varying(150) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    data text,
    field_data text,
    export_permission character varying(255) DEFAULT 'not-set'::character varying,
    mass_update_permission character varying(255) DEFAULT 'not-set'::character varying,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone
);


--
-- Name: portal_role_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_role_user (
    id bigint NOT NULL,
    portal_role_id character varying(17) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: portal_role_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portal_role_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portal_role_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portal_role_user_id_seq OWNED BY public.portal_role_user.id;


--
-- Name: portal_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_user (
    id bigint NOT NULL,
    portal_id character varying(17) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: portal_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.portal_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: portal_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.portal_user_id_seq OWNED BY public.portal_user.id;


--
-- Name: preferences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preferences (
    id character varying(17) NOT NULL,
    data text
);


--
-- Name: reminder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reminder (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    remind_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    start_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    type character varying(36) DEFAULT 'Popup'::character varying,
    seconds integer DEFAULT 0,
    is_submitted boolean DEFAULT false NOT NULL,
    user_id character varying(17) DEFAULT NULL::character varying,
    entity_id character varying(17) DEFAULT NULL::character varying,
    entity_type character varying(100) DEFAULT NULL::character varying
);


--
-- Name: role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role (
    id character varying(17) NOT NULL,
    name character varying(150) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    assignment_permission character varying(255) DEFAULT 'not-set'::character varying,
    user_permission character varying(255) DEFAULT 'not-set'::character varying,
    message_permission character varying(255) DEFAULT 'not-set'::character varying,
    portal_permission character varying(255) DEFAULT 'not-set'::character varying,
    group_email_account_permission character varying(255) DEFAULT 'not-set'::character varying,
    export_permission character varying(255) DEFAULT 'not-set'::character varying,
    mass_update_permission character varying(255) DEFAULT 'not-set'::character varying,
    data_privacy_permission character varying(255) DEFAULT 'not-set'::character varying,
    follower_management_permission character varying(255) DEFAULT 'not-set'::character varying,
    audit_permission character varying(255) DEFAULT 'not-set'::character varying,
    mention_permission character varying(255) DEFAULT 'not-set'::character varying,
    user_calendar_permission character varying(255) DEFAULT 'not-set'::character varying,
    data text,
    field_data text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone
);


--
-- Name: role_team; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_team (
    id bigint NOT NULL,
    role_id character varying(17) DEFAULT NULL::character varying,
    team_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: role_team_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_team_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_team_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_team_id_seq OWNED BY public.role_team.id;


--
-- Name: role_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_user (
    id bigint NOT NULL,
    role_id character varying(17) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: role_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.role_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: role_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.role_user_id_seq OWNED BY public.role_user.id;


--
-- Name: scheduled_job; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_job (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    job character varying(255) DEFAULT NULL::character varying,
    status character varying(255) DEFAULT 'Active'::character varying,
    scheduling character varying(255) DEFAULT NULL::character varying,
    last_run timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    is_internal boolean DEFAULT false NOT NULL,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: scheduled_job_log_record; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_job_log_record (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    status character varying(255) DEFAULT NULL::character varying,
    execution_time timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    scheduled_job_id character varying(17) DEFAULT NULL::character varying,
    target_id character varying(17) DEFAULT NULL::character varying,
    target_type character varying(100) DEFAULT NULL::character varying
);


--
-- Name: sms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sms (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    from_name character varying(255) DEFAULT NULL::character varying,
    body text,
    status character varying(255) DEFAULT 'Archived'::character varying,
    date_sent timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    from_phone_number_id character varying(17) DEFAULT NULL::character varying,
    parent_id character varying(17) DEFAULT NULL::character varying,
    parent_type character varying(100) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    replied_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: sms_phone_number; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sms_phone_number (
    id bigint NOT NULL,
    sms_id character varying(17) DEFAULT NULL::character varying,
    phone_number_id character varying(17) DEFAULT NULL::character varying,
    address_type character varying(4) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: sms_phone_number_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sms_phone_number_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sms_phone_number_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sms_phone_number_id_seq OWNED BY public.sms_phone_number.id;


--
-- Name: star_subscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.star_subscription (
    id bigint NOT NULL,
    deleted boolean DEFAULT false,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    entity_id character varying(17) DEFAULT NULL::character varying,
    entity_type character varying(100) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: star_subscription_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.star_subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: star_subscription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.star_subscription_id_seq OWNED BY public.star_subscription.id;


--
-- Name: stream_subscription; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stream_subscription (
    id bigint NOT NULL,
    deleted boolean DEFAULT false,
    entity_id character varying(17) DEFAULT NULL::character varying,
    entity_type character varying(100) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: stream_subscription_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stream_subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stream_subscription_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stream_subscription_id_seq OWNED BY public.stream_subscription.id;


--
-- Name: system_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_data (
    id character varying(1) NOT NULL,
    deleted boolean DEFAULT false,
    last_password_recovery_date timestamp(0) without time zone DEFAULT NULL::timestamp without time zone
);


--
-- Name: target; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.target (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    salutation_name character varying(255) DEFAULT NULL::character varying,
    first_name character varying(100) DEFAULT ''::character varying,
    last_name character varying(100) DEFAULT ''::character varying,
    title character varying(100) DEFAULT NULL::character varying,
    account_name character varying(100) DEFAULT NULL::character varying,
    website character varying(255) DEFAULT NULL::character varying,
    address_street character varying(255) DEFAULT NULL::character varying,
    address_city character varying(100) DEFAULT NULL::character varying,
    address_state character varying(100) DEFAULT NULL::character varying,
    address_country character varying(100) DEFAULT NULL::character varying,
    address_postal_code character varying(40) DEFAULT NULL::character varying,
    do_not_call boolean DEFAULT false NOT NULL,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    middle_name character varying(100) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: target_list; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.target_list (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    category_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: target_list_category; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.target_list_category (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    "order" integer,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    parent_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: target_list_category_path; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.target_list_category_path (
    id integer NOT NULL,
    ascendor_id character varying(17) DEFAULT NULL::character varying,
    descendor_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: target_list_category_path_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.target_list_category_path_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: target_list_category_path_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.target_list_category_path_id_seq OWNED BY public.target_list_category_path.id;


--
-- Name: target_list_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.target_list_user (
    id bigint NOT NULL,
    user_id character varying(17) DEFAULT NULL::character varying,
    target_list_id character varying(17) DEFAULT NULL::character varying,
    opted_out boolean DEFAULT false,
    deleted boolean DEFAULT false
);


--
-- Name: target_list_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.target_list_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: target_list_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.target_list_user_id_seq OWNED BY public.target_list_user.id;


--
-- Name: task; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.task (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    status character varying(255) DEFAULT 'Not Started'::character varying,
    priority character varying(255) DEFAULT 'Normal'::character varying,
    date_start timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    date_end timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    date_start_date date,
    date_end_date date,
    date_completed timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    stream_updated_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    parent_id character varying(17) DEFAULT NULL::character varying,
    parent_type character varying(100) DEFAULT NULL::character varying,
    account_id character varying(17) DEFAULT NULL::character varying,
    contact_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    assigned_user_id character varying(17) DEFAULT NULL::character varying,
    version_number bigint,
    email_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: team; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team (
    id character varying(17) NOT NULL,
    name character varying(100) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    position_list text,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    layout_set_id character varying(17) DEFAULT NULL::character varying,
    working_time_calendar_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: team_user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.team_user (
    id bigint NOT NULL,
    team_id character varying(17) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying,
    role character varying(100) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: team_user_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.team_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: team_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.team_user_id_seq OWNED BY public.team_user.id;


--
-- Name: template; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.template (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    body text,
    header text,
    footer text,
    entity_type character varying(255) DEFAULT NULL::character varying,
    status character varying(8) DEFAULT 'Active'::character varying,
    left_margin double precision DEFAULT '10'::double precision,
    right_margin double precision DEFAULT '10'::double precision,
    top_margin double precision DEFAULT '10'::double precision,
    bottom_margin double precision DEFAULT '20'::double precision,
    print_footer boolean DEFAULT false NOT NULL,
    print_header boolean DEFAULT false NOT NULL,
    footer_position double precision DEFAULT '10'::double precision,
    header_position double precision DEFAULT '0'::double precision,
    style text,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    page_orientation character varying(255) DEFAULT 'Portrait'::character varying,
    page_format character varying(255) DEFAULT 'A4'::character varying,
    page_width double precision,
    page_height double precision,
    font_face character varying(255) DEFAULT NULL::character varying,
    title character varying(255) DEFAULT NULL::character varying,
    filename character varying(150) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying,
    version_number bigint
);


--
-- Name: two_factor_code; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.two_factor_code (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    code character varying(100) DEFAULT NULL::character varying,
    method character varying(100) DEFAULT NULL::character varying,
    attempts_left integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    user_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: unique_id; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.unique_id (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    data text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    terminate_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    target_id character varying(17) DEFAULT NULL::character varying,
    target_type character varying(100) DEFAULT NULL::character varying
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    user_name character varying(50) DEFAULT NULL::character varying,
    type character varying(24) DEFAULT 'regular'::character varying,
    password character varying(150) DEFAULT NULL::character varying,
    auth_method character varying(24) DEFAULT NULL::character varying,
    api_key character varying(100) DEFAULT NULL::character varying,
    salutation_name character varying(255) DEFAULT NULL::character varying,
    first_name character varying(100) DEFAULT NULL::character varying,
    last_name character varying(100) DEFAULT NULL::character varying,
    is_active boolean DEFAULT true NOT NULL,
    title character varying(100) DEFAULT NULL::character varying,
    avatar_color character varying(7) DEFAULT NULL::character varying,
    gender character varying(255) DEFAULT NULL::character varying,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    middle_name character varying(100) DEFAULT NULL::character varying,
    delete_id character varying(17) DEFAULT '0'::character varying NOT NULL,
    default_team_id character varying(17) DEFAULT NULL::character varying,
    contact_id character varying(17) DEFAULT NULL::character varying,
    avatar_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    dashboard_template_id character varying(17) DEFAULT NULL::character varying,
    working_time_calendar_id character varying(17) DEFAULT NULL::character varying,
    layout_set_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: user_data; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_data (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    auth2_f_a boolean DEFAULT false NOT NULL,
    auth2_f_a_method character varying(255) DEFAULT NULL::character varying,
    auth2_f_a_totp_secret character varying(32) DEFAULT NULL::character varying,
    auth2_f_a_email_address character varying(255) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: user_reaction; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_reaction (
    id character varying(17) NOT NULL,
    type character varying(10) DEFAULT NULL::character varying,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    user_id character varying(17) DEFAULT NULL::character varying,
    parent_id character varying(17) DEFAULT NULL::character varying,
    parent_type character varying(100) DEFAULT NULL::character varying
);


--
-- Name: user_working_time_range; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_working_time_range (
    id bigint NOT NULL,
    user_id character varying(17) DEFAULT NULL::character varying,
    working_time_range_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: user_working_time_range_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_working_time_range_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_working_time_range_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_working_time_range_id_seq OWNED BY public.user_working_time_range.id;


--
-- Name: webhook; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    event character varying(100) DEFAULT NULL::character varying,
    url character varying(512) DEFAULT NULL::character varying,
    is_active boolean DEFAULT true NOT NULL,
    entity_type character varying(255) DEFAULT NULL::character varying,
    type character varying(255) DEFAULT NULL::character varying,
    field character varying(255) DEFAULT NULL::character varying,
    secret_key character varying(100) DEFAULT NULL::character varying,
    skip_own boolean DEFAULT false NOT NULL,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    user_id character varying(17) DEFAULT NULL::character varying,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: webhook_event_queue_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_event_queue_item (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    number bigint NOT NULL,
    event character varying(100) DEFAULT NULL::character varying,
    data text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    is_processed boolean DEFAULT false NOT NULL,
    target_id character varying(17) DEFAULT NULL::character varying,
    target_type character varying(100) DEFAULT NULL::character varying,
    user_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: webhook_event_queue_item_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webhook_event_queue_item_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhook_event_queue_item_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webhook_event_queue_item_number_seq OWNED BY public.webhook_event_queue_item.number;


--
-- Name: webhook_queue_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.webhook_queue_item (
    id character varying(17) NOT NULL,
    deleted boolean DEFAULT false,
    number bigint NOT NULL,
    event character varying(100) DEFAULT NULL::character varying,
    data text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    status character varying(7) DEFAULT 'Pending'::character varying,
    processed_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    attempts integer DEFAULT 0,
    process_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    webhook_id character varying(17) DEFAULT NULL::character varying,
    target_id character varying(17) DEFAULT NULL::character varying,
    target_type character varying(100) DEFAULT NULL::character varying
);


--
-- Name: webhook_queue_item_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.webhook_queue_item_number_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: webhook_queue_item_number_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.webhook_queue_item_number_seq OWNED BY public.webhook_queue_item.number;


--
-- Name: working_time_calendar; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.working_time_calendar (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    description text,
    time_zone character varying(255) DEFAULT NULL::character varying,
    time_ranges text DEFAULT '[["9:00","17:00"]]'::text,
    weekday0 boolean DEFAULT false NOT NULL,
    weekday1 boolean DEFAULT true NOT NULL,
    weekday2 boolean DEFAULT true NOT NULL,
    weekday3 boolean DEFAULT true NOT NULL,
    weekday4 boolean DEFAULT true NOT NULL,
    weekday5 boolean DEFAULT true NOT NULL,
    weekday6 boolean DEFAULT false NOT NULL,
    weekday0_time_ranges text,
    weekday1_time_ranges text,
    weekday2_time_ranges text,
    weekday3_time_ranges text,
    weekday4_time_ranges text,
    weekday5_time_ranges text,
    weekday6_time_ranges text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: working_time_calendar_working_time_range; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.working_time_calendar_working_time_range (
    id bigint NOT NULL,
    working_time_calendar_id character varying(17) DEFAULT NULL::character varying,
    working_time_range_id character varying(17) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false
);


--
-- Name: working_time_calendar_working_time_range_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.working_time_calendar_working_time_range_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: working_time_calendar_working_time_range_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.working_time_calendar_working_time_range_id_seq OWNED BY public.working_time_calendar_working_time_range.id;


--
-- Name: working_time_range; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.working_time_range (
    id character varying(17) NOT NULL,
    name character varying(255) DEFAULT NULL::character varying,
    deleted boolean DEFAULT false,
    time_ranges text,
    date_start date,
    date_end date,
    type character varying(11) DEFAULT 'Non-working'::character varying,
    description text,
    created_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    modified_at timestamp(0) without time zone DEFAULT NULL::timestamp without time zone,
    created_by_id character varying(17) DEFAULT NULL::character varying,
    modified_by_id character varying(17) DEFAULT NULL::character varying
);


--
-- Name: account_contact id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_contact ALTER COLUMN id SET DEFAULT nextval('public.account_contact_id_seq'::regclass);


--
-- Name: account_document id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_document ALTER COLUMN id SET DEFAULT nextval('public.account_document_id_seq'::regclass);


--
-- Name: account_portal_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_portal_user ALTER COLUMN id SET DEFAULT nextval('public.account_portal_user_id_seq'::regclass);


--
-- Name: account_target_list id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_target_list ALTER COLUMN id SET DEFAULT nextval('public.account_target_list_id_seq'::regclass);


--
-- Name: action_history_record number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_history_record ALTER COLUMN number SET DEFAULT nextval('public.action_history_record_number_seq'::regclass);


--
-- Name: app_log_record number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_log_record ALTER COLUMN number SET DEFAULT nextval('public.app_log_record_number_seq'::regclass);


--
-- Name: autofollow id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autofollow ALTER COLUMN id SET DEFAULT nextval('public.autofollow_id_seq'::regclass);


--
-- Name: call_contact id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_contact ALTER COLUMN id SET DEFAULT nextval('public.call_contact_id_seq'::regclass);


--
-- Name: call_lead id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_lead ALTER COLUMN id SET DEFAULT nextval('public.call_lead_id_seq'::regclass);


--
-- Name: call_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_user ALTER COLUMN id SET DEFAULT nextval('public.call_user_id_seq'::regclass);


--
-- Name: campaign_target_list id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_target_list ALTER COLUMN id SET DEFAULT nextval('public.campaign_target_list_id_seq'::regclass);


--
-- Name: campaign_target_list_excluding id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_target_list_excluding ALTER COLUMN id SET DEFAULT nextval('public.campaign_target_list_excluding_id_seq'::regclass);


--
-- Name: case number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."case" ALTER COLUMN number SET DEFAULT nextval('public.case_number_seq'::regclass);


--
-- Name: case_contact id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_contact ALTER COLUMN id SET DEFAULT nextval('public.case_contact_id_seq'::regclass);


--
-- Name: case_knowledge_base_article id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_knowledge_base_article ALTER COLUMN id SET DEFAULT nextval('public.case_knowledge_base_article_id_seq'::regclass);


--
-- Name: contact_document id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_document ALTER COLUMN id SET DEFAULT nextval('public.contact_document_id_seq'::regclass);


--
-- Name: contact_meeting id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_meeting ALTER COLUMN id SET DEFAULT nextval('public.contact_meeting_id_seq'::regclass);


--
-- Name: contact_opportunity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_opportunity ALTER COLUMN id SET DEFAULT nextval('public.contact_opportunity_id_seq'::regclass);


--
-- Name: contact_target_list id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_target_list ALTER COLUMN id SET DEFAULT nextval('public.contact_target_list_id_seq'::regclass);


--
-- Name: document_folder_path id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folder_path ALTER COLUMN id SET DEFAULT nextval('public.document_folder_path_id_seq'::regclass);


--
-- Name: document_lead id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_lead ALTER COLUMN id SET DEFAULT nextval('public.document_lead_id_seq'::regclass);


--
-- Name: document_opportunity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_opportunity ALTER COLUMN id SET DEFAULT nextval('public.document_opportunity_id_seq'::regclass);


--
-- Name: email_email_account id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_email_account ALTER COLUMN id SET DEFAULT nextval('public.email_email_account_id_seq'::regclass);


--
-- Name: email_email_address id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_email_address ALTER COLUMN id SET DEFAULT nextval('public.email_email_address_id_seq'::regclass);


--
-- Name: email_inbound_email id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_inbound_email ALTER COLUMN id SET DEFAULT nextval('public.email_inbound_email_id_seq'::regclass);


--
-- Name: email_template_category_path id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template_category_path ALTER COLUMN id SET DEFAULT nextval('public.email_template_category_path_id_seq'::regclass);


--
-- Name: email_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_user ALTER COLUMN id SET DEFAULT nextval('public.email_user_id_seq'::regclass);


--
-- Name: entity_email_address id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_email_address ALTER COLUMN id SET DEFAULT nextval('public.entity_email_address_id_seq'::regclass);


--
-- Name: entity_phone_number id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_phone_number ALTER COLUMN id SET DEFAULT nextval('public.entity_phone_number_id_seq'::regclass);


--
-- Name: entity_team id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_team ALTER COLUMN id SET DEFAULT nextval('public.entity_team_id_seq'::regclass);


--
-- Name: entity_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_user ALTER COLUMN id SET DEFAULT nextval('public.entity_user_id_seq'::regclass);


--
-- Name: group_email_folder_team id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_email_folder_team ALTER COLUMN id SET DEFAULT nextval('public.group_email_folder_team_id_seq'::regclass);


--
-- Name: import_entity id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_entity ALTER COLUMN id SET DEFAULT nextval('public.import_entity_id_seq'::regclass);


--
-- Name: inbound_email_team id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_email_team ALTER COLUMN id SET DEFAULT nextval('public.inbound_email_team_id_seq'::regclass);


--
-- Name: job number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job ALTER COLUMN number SET DEFAULT nextval('public.job_number_seq'::regclass);


--
-- Name: knowledge_base_article_knowledge_base_category id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base_article_knowledge_base_category ALTER COLUMN id SET DEFAULT nextval('public.knowledge_base_article_knowledge_base_category_id_seq'::regclass);


--
-- Name: knowledge_base_article_portal id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base_article_portal ALTER COLUMN id SET DEFAULT nextval('public.knowledge_base_article_portal_id_seq'::regclass);


--
-- Name: knowledge_base_category_path id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base_category_path ALTER COLUMN id SET DEFAULT nextval('public.knowledge_base_category_path_id_seq'::regclass);


--
-- Name: lead_capture_log_record number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_capture_log_record ALTER COLUMN number SET DEFAULT nextval('public.lead_capture_log_record_number_seq'::regclass);


--
-- Name: lead_meeting id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_meeting ALTER COLUMN id SET DEFAULT nextval('public.lead_meeting_id_seq'::regclass);


--
-- Name: lead_target_list id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_target_list ALTER COLUMN id SET DEFAULT nextval('public.lead_target_list_id_seq'::regclass);


--
-- Name: mass_email_target_list id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mass_email_target_list ALTER COLUMN id SET DEFAULT nextval('public.mass_email_target_list_id_seq'::regclass);


--
-- Name: mass_email_target_list_excluding id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mass_email_target_list_excluding ALTER COLUMN id SET DEFAULT nextval('public.mass_email_target_list_excluding_id_seq'::regclass);


--
-- Name: meeting_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_user ALTER COLUMN id SET DEFAULT nextval('public.meeting_user_id_seq'::regclass);


--
-- Name: note number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note ALTER COLUMN number SET DEFAULT nextval('public.note_number_seq'::regclass);


--
-- Name: note_portal id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_portal ALTER COLUMN id SET DEFAULT nextval('public.note_portal_id_seq'::regclass);


--
-- Name: note_team id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_team ALTER COLUMN id SET DEFAULT nextval('public.note_team_id_seq'::regclass);


--
-- Name: note_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_user ALTER COLUMN id SET DEFAULT nextval('public.note_user_id_seq'::regclass);


--
-- Name: notification number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification ALTER COLUMN number SET DEFAULT nextval('public.notification_number_seq'::regclass);


--
-- Name: portal_portal_role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_portal_role ALTER COLUMN id SET DEFAULT nextval('public.portal_portal_role_id_seq'::regclass);


--
-- Name: portal_role_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_role_user ALTER COLUMN id SET DEFAULT nextval('public.portal_role_user_id_seq'::regclass);


--
-- Name: portal_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_user ALTER COLUMN id SET DEFAULT nextval('public.portal_user_id_seq'::regclass);


--
-- Name: role_team id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_team ALTER COLUMN id SET DEFAULT nextval('public.role_team_id_seq'::regclass);


--
-- Name: role_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_user ALTER COLUMN id SET DEFAULT nextval('public.role_user_id_seq'::regclass);


--
-- Name: sms_phone_number id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_phone_number ALTER COLUMN id SET DEFAULT nextval('public.sms_phone_number_id_seq'::regclass);


--
-- Name: star_subscription id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.star_subscription ALTER COLUMN id SET DEFAULT nextval('public.star_subscription_id_seq'::regclass);


--
-- Name: stream_subscription id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_subscription ALTER COLUMN id SET DEFAULT nextval('public.stream_subscription_id_seq'::regclass);


--
-- Name: target_list_category_path id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_list_category_path ALTER COLUMN id SET DEFAULT nextval('public.target_list_category_path_id_seq'::regclass);


--
-- Name: target_list_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_list_user ALTER COLUMN id SET DEFAULT nextval('public.target_list_user_id_seq'::regclass);


--
-- Name: team_user id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_user ALTER COLUMN id SET DEFAULT nextval('public.team_user_id_seq'::regclass);


--
-- Name: user_working_time_range id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_working_time_range ALTER COLUMN id SET DEFAULT nextval('public.user_working_time_range_id_seq'::regclass);


--
-- Name: webhook_event_queue_item number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_event_queue_item ALTER COLUMN number SET DEFAULT nextval('public.webhook_event_queue_item_number_seq'::regclass);


--
-- Name: webhook_queue_item number; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_queue_item ALTER COLUMN number SET DEFAULT nextval('public.webhook_queue_item_number_seq'::regclass);


--
-- Name: working_time_calendar_working_time_range id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.working_time_calendar_working_time_range ALTER COLUMN id SET DEFAULT nextval('public.working_time_calendar_working_time_range_id_seq'::regclass);


--
-- Name: account_contact account_contact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_contact
    ADD CONSTRAINT account_contact_pkey PRIMARY KEY (id);


--
-- Name: account_document account_document_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_document
    ADD CONSTRAINT account_document_pkey PRIMARY KEY (id);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: account_portal_user account_portal_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_portal_user
    ADD CONSTRAINT account_portal_user_pkey PRIMARY KEY (id);


--
-- Name: account_target_list account_target_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_target_list
    ADD CONSTRAINT account_target_list_pkey PRIMARY KEY (id);


--
-- Name: acta_visita acta_visita_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.acta_visita
    ADD CONSTRAINT acta_visita_pkey PRIMARY KEY (id);


--
-- Name: action_history_record action_history_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.action_history_record
    ADD CONSTRAINT action_history_record_pkey PRIMARY KEY (id);


--
-- Name: actuo_archivo actuo_archivo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.actuo_archivo
    ADD CONSTRAINT actuo_archivo_pkey PRIMARY KEY (id);


--
-- Name: address_country address_country_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.address_country
    ADD CONSTRAINT address_country_pkey PRIMARY KEY (id);


--
-- Name: app_log_record app_log_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_log_record
    ADD CONSTRAINT app_log_record_pkey PRIMARY KEY (id);


--
-- Name: app_secret app_secret_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.app_secret
    ADD CONSTRAINT app_secret_pkey PRIMARY KEY (id);


--
-- Name: array_value array_value_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.array_value
    ADD CONSTRAINT array_value_pkey PRIMARY KEY (id);


--
-- Name: asignacion_historial asignacion_historial_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asignacion_historial
    ADD CONSTRAINT asignacion_historial_pkey PRIMARY KEY (id);


--
-- Name: attachment attachment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attachment
    ADD CONSTRAINT attachment_pkey PRIMARY KEY (id);


--
-- Name: auth_log_record auth_log_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_log_record
    ADD CONSTRAINT auth_log_record_pkey PRIMARY KEY (id);


--
-- Name: auth_token auth_token_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_token
    ADD CONSTRAINT auth_token_pkey PRIMARY KEY (id);


--
-- Name: authentication_provider authentication_provider_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.authentication_provider
    ADD CONSTRAINT authentication_provider_pkey PRIMARY KEY (id);


--
-- Name: autofollow autofollow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.autofollow
    ADD CONSTRAINT autofollow_pkey PRIMARY KEY (id);


--
-- Name: c_case_document c_case_document_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c_case_document
    ADD CONSTRAINT c_case_document_pkey PRIMARY KEY (id);


--
-- Name: c_location c_location_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.c_location
    ADD CONSTRAINT c_location_pkey PRIMARY KEY (id);


--
-- Name: call_contact call_contact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_contact
    ADD CONSTRAINT call_contact_pkey PRIMARY KEY (id);


--
-- Name: call_lead call_lead_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_lead
    ADD CONSTRAINT call_lead_pkey PRIMARY KEY (id);


--
-- Name: call call_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call
    ADD CONSTRAINT call_pkey PRIMARY KEY (id);


--
-- Name: call_user call_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.call_user
    ADD CONSTRAINT call_user_pkey PRIMARY KEY (id);


--
-- Name: campaign_log_record campaign_log_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_log_record
    ADD CONSTRAINT campaign_log_record_pkey PRIMARY KEY (id);


--
-- Name: campaign campaign_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign
    ADD CONSTRAINT campaign_pkey PRIMARY KEY (id);


--
-- Name: campaign_target_list_excluding campaign_target_list_excluding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_target_list_excluding
    ADD CONSTRAINT campaign_target_list_excluding_pkey PRIMARY KEY (id);


--
-- Name: campaign_target_list campaign_target_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_target_list
    ADD CONSTRAINT campaign_target_list_pkey PRIMARY KEY (id);


--
-- Name: campaign_tracking_url campaign_tracking_url_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.campaign_tracking_url
    ADD CONSTRAINT campaign_tracking_url_pkey PRIMARY KEY (id);


--
-- Name: case_contact case_contact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_contact
    ADD CONSTRAINT case_contact_pkey PRIMARY KEY (id);


--
-- Name: case_knowledge_base_article case_knowledge_base_article_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.case_knowledge_base_article
    ADD CONSTRAINT case_knowledge_base_article_pkey PRIMARY KEY (id);


--
-- Name: case case_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."case"
    ADD CONSTRAINT case_pkey PRIMARY KEY (id);


--
-- Name: comunicacion_caso comunicacion_caso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comunicacion_caso
    ADD CONSTRAINT comunicacion_caso_pkey PRIMARY KEY (id);


--
-- Name: contact_document contact_document_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_document
    ADD CONSTRAINT contact_document_pkey PRIMARY KEY (id);


--
-- Name: contact_meeting contact_meeting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_meeting
    ADD CONSTRAINT contact_meeting_pkey PRIMARY KEY (id);


--
-- Name: contact_opportunity contact_opportunity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_opportunity
    ADD CONSTRAINT contact_opportunity_pkey PRIMARY KEY (id);


--
-- Name: contact contact_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact
    ADD CONSTRAINT contact_pkey PRIMARY KEY (id);


--
-- Name: contact_target_list contact_target_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contact_target_list
    ADD CONSTRAINT contact_target_list_pkey PRIMARY KEY (id);


--
-- Name: currency currency_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currency
    ADD CONSTRAINT currency_pkey PRIMARY KEY (id);


--
-- Name: currency_record currency_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currency_record
    ADD CONSTRAINT currency_record_pkey PRIMARY KEY (id);


--
-- Name: currency_record_rate currency_record_rate_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currency_record_rate
    ADD CONSTRAINT currency_record_rate_pkey PRIMARY KEY (id);


--
-- Name: dashboard_template dashboard_template_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_template
    ADD CONSTRAINT dashboard_template_pkey PRIMARY KEY (id);


--
-- Name: document_folder_path document_folder_path_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folder_path
    ADD CONSTRAINT document_folder_path_pkey PRIMARY KEY (id);


--
-- Name: document_folder document_folder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_folder
    ADD CONSTRAINT document_folder_pkey PRIMARY KEY (id);


--
-- Name: document_lead document_lead_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_lead
    ADD CONSTRAINT document_lead_pkey PRIMARY KEY (id);


--
-- Name: document_opportunity document_opportunity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_opportunity
    ADD CONSTRAINT document_opportunity_pkey PRIMARY KEY (id);


--
-- Name: document document_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document
    ADD CONSTRAINT document_pkey PRIMARY KEY (id);


--
-- Name: email_account email_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_account
    ADD CONSTRAINT email_account_pkey PRIMARY KEY (id);


--
-- Name: email_address email_address_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_address
    ADD CONSTRAINT email_address_pkey PRIMARY KEY (id);


--
-- Name: email_email_account email_email_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_email_account
    ADD CONSTRAINT email_email_account_pkey PRIMARY KEY (id);


--
-- Name: email_email_address email_email_address_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_email_address
    ADD CONSTRAINT email_email_address_pkey PRIMARY KEY (id);


--
-- Name: email_filter email_filter_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_filter
    ADD CONSTRAINT email_filter_pkey PRIMARY KEY (id);


--
-- Name: email_folder email_folder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_folder
    ADD CONSTRAINT email_folder_pkey PRIMARY KEY (id);


--
-- Name: email_inbound_email email_inbound_email_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_inbound_email
    ADD CONSTRAINT email_inbound_email_pkey PRIMARY KEY (id);


--
-- Name: email email_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email
    ADD CONSTRAINT email_pkey PRIMARY KEY (id);


--
-- Name: email_queue_item email_queue_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_queue_item
    ADD CONSTRAINT email_queue_item_pkey PRIMARY KEY (id);


--
-- Name: email_template_category_path email_template_category_path_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template_category_path
    ADD CONSTRAINT email_template_category_path_pkey PRIMARY KEY (id);


--
-- Name: email_template_category email_template_category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template_category
    ADD CONSTRAINT email_template_category_pkey PRIMARY KEY (id);


--
-- Name: email_template email_template_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_template
    ADD CONSTRAINT email_template_pkey PRIMARY KEY (id);


--
-- Name: email_user email_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_user
    ADD CONSTRAINT email_user_pkey PRIMARY KEY (id);


--
-- Name: entity_email_address entity_email_address_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_email_address
    ADD CONSTRAINT entity_email_address_pkey PRIMARY KEY (id);


--
-- Name: entity_phone_number entity_phone_number_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_phone_number
    ADD CONSTRAINT entity_phone_number_pkey PRIMARY KEY (id);


--
-- Name: entity_team entity_team_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_team
    ADD CONSTRAINT entity_team_pkey PRIMARY KEY (id);


--
-- Name: entity_user entity_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.entity_user
    ADD CONSTRAINT entity_user_pkey PRIMARY KEY (id);


--
-- Name: export export_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export
    ADD CONSTRAINT export_pkey PRIMARY KEY (id);


--
-- Name: extension extension_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.extension
    ADD CONSTRAINT extension_pkey PRIMARY KEY (id);


--
-- Name: external_account external_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_account
    ADD CONSTRAINT external_account_pkey PRIMARY KEY (id);


--
-- Name: group_email_folder group_email_folder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_email_folder
    ADD CONSTRAINT group_email_folder_pkey PRIMARY KEY (id);


--
-- Name: group_email_folder_team group_email_folder_team_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.group_email_folder_team
    ADD CONSTRAINT group_email_folder_team_pkey PRIMARY KEY (id);


--
-- Name: import_entity import_entity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_entity
    ADD CONSTRAINT import_entity_pkey PRIMARY KEY (id);


--
-- Name: import_error import_error_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_error
    ADD CONSTRAINT import_error_pkey PRIMARY KEY (id);


--
-- Name: import import_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import
    ADD CONSTRAINT import_pkey PRIMARY KEY (id);


--
-- Name: inbound_email inbound_email_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_email
    ADD CONSTRAINT inbound_email_pkey PRIMARY KEY (id);


--
-- Name: inbound_email_team inbound_email_team_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbound_email_team
    ADD CONSTRAINT inbound_email_team_pkey PRIMARY KEY (id);


--
-- Name: integration integration_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.integration
    ADD CONSTRAINT integration_pkey PRIMARY KEY (id);


--
-- Name: job job_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job
    ADD CONSTRAINT job_pkey PRIMARY KEY (id);


--
-- Name: kanban_order kanban_order_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kanban_order
    ADD CONSTRAINT kanban_order_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base_article_knowledge_base_category knowledge_base_article_knowledge_base_category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base_article_knowledge_base_category
    ADD CONSTRAINT knowledge_base_article_knowledge_base_category_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base_article knowledge_base_article_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base_article
    ADD CONSTRAINT knowledge_base_article_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base_article_portal knowledge_base_article_portal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base_article_portal
    ADD CONSTRAINT knowledge_base_article_portal_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base_category_path knowledge_base_category_path_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base_category_path
    ADD CONSTRAINT knowledge_base_category_path_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base_category knowledge_base_category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_base_category
    ADD CONSTRAINT knowledge_base_category_pkey PRIMARY KEY (id);


--
-- Name: layout_record layout_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_record
    ADD CONSTRAINT layout_record_pkey PRIMARY KEY (id);


--
-- Name: layout_set layout_set_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.layout_set
    ADD CONSTRAINT layout_set_pkey PRIMARY KEY (id);


--
-- Name: lead_capture_log_record lead_capture_log_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_capture_log_record
    ADD CONSTRAINT lead_capture_log_record_pkey PRIMARY KEY (id);


--
-- Name: lead_capture lead_capture_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_capture
    ADD CONSTRAINT lead_capture_pkey PRIMARY KEY (id);


--
-- Name: lead_meeting lead_meeting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_meeting
    ADD CONSTRAINT lead_meeting_pkey PRIMARY KEY (id);


--
-- Name: lead lead_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead
    ADD CONSTRAINT lead_pkey PRIMARY KEY (id);


--
-- Name: lead_target_list lead_target_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_target_list
    ADD CONSTRAINT lead_target_list_pkey PRIMARY KEY (id);


--
-- Name: mass_action mass_action_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mass_action
    ADD CONSTRAINT mass_action_pkey PRIMARY KEY (id);


--
-- Name: mass_email mass_email_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mass_email
    ADD CONSTRAINT mass_email_pkey PRIMARY KEY (id);


--
-- Name: mass_email_target_list_excluding mass_email_target_list_excluding_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mass_email_target_list_excluding
    ADD CONSTRAINT mass_email_target_list_excluding_pkey PRIMARY KEY (id);


--
-- Name: mass_email_target_list mass_email_target_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mass_email_target_list
    ADD CONSTRAINT mass_email_target_list_pkey PRIMARY KEY (id);


--
-- Name: meeting meeting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting
    ADD CONSTRAINT meeting_pkey PRIMARY KEY (id);


--
-- Name: meeting_user meeting_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.meeting_user
    ADD CONSTRAINT meeting_user_pkey PRIMARY KEY (id);


--
-- Name: next_number next_number_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.next_number
    ADD CONSTRAINT next_number_pkey PRIMARY KEY (id);


--
-- Name: note note_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note
    ADD CONSTRAINT note_pkey PRIMARY KEY (id);


--
-- Name: note_portal note_portal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_portal
    ADD CONSTRAINT note_portal_pkey PRIMARY KEY (id);


--
-- Name: note_team note_team_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_team
    ADD CONSTRAINT note_team_pkey PRIMARY KEY (id);


--
-- Name: note_user note_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.note_user
    ADD CONSTRAINT note_user_pkey PRIMARY KEY (id);


--
-- Name: notification notification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notification
    ADD CONSTRAINT notification_pkey PRIMARY KEY (id);


--
-- Name: o_auth_account o_auth_account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.o_auth_account
    ADD CONSTRAINT o_auth_account_pkey PRIMARY KEY (id);


--
-- Name: o_auth_provider o_auth_provider_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.o_auth_provider
    ADD CONSTRAINT o_auth_provider_pkey PRIMARY KEY (id);


--
-- Name: opportunity opportunity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunity
    ADD CONSTRAINT opportunity_pkey PRIMARY KEY (id);


--
-- Name: password_change_request password_change_request_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_change_request
    ADD CONSTRAINT password_change_request_pkey PRIMARY KEY (id);


--
-- Name: phone_number phone_number_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.phone_number
    ADD CONSTRAINT phone_number_pkey PRIMARY KEY (id);


--
-- Name: portal portal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal
    ADD CONSTRAINT portal_pkey PRIMARY KEY (id);


--
-- Name: portal_portal_role portal_portal_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_portal_role
    ADD CONSTRAINT portal_portal_role_pkey PRIMARY KEY (id);


--
-- Name: portal_role portal_role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_role
    ADD CONSTRAINT portal_role_pkey PRIMARY KEY (id);


--
-- Name: portal_role_user portal_role_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_role_user
    ADD CONSTRAINT portal_role_user_pkey PRIMARY KEY (id);


--
-- Name: portal_user portal_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_user
    ADD CONSTRAINT portal_user_pkey PRIMARY KEY (id);


--
-- Name: preferences preferences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preferences
    ADD CONSTRAINT preferences_pkey PRIMARY KEY (id);


--
-- Name: reminder reminder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reminder
    ADD CONSTRAINT reminder_pkey PRIMARY KEY (id);


--
-- Name: role role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_pkey PRIMARY KEY (id);


--
-- Name: role_team role_team_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_team
    ADD CONSTRAINT role_team_pkey PRIMARY KEY (id);


--
-- Name: role_user role_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_user
    ADD CONSTRAINT role_user_pkey PRIMARY KEY (id);


--
-- Name: scheduled_job_log_record scheduled_job_log_record_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_job_log_record
    ADD CONSTRAINT scheduled_job_log_record_pkey PRIMARY KEY (id);


--
-- Name: scheduled_job scheduled_job_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_job
    ADD CONSTRAINT scheduled_job_pkey PRIMARY KEY (id);


--
-- Name: sms_phone_number sms_phone_number_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms_phone_number
    ADD CONSTRAINT sms_phone_number_pkey PRIMARY KEY (id);


--
-- Name: sms sms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sms
    ADD CONSTRAINT sms_pkey PRIMARY KEY (id);


--
-- Name: star_subscription star_subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.star_subscription
    ADD CONSTRAINT star_subscription_pkey PRIMARY KEY (id);


--
-- Name: stream_subscription stream_subscription_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stream_subscription
    ADD CONSTRAINT stream_subscription_pkey PRIMARY KEY (id);


--
-- Name: system_data system_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_data
    ADD CONSTRAINT system_data_pkey PRIMARY KEY (id);


--
-- Name: target_list_category_path target_list_category_path_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_list_category_path
    ADD CONSTRAINT target_list_category_path_pkey PRIMARY KEY (id);


--
-- Name: target_list_category target_list_category_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_list_category
    ADD CONSTRAINT target_list_category_pkey PRIMARY KEY (id);


--
-- Name: target_list target_list_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_list
    ADD CONSTRAINT target_list_pkey PRIMARY KEY (id);


--
-- Name: target_list_user target_list_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_list_user
    ADD CONSTRAINT target_list_user_pkey PRIMARY KEY (id);


--
-- Name: target target_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target
    ADD CONSTRAINT target_pkey PRIMARY KEY (id);


--
-- Name: task task_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.task
    ADD CONSTRAINT task_pkey PRIMARY KEY (id);


--
-- Name: team team_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team
    ADD CONSTRAINT team_pkey PRIMARY KEY (id);


--
-- Name: team_user team_user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.team_user
    ADD CONSTRAINT team_user_pkey PRIMARY KEY (id);


--
-- Name: template template_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.template
    ADD CONSTRAINT template_pkey PRIMARY KEY (id);


--
-- Name: two_factor_code two_factor_code_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.two_factor_code
    ADD CONSTRAINT two_factor_code_pkey PRIMARY KEY (id);


--
-- Name: unique_id unique_id_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.unique_id
    ADD CONSTRAINT unique_id_pkey PRIMARY KEY (id);


--
-- Name: user_data user_data_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_data
    ADD CONSTRAINT user_data_pkey PRIMARY KEY (id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: user_reaction user_reaction_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_reaction
    ADD CONSTRAINT user_reaction_pkey PRIMARY KEY (id);


--
-- Name: user_working_time_range user_working_time_range_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_working_time_range
    ADD CONSTRAINT user_working_time_range_pkey PRIMARY KEY (id);


--
-- Name: webhook_event_queue_item webhook_event_queue_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_event_queue_item
    ADD CONSTRAINT webhook_event_queue_item_pkey PRIMARY KEY (id);


--
-- Name: webhook webhook_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook
    ADD CONSTRAINT webhook_pkey PRIMARY KEY (id);


--
-- Name: webhook_queue_item webhook_queue_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.webhook_queue_item
    ADD CONSTRAINT webhook_queue_item_pkey PRIMARY KEY (id);


--
-- Name: working_time_calendar working_time_calendar_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.working_time_calendar
    ADD CONSTRAINT working_time_calendar_pkey PRIMARY KEY (id);


--
-- Name: working_time_calendar_working_time_range working_time_calendar_working_time_range_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.working_time_calendar_working_time_range
    ADD CONSTRAINT working_time_calendar_working_time_range_pkey PRIMARY KEY (id);


--
-- Name: working_time_range working_time_range_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.working_time_range
    ADD CONSTRAINT working_time_range_pkey PRIMARY KEY (id);


--
-- Name: idx_account_assigned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_assigned_user ON public.account USING btree (assigned_user_id, deleted);


--
-- Name: idx_account_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_assigned_user_id ON public.account USING btree (assigned_user_id);


--
-- Name: idx_account_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_campaign_id ON public.account USING btree (campaign_id);


--
-- Name: idx_account_contact_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_contact_account_id ON public.account_contact USING btree (account_id);


--
-- Name: idx_account_contact_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_contact_contact_id ON public.account_contact USING btree (contact_id);


--
-- Name: idx_account_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_created_at ON public.account USING btree (created_at, deleted);


--
-- Name: idx_account_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_created_by_id ON public.account USING btree (created_by_id);


--
-- Name: idx_account_document_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_document_account_id ON public.account_document USING btree (account_id);


--
-- Name: idx_account_document_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_document_document_id ON public.account_document USING btree (document_id);


--
-- Name: idx_account_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_modified_by_id ON public.account USING btree (modified_by_id);


--
-- Name: idx_account_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_name ON public.account USING btree (name, deleted);


--
-- Name: idx_account_portal_user_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_portal_user_account_id ON public.account_portal_user USING btree (account_id);


--
-- Name: idx_account_portal_user_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_portal_user_user_id ON public.account_portal_user USING btree (user_id);


--
-- Name: idx_account_target_list_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_target_list_account_id ON public.account_target_list USING btree (account_id);


--
-- Name: idx_account_target_list_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_account_target_list_target_list_id ON public.account_target_list USING btree (target_list_id);


--
-- Name: idx_acta_visita_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acta_visita_assigned_user_id ON public.acta_visita USING btree (assigned_user_id);


--
-- Name: idx_acta_visita_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acta_visita_case_id ON public.acta_visita USING btree (case_id);


--
-- Name: idx_acta_visita_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acta_visita_created_by_id ON public.acta_visita USING btree (created_by_id);


--
-- Name: idx_acta_visita_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_acta_visita_modified_by_id ON public.acta_visita USING btree (modified_by_id);


--
-- Name: idx_action_history_record_auth_log_record_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_history_record_auth_log_record_id ON public.action_history_record USING btree (auth_log_record_id);


--
-- Name: idx_action_history_record_auth_token_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_history_record_auth_token_id ON public.action_history_record USING btree (auth_token_id);


--
-- Name: idx_action_history_record_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_history_record_target ON public.action_history_record USING btree (target_type, target_id);


--
-- Name: idx_action_history_record_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_action_history_record_user_id ON public.action_history_record USING btree (user_id);


--
-- Name: idx_actuo_archivo_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actuo_archivo_assigned_user_id ON public.actuo_archivo USING btree (assigned_user_id);


--
-- Name: idx_actuo_archivo_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actuo_archivo_case_id ON public.actuo_archivo USING btree (case_id);


--
-- Name: idx_actuo_archivo_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actuo_archivo_created_by_id ON public.actuo_archivo USING btree (created_by_id);


--
-- Name: idx_actuo_archivo_inspector_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actuo_archivo_inspector_id ON public.actuo_archivo USING btree (inspector_id);


--
-- Name: idx_actuo_archivo_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_actuo_archivo_modified_by_id ON public.actuo_archivo USING btree (modified_by_id);


--
-- Name: idx_app_log_record_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_log_record_level ON public.app_log_record USING btree (level);


--
-- Name: idx_app_secret_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_secret_created_by_id ON public.app_secret USING btree (created_by_id);


--
-- Name: idx_app_secret_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_secret_modified_by_id ON public.app_secret USING btree (modified_by_id);


--
-- Name: idx_app_secret_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_app_secret_name ON public.app_secret USING btree (name);


--
-- Name: idx_array_value_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_array_value_entity ON public.array_value USING btree (entity_id, entity_type);


--
-- Name: idx_array_value_entity_type_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_array_value_entity_type_value ON public.array_value USING btree (entity_type, value);


--
-- Name: idx_array_value_entity_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_array_value_entity_value ON public.array_value USING btree (entity_type, entity_id, value);


--
-- Name: idx_asignacion_historial_asignado_por_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_historial_asignado_por_id ON public.asignacion_historial USING btree (asignado_por_id);


--
-- Name: idx_asignacion_historial_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_historial_case_id ON public.asignacion_historial USING btree (case_id);


--
-- Name: idx_asignacion_historial_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_historial_created_by_id ON public.asignacion_historial USING btree (created_by_id);


--
-- Name: idx_asignacion_historial_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_historial_modified_by_id ON public.asignacion_historial USING btree (modified_by_id);


--
-- Name: idx_asignacion_historial_responsable_anterior_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_historial_responsable_anterior_id ON public.asignacion_historial USING btree (responsable_anterior_id);


--
-- Name: idx_asignacion_historial_responsable_nuevo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_asignacion_historial_responsable_nuevo_id ON public.asignacion_historial USING btree (responsable_nuevo_id);


--
-- Name: idx_attachment_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachment_created_by_id ON public.attachment USING btree (created_by_id);


--
-- Name: idx_attachment_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachment_parent ON public.attachment USING btree (parent_type, parent_id);


--
-- Name: idx_attachment_related; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachment_related ON public.attachment USING btree (related_id, related_type);


--
-- Name: idx_attachment_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_attachment_source ON public.attachment USING btree (source_id);


--
-- Name: idx_auth_log_record_auth_token_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_log_record_auth_token_id ON public.auth_log_record USING btree (auth_token_id);


--
-- Name: idx_auth_log_record_ip_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_log_record_ip_address ON public.auth_log_record USING btree (ip_address);


--
-- Name: idx_auth_log_record_ip_address_request_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_log_record_ip_address_request_time ON public.auth_log_record USING btree (ip_address, request_time);


--
-- Name: idx_auth_log_record_portal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_log_record_portal_id ON public.auth_log_record USING btree (portal_id);


--
-- Name: idx_auth_log_record_request_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_log_record_request_time ON public.auth_log_record USING btree (request_time);


--
-- Name: idx_auth_log_record_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_log_record_user_id ON public.auth_log_record USING btree (user_id);


--
-- Name: idx_auth_log_record_username_ip_address; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_log_record_username_ip_address ON public.auth_log_record USING btree (username, ip_address);


--
-- Name: idx_auth_token_hash; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_token_hash ON public.auth_token USING btree (hash);


--
-- Name: idx_auth_token_portal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_token_portal_id ON public.auth_token USING btree (portal_id);


--
-- Name: idx_auth_token_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_token_token ON public.auth_token USING btree (token, deleted);


--
-- Name: idx_auth_token_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_token_user_id ON public.auth_token USING btree (user_id);


--
-- Name: idx_autofollow_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autofollow_entity_type ON public.autofollow USING btree (entity_type);


--
-- Name: idx_autofollow_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_autofollow_user ON public.autofollow USING btree (user_id);


--
-- Name: idx_c_case_document_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_c_case_document_case_id ON public.c_case_document USING btree (case_id);


--
-- Name: idx_c_case_document_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_c_case_document_document_id ON public.c_case_document USING btree (document_id);


--
-- Name: idx_c_location_assigned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_c_location_assigned_user ON public.c_location USING btree (assigned_user_id, deleted);


--
-- Name: idx_c_location_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_c_location_assigned_user_id ON public.c_location USING btree (assigned_user_id);


--
-- Name: idx_c_location_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_c_location_created_at ON public.c_location USING btree (created_at);


--
-- Name: idx_c_location_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_c_location_created_by_id ON public.c_location USING btree (created_by_id);


--
-- Name: idx_c_location_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_c_location_modified_by_id ON public.c_location USING btree (modified_by_id);


--
-- Name: idx_c_location_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_c_location_name ON public.c_location USING btree (name, deleted);


--
-- Name: idx_call_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_account_id ON public.call USING btree (account_id);


--
-- Name: idx_call_assigned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_assigned_user ON public.call USING btree (assigned_user_id, deleted);


--
-- Name: idx_call_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_assigned_user_id ON public.call USING btree (assigned_user_id);


--
-- Name: idx_call_assigned_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_assigned_user_status ON public.call USING btree (assigned_user_id, status);


--
-- Name: idx_call_contact_call_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_contact_call_id ON public.call_contact USING btree (call_id);


--
-- Name: idx_call_contact_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_contact_contact_id ON public.call_contact USING btree (contact_id);


--
-- Name: idx_call_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_created_by_id ON public.call USING btree (created_by_id);


--
-- Name: idx_call_date_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_date_start ON public.call USING btree (date_start, deleted);


--
-- Name: idx_call_date_start_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_date_start_status ON public.call USING btree (date_start, status);


--
-- Name: idx_call_lead_call_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_lead_call_id ON public.call_lead USING btree (call_id);


--
-- Name: idx_call_lead_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_lead_lead_id ON public.call_lead USING btree (lead_id);


--
-- Name: idx_call_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_modified_by_id ON public.call USING btree (modified_by_id);


--
-- Name: idx_call_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_parent ON public.call USING btree (parent_id, parent_type);


--
-- Name: idx_call_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_status ON public.call USING btree (status, deleted);


--
-- Name: idx_call_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_uid ON public.call USING btree (uid);


--
-- Name: idx_call_user_call_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_user_call_id ON public.call_user USING btree (call_id);


--
-- Name: idx_call_user_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_call_user_user_id ON public.call_user USING btree (user_id);


--
-- Name: idx_campaign_accounts_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_accounts_template_id ON public.campaign USING btree (accounts_template_id);


--
-- Name: idx_campaign_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_assigned_user_id ON public.campaign USING btree (assigned_user_id);


--
-- Name: idx_campaign_contacts_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_contacts_template_id ON public.campaign USING btree (contacts_template_id);


--
-- Name: idx_campaign_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_created_at ON public.campaign USING btree (created_at, deleted);


--
-- Name: idx_campaign_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_created_by_id ON public.campaign USING btree (created_by_id);


--
-- Name: idx_campaign_leads_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_leads_template_id ON public.campaign USING btree (leads_template_id);


--
-- Name: idx_campaign_log_record_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_log_record_action ON public.campaign_log_record USING btree (action, deleted);


--
-- Name: idx_campaign_log_record_action_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_log_record_action_date ON public.campaign_log_record USING btree (action_date, deleted);


--
-- Name: idx_campaign_log_record_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_log_record_campaign_id ON public.campaign_log_record USING btree (campaign_id);


--
-- Name: idx_campaign_log_record_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_log_record_created_by_id ON public.campaign_log_record USING btree (created_by_id);


--
-- Name: idx_campaign_log_record_object; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_log_record_object ON public.campaign_log_record USING btree (object_id, object_type);


--
-- Name: idx_campaign_log_record_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_log_record_parent ON public.campaign_log_record USING btree (parent_id, parent_type);


--
-- Name: idx_campaign_log_record_queue_item_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_log_record_queue_item_id ON public.campaign_log_record USING btree (queue_item_id);


--
-- Name: idx_campaign_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_modified_by_id ON public.campaign USING btree (modified_by_id);


--
-- Name: idx_campaign_target_list_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_target_list_campaign_id ON public.campaign_target_list USING btree (campaign_id);


--
-- Name: idx_campaign_target_list_excluding_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_target_list_excluding_campaign_id ON public.campaign_target_list_excluding USING btree (campaign_id);


--
-- Name: idx_campaign_target_list_excluding_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_target_list_excluding_target_list_id ON public.campaign_target_list_excluding USING btree (target_list_id);


--
-- Name: idx_campaign_target_list_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_target_list_target_list_id ON public.campaign_target_list USING btree (target_list_id);


--
-- Name: idx_campaign_tracking_url_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_tracking_url_campaign_id ON public.campaign_tracking_url USING btree (campaign_id);


--
-- Name: idx_campaign_tracking_url_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_tracking_url_created_by_id ON public.campaign_tracking_url USING btree (created_by_id);


--
-- Name: idx_campaign_tracking_url_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_tracking_url_modified_by_id ON public.campaign_tracking_url USING btree (modified_by_id);


--
-- Name: idx_campaign_users_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_campaign_users_template_id ON public.campaign USING btree (users_template_id);


--
-- Name: idx_case_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_account_id ON public."case" USING btree (account_id);


--
-- Name: idx_case_assigned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_assigned_user ON public."case" USING btree (assigned_user_id, deleted);


--
-- Name: idx_case_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_assigned_user_id ON public."case" USING btree (assigned_user_id);


--
-- Name: idx_case_assigned_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_assigned_user_status ON public."case" USING btree (assigned_user_id, status);


--
-- Name: idx_case_c_perjudicante_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_c_perjudicante_contact_id ON public."case" USING btree (c_perjudicante_contact_id);


--
-- Name: idx_case_c_perjudicante_cuenta_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_c_perjudicante_cuenta_id ON public."case" USING btree (c_perjudicante_cuenta_id);


--
-- Name: idx_case_c_recibida_por_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_c_recibida_por_id ON public."case" USING btree (c_recibida_por_id);


--
-- Name: idx_case_c_remitido_a_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_c_remitido_a_id ON public."case" USING btree (c_remitido_a_id);


--
-- Name: idx_case_contact_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_contact_case_id ON public.case_contact USING btree (case_id);


--
-- Name: idx_case_contact_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_contact_contact_id ON public.case_contact USING btree (contact_id);


--
-- Name: idx_case_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_contact_id ON public."case" USING btree (contact_id);


--
-- Name: idx_case_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_created_by_id ON public."case" USING btree (created_by_id);


--
-- Name: idx_case_inbound_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_inbound_email_id ON public."case" USING btree (inbound_email_id);


--
-- Name: idx_case_knowledge_base_article_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_knowledge_base_article_case_id ON public.case_knowledge_base_article USING btree (case_id);


--
-- Name: idx_case_knowledge_base_article_knowledge_base_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_knowledge_base_article_knowledge_base_article_id ON public.case_knowledge_base_article USING btree (knowledge_base_article_id);


--
-- Name: idx_case_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_lead_id ON public."case" USING btree (lead_id);


--
-- Name: idx_case_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_modified_by_id ON public."case" USING btree (modified_by_id);


--
-- Name: idx_case_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_status ON public."case" USING btree (status, deleted);


--
-- Name: idx_case_system_full_text_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_case_system_full_text_search ON public."case" USING gin (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || description)));


--
-- Name: idx_comunicacion_caso_case_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comunicacion_caso_case_id ON public.comunicacion_caso USING btree (case_id);


--
-- Name: idx_comunicacion_caso_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comunicacion_caso_created_by_id ON public.comunicacion_caso USING btree (created_by_id);


--
-- Name: idx_comunicacion_caso_destinatario_tercero; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comunicacion_caso_destinatario_tercero ON public.comunicacion_caso USING btree (destinatario_tercero_id, destinatario_tercero_type);


--
-- Name: idx_comunicacion_caso_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comunicacion_caso_modified_by_id ON public.comunicacion_caso USING btree (modified_by_id);


--
-- Name: idx_contact_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_account_id ON public.contact USING btree (account_id);


--
-- Name: idx_contact_assigned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_assigned_user ON public.contact USING btree (assigned_user_id, deleted);


--
-- Name: idx_contact_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_assigned_user_id ON public.contact USING btree (assigned_user_id);


--
-- Name: idx_contact_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_campaign_id ON public.contact USING btree (campaign_id);


--
-- Name: idx_contact_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_created_at ON public.contact USING btree (created_at, deleted);


--
-- Name: idx_contact_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_created_by_id ON public.contact USING btree (created_by_id);


--
-- Name: idx_contact_document_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_document_contact_id ON public.contact_document USING btree (contact_id);


--
-- Name: idx_contact_document_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_document_document_id ON public.contact_document USING btree (document_id);


--
-- Name: idx_contact_first_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_first_name ON public.contact USING btree (first_name, deleted);


--
-- Name: idx_contact_meeting_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_meeting_contact_id ON public.contact_meeting USING btree (contact_id);


--
-- Name: idx_contact_meeting_meeting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_meeting_meeting_id ON public.contact_meeting USING btree (meeting_id);


--
-- Name: idx_contact_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_modified_by_id ON public.contact USING btree (modified_by_id);


--
-- Name: idx_contact_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_name ON public.contact USING btree (first_name, last_name);


--
-- Name: idx_contact_opportunity_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_opportunity_contact_id ON public.contact_opportunity USING btree (contact_id);


--
-- Name: idx_contact_opportunity_opportunity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_opportunity_opportunity_id ON public.contact_opportunity USING btree (opportunity_id);


--
-- Name: idx_contact_target_list_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_target_list_contact_id ON public.contact_target_list USING btree (contact_id);


--
-- Name: idx_contact_target_list_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contact_target_list_target_list_id ON public.contact_target_list USING btree (target_list_id);


--
-- Name: idx_currency_record_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_currency_record_code ON public.currency_record USING btree (code);


--
-- Name: idx_currency_record_rate_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_currency_record_rate_created_by_id ON public.currency_record_rate USING btree (created_by_id);


--
-- Name: idx_currency_record_rate_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_currency_record_rate_modified_by_id ON public.currency_record_rate USING btree (modified_by_id);


--
-- Name: idx_currency_record_rate_record_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_currency_record_rate_record_id ON public.currency_record_rate USING btree (record_id);


--
-- Name: idx_dashboard_template_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dashboard_template_created_by_id ON public.dashboard_template USING btree (created_by_id);


--
-- Name: idx_dashboard_template_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dashboard_template_modified_by_id ON public.dashboard_template USING btree (modified_by_id);


--
-- Name: idx_document_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_assigned_user_id ON public.document USING btree (assigned_user_id);


--
-- Name: idx_document_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_created_by_id ON public.document USING btree (created_by_id);


--
-- Name: idx_document_folder_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_folder_created_by_id ON public.document_folder USING btree (created_by_id);


--
-- Name: idx_document_folder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_folder_id ON public.document USING btree (folder_id);


--
-- Name: idx_document_folder_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_folder_modified_by_id ON public.document_folder USING btree (modified_by_id);


--
-- Name: idx_document_folder_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_folder_parent_id ON public.document_folder USING btree (parent_id);


--
-- Name: idx_document_folder_path_ascendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_folder_path_ascendor_id ON public.document_folder_path USING btree (ascendor_id);


--
-- Name: idx_document_folder_path_descendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_folder_path_descendor_id ON public.document_folder_path USING btree (descendor_id);


--
-- Name: idx_document_lead_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_lead_document_id ON public.document_lead USING btree (document_id);


--
-- Name: idx_document_lead_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_lead_lead_id ON public.document_lead USING btree (lead_id);


--
-- Name: idx_document_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_modified_by_id ON public.document USING btree (modified_by_id);


--
-- Name: idx_document_opportunity_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_opportunity_document_id ON public.document_opportunity USING btree (document_id);


--
-- Name: idx_document_opportunity_opportunity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_opportunity_opportunity_id ON public.document_opportunity USING btree (opportunity_id);


--
-- Name: idx_email_account_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_account_assigned_user_id ON public.email_account USING btree (assigned_user_id);


--
-- Name: idx_email_account_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_account_created_by_id ON public.email_account USING btree (created_by_id);


--
-- Name: idx_email_account_email_folder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_account_email_folder_id ON public.email_account USING btree (email_folder_id);


--
-- Name: idx_email_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_account_id ON public.email USING btree (account_id);


--
-- Name: idx_email_account_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_account_modified_by_id ON public.email_account USING btree (modified_by_id);


--
-- Name: idx_email_address_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_address_lower ON public.email_address USING btree (lower);


--
-- Name: idx_email_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_assigned_user_id ON public.email USING btree (assigned_user_id);


--
-- Name: idx_email_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_created_by_id ON public.email USING btree (created_by_id);


--
-- Name: idx_email_created_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_created_event ON public.email USING btree (created_event_id, created_event_type);


--
-- Name: idx_email_date_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_date_sent ON public.email USING btree (date_sent, deleted);


--
-- Name: idx_email_date_sent_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_date_sent_status ON public.email USING btree (date_sent, status, deleted);


--
-- Name: idx_email_email_account_email_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_email_account_email_account_id ON public.email_email_account USING btree (email_account_id);


--
-- Name: idx_email_email_account_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_email_account_email_id ON public.email_email_account USING btree (email_id);


--
-- Name: idx_email_email_address_email_address_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_email_address_email_address_id ON public.email_email_address USING btree (email_address_id);


--
-- Name: idx_email_email_address_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_email_address_email_id ON public.email_email_address USING btree (email_id);


--
-- Name: idx_email_filter_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_filter_created_by_id ON public.email_filter USING btree (created_by_id);


--
-- Name: idx_email_filter_email_folder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_filter_email_folder_id ON public.email_filter USING btree (email_folder_id);


--
-- Name: idx_email_filter_group_email_folder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_filter_group_email_folder_id ON public.email_filter USING btree (group_email_folder_id);


--
-- Name: idx_email_filter_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_filter_modified_by_id ON public.email_filter USING btree (modified_by_id);


--
-- Name: idx_email_filter_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_filter_parent ON public.email_filter USING btree (parent_id, parent_type);


--
-- Name: idx_email_folder_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_folder_assigned_user_id ON public.email_folder USING btree (assigned_user_id);


--
-- Name: idx_email_folder_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_folder_created_by_id ON public.email_folder USING btree (created_by_id);


--
-- Name: idx_email_folder_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_folder_modified_by_id ON public.email_folder USING btree (modified_by_id);


--
-- Name: idx_email_from_email_address_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_from_email_address_id ON public.email USING btree (from_email_address_id);


--
-- Name: idx_email_group_folder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_group_folder_id ON public.email USING btree (group_folder_id);


--
-- Name: idx_email_group_status_folder; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_group_status_folder ON public.email USING btree (group_status_folder);


--
-- Name: idx_email_ics_event_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_ics_event_uid ON public.email USING btree (ics_event_uid);


--
-- Name: idx_email_inbound_email_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_inbound_email_email_id ON public.email_inbound_email USING btree (email_id);


--
-- Name: idx_email_inbound_email_inbound_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_inbound_email_inbound_email_id ON public.email_inbound_email USING btree (inbound_email_id);


--
-- Name: idx_email_message_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_message_id ON public.email USING btree (message_id);


--
-- Name: idx_email_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_modified_by_id ON public.email USING btree (modified_by_id);


--
-- Name: idx_email_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_parent ON public.email USING btree (parent_id, parent_type);


--
-- Name: idx_email_queue_item_mass_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queue_item_mass_email_id ON public.email_queue_item USING btree (mass_email_id);


--
-- Name: idx_email_queue_item_sent_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queue_item_sent_at ON public.email_queue_item USING btree (sent_at);


--
-- Name: idx_email_queue_item_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queue_item_target ON public.email_queue_item USING btree (target_id, target_type);


--
-- Name: idx_email_replied_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_replied_id ON public.email USING btree (replied_id);


--
-- Name: idx_email_sent_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_sent_by_id ON public.email USING btree (sent_by_id);


--
-- Name: idx_email_system_full_text_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_system_full_text_search ON public.email USING gin (to_tsvector('english'::regconfig, (((((name)::text || ' '::text) || body_plain) || ' '::text) || body)));


--
-- Name: idx_email_template_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_template_assigned_user_id ON public.email_template USING btree (assigned_user_id);


--
-- Name: idx_email_template_category_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_template_category_created_by_id ON public.email_template_category USING btree (created_by_id);


--
-- Name: idx_email_template_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_template_category_id ON public.email_template USING btree (category_id);


--
-- Name: idx_email_template_category_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_template_category_modified_by_id ON public.email_template_category USING btree (modified_by_id);


--
-- Name: idx_email_template_category_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_template_category_parent_id ON public.email_template_category USING btree (parent_id);


--
-- Name: idx_email_template_category_path_ascendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_template_category_path_ascendor_id ON public.email_template_category_path USING btree (ascendor_id);


--
-- Name: idx_email_template_category_path_descendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_template_category_path_descendor_id ON public.email_template_category_path USING btree (descendor_id);


--
-- Name: idx_email_template_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_template_created_by_id ON public.email_template USING btree (created_by_id);


--
-- Name: idx_email_template_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_template_modified_by_id ON public.email_template USING btree (modified_by_id);


--
-- Name: idx_email_user_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_user_email_id ON public.email_user USING btree (email_id);


--
-- Name: idx_email_user_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_user_user_id ON public.email_user USING btree (user_id);


--
-- Name: idx_entity_email_address_email_address_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_email_address_email_address_id ON public.entity_email_address USING btree (email_address_id);


--
-- Name: idx_entity_email_address_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_email_address_entity_id ON public.entity_email_address USING btree (entity_id);


--
-- Name: idx_entity_phone_number_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_phone_number_entity_id ON public.entity_phone_number USING btree (entity_id);


--
-- Name: idx_entity_phone_number_phone_number_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_phone_number_phone_number_id ON public.entity_phone_number USING btree (phone_number_id);


--
-- Name: idx_entity_team_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_team_entity_id ON public.entity_team USING btree (entity_id);


--
-- Name: idx_entity_team_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_team_team_id ON public.entity_team USING btree (team_id);


--
-- Name: idx_entity_user_entity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_user_entity_id ON public.entity_user USING btree (entity_id);


--
-- Name: idx_entity_user_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_entity_user_user_id ON public.entity_user USING btree (user_id);


--
-- Name: idx_export_attachment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_attachment ON public.export USING btree (attachment_id);


--
-- Name: idx_export_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_created_by_id ON public.export USING btree (created_by_id);


--
-- Name: idx_extension_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_extension_created_by_id ON public.extension USING btree (created_by_id);


--
-- Name: idx_extension_license_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_extension_license_status ON public.extension USING btree (license_status);


--
-- Name: idx_group_email_folder_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_email_folder_created_by_id ON public.group_email_folder USING btree (created_by_id);


--
-- Name: idx_group_email_folder_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_email_folder_modified_by_id ON public.group_email_folder USING btree (modified_by_id);


--
-- Name: idx_group_email_folder_team_group_email_folder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_email_folder_team_group_email_folder_id ON public.group_email_folder_team USING btree (group_email_folder_id);


--
-- Name: idx_group_email_folder_team_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_group_email_folder_team_team_id ON public.group_email_folder_team USING btree (team_id);


--
-- Name: idx_import_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_created_by_id ON public.import USING btree (created_by_id);


--
-- Name: idx_import_entity_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_entity_entity ON public.import_entity USING btree (entity_id, entity_type);


--
-- Name: idx_import_entity_entity_import; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_entity_entity_import ON public.import_entity USING btree (import_id, entity_type);


--
-- Name: idx_import_entity_import; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_entity_import ON public.import_entity USING btree (import_id);


--
-- Name: idx_import_error_import_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_error_import_id ON public.import_error USING btree (import_id);


--
-- Name: idx_import_error_import_row_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_error_import_row_index ON public.import_error USING btree (import_id, row_index);


--
-- Name: idx_import_error_row_index; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_import_error_row_index ON public.import_error USING btree (row_index);


--
-- Name: idx_inbound_email_assign_to_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_email_assign_to_user_id ON public.inbound_email USING btree (assign_to_user_id);


--
-- Name: idx_inbound_email_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_email_created_by_id ON public.inbound_email USING btree (created_by_id);


--
-- Name: idx_inbound_email_group_email_folder_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_email_group_email_folder_id ON public.inbound_email USING btree (group_email_folder_id);


--
-- Name: idx_inbound_email_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_email_modified_by_id ON public.inbound_email USING btree (modified_by_id);


--
-- Name: idx_inbound_email_reply_email_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_email_reply_email_template_id ON public.inbound_email USING btree (reply_email_template_id);


--
-- Name: idx_inbound_email_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_email_team_id ON public.inbound_email USING btree (team_id);


--
-- Name: idx_inbound_email_team_inbound_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_email_team_inbound_email_id ON public.inbound_email_team USING btree (inbound_email_id);


--
-- Name: idx_inbound_email_team_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_inbound_email_team_team_id ON public.inbound_email_team USING btree (team_id);


--
-- Name: idx_job_execute_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_execute_time ON public.job USING btree (status, execute_time);


--
-- Name: idx_job_scheduled_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_scheduled_job_id ON public.job USING btree (scheduled_job_id);


--
-- Name: idx_job_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_status ON public.job USING btree (status, deleted);


--
-- Name: idx_job_status_scheduled_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_status_scheduled_job_id ON public.job USING btree (status, scheduled_job_id);


--
-- Name: idx_kanban_order_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_order_entity ON public.kanban_order USING btree (entity_id, entity_type);


--
-- Name: idx_kanban_order_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_order_entity_type ON public.kanban_order USING btree (entity_type);


--
-- Name: idx_kanban_order_entity_type_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_order_entity_type_user_id ON public.kanban_order USING btree (entity_type, user_id);


--
-- Name: idx_kanban_order_entity_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_order_entity_user_id ON public.kanban_order USING btree (entity_type, entity_id, user_id);


--
-- Name: idx_kanban_order_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_kanban_order_user ON public.kanban_order USING btree (user_id);


--
-- Name: idx_knowl_base_artic_knowl_base_categ_knowl_base_artic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowl_base_artic_knowl_base_categ_knowl_base_artic_id ON public.knowledge_base_article_knowledge_base_category USING btree (knowledge_base_article_id);


--
-- Name: idx_knowl_base_artic_knowl_base_categ_knowl_base_categ_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowl_base_artic_knowl_base_categ_knowl_base_categ_id ON public.knowledge_base_article_knowledge_base_category USING btree (knowledge_base_category_id);


--
-- Name: idx_knowledge_base_article_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_article_assigned_user_id ON public.knowledge_base_article USING btree (assigned_user_id);


--
-- Name: idx_knowledge_base_article_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_article_created_by_id ON public.knowledge_base_article USING btree (created_by_id);


--
-- Name: idx_knowledge_base_article_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_article_modified_by_id ON public.knowledge_base_article USING btree (modified_by_id);


--
-- Name: idx_knowledge_base_article_portal_knowledge_base_article_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_article_portal_knowledge_base_article_id ON public.knowledge_base_article_portal USING btree (knowledge_base_article_id);


--
-- Name: idx_knowledge_base_article_portal_portal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_article_portal_portal_id ON public.knowledge_base_article_portal USING btree (portal_id);


--
-- Name: idx_knowledge_base_article_system_full_text_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_article_system_full_text_search ON public.knowledge_base_article USING gin (to_tsvector('english'::regconfig, (((name)::text || ' '::text) || body_plain)));


--
-- Name: idx_knowledge_base_category_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_category_created_by_id ON public.knowledge_base_category USING btree (created_by_id);


--
-- Name: idx_knowledge_base_category_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_category_modified_by_id ON public.knowledge_base_category USING btree (modified_by_id);


--
-- Name: idx_knowledge_base_category_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_category_parent_id ON public.knowledge_base_category USING btree (parent_id);


--
-- Name: idx_knowledge_base_category_path_ascendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_category_path_ascendor_id ON public.knowledge_base_category_path USING btree (ascendor_id);


--
-- Name: idx_knowledge_base_category_path_descendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_base_category_path_descendor_id ON public.knowledge_base_category_path USING btree (descendor_id);


--
-- Name: idx_layout_record_layout_set_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_layout_record_layout_set_id ON public.layout_record USING btree (layout_set_id);


--
-- Name: idx_layout_record_name_layout_set_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_layout_record_name_layout_set_id ON public.layout_record USING btree (name, layout_set_id);


--
-- Name: idx_lead_assigned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_assigned_user ON public.lead USING btree (assigned_user_id, deleted);


--
-- Name: idx_lead_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_assigned_user_id ON public.lead USING btree (assigned_user_id);


--
-- Name: idx_lead_assigned_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_assigned_user_status ON public.lead USING btree (assigned_user_id, status);


--
-- Name: idx_lead_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_campaign_id ON public.lead USING btree (campaign_id);


--
-- Name: idx_lead_capture_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_capture_campaign_id ON public.lead_capture USING btree (campaign_id);


--
-- Name: idx_lead_capture_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_capture_created_by_id ON public.lead_capture USING btree (created_by_id);


--
-- Name: idx_lead_capture_inbound_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_capture_inbound_email_id ON public.lead_capture USING btree (inbound_email_id);


--
-- Name: idx_lead_capture_log_record_lead_capture_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_capture_log_record_lead_capture_id ON public.lead_capture_log_record USING btree (lead_capture_id);


--
-- Name: idx_lead_capture_log_record_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_capture_log_record_target ON public.lead_capture_log_record USING btree (target_id, target_type);


--
-- Name: idx_lead_capture_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_capture_modified_by_id ON public.lead_capture USING btree (modified_by_id);


--
-- Name: idx_lead_capture_opt_in_confirmation_email_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_capture_opt_in_confirmation_email_template_id ON public.lead_capture USING btree (opt_in_confirmation_email_template_id);


--
-- Name: idx_lead_capture_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_capture_target_list_id ON public.lead_capture USING btree (target_list_id);


--
-- Name: idx_lead_capture_target_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_capture_target_team_id ON public.lead_capture USING btree (target_team_id);


--
-- Name: idx_lead_created_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_created_account_id ON public.lead USING btree (created_account_id);


--
-- Name: idx_lead_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_created_at ON public.lead USING btree (created_at, deleted);


--
-- Name: idx_lead_created_at_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_created_at_status ON public.lead USING btree (created_at, status);


--
-- Name: idx_lead_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_created_by_id ON public.lead USING btree (created_by_id);


--
-- Name: idx_lead_created_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_created_contact_id ON public.lead USING btree (created_contact_id);


--
-- Name: idx_lead_created_opportunity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_created_opportunity_id ON public.lead USING btree (created_opportunity_id);


--
-- Name: idx_lead_first_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_first_name ON public.lead USING btree (first_name, deleted);


--
-- Name: idx_lead_meeting_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_meeting_lead_id ON public.lead_meeting USING btree (lead_id);


--
-- Name: idx_lead_meeting_meeting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_meeting_meeting_id ON public.lead_meeting USING btree (meeting_id);


--
-- Name: idx_lead_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_modified_by_id ON public.lead USING btree (modified_by_id);


--
-- Name: idx_lead_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_name ON public.lead USING btree (first_name, last_name);


--
-- Name: idx_lead_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_status ON public.lead USING btree (status, deleted);


--
-- Name: idx_lead_target_list_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_target_list_lead_id ON public.lead_target_list USING btree (lead_id);


--
-- Name: idx_lead_target_list_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lead_target_list_target_list_id ON public.lead_target_list USING btree (target_list_id);


--
-- Name: idx_mass_action_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mass_action_created_by_id ON public.mass_action USING btree (created_by_id);


--
-- Name: idx_mass_email_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mass_email_campaign_id ON public.mass_email USING btree (campaign_id);


--
-- Name: idx_mass_email_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mass_email_created_by_id ON public.mass_email USING btree (created_by_id);


--
-- Name: idx_mass_email_email_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mass_email_email_template_id ON public.mass_email USING btree (email_template_id);


--
-- Name: idx_mass_email_inbound_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mass_email_inbound_email_id ON public.mass_email USING btree (inbound_email_id);


--
-- Name: idx_mass_email_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mass_email_modified_by_id ON public.mass_email USING btree (modified_by_id);


--
-- Name: idx_mass_email_target_list_excluding_mass_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mass_email_target_list_excluding_mass_email_id ON public.mass_email_target_list_excluding USING btree (mass_email_id);


--
-- Name: idx_mass_email_target_list_excluding_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mass_email_target_list_excluding_target_list_id ON public.mass_email_target_list_excluding USING btree (target_list_id);


--
-- Name: idx_mass_email_target_list_mass_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mass_email_target_list_mass_email_id ON public.mass_email_target_list USING btree (mass_email_id);


--
-- Name: idx_mass_email_target_list_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mass_email_target_list_target_list_id ON public.mass_email_target_list USING btree (target_list_id);


--
-- Name: idx_meeting_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_account_id ON public.meeting USING btree (account_id);


--
-- Name: idx_meeting_assigned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_assigned_user ON public.meeting USING btree (assigned_user_id, deleted);


--
-- Name: idx_meeting_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_assigned_user_id ON public.meeting USING btree (assigned_user_id);


--
-- Name: idx_meeting_assigned_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_assigned_user_status ON public.meeting USING btree (assigned_user_id, status);


--
-- Name: idx_meeting_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_created_by_id ON public.meeting USING btree (created_by_id);


--
-- Name: idx_meeting_date_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_date_start ON public.meeting USING btree (date_start, deleted);


--
-- Name: idx_meeting_date_start_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_date_start_status ON public.meeting USING btree (date_start, status);


--
-- Name: idx_meeting_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_modified_by_id ON public.meeting USING btree (modified_by_id);


--
-- Name: idx_meeting_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_parent ON public.meeting USING btree (parent_id, parent_type);


--
-- Name: idx_meeting_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_status ON public.meeting USING btree (status, deleted);


--
-- Name: idx_meeting_uid; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_uid ON public.meeting USING btree (uid);


--
-- Name: idx_meeting_user_meeting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_user_meeting_id ON public.meeting_user USING btree (meeting_id);


--
-- Name: idx_meeting_user_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_meeting_user_user_id ON public.meeting_user USING btree (user_id);


--
-- Name: idx_next_number_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_next_number_entity_type ON public.next_number USING btree (entity_type);


--
-- Name: idx_next_number_entity_type_field_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_next_number_entity_type_field_name ON public.next_number USING btree (entity_type, field_name);


--
-- Name: idx_note_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_created_at ON public.note USING btree (created_at);


--
-- Name: idx_note_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_created_by_id ON public.note USING btree (created_by_id);


--
-- Name: idx_note_created_by_number; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_created_by_number ON public.note USING btree (created_by_id, number);


--
-- Name: idx_note_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_modified_by_id ON public.note USING btree (modified_by_id);


--
-- Name: idx_note_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_parent ON public.note USING btree (parent_id, parent_type);


--
-- Name: idx_note_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_parent_id ON public.note USING btree (parent_id);


--
-- Name: idx_note_parent_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_parent_type ON public.note USING btree (parent_type);


--
-- Name: idx_note_portal_note_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_portal_note_id ON public.note_portal USING btree (note_id);


--
-- Name: idx_note_portal_portal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_portal_portal_id ON public.note_portal USING btree (portal_id);


--
-- Name: idx_note_related; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_related ON public.note USING btree (related_id, related_type);


--
-- Name: idx_note_related_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_related_id ON public.note USING btree (related_id);


--
-- Name: idx_note_related_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_related_type ON public.note USING btree (related_type);


--
-- Name: idx_note_super_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_super_parent ON public.note USING btree (super_parent_id, super_parent_type);


--
-- Name: idx_note_super_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_super_parent_id ON public.note USING btree (super_parent_id);


--
-- Name: idx_note_super_parent_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_super_parent_type ON public.note USING btree (super_parent_type);


--
-- Name: idx_note_system_full_text_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_system_full_text_search ON public.note USING gin (to_tsvector('english'::regconfig, post));


--
-- Name: idx_note_target_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_target_type ON public.note USING btree (target_type);


--
-- Name: idx_note_team_note_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_team_note_id ON public.note_team USING btree (note_id);


--
-- Name: idx_note_team_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_team_team_id ON public.note_team USING btree (team_id);


--
-- Name: idx_note_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_type ON public.note USING btree (type);


--
-- Name: idx_note_user_note_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_user_note_id ON public.note_user USING btree (note_id);


--
-- Name: idx_note_user_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_note_user_user_id ON public.note_user USING btree (user_id);


--
-- Name: idx_notification_action_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_action_id ON public.notification USING btree (action_id);


--
-- Name: idx_notification_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_created_at ON public.notification USING btree (created_at);


--
-- Name: idx_notification_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_created_by_id ON public.notification USING btree (created_by_id);


--
-- Name: idx_notification_related; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_related ON public.notification USING btree (related_id, related_type);


--
-- Name: idx_notification_related_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_related_parent ON public.notification USING btree (related_parent_id, related_parent_type);


--
-- Name: idx_notification_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_user ON public.notification USING btree (user_id, number);


--
-- Name: idx_notification_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_user_id ON public.notification USING btree (user_id);


--
-- Name: idx_notification_user_id_read_related_parent_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notification_user_id_read_related_parent_type ON public.notification USING btree (user_id, deleted, read, related_parent_type);


--
-- Name: idx_o_auth_account_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_o_auth_account_created_by_id ON public.o_auth_account USING btree (created_by_id);


--
-- Name: idx_o_auth_account_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_o_auth_account_modified_by_id ON public.o_auth_account USING btree (modified_by_id);


--
-- Name: idx_o_auth_account_provider_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_o_auth_account_provider_id ON public.o_auth_account USING btree (provider_id);


--
-- Name: idx_o_auth_account_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_o_auth_account_user_id ON public.o_auth_account USING btree (user_id);


--
-- Name: idx_o_auth_provider_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_o_auth_provider_created_by_id ON public.o_auth_provider USING btree (created_by_id);


--
-- Name: idx_o_auth_provider_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_o_auth_provider_modified_by_id ON public.o_auth_provider USING btree (modified_by_id);


--
-- Name: idx_opportunity_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_account_id ON public.opportunity USING btree (account_id);


--
-- Name: idx_opportunity_assigned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_assigned_user ON public.opportunity USING btree (assigned_user_id, deleted);


--
-- Name: idx_opportunity_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_assigned_user_id ON public.opportunity USING btree (assigned_user_id);


--
-- Name: idx_opportunity_assigned_user_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_assigned_user_stage ON public.opportunity USING btree (assigned_user_id, stage);


--
-- Name: idx_opportunity_campaign_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_campaign_id ON public.opportunity USING btree (campaign_id);


--
-- Name: idx_opportunity_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_contact_id ON public.opportunity USING btree (contact_id);


--
-- Name: idx_opportunity_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_created_at ON public.opportunity USING btree (created_at, deleted);


--
-- Name: idx_opportunity_created_at_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_created_at_stage ON public.opportunity USING btree (created_at, stage);


--
-- Name: idx_opportunity_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_created_by_id ON public.opportunity USING btree (created_by_id);


--
-- Name: idx_opportunity_last_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_last_stage ON public.opportunity USING btree (last_stage);


--
-- Name: idx_opportunity_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_modified_by_id ON public.opportunity USING btree (modified_by_id);


--
-- Name: idx_opportunity_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_opportunity_stage ON public.opportunity USING btree (stage, deleted);


--
-- Name: idx_password_change_request_request_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_change_request_request_id ON public.password_change_request USING btree (request_id);


--
-- Name: idx_password_change_request_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_password_change_request_user_id ON public.password_change_request USING btree (user_id);


--
-- Name: idx_phone_number_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_number_name ON public.phone_number USING btree (name);


--
-- Name: idx_phone_number_numeric; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_phone_number_numeric ON public.phone_number USING btree ("numeric");


--
-- Name: idx_portal_authentication_provider_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_authentication_provider_id ON public.portal USING btree (authentication_provider_id);


--
-- Name: idx_portal_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_created_by_id ON public.portal USING btree (created_by_id);


--
-- Name: idx_portal_custom_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_custom_id ON public.portal USING btree (custom_id);


--
-- Name: idx_portal_layout_set_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_layout_set_id ON public.portal USING btree (layout_set_id);


--
-- Name: idx_portal_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_modified_by_id ON public.portal USING btree (modified_by_id);


--
-- Name: idx_portal_portal_role_portal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_portal_role_portal_id ON public.portal_portal_role USING btree (portal_id);


--
-- Name: idx_portal_portal_role_portal_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_portal_role_portal_role_id ON public.portal_portal_role USING btree (portal_role_id);


--
-- Name: idx_portal_role_user_portal_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_role_user_portal_role_id ON public.portal_role_user USING btree (portal_role_id);


--
-- Name: idx_portal_role_user_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_role_user_user_id ON public.portal_role_user USING btree (user_id);


--
-- Name: idx_portal_user_portal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_user_portal_id ON public.portal_user USING btree (portal_id);


--
-- Name: idx_portal_user_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_portal_user_user_id ON public.portal_user USING btree (user_id);


--
-- Name: idx_reminder_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_entity ON public.reminder USING btree (entity_id, entity_type);


--
-- Name: idx_reminder_remind_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_remind_at ON public.reminder USING btree (remind_at);


--
-- Name: idx_reminder_start_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_start_at ON public.reminder USING btree (start_at);


--
-- Name: idx_reminder_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_type ON public.reminder USING btree (type);


--
-- Name: idx_reminder_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reminder_user_id ON public.reminder USING btree (user_id);


--
-- Name: idx_role_team_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_team_role_id ON public.role_team USING btree (role_id);


--
-- Name: idx_role_team_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_team_team_id ON public.role_team USING btree (team_id);


--
-- Name: idx_role_user_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_user_role_id ON public.role_user USING btree (role_id);


--
-- Name: idx_role_user_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_role_user_user_id ON public.role_user USING btree (user_id);


--
-- Name: idx_schedule_job_log_record_schedule_job_id_executio_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_job_log_record_schedule_job_id_executio_time ON public.scheduled_job_log_record USING btree (scheduled_job_id, execution_time);


--
-- Name: idx_scheduled_job_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_job_created_by_id ON public.scheduled_job USING btree (created_by_id);


--
-- Name: idx_scheduled_job_log_record_scheduled_job_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_job_log_record_scheduled_job_id ON public.scheduled_job_log_record USING btree (scheduled_job_id);


--
-- Name: idx_scheduled_job_log_record_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_job_log_record_target ON public.scheduled_job_log_record USING btree (target_id, target_type);


--
-- Name: idx_scheduled_job_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_scheduled_job_modified_by_id ON public.scheduled_job USING btree (modified_by_id);


--
-- Name: idx_sms_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_created_by_id ON public.sms USING btree (created_by_id);


--
-- Name: idx_sms_date_sent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_date_sent ON public.sms USING btree (date_sent, deleted);


--
-- Name: idx_sms_date_sent_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_date_sent_status ON public.sms USING btree (date_sent, status, deleted);


--
-- Name: idx_sms_from_phone_number_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_from_phone_number_id ON public.sms USING btree (from_phone_number_id);


--
-- Name: idx_sms_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_modified_by_id ON public.sms USING btree (modified_by_id);


--
-- Name: idx_sms_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_parent ON public.sms USING btree (parent_id, parent_type);


--
-- Name: idx_sms_phone_number_phone_number_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_phone_number_phone_number_id ON public.sms_phone_number USING btree (phone_number_id);


--
-- Name: idx_sms_phone_number_sms_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_phone_number_sms_id ON public.sms_phone_number USING btree (sms_id);


--
-- Name: idx_sms_replied_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sms_replied_id ON public.sms USING btree (replied_id);


--
-- Name: idx_star_subscription_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_star_subscription_entity ON public.star_subscription USING btree (entity_id, entity_type);


--
-- Name: idx_star_subscription_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_star_subscription_user ON public.star_subscription USING btree (user_id);


--
-- Name: idx_star_subscription_user_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_star_subscription_user_entity_type ON public.star_subscription USING btree (user_id, entity_type);


--
-- Name: idx_stream_subscription_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stream_subscription_entity ON public.stream_subscription USING btree (entity_id, entity_type);


--
-- Name: idx_stream_subscription_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stream_subscription_user ON public.stream_subscription USING btree (user_id);


--
-- Name: idx_stream_subscription_user_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stream_subscription_user_entity ON public.stream_subscription USING btree (user_id, entity_id, entity_type);


--
-- Name: idx_target_assigned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_assigned_user ON public.target USING btree (assigned_user_id, deleted);


--
-- Name: idx_target_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_assigned_user_id ON public.target USING btree (assigned_user_id);


--
-- Name: idx_target_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_created_by_id ON public.target USING btree (created_by_id);


--
-- Name: idx_target_first_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_first_name ON public.target USING btree (first_name, deleted);


--
-- Name: idx_target_list_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_list_assigned_user_id ON public.target_list USING btree (assigned_user_id);


--
-- Name: idx_target_list_category_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_list_category_created_by_id ON public.target_list_category USING btree (created_by_id);


--
-- Name: idx_target_list_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_list_category_id ON public.target_list USING btree (category_id);


--
-- Name: idx_target_list_category_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_list_category_modified_by_id ON public.target_list_category USING btree (modified_by_id);


--
-- Name: idx_target_list_category_parent_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_list_category_parent_id ON public.target_list_category USING btree (parent_id);


--
-- Name: idx_target_list_category_path_ascendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_list_category_path_ascendor_id ON public.target_list_category_path USING btree (ascendor_id);


--
-- Name: idx_target_list_category_path_descendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_list_category_path_descendor_id ON public.target_list_category_path USING btree (descendor_id);


--
-- Name: idx_target_list_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_list_created_at ON public.target_list USING btree (created_at, deleted);


--
-- Name: idx_target_list_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_list_created_by_id ON public.target_list USING btree (created_by_id);


--
-- Name: idx_target_list_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_list_modified_by_id ON public.target_list USING btree (modified_by_id);


--
-- Name: idx_target_list_user_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_list_user_target_list_id ON public.target_list_user USING btree (target_list_id);


--
-- Name: idx_target_list_user_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_list_user_user_id ON public.target_list_user USING btree (user_id);


--
-- Name: idx_target_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_modified_by_id ON public.target USING btree (modified_by_id);


--
-- Name: idx_target_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_target_name ON public.target USING btree (first_name, last_name);


--
-- Name: idx_task_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_account_id ON public.task USING btree (account_id);


--
-- Name: idx_task_assigned_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_assigned_user ON public.task USING btree (assigned_user_id, deleted);


--
-- Name: idx_task_assigned_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_assigned_user_id ON public.task USING btree (assigned_user_id);


--
-- Name: idx_task_assigned_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_assigned_user_status ON public.task USING btree (assigned_user_id, status);


--
-- Name: idx_task_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_contact_id ON public.task USING btree (contact_id);


--
-- Name: idx_task_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_created_by_id ON public.task USING btree (created_by_id);


--
-- Name: idx_task_date_end_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_date_end_status ON public.task USING btree (date_end, status);


--
-- Name: idx_task_date_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_date_start ON public.task USING btree (date_start, deleted);


--
-- Name: idx_task_date_start_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_date_start_status ON public.task USING btree (date_start, status);


--
-- Name: idx_task_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_email_id ON public.task USING btree (email_id);


--
-- Name: idx_task_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_modified_by_id ON public.task USING btree (modified_by_id);


--
-- Name: idx_task_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_parent ON public.task USING btree (parent_id, parent_type);


--
-- Name: idx_task_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_task_status ON public.task USING btree (status, deleted);


--
-- Name: idx_team_layout_set_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_layout_set_id ON public.team USING btree (layout_set_id);


--
-- Name: idx_team_user_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_user_team_id ON public.team_user USING btree (team_id);


--
-- Name: idx_team_user_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_user_user_id ON public.team_user USING btree (user_id);


--
-- Name: idx_team_working_time_calendar_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_team_working_time_calendar_id ON public.team USING btree (working_time_calendar_id);


--
-- Name: idx_template_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_created_by_id ON public.template USING btree (created_by_id);


--
-- Name: idx_template_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_template_modified_by_id ON public.template USING btree (modified_by_id);


--
-- Name: idx_two_factor_code_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_two_factor_code_created_at ON public.two_factor_code USING btree (created_at);


--
-- Name: idx_two_factor_code_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_two_factor_code_user_id ON public.two_factor_code USING btree (user_id);


--
-- Name: idx_two_factor_code_user_id_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_two_factor_code_user_id_method ON public.two_factor_code USING btree (user_id, method);


--
-- Name: idx_two_factor_code_user_id_method_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_two_factor_code_user_id_method_created_at ON public.two_factor_code USING btree (user_id, method, created_at);


--
-- Name: idx_two_factor_code_user_id_method_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_two_factor_code_user_id_method_is_active ON public.two_factor_code USING btree (user_id, method, is_active);


--
-- Name: idx_unique_id_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unique_id_created_by_id ON public.unique_id USING btree (created_by_id);


--
-- Name: idx_unique_id_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unique_id_name ON public.unique_id USING btree (name);


--
-- Name: idx_unique_id_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_unique_id_target ON public.unique_id USING btree (target_id, target_type);


--
-- Name: idx_user_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_contact_id ON public."user" USING btree (contact_id);


--
-- Name: idx_user_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_created_by_id ON public."user" USING btree (created_by_id);


--
-- Name: idx_user_dashboard_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_dashboard_template_id ON public."user" USING btree (dashboard_template_id);


--
-- Name: idx_user_data_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_data_user_id ON public.user_data USING btree (user_id);


--
-- Name: idx_user_default_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_default_team_id ON public."user" USING btree (default_team_id);


--
-- Name: idx_user_layout_set_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_layout_set_id ON public."user" USING btree (layout_set_id);


--
-- Name: idx_user_reaction_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reaction_parent ON public.user_reaction USING btree (parent_id, parent_type);


--
-- Name: idx_user_reaction_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_reaction_user_id ON public.user_reaction USING btree (user_id);


--
-- Name: idx_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_type ON public."user" USING btree (type);


--
-- Name: idx_user_user_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_user_name ON public."user" USING btree (user_name);


--
-- Name: idx_user_working_time_calendar_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_working_time_calendar_id ON public."user" USING btree (working_time_calendar_id);


--
-- Name: idx_user_working_time_range_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_working_time_range_user_id ON public.user_working_time_range USING btree (user_id);


--
-- Name: idx_user_working_time_range_working_time_range_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_user_working_time_range_working_time_range_id ON public.user_working_time_range USING btree (working_time_range_id);


--
-- Name: idx_webhook_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_created_by_id ON public.webhook USING btree (created_by_id);


--
-- Name: idx_webhook_entity_type_field; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_entity_type_field ON public.webhook USING btree (entity_type, field);


--
-- Name: idx_webhook_entity_type_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_entity_type_type ON public.webhook USING btree (entity_type, type);


--
-- Name: idx_webhook_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_event ON public.webhook USING btree (event);


--
-- Name: idx_webhook_event_queue_item_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_event_queue_item_target ON public.webhook_event_queue_item USING btree (target_id, target_type);


--
-- Name: idx_webhook_event_queue_item_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_event_queue_item_user_id ON public.webhook_event_queue_item USING btree (user_id);


--
-- Name: idx_webhook_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_modified_by_id ON public.webhook USING btree (modified_by_id);


--
-- Name: idx_webhook_queue_item_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_queue_item_target ON public.webhook_queue_item USING btree (target_id, target_type);


--
-- Name: idx_webhook_queue_item_webhook_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_queue_item_webhook_id ON public.webhook_queue_item USING btree (webhook_id);


--
-- Name: idx_webhook_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_webhook_user_id ON public.webhook USING btree (user_id);


--
-- Name: idx_worki_time_calen_worki_time_range_worki_time_calen_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worki_time_calen_worki_time_range_worki_time_calen_id ON public.working_time_calendar_working_time_range USING btree (working_time_calendar_id);


--
-- Name: idx_worki_time_calen_worki_time_range_worki_time_range_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_worki_time_calen_worki_time_range_worki_time_range_id ON public.working_time_calendar_working_time_range USING btree (working_time_range_id);


--
-- Name: idx_working_time_calendar_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_working_time_calendar_created_by_id ON public.working_time_calendar USING btree (created_by_id);


--
-- Name: idx_working_time_calendar_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_working_time_calendar_modified_by_id ON public.working_time_calendar USING btree (modified_by_id);


--
-- Name: idx_working_time_range_created_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_working_time_range_created_by_id ON public.working_time_range USING btree (created_by_id);


--
-- Name: idx_working_time_range_modified_by_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_working_time_range_modified_by_id ON public.working_time_range USING btree (modified_by_id);


--
-- Name: idx_working_time_range_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_working_time_range_type ON public.working_time_range USING btree (type);


--
-- Name: idx_working_time_range_type_range; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_working_time_range_type_range ON public.working_time_range USING btree (type, date_start, date_end);


--
-- Name: uni_kno_bas_art_kno_bas_cat_kno_bas_art_id_kno_bas_cat_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uni_kno_bas_art_kno_bas_cat_kno_bas_art_id_kno_bas_cat_id ON public.knowledge_base_article_knowledge_base_category USING btree (knowledge_base_article_id, knowledge_base_category_id);


--
-- Name: uni_wor_tim_cal_wor_tim_ran_wor_tim_cal_id_wor_tim_ran_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uni_wor_tim_cal_wor_tim_ran_wor_tim_cal_id_wor_tim_ran_id ON public.working_time_calendar_working_time_range USING btree (working_time_calendar_id, working_time_range_id);


--
-- Name: uniq_account_contact_account_id_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_account_contact_account_id_contact_id ON public.account_contact USING btree (account_id, contact_id);


--
-- Name: uniq_account_created_at_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_account_created_at_id ON public.account USING btree (created_at, id);


--
-- Name: uniq_account_document_account_id_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_account_document_account_id_document_id ON public.account_document USING btree (account_id, document_id);


--
-- Name: uniq_account_portal_user_user_id_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_account_portal_user_user_id_account_id ON public.account_portal_user USING btree (user_id, account_id);


--
-- Name: uniq_account_target_list_account_id_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_account_target_list_account_id_target_list_id ON public.account_target_list USING btree (account_id, target_list_id);


--
-- Name: uniq_action_history_record_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_action_history_record_number ON public.action_history_record USING btree (number);


--
-- Name: uniq_address_country_name; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_address_country_name ON public.address_country USING btree (name);


--
-- Name: uniq_app_log_record_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_app_log_record_number ON public.app_log_record USING btree (number);


--
-- Name: uniq_app_secret_name_delete_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_app_secret_name_delete_id ON public.app_secret USING btree (name, delete_id);


--
-- Name: uniq_c_case_document_case_id_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_c_case_document_case_id_document_id ON public.c_case_document USING btree (case_id, document_id);


--
-- Name: uniq_c_location_created_at_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_c_location_created_at_id ON public.c_location USING btree (created_at, id);


--
-- Name: uniq_call_contact_call_id_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_call_contact_call_id_contact_id ON public.call_contact USING btree (call_id, contact_id);


--
-- Name: uniq_call_lead_call_id_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_call_lead_call_id_lead_id ON public.call_lead USING btree (call_id, lead_id);


--
-- Name: uniq_call_user_user_id_call_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_call_user_user_id_call_id ON public.call_user USING btree (user_id, call_id);


--
-- Name: uniq_campaig_target_list_excludi_campaig_id_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_campaig_target_list_excludi_campaig_id_target_list_id ON public.campaign_target_list_excluding USING btree (campaign_id, target_list_id);


--
-- Name: uniq_campaign_target_list_campaign_id_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_campaign_target_list_campaign_id_target_list_id ON public.campaign_target_list USING btree (campaign_id, target_list_id);


--
-- Name: uniq_case_contact_case_id_contact_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_case_contact_case_id_contact_id ON public.case_contact USING btree (case_id, contact_id);


--
-- Name: uniq_case_knowle_base_articl_case_id_knowle_base_articl_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_case_knowle_base_articl_case_id_knowle_base_articl_id ON public.case_knowledge_base_article USING btree (case_id, knowledge_base_article_id);


--
-- Name: uniq_case_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_case_number ON public."case" USING btree (number);


--
-- Name: uniq_contact_created_at_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_contact_created_at_id ON public.contact USING btree (created_at, id);


--
-- Name: uniq_contact_document_contact_id_document_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_contact_document_contact_id_document_id ON public.contact_document USING btree (contact_id, document_id);


--
-- Name: uniq_contact_meeting_contact_id_meeting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_contact_meeting_contact_id_meeting_id ON public.contact_meeting USING btree (contact_id, meeting_id);


--
-- Name: uniq_contact_opportunity_contact_id_opportunity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_contact_opportunity_contact_id_opportunity_id ON public.contact_opportunity USING btree (contact_id, opportunity_id);


--
-- Name: uniq_contact_target_list_contact_id_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_contact_target_list_contact_id_target_list_id ON public.contact_target_list USING btree (contact_id, target_list_id);


--
-- Name: uniq_currency_record_code_delete_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_currency_record_code_delete_id ON public.currency_record USING btree (code, delete_id);


--
-- Name: uniq_currency_record_rate_record_id_base_code_date; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_currency_record_rate_record_id_base_code_date ON public.currency_record_rate USING btree (record_id, base_code, date, delete_id);


--
-- Name: uniq_document_lead_document_id_lead_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_document_lead_document_id_lead_id ON public.document_lead USING btree (document_id, lead_id);


--
-- Name: uniq_document_opportunity_document_id_opportunity_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_document_opportunity_document_id_opportunity_id ON public.document_opportunity USING btree (document_id, opportunity_id);


--
-- Name: uniq_email_email_account_email_id_email_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_email_email_account_email_id_email_account_id ON public.email_email_account USING btree (email_id, email_account_id);


--
-- Name: uniq_email_email_addre_email_id_email_addre_id_addre_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_email_email_addre_email_id_email_addre_id_addre_type ON public.email_email_address USING btree (email_id, email_address_id, address_type);


--
-- Name: uniq_email_inbound_email_email_id_inbound_email_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_email_inbound_email_email_id_inbound_email_id ON public.email_inbound_email USING btree (email_id, inbound_email_id);


--
-- Name: uniq_email_user_email_id_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_email_user_email_id_user_id ON public.email_user USING btree (email_id, user_id);


--
-- Name: uniq_entit_email_addre_entit_id_email_addre_id_entit_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_entit_email_addre_entit_id_email_addre_id_entit_type ON public.entity_email_address USING btree (entity_id, email_address_id, entity_type);


--
-- Name: uniq_entit_phone_numbe_entit_id_phone_numbe_id_entit_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_entit_phone_numbe_entit_id_phone_numbe_id_entit_type ON public.entity_phone_number USING btree (entity_id, phone_number_id, entity_type);


--
-- Name: uniq_entity_team_entity_id_team_id_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_entity_team_entity_id_team_id_entity_type ON public.entity_team USING btree (entity_id, team_id, entity_type);


--
-- Name: uniq_entity_user_entity_id_user_id_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_entity_user_entity_id_user_id_entity_type ON public.entity_user USING btree (entity_id, user_id, entity_type);


--
-- Name: uniq_group_email_folder_team_group_email_folder_id_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_group_email_folder_team_group_email_folder_id_team_id ON public.group_email_folder_team USING btree (group_email_folder_id, team_id);


--
-- Name: uniq_inbound_email_team_inbound_email_id_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_inbound_email_team_inbound_email_id_team_id ON public.inbound_email_team USING btree (inbound_email_id, team_id);


--
-- Name: uniq_job_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_job_number ON public.job USING btree (number);


--
-- Name: uniq_knowl_base_artic_porta_porta_id_knowl_base_artic_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_knowl_base_artic_porta_porta_id_knowl_base_artic_id ON public.knowledge_base_article_portal USING btree (portal_id, knowledge_base_article_id);


--
-- Name: uniq_lead_capture_log_record_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_lead_capture_log_record_number ON public.lead_capture_log_record USING btree (number);


--
-- Name: uniq_lead_created_at_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_lead_created_at_id ON public.lead USING btree (created_at, id);


--
-- Name: uniq_lead_meeting_lead_id_meeting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_lead_meeting_lead_id_meeting_id ON public.lead_meeting USING btree (lead_id, meeting_id);


--
-- Name: uniq_lead_target_list_lead_id_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_lead_target_list_lead_id_target_list_id ON public.lead_target_list USING btree (lead_id, target_list_id);


--
-- Name: uniq_mass_emai_targ_list_excl_mass_emai_id_targ_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_mass_emai_targ_list_excl_mass_emai_id_targ_list_id ON public.mass_email_target_list_excluding USING btree (mass_email_id, target_list_id);


--
-- Name: uniq_mass_email_target_list_mass_email_id_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_mass_email_target_list_mass_email_id_target_list_id ON public.mass_email_target_list USING btree (mass_email_id, target_list_id);


--
-- Name: uniq_meeting_user_user_id_meeting_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_meeting_user_user_id_meeting_id ON public.meeting_user USING btree (user_id, meeting_id);


--
-- Name: uniq_note_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_note_number ON public.note USING btree (number);


--
-- Name: uniq_note_portal_note_id_portal_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_note_portal_note_id_portal_id ON public.note_portal USING btree (note_id, portal_id);


--
-- Name: uniq_note_team_note_id_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_note_team_note_id_team_id ON public.note_team USING btree (note_id, team_id);


--
-- Name: uniq_note_user_note_id_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_note_user_note_id_user_id ON public.note_user USING btree (note_id, user_id);


--
-- Name: uniq_notification_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_notification_number ON public.notification USING btree (number);


--
-- Name: uniq_opportunity_created_at_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_opportunity_created_at_id ON public.opportunity USING btree (created_at, id);


--
-- Name: uniq_portal_portal_role_portal_id_portal_role_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_portal_portal_role_portal_id_portal_role_id ON public.portal_portal_role USING btree (portal_id, portal_role_id);


--
-- Name: uniq_portal_role_user_portal_role_id_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_portal_role_user_portal_role_id_user_id ON public.portal_role_user USING btree (portal_role_id, user_id);


--
-- Name: uniq_portal_user_portal_id_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_portal_user_portal_id_user_id ON public.portal_user USING btree (portal_id, user_id);


--
-- Name: uniq_role_team_role_id_team_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_role_team_role_id_team_id ON public.role_team USING btree (role_id, team_id);


--
-- Name: uniq_role_user_role_id_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_role_user_role_id_user_id ON public.role_user USING btree (role_id, user_id);


--
-- Name: uniq_sms_phone_number_sms_id_phone_number_id_address_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_sms_phone_number_sms_id_phone_number_id_address_type ON public.sms_phone_number USING btree (sms_id, phone_number_id, address_type);


--
-- Name: uniq_star_subscription_user_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_star_subscription_user_entity ON public.star_subscription USING btree (user_id, entity_id, entity_type);


--
-- Name: uniq_target_list_user_user_id_target_list_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_target_list_user_user_id_target_list_id ON public.target_list_user USING btree (user_id, target_list_id);


--
-- Name: uniq_team_user_team_id_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_team_user_team_id_user_id ON public.team_user USING btree (team_id, user_id);


--
-- Name: uniq_user_reaction_parent_user_type; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_user_reaction_parent_user_type ON public.user_reaction USING btree (parent_id, parent_type, user_id, type);


--
-- Name: uniq_user_user_name_delete_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_user_user_name_delete_id ON public."user" USING btree (user_name, delete_id);


--
-- Name: uniq_user_working_time_range_user_id_working_time_range_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_user_working_time_range_user_id_working_time_range_id ON public.user_working_time_range USING btree (user_id, working_time_range_id);


--
-- Name: uniq_webhook_event_queue_item_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_webhook_event_queue_item_number ON public.webhook_event_queue_item USING btree (number);


--
-- Name: uniq_webhook_queue_item_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uniq_webhook_queue_item_number ON public.webhook_queue_item USING btree (number);


--
-- PostgreSQL database dump complete
--

\unrestrict Aqjd9ROayMckjlkHWqdpYmtSGZfqFrtnDqw4yzXV5TrEGAO4Htp1RU6fDqTR2ma

