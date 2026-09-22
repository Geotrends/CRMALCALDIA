<aside class="case-expediente-info" role="note">
    <span class="fas fa-circle-info case-expediente-info__icon" aria-hidden="true"></span>
    <div class="case-expediente-info__content">
        <span><b>Nota:</b> {{#if hasExpediente}}{{linkedText}}{{else}}{{pendingText}}{{/if}}</span>
        {{#if hasExpedienteLink}}
        <div class="case-expediente-info__link">
            <a href="{{expedienteUrl}}"><span class="fas fa-folder-open"></span> {{expedienteLabel}}</a>
        </div>
        {{/if}}
    </div>
</aside>
