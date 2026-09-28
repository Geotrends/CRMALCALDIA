define('custom:views/case/fields/decision-juridica', [
    'views/fields/base',
    'custom:helpers/radicacion-fields',
    'custom:helpers/silent-ajax',
    'custom:helpers/auto-inicio-modal',
    'custom:helpers/safe-ui-promise',
], function (Dep, RadicacionFields, SilentAjax, AutoInicioModal, SafeUiPromise) {

    const STATUS_VISITA_REALIZADA = 'En gestión técnica';
    const STATUS_REVISION = 'Revisión de hallazgos';
    const STATUS_LEGACY_APPROVED = 'Visita aprobada';

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
            endpoint: 'Case/action/cerrarSinProceso',
            confirm: '¿Confirma el cierre de la atención sin abrir proceso? El caso quedará pendiente de la respuesta final al peticionario (la proyecta Inspección) y se finaliza con «Finalizar caso».',
            success: 'Atención cerrada: pendiente de la respuesta final al peticionario.',
        },
        'Remisión por competencia': {
            label: 'Guardar y remitir por competencia',
            icon: 'fa-share-from-square',
            endpoint: 'Case/action/remitirPorCompetencia',
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

            if (!this.model.id) {
                return;
            }

            this.listenTo(this.model, 'change:status sync', function () {
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

            if (!this.model.id || this._loading) {
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
                    self.loadState();
                });

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

            Promise.all([autoInicioRequest, actaRequest]).then(function (responses) {
                const list = (responses[0] && responses[0].list) || [];
                const actas = (responses[1] && responses[1].list) || [];

                self.hasAutoInicio = list.length > 0;
                self.hasActaFirmada = !!(actas[0] && String(actas[0].formatoManoAdjuntoIds || '').trim());
                self.currentActa = actas[0] || null;
                self.stateReady = true;
                self.refreshViewState();
            }).catch(function () {
                self.hasAutoInicio = false;
                self.hasActaFirmada = false;
                self.stateReady = true;
                self.refreshViewState();
            }).finally(function () {
                self._loading = false;
            });
        },

        refreshViewState: function () {
            if (!this.isRendered || !this.isRendered()) {
                return;
            }

            const data = this.data();
            const hadPanel = this.$el.data('decisionPanelVisible') === true;
            const showPanel = !!data.showPanel;

            if (!hadPanel && showPanel) {
                // Primera vez que corresponde mostrarlo: el template se
                // renderizó con showPanel=false (nada de HTML dentro del
                // {{#if}}), así que hay que re-renderizar de verdad, no
                // solo alternar visibilidad de elementos que no existen.
                this.$el.data('decisionPanelVisible', true);
                SafeUiPromise.safeReRender(this);
                this.updatePanelVisibility(true);
                this.bindUi();

                return;
            }

            this.$el.data('decisionPanelVisible', showPanel);
            this.updatePanelVisibility(showPanel);

            if (showPanel) {
                this.bindUi();
            }
        },

        data: function () {
            const user = this.getUser();
            // Con expediente (en preparación o abierto) la revisión ya se resolvió: la
            // apertura sigue en el bloque «Apertura de expediente».
            const canDecidir = this.stateReady && this.canDecidir(user) && !this.hasAutoInicio && this.hasActaFirmada
                && !this.model.get('expedienteId')
                && this.model.get('cDecisionTramite') !== 'Apertura de actuación';
            const status = String(this.model.get('status') || '').trim();
            const showRevisar = canDecidir && status === STATUS_VISITA_REALIZADA;
            const showDecisiones = canDecidir && (status === STATUS_REVISION || status === STATUS_LEGACY_APPROVED);

            return {
                showPanel: showRevisar || showDecisiones,
                showRevisar: showRevisar,
                showDecisiones: showDecisiones,
                helpText: this.translateCaseLabel('decisionJuridicaHelp'),
                decisionTramite: this.model.get('cDecisionTramite') || '',
                motivoDecision: this.model.get('cMotivoDecision') || '',
                entidadRemision: this.model.get('cEntidadRemision') || '',
            };
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

        bindUi: function () {
            if (!this.$el || !this.$el.length) {
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

                Espo.Ajax.postRequest('Case/action/guardarDefinicionTramite', {
                    id: self.model.id, decision: decision, motivo: motivo, entidadRemision: entidadRemision,
                }).then(function () {
                    if (accion.endpoint) {
                        return Espo.Ajax.postRequest(accion.endpoint, {id: self.model.id});
                    }

                    return null;
                }).then(function (response) {
                    Espo.Ui.notify(false);

                    if (!accion.endpoint) {
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
