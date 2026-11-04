define('custom:helpers/case-related-record-modal', [
    'helpers/record-modal',
    'custom:helpers/acta-visita-modal',
], function (RecordModal, ActaVisitaModal) {
    const RecordModalHelper = RecordModal.default || RecordModal;

    const bind = function (view) {
        view.$el.find('[data-case-record-type]').off('click.caseRelatedModal').on('click.caseRelatedModal', function (event) {
            event.preventDefault();
            event.stopPropagation();
            const $link = $(event.currentTarget);
            const type = $link.attr('data-case-record-type');
            const id = $link.attr('data-case-record-id');
            if (!id) return;
            if (type === 'ActaVisita') {
                ActaVisitaModal.openDetailById(view, id, view.model.id);
            } else if (type === 'IntervencionTecnica') {
                new RecordModalHelper().showDetail(view, {
                    entityType: type, id: id, layoutName: 'detail',
                    editDisabled: true, removeDisabled: true, fullFormDisabled: true,
                }).catch(() => {});
            }
        });
    };

    return {bind: bind};
});
