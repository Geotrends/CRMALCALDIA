<div class="stream-head-container notification-item-head">
    <div class="pull-left">
        {{{avatar}}}
    </div>
    <div class="stream-head-text-container">
        <span class="{{style}} message">
            {{{message}}}
        </span>
    </div>
    <button
        type="button"
        class="btn btn-link btn-xs notification-remove-button"
        data-action="remove-notification"
        title="Eliminar notificación"
        aria-label="Eliminar notificación"
    ><span class="fas fa-trash-alt"></span></button>
</div>
<div class="stream-date-container">
    <span class="text-muted small">{{{createdAt}}}</span>
</div>
