<div class="radicado-assistant">
    {{#if isAssistant}}
        <div class="form-group">
            <label class="control-label">{{translate 'cRadicadoModo' scope='Case'}}</label>
            <div>
                <select class="form-control input-sm" data-role="modo">
                    <option value="Automático" {{#if isAutomatico}}selected{{/if}}>{{translate 'Automático' scope='Case' category='options' optionName='cRadicadoModo'}}</option>
                    <option value="Manual" {{#unless isAutomatico}}selected{{/unless}}>{{translate 'Manual' scope='Case' category='options' optionName='cRadicadoModo'}}</option>
                </select>
            </div>
        </div>

        {{#if isAutomatico}}
            <div class="row">
                <div class="col-sm-7">
                    <div class="form-group">
                        <label class="control-label">{{translate 'cRadicadoSiglas' scope='Case'}}</label>
                        <select class="form-control input-sm" data-role="siglas">
                            <option value="">{{translate 'Select'}}</option>
                            {{#each siglasOptions}}
                                <option value="{{code}}" {{#if selected}}selected{{/if}}>{{label}}</option>
                            {{/each}}
                        </select>
                    </div>
                </div>
                <div class="col-sm-5">
                    <div class="form-group">
                        <label class="control-label">{{translate 'cRadicadoAnio' scope='Case'}}</label>
                        <input class="form-control input-sm" type="number" min="1900" max="9999" data-role="anio" value="{{anio}}">
                    </div>
                </div>
            </div>
            <div class="well well-sm radicado-preview">
                <div><strong>{{translate 'cNumeroRadicado' scope='Case'}}:</strong> <span data-role="preview-radicado">{{previewRadicado}}</span></div>
                <div><strong>{{translate 'cExpediente' scope='Case'}}:</strong> <span data-role="preview-expediente">{{previewExpediente}}</span></div>
                <div class="text-muted small m-t-s">{{translate 'radicadoPreviewHelp' scope='Case'}}</div>
            </div>
        {{else}}
            <input type="text" class="form-control main-element" data-name="manual-radicado" value="{{manualRadicado}}" maxlength="100" autocomplete="espo-off">
        {{/if}}
    {{else}}
        <span class="none-value">{{value}}</span>
    {{/if}}
</div>
