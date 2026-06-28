define('custom:helpers/patrullero-edit-mode', [
    'custom:helpers/patrullero-acta',
    'custom:helpers/acta-visita-case-status',
], function (PatrulleroActa, ActaVisitaCaseStatus) {

    const isPurePatrulleroUser = PatrulleroActa.isPurePatrulleroUser;

    const findPrimaryButton = function (recordView) {
        let $btn = recordView.findPrimaryActionButton('edit');

        if (!$btn.length) {
            $btn = recordView.findPrimaryActionButton('llenarActaVisita');
        }

        if (!$btn.length) {
            $btn = recordView.findPrimaryActionButton('imprimirActaManual');
        }

        if (!$btn.length && recordView.getDetailActionElements) {
            $btn = recordView.getDetailActionElements()
                .find('.detail-button-container .btn-primary, .header-buttons .btn-primary')
                .first();
        }

        return $btn;
    };

    const applyDetailReadOnly = function (recordView) {
        if (!recordView || !isPurePatrulleroUser(recordView.getUser())) {
            return;
        }

        if (typeof recordView.setReadOnly === 'function') {
            recordView.setReadOnly();
        }

        recordView.$el.find('[data-action="delete"], [data-action="remove"]')
            .closest('.btn, .dropdown-item, li')
            .hide();
    };

    const updateDetailActionButtons = function (recordView) {
        if (!recordView || !isPurePatrulleroUser(recordView.getUser())) {
            return;
        }

        if (!recordView.model || !recordView.model.id) {
            return;
        }

        const user = recordView.getUser();
        const model = recordView.model;

        recordView.$el.find('[data-action="delete"], [data-action="remove"]')
            .closest('.btn, .dropdown-item, li')
            .hide();

        const $editBtn = findPrimaryButton(recordView);

        if (!$editBtn.length) {
            return;
        }

        ActaVisitaCaseStatus.fetchActaForCase(model.id, user, model, { bypassCache: true }).then(function (acta) {
            const canActa = PatrulleroActa.shouldShowActaVisitaButton(user, model, acta);
            const canPrint = PatrulleroActa.canPrintManualActa(user, model);

            if (recordView._imprimirActaButtonAdded) {
                recordView.safeRemoveMenuItem('imprimirActaManual');
                recordView._imprimirActaButtonAdded = false;
            }

            if (!canActa && !canPrint) {
                $editBtn.hide();

                return;
            }

            $editBtn.show();

            if (canActa) {
                const isEdit = ActaVisitaCaseStatus.isActaDiligenciada(acta);
                const label = isEdit
                    ? recordView.translate('editarActaVisita', 'Case')
                    : recordView.translate('llenarActaVisita', 'Case');

                recordView.setPrimaryActionButtonLabel($editBtn, label);
                recordView.setPrimaryActionButtonAction($editBtn, 'llenarActaVisita');
                recordView.setPrimaryActionButtonHref($editBtn, null);
            } else {
                recordView.setPrimaryActionButtonLabel(
                    $editBtn,
                    recordView.translate('imprimirActaVisitaManual', 'Case')
                );
                recordView.setPrimaryActionButtonAction($editBtn, 'imprimirActaManual');
                recordView.setPrimaryActionButtonHref($editBtn, null);
            }

            if (canPrint && canActa) {
                if (recordView.safeAddMenuItem({
                    label: recordView.translate('imprimirActaVisitaManual', 'Case'),
                    name: 'imprimirActaManual',
                    action: 'imprimirActaManual',
                })) {
                    recordView._imprimirActaButtonAdded = true;
                }
            }
        });
    };

    const actionImprimirActaManual = function (recordView) {
        if (!recordView || !PatrulleroActa.canPrintManualActa(recordView.getUser(), recordView.model)) {
            Espo.Ui.warning(recordView.translate('actaVisitaManualUnavailable', 'Case'));

            return;
        }

        if (!recordView.model || !recordView.model.id) {
            Espo.Ui.error(recordView.translate('Error'));

            return;
        }

        const url = recordView.getBasePath()
            + '?entryPoint=FormatoActaVisitaCaso'
            + '&id=' + encodeURIComponent(recordView.model.id)
            + '&modo=manual'
            + '&inline=1';

        Espo.Ui.notify(recordView.translate('pleaseWait', 'messages'));

        const printWindow = window.open(url, '_blank');

        if (!printWindow) {
            Espo.Ui.error(recordView.translate('actaVisitaPrintBlocked', 'Case'));
            Espo.Ui.notify(false);

            return;
        }

        window.setTimeout(function () {
            Espo.Ui.notify(false);
        }, 2000);
    };

    return {
        isPurePatrulleroUser: isPurePatrulleroUser,
        applyDetailReadOnly: applyDetailReadOnly,
        updateDetailActionButtons: updateDetailActionButtons,
        actionImprimirActaManual: actionImprimirActaManual,
    };
});
