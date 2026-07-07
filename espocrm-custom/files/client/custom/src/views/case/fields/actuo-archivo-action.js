define('custom:views/case/fields/actuo-archivo-action', [
    'views/fields/base',
    'custom:helpers/actuo-archivo-modal',
    'custom:helpers/actuo-archivo-case-status',
    'custom:helpers/formato-actuo-archivo-case-access',
    'custom:helpers/radicacion-fields',
    'custom:helpers/safe-ui-promise',
], function (Dep, ActuoArchivoModal, ActuoArchivoCaseStatus, FormatoActuoArchivoCaseAccess, RadicacionFields, SafeUiPromise) {

    return Dep.extend({

        detailTemplate: 'custom:case/fields/actuo-archivo-action',

        setup: function () {
            Dep.prototype.setup.call(this);

            this.actuoIsEditMode = false;
            this.stateReady = false;
            this._actuoStateLoading = false;

            if (!this.model.id) {
                return;
            }

            this.listenTo(this.model, 'change:status sync', function () {
                this.scheduleLoadActuoState();
            });
        },

        translateCaseLabel: function (key) {
            return this.getLanguage().translate(key, 'labels', 'Case')
                || this.translate(key, 'Case');
        },

        canManageActuo: function (user) {
            user = user || this.getUser();

            return FormatoActuoArchivoCaseAccess.canManageActuoFromCase(user)
                && FormatoActuoArchivoCaseAccess.isCaseReadyForActuo(this.model);
        },

        scheduleLoadActuoState: function () {
            if (this._actuoStateTimer) {
                window.clearTimeout(this._actuoStateTimer);
            }

            const self = this;

            this._actuoStateTimer = window.setTimeout(function () {
                self._actuoStateTimer = null;
                self.loadActuoState();
            }, 150);
        },

        loadActuoState: function () {
            const user = this.getUser();
            const self = this;

            if (!this.model.id || this._actuoStateLoading) {
                return;
            }

            this._actuoStateLoading = true;

            RadicacionFields.ensureProfile(user);

            RadicacionFields.onProfileReady(function () {
                try {
                    if (!self.canManageActuo(user)) {
                        self.applyActuoState(null);

                        return;
                    }

                    ActuoArchivoCaseStatus.fetchActuoForCase(self.model.id, user, self.model)
                        .then(function (actuo) {
                            self.applyActuoState(actuo);
                        })
                        .catch(function () {
                            self.applyActuoState(null);
                        })
                        .finally(function () {
                            self._actuoStateLoading = false;
                        });
                } catch (error) {
                    self._actuoStateLoading = false;
                    self.applyActuoState(null);
                }
            });
        },

        applyActuoState: function (actuo) {
            this.actuoIsEditMode = ActuoArchivoCaseStatus.isActuoDiligenciado(actuo);
            this.stateReady = true;
            this.updatePanelVisibility(this.canManageActuo());
            this.refreshViewState();
        },

        refreshViewState: function () {
            if (!this.isRendered || !this.isRendered() || !this.stateReady) {
                return;
            }

            const data = this.data();
            const hadPanel = this.$el.data('actuoPanelVisible') === true;
            const showPanel = !!data.showPanel;

            if (!hadPanel && showPanel) {
                this.$el.data('actuoPanelVisible', true);
                SafeUiPromise.safeReRender(this);
                this.updatePanelVisibility(true);
                this.bindUi();

                return;
            }

            this.$el.data('actuoPanelVisible', showPanel);

            if (!showPanel) {
                this.updatePanelVisibility(false);

                return;
            }

            this.updatePanelVisibility(true);
            this.$el.find('.case-actuo-archivo-help').text(data.helpText || '');
            this.$el.find('.case-actuo-archivo-actions').toggle(!!data.showActions);
            this.$el.find('[data-action="llenarActuoArchivo"] .case-actuo-archivo-btn-text')
                .text(data.buttonLabel);
            this.$el.find('[data-action="imprimirActuoManual"] .case-actuo-archivo-btn-text')
                .text(data.printLabel);
            this.bindUi();
        },

        data: function () {
            const user = this.getUser();
            const showPanel = this.stateReady && this.canManageActuo(user);

            return {
                showPanel: showPanel,
                showActions: showPanel,
                helpText: this.actuoIsEditMode
                    ? this.translateCaseLabel('actuoArchivoEditHelp')
                    : this.translateCaseLabel('actuoArchivoPanelHelp'),
                buttonLabel: this.actuoIsEditMode
                    ? this.translateCaseLabel('editarActuoArchivo')
                    : this.translateCaseLabel('llenarActuoArchivo'),
                printLabel: this.translateCaseLabel('imprimirActuoArchivoManual'),
            };
        },

        afterRender: function () {
            Dep.prototype.afterRender.call(this);
            this.bindUi();

            if (this.model.id && !this.stateReady && !this._actuoStateLoading) {
                this.loadActuoState();
            }
        },

        setReadOnly: function () {
            this.readOnly = false;

            if (this.isRendered && this.isRendered()) {
                this.bindUi();
            }
        },

        updatePanelVisibility: function (show) {
            if (!this.$el || !this.$el.length) {
                return;
            }

            this.$el.closest(
                '.panel[data-name="actuoArchivo"], ' +
                '.record-panel[data-name="actuoArchivo"], ' +
                '[data-name="actuoArchivo"].panel'
            ).toggle(show);
        },

        bindUi: function () {
            if (!this.$el || !this.$el.length || !this.canManageActuo()) {
                return;
            }

            const self = this;

            this.$el.find('[data-action="llenarActuoArchivo"]').off('click.actuo');
            this.$el.find('[data-action="imprimirActuoManual"]').off('click.actuoManual');

            this.$el.find('[data-action="llenarActuoArchivo"]').on('click.actuo', function (e) {
                e.preventDefault();
                e.stopPropagation();

                ActuoArchivoModal.open(self, self.model, self.getUser(), {
                    onAfterSave: function () {
                        ActuoArchivoCaseStatus.invalidateCache(self.model.id);
                        self.scheduleLoadActuoState();
                        self.model.fetch();
                    },
                });
            });

            this.$el.find('[data-action="imprimirActuoManual"]').on('click.actuoManual', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.actionImprimirActuoManual();
            });
        },

        actionImprimirActuoManual: function () {
            if (!this.model.id) {
                Espo.Ui.error(this.translate('Error'));

                return;
            }

            const url = this.getBasePath()
                + '?entryPoint=FormatoActuoArchivoCaso'
                + '&id=' + encodeURIComponent(this.model.id)
                + '&modo=manual'
                + '&format=pdf'
                + '&inline=1';

            Espo.Ui.notify(this.translate('pleaseWait', 'messages'));

            const printWindow = window.open(url, '_blank');

            if (!printWindow) {
                Espo.Ui.error(this.translateCaseLabel('actuoArchivoPrintBlocked'));
                Espo.Ui.notify(false);

                return;
            }

            window.setTimeout(function () {
                Espo.Ui.notify(false);
            }, 2000);
        },
    });
});
