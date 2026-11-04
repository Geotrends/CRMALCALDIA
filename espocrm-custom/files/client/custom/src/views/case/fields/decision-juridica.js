define('custom:views/case/fields/decision-juridica', [
    'views/fields/base',
    'custom:helpers/radicacion-fields',
    'custom:helpers/silent-ajax',
    'custom:helpers/auto-inicio-modal',
    'custom:helpers/safe-ui-promise',
    'custom:helpers/case-related-record-modal',
], function (Dep, RadicacionFields, SilentAjax, AutoInicioModal, SafeUiPromise, CaseRelatedRecordModal) {

    const STATUS_VISITA_REALIZADA = 'En gestión técnica';
    const STATUS_REVISION = 'Revisión de hallazgos';
    const STATUS_LEGACY_APPROVED = 'Visita aprobada';

    const STATUS_REVISION_TECNICA = 'Revisión técnica';
    const STATUS_REVISION_JURIDICA = 'Revisión jurídica';

    /** Revisión técnica (Director Técnico): decisiones posibles sobre la visita revisada. */
    const DECISIONES_TECNICA = [
        {
            value: 'enviar_juridica',
            label: 'Enviar a revisión jurídica',
            help: 'El acta y el informe técnico están completos. Puede dejar un comentario para el Apoyo Jurídico.',
            motivo: 'opcional',
            boton: 'Enviar a revisión jurídica',
            confirm: '¿Confirma el aval técnico y el envío a revisión jurídica? La intervención técnica quedará «Completa documentalmente».',
            success: 'Enviado a revisión jurídica.',
        },
        {
            value: 'correcciones',
            label: 'Solicitar correcciones',
            help: 'Pida mejorar el informe técnico o cambiar algún campo del acta. El inspector las atenderá y volverá a enviarlo a revisión.',
            motivo: 'requerido',
            boton: 'Solicitar correcciones',
            confirm: '¿Confirma la solicitud de correcciones? La solicitud vuelve a gestión técnica y se avisa al inspector responsable.',
            success: 'Correcciones solicitadas al inspector.',
        },
        {
            value: 'nueva_visita',
            label: 'Solicitar una nueva visita',
            help: 'Fundamente por qué se necesita otra visita. Se avisará al responsable para que la programe.',
            motivo: 'requerido',
            boton: 'Solicitar nueva visita',
            confirm: '¿Confirma que se necesita una nueva visita? Se avisará al responsable con el motivo y un plazo de 5 días hábiles.',
            success: 'Nueva visita solicitada.',
        },
        {
            value: 'remitir',
            label: 'Remitir por competencia',
            help: 'La solicitud corresponde a otra entidad. Indique cuál y por qué.',
            motivo: 'requerido',
            entidad: true,
            boton: 'Remitir por competencia',
            confirm: '¿Confirma la remisión por competencia? Se registrará la remisión y se avisará a quien prepara el oficio.',
            success: 'Caso remitido por competencia.',
        },
    ];

    /** Revisión jurídica (Apoyo Jurídico): abrir o no abrir actuación. */
    const DECISIONES_JURIDICA = [
        {
            value: 'abrir',
            label: 'Abrir actuación',
            help: 'El caso requiere una actuación. Después se elige el régimen y el expediente en «Apertura de expediente».',
            motivo: 'opcional',
            boton: 'Decidir la apertura de actuación',
            confirm: '¿Confirma que se abre actuación? A continuación complete la apertura en «Apertura de expediente».',
            success: 'Definición guardada. Complete la apertura en «Apertura de expediente».',
        },
        {
            value: 'no_abrir',
            label: 'No abrir actuación',
            help: 'Deje sus observaciones. Se cierra la atención y queda pendiente la respuesta final al peticionario.',
            motivo: 'requerido',
            boton: 'No abrir actuación y cerrar la atención',
            confirm: '¿Confirma que no se abre actuación? El caso quedará pendiente de la respuesta final al peticionario.',
            success: 'Atención cerrada: pendiente de la respuesta final al peticionario.',
        },
    ];

    /** Definición de trámite → acción que ejecuta el botón único. */
    const ACCIONES = {
        'Visita complementaria': {
            label: 'Guardar y solicitar visita complementaria',
            icon: 'fa-plus',
            endpoint: 'Case/action/prepararNuevaVisita',
            confirm: '¿Confirma que desea solicitar una visita complementaria? Se avisará al responsable con la motivación y un plazo de 5 días hábiles.',
            success: 'Visita complementaria solicitada.',
        },
        'Cierre de atención': {
            label: 'Guardar y cerrar la atención',
            icon: 'fa-box-archive',
            endpoint: null,
            ejecutar: true,
            confirm: '¿Confirma el cierre de la atención sin abrir proceso? El caso quedará pendiente de la respuesta final al peticionario (la proyecta Inspección) y se finaliza con «Finalizar caso».',
            success: 'Atención cerrada: pendiente de la respuesta final al peticionario.',
        },
        'Remisión por competencia': {
            label: 'Guardar y remitir por competencia',
            icon: 'fa-share-from-square',
            endpoint: null,
            ejecutar: true,
            confirm: '¿Confirma la remisión por competencia? Se registrará la remisión, se avisará a quien prepara el oficio (plazo de 5 días hábiles) y el caso se finaliza con «Finalizar caso» cuando se envíe el oficio y se informe al peticionario.',
            success: 'Caso remitido por competencia. Remisión registrada para el oficio.',
        },
        'Apertura de actuación': {
            label: 'Guardar y decidir la apertura',
            icon: 'fa-gavel',
            endpoint: null,
            confirm: '¿Confirma la apertura de actuación? A continuación elija el régimen y si se abre un expediente nuevo o se incorpora a uno existente.',
            success: '',
        },
    };

    return Dep.extend({

        detailTemplate: 'custom:case/fields/decision-juridica',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.stateReady = false;
            this.hasAutoInicio = false;
            this.hasActaFirmada = false;
            this._loading = false;
            this.once('remove', () => {
                this._removed = true;
                window.clearTimeout(this._timer);
            });

            if (!this.model.id) {
                return;
            }

            this.listenTo(this.model, 'change:status change:expedienteId change:cDecisionTramite sync visitas:updated', function () {
                this._stateRevision = (this._stateRevision || 0) + 1;
                this.scheduleLoadState();
            });
        },

        translateCaseLabel: function (key) {
            return this.getLanguage().translate(key, 'labels', 'Case')
                || this.translate(key, 'Case');
        },

        canDecidir: function (user) {
            user = user || this.getUser();

            if (user.isAdmin && user.isAdmin()) {
                return true;
            }

            return RadicacionFields.isInspeccionUser(user)
                || RadicacionFields.isAsignadorUser(user)
                || RadicacionFields.isJuridicaUser(user)
                || this.tieneRol('Inspector Ambiental');
        },

        /** Roles del usuario según el perfil del servidor (cargado en loadState). */
        tieneRol: function (nombre) {
            return (this.profileRoles || []).indexOf(nombre) !== -1;
        },

        /** Apertura de actuación: Admin, Director Técnico, Inspector Ambiental o Apoyo Jurídico. */
        canDecidirApertura: function () {
            const user = this.getUser();

            return (user.isAdmin && user.isAdmin())
                || RadicacionFields.isAsignadorUser(user)
                || RadicacionFields.isJuridicaUser(user)
                || this.tieneRol('Inspector Ambiental');
        },

        isCaseReadyForDecision: function () {
            const status = String(this.model.get('status') || '').trim();

            return status === STATUS_VISITA_REALIZADA || status === STATUS_REVISION || status === STATUS_LEGACY_APPROVED;
        },

        scheduleLoadState: function () {
            if (this._timer) {
                window.clearTimeout(this._timer);
            }

            const self = this;

            this._timer = window.setTimeout(function () {
                self._timer = null;
                self.loadState();
            }, 150);
        },

        loadState: function () {
            const self = this;
            const user = this.getUser();

            if (!this.model.id || this._removed) {
                return;
            }

            if (this._loading) {
                this._reload = true;
                return;
            }

            if (!this.profileRoles) {
                this._loading = true;
                RadicacionFields.ensureProfile(user).then(function (profile) {
                    self.profileRoles = (profile && profile.roles) || [];
                }).catch(function () {
                    self.profileRoles = [];
                }).finally(function () {
                    self._loading = false;
                    self._reload = false;
                    self.loadState();
                });

                return;
            }

            if (this.esEtapaRevision()) {
                this.cargarRevision();

                return;
            }

            if (!this.isCaseReadyForDecision() || !this.canDecidir(user)) {
                this.hasAutoInicio = false;
                this.hasActaFirmada = false;
                this.stateReady = true;
                this.refreshViewState();

                return;
            }

            this._loading = true;
            const revision = this._stateRevision || 0;

            const autoInicioRequest = SilentAjax.getRequest('AutoInicio', {
                where: [
                    {
                        type: 'equals',
                        attribute: 'caseId',
                        value: this.model.id,
                    },
                ],
                select: 'id',
                maxSize: 1,
            });
            const actaRequest = SilentAjax.getRequest('ActaVisita', {
                where: [{type: 'equals', attribute: 'caseId', value: this.model.id}],
                select: 'id,formatoManoAdjuntoIds,cDecisionTramite,observacionesRevision,cEntidadRemision,cRevisadoPor,fechaAprobacion',
                orderBy: 'createdAt',
                order: 'desc',
                maxSize: 1,
            });

            const nuevaVisitaRequest = SilentAjax.getRequest('Case/action/enProcesoOtraVisita', {id: this.model.id});

            Promise.all([autoInicioRequest, actaRequest, nuevaVisitaRequest]).then(function (responses) {
                if (self._removed || revision !== (self._stateRevision || 0)) {
                    return;
                }
                const list = (responses[0] && responses[0].list) || [];
                const actas = (responses[1] && responses[1].list) || [];

                self.hasAutoInicio = list.length > 0;
                self.hasActaFirmada = !!(actas[0] && String(actas[0].formatoManoAdjuntoIds || '').trim());
                self.currentActa = actas[0] || null;
                self.visitaComplementariaPreparada = !!(responses[2] && responses[2].enProcesoOtraVisita);
                self.stateReady = true;
                self.refreshViewState();
            }).catch(function () {
                if (self._removed || revision !== (self._stateRevision || 0)) {
                    return;
                }
                self.hasAutoInicio = false;
                self.hasActaFirmada = false;
                self.stateReady = true;
                self.refreshViewState();
            }).finally(function () {
                self._loading = false;
                if (!self._removed && (self._reload || revision !== (self._stateRevision || 0))) {
                    self._reload = false;
                    self.scheduleLoadState();
                }
            });
        },

        esEtapaRevision: function () {
            const status = String(this.model.get('status') || '').trim();

            return status === STATUS_REVISION_TECNICA || status === STATUS_REVISION_JURIDICA;
        },

        cargarRevision: function () {
            const self = this;
            const revision = this._stateRevision || 0;

            this._loading = true;

            SilentAjax.getRequest('Case/action/revisionEstado', {id: this.model.id}).then(function (response) {
                if (self._removed || revision !== (self._stateRevision || 0)) {
                    return;
                }

                self.revision = response || null;
                self.stateReady = true;
                self.refreshViewState();
            }).catch(function () {
                self.revision = null;
                self.stateReady = true;
                self.refreshViewState();
            }).finally(function () {
                self._loading = false;

                if (!self._removed && (self._reload || revision !== (self._stateRevision || 0))) {
                    self._reload = false;
                    self.scheduleLoadState();
                }
            });
        },

        /** Datos de la revisión técnico-jurídica para la plantilla. */
        datosRevision: function () {
            const revision = this.revision || {};
            const etapa = this.esEtapaRevision() ? revision.etapa : null;

            if (!this.stateReady || !etapa) {
                return {showRevision: false};
            }

            const tecnica = etapa === 'tecnica';
            const puedeDecidir = tecnica ? !!revision.puedeDecidirTecnica : !!revision.puedeDecidirJuridica;
            const intervencion = revision.intervencion || null;
            const acta = revision.acta || null;

            return {
                showRevision: true,
                revisionTitulo: tecnica ? 'Revisión técnica · Director Técnico' : 'Revisión jurídica · Apoyo Jurídico',
                revisionAyuda: tecnica
                    ? 'Revise el acta de visita y el informe técnico, y decida cómo continúa la solicitud.'
                    : 'El Director Técnico avaló la visita. Decida si el caso necesita la apertura de una actuación.',
                revisionPendiente: !puedeDecidir,
                revisionQuien: tecnica ? 'el Director Técnico' : 'el Apoyo Jurídico',
                puedeDecidirRevision: puedeDecidir,
                verificaFecha: !tecnica,
                fechaRespuesta: revision.fechaRespuesta || {},
                intervencion: intervencion,
                acta: acta,
                comentarioTecnico: !tecnica && intervencion ? intervencion.observacionesRevision : '',
                decisiones: (tecnica ? DECISIONES_TECNICA : DECISIONES_JURIDICA).map(function (d) {
                    return {value: d.value, label: d.label, help: d.help};
                }),
            };
        },

        refreshViewState: function () {
            if (!this.isRendered || !this.isRendered()) {
                return;
            }

            const data = this.data();
            const hadPanel = this.$el.data('decisionPanelVisible') === true;
            const showPanel = !!data.showPanel;
            const stateKey = JSON.stringify([data, this.currentActa]);

            if (showPanel && (!hadPanel || this._renderedStateKey !== stateKey)) {
                // Primera vez que corresponde mostrarlo: el template se
                // renderizó con showPanel=false (nada de HTML dentro del
                // {{#if}}), así que hay que re-renderizar de verdad, no
                // solo alternar visibilidad de elementos que no existen.
                this.$el.data('decisionPanelVisible', true);
                this._renderedStateKey = stateKey;
                // La firma puede llegar mientras el panel ya era visible con un aviso.
                // Reconstruir el template y enlazar los controles después de ese render.
                Promise.resolve(SafeUiPromise.safeReRender(this)).then(() => {
                    if (!this._removed) {
                        this.updatePanelVisibility(!!this.data().showPanel);
                    }
                });

                return;
            }

            this.$el.data('decisionPanelVisible', showPanel);
            this.updatePanelVisibility(showPanel);

            // Si nada cambió, conservar los valores que está escribiendo el inspector.
        },

        data: function () {
            const user = this.getUser();
            // Con expediente (en preparación o abierto) la revisión ya se resolvió: la
            // apertura sigue en el bloque «Apertura de expediente».
            const revisable = this.stateReady && this.canDecidir(user) && !this.hasAutoInicio
                && !this.model.get('expedienteId')
                && this.model.get('cDecisionTramite') !== 'Apertura de actuación';
            const canDecidir = revisable && this.hasActaFirmada;
            const status = String(this.model.get('status') || '').trim();
            // Con el acta registrada pero sin el acta firmada, quien revisa ve la sección con el aviso
            // (el servidor exige el acta firmada para registrar la revisión).
            const showSinFirma = revisable && !this.hasActaFirmada && !!this.currentActa
                && (status === STATUS_REVISION || status === STATUS_LEGACY_APPROVED);
            // La revisión empieza sola cuando la visita tiene acta e informe técnico (Revisión técnica).
            const showRevisar = false;
            const showDecisiones = canDecidir && (status === STATUS_REVISION || status === STATUS_LEGACY_APPROVED);
            const acta = this.currentActa || {};
            const showComplementariaSolicitada = canDecidir && this.visitaComplementariaPreparada
                && acta.cDecisionTramite === 'Visita complementaria'
                && !!(acta.cRevisadoPor || acta.fechaAprobacion);

            const revision = this.datosRevision();

            return Object.assign({
                showPanel: showRevisar || showDecisiones || showSinFirma || revision.showRevision,
                showSinFirma: showSinFirma,
                showRevisar: showRevisar,
                showDecisiones: showDecisiones,
                showComplementariaSolicitada: !!showComplementariaSolicitada,
                helpText: this.translateCaseLabel('decisionJuridicaHelp'),
                decisionTramite: this.model.get('cDecisionTramite') || '',
                motivoDecision: this.model.get('cMotivoDecision') || '',
                entidadRemision: this.model.get('cEntidadRemision') || '',
            }, revision);
        },

        updatePanelVisibility: function (show) {
            if (!this.$el || !this.$el.length) {
                return;
            }

            if (this.$el.closest('.case-visita-decision').length) {
                this.$el.closest('.case-visita-decision').toggle(!!show);
                return;
            }

            const $namedPanel = this.$el.closest(
                '.panel[data-name="decisionJuridica"], ' +
                '.record-panel[data-name="decisionJuridica"], ' +
                '[data-name="decisionJuridica"].panel'
            );
            const $panel = $namedPanel.length
                ? $namedPanel
                : this.$el.closest('.panel');

            $panel.toggle(!!show);
        },

        setReadOnly: function () {
            this.readOnly = false;

            if (this.isRendered && this.isRendered()) {
                this.bindUi();
            }
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);

            // Este panel no corresponde al formulario de creación. Solo se
            // muestra en un caso existente cuando la visita fue aprobada.
            if (!this.model.id) {
                this.updatePanelVisibility(false);

                return;
            }

            if (!this.stateReady && !this._loading) {
                this.updatePanelVisibility(false);
                this.loadState();

                return;
            }

            const data = this.data();
            this.updatePanelVisibility(!!data.showPanel);

            if (data.showPanel) {
                this.bindUi();
            }
        },

        /** Formulario de la revisión técnica o jurídica: opción elegida, motivación y botón único. */
        bindRevisionUi: function () {
            const self = this;
            const tecnica = (this.revision || {}).etapa === 'tecnica';
            const definiciones = tecnica ? DECISIONES_TECNICA : DECISIONES_JURIDICA;
            const $root = this.$el.find('.case-revision');

            const sync = function () {
                const value = String($root.find('input[name="revisionDecision"]:checked').val() || '');
                const def = definiciones.find(d => d.value === value);

                $root.find('.case-revision__opcion').removeClass('is-selected');
                $root.find('input[name="revisionDecision"]:checked').closest('.case-revision__opcion').addClass('is-selected');
                $root.find('.case-revision__entidad').toggleClass('hidden', !(def && def.entidad));
                $root.find('.js-revision-motivo-label').text(def
                    ? (def.motivo === 'requerido' ? 'Fundamentación (obligatoria)' : 'Comentario (opcional)')
                    : 'Motivación');

                const $btn = $root.find('[data-action="ejecutarRevision"]');

                $btn.prop('disabled', !def);
                $btn.find('.js-revision-btn-label').text(def ? def.boton : 'Seleccione una decisión');
            };

            $root.find('input[name="revisionDecision"]').off('change.revision').on('change.revision', sync);
            $root.find('[data-name="fechaCorregir"]').off('change.revision').on('change.revision', function () {
                $root.find('.case-revision__fecha-corregir').toggleClass('hidden', !this.checked);
            });
            sync();

            $root.find('[data-action="ejecutarRevision"]').off('click.revision').on('click.revision', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.actionEjecutarRevision(definiciones, tecnica);
            });
        },

        actionEjecutarRevision: function (definiciones, tecnica) {
            const self = this;
            const $root = this.$el.find('.case-revision');
            const value = String($root.find('input[name="revisionDecision"]:checked').val() || '');
            const def = definiciones.find(d => d.value === value);
            const motivo = String($root.find('[data-name="revisionMotivo"]').val() || '').trim();
            const entidad = String($root.find('[data-name="revisionEntidad"]').val() || '').trim();

            if (!def) {
                Espo.Ui.error('Seleccione una decisión.');

                return;
            }

            if (def.motivo === 'requerido' && !motivo) {
                $root.find('[data-name="revisionMotivo"]').closest('.form-group').addClass('has-error');
                $root.find('[data-name="revisionMotivo"]').trigger('focus');
                Espo.Ui.error('Escriba la fundamentación de la decisión.');

                return;
            }

            if (def.entidad && !entidad) {
                $root.find('[data-name="revisionEntidad"]').closest('.form-group').addClass('has-error');
                Espo.Ui.error('Indique la entidad competente a la que se remitirá el caso.');

                return;
            }

            let fecha = {};

            if (!tecnica) {
                const corregir = $root.find('[data-name="fechaCorregir"]').is(':checked');
                const verificada = $root.find('[data-name="fechaVerificada"]').is(':checked');
                const actual = String(((self.revision || {}).fechaRespuesta || {}).fecha || '');
                const corregida = corregir ? String($root.find('[data-name="fechaCorregida"]').val() || '') : '';
                const motivoFecha = String($root.find('[data-name="fechaMotivo"]').val() || '').trim();

                if (!verificada) {
                    Espo.Ui.error('Confirme que verificó la fecha límite de respuesta.');

                    return;
                }

                if ((corregir || !actual) && !corregida) {
                    Espo.Ui.error('Indique la fecha límite de respuesta correcta.');

                    return;
                }

                if (corregida && corregida !== actual && !motivoFecha) {
                    $root.find('[data-name="fechaMotivo"]').closest('.form-group').addClass('has-error');
                    Espo.Ui.error('Explique por qué se corrige la fecha límite de respuesta.');

                    return;
                }

                fecha = {fechaRespuestaVerificada: true, fechaRespuestaCorregida: corregida, fechaRespuestaMotivo: motivoFecha};
            }

            Espo.Ui.confirm(def.confirm, {
                title: def.boton,
                confirmText: 'Sí, continuar',
                cancelText: 'Cancelar',
                confirmStyle: 'primary',
            }, function () {
                Espo.Ui.notify(self.translate('pleaseWait', 'messages'));

                const request = tecnica
                    ? Espo.Ajax.postRequest('Case/action/revisionTecnica', {
                        id: self.model.id, decision: def.value, motivo: motivo, entidadRemision: entidad,
                    })
                    : Espo.Ajax.postRequest('Case/action/revisionJuridica', {
                        id: self.model.id, decision: def.value, observaciones: motivo,
                        fechaRespuestaVerificada: fecha.fechaRespuestaVerificada,
                        fechaRespuestaCorregida: fecha.fechaRespuestaCorregida,
                        fechaRespuestaMotivo: fecha.fechaRespuestaMotivo,
                    });

                request.then(function (response) {
                    Espo.Ui.notify(false);
                    Espo.Ui.success(def.success);

                    if (response && response.status) {
                        self.model.set('status', response.status);
                    }

                    self.model.fetch();
                    $(window).trigger('crm:visita-historial-changed');
                }).catch(function () {
                    Espo.Ui.notify(false);
                    self.model.fetch();
                });
            });
        },

        bindUi: function () {
            CaseRelatedRecordModal.bind(this);
            if (!this.$el || !this.$el.length) {
                return;
            }

            if (this.datosRevision().showRevision) {
                this.bindRevisionUi();

                return;
            }

            const self = this;
            const $decision = this.$el.find('[data-name="decisionTramite"]');
            const $entidad = this.$el.find('[data-name="entidadRemision"]');

            // Se precarga la revisión de ESTA visita (la en curso), si ya se registró;
            // la decisión de una visita anterior se consulta en su propia tarjeta.
            const acta = this.currentActa || {};
            const revisada = String(acta.cDecisionTramite || '').trim() !== ''
                && (String(acta.cRevisadoPor || '').trim() !== '' || String(acta.fechaAprobacion || '').trim() !== '');

            $decision.val(revisada ? acta.cDecisionTramite : '');
            this.$el.find('[data-name="motivoDecision"]').val(revisada ? (acta.observacionesRevision || '') : '');
            $entidad.val(revisada ? (acta.cEntidadRemision || '') : '');

            // «Entidad competente» solo se habilita con «Remisión por competencia»;
            // el botón único cambia su texto según la definición elegida.
            const syncForm = function () {
                const decision = String($decision.val() || '');
                const esRemision = decision === 'Remisión por competencia';
                const accion = ACCIONES[decision];

                $entidad.prop('disabled', !esRemision)
                    .attr('placeholder', esRemision
                        ? 'Entidad destinataria de la remisión'
                        : 'Solo aplica para remisión por competencia');
                $entidad.closest('.case-entidad-remision').toggleClass('is-disabled', !esRemision);

                if (!esRemision) {
                    $entidad.val('');
                }

                const $btn = self.$el.find('[data-action="ejecutarDefinicion"]');

                $btn.prop('disabled', !accion);
                $btn.find('.js-ejecutar-label').text(accion ? accion.label : 'Seleccione la definición de trámite');
                $btn.find('.js-ejecutar-icon').attr('class', 'fas ' + (accion ? accion.icon : 'fa-circle-check') + ' js-ejecutar-icon');
            };

            if (!this.canDecidirApertura()) {
                $decision.find('option[value="Apertura de actuación"]').remove();
            }

            $decision.off('change.decisionForm').on('change.decisionForm', syncForm);
            syncForm();

            this.$el.find('[data-action="ejecutarDefinicion"]').off('click.decisionEjecutar')
                .on('click.decisionEjecutar', function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    self.actionEjecutarDefinicion();
                });
        },

        /**
         * Un solo paso: valida, confirma, guarda la definición (queda la revisión de
         * hallazgos registrada) y ejecuta la acción correspondiente.
         */
        actionEjecutarDefinicion: function () {
            if (this.data().showComplementariaSolicitada) {
                Espo.Ui.success('La visita complementaria ya está solicitada. El responsable asignado debe programarla desde Visitas.');
                return;
            }
            const self = this;
            const decision = String(this.$el.find('[data-name="decisionTramite"]').val() || '').trim();
            const motivo = String(this.$el.find('[data-name="motivoDecision"]').val() || '').trim();
            const entidadRemision = String(this.$el.find('[data-name="entidadRemision"]').val() || '').trim();
            const accion = ACCIONES[decision];

            const faltante = !accion ? ['decisionTramite', 'Seleccione la definición de trámite.']
                : !motivo ? ['motivoDecision', 'Escriba la motivación de la revisión: los hallazgos y la razón de la definición.']
                    : (decision === 'Remisión por competencia' && !entidadRemision)
                        ? ['entidadRemision', 'Indique la entidad competente a la que se remitirá el caso.']
                        : null;

            this.$el.find('.case-decision-juridica-form .has-error').removeClass('has-error');

            if (faltante) {
                const $campo = this.$el.find('[data-name="' + faltante[0] + '"]');

                $campo.closest('.form-group').addClass('has-error');
                $campo.trigger('focus');
                Espo.Ui.error(faltante[1]);

                return;
            }

            const ejecutar = function () {
                Espo.Ui.notify(self.translate('pleaseWait', 'messages'));

                // Cierre y remisión se ejecutan en la misma petición ("ejecutar"): un solo
                // guardado del caso y una sola entrada en la historia.
                Espo.Ajax.postRequest('Case/action/guardarDefinicionTramite', {
                    id: self.model.id, decision: decision, motivo: motivo, entidadRemision: entidadRemision,
                    ejecutar: !!accion.ejecutar,
                }).then(function (response) {
                    if (accion.endpoint) {
                        return Espo.Ajax.postRequest(accion.endpoint, {id: self.model.id});
                    }

                    return response;
                }).then(function (response) {
                    Espo.Ui.notify(false);

                    if (!accion.endpoint && !accion.ejecutar) {
                        // Apertura de actuación: se decide el régimen y si se abre un expediente
                        // nuevo o se incorpora a uno existente en el bloque «Apertura de expediente».
                        Espo.Ui.success('Definición guardada. Complete la apertura en «Apertura de expediente».');
                        self.model.fetch();

                        return;
                    }

                    Espo.Ui.success(accion.success);

                    if (response && response.status) {
                        self.model.set('status', response.status);
                    }

                    self.model.fetch();
                }).catch(function () {
                    // El detalle del error lo muestra el aviso global (ui-toasts).
                    Espo.Ui.notify(false);
                    self.model.fetch();
                });
            };

            Espo.Ui.confirm(accion.confirm, {
                title: accion.label,
                confirmText: 'Sí, continuar',
                cancelText: 'Cancelar',
                confirmStyle: 'primary',
            }, ejecutar);
        },
    });
});
