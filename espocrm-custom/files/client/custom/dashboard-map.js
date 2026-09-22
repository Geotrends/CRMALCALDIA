import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs';

const ENVIGADO_CENTER = [-75.584, 6.171];
const BARRIOS_GEOJSON_URL = 'https://services7.arcgis.com/vAISUooSGCM0wKQp/arcgis/rest/services/'
    + 'Mapa_Base_MA_2024_WFL1/FeatureServer/3/query?where=1%3D1&outFields=nom_barrio&f=geojson&outSR=4326&returnGeometry=true';
const BARRIOS_SOURCE = 'envigado-barrios';
const BARRIOS_FILL_LAYER = 'envigado-barrios-fill';
const BARRIOS_LINE_LAYER = 'envigado-barrios-line';

const normalize = (value) => String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

// Equivalencias entre el catálogo operativo del CRM y la capa territorial.
const BARRIO_ALIASES = {
    bucarest: 'bucarets',
    'milánvallejuelos': 'milanvallejuelos',
    'lomaelatravezado': 'lomadelatravesado',
    'bosquesdezuniga': 'bosquesdezuniga',
    'villagrande': 'villagrandre',
};
const MAP_STYLES = {
    osm: {
        version: 8,
        sources: {
            osm: {
                type: 'raster',
                tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                tileSize: 256,
                attribution: '© OpenStreetMap contributors',
            },
        },
        layers: [{id: 'osm', type: 'raster', source: 'osm'}],
    },
    satellite: {
        version: 8,
        sources: {
            satellite: {
                type: 'raster',
                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                tileSize: 256,
                attribution: 'Tiles © Esri',
            },
        },
        layers: [{id: 'satellite', type: 'raster', source: 'satellite'}],
    },
};

const mapElement = document.getElementById('mapa-inspeccion');
const statusElement = document.getElementById('mapa-estado');
const layerButtons = Array.from(document.querySelectorAll('[data-map-style]'));

if (mapElement) {
    let barriosGeoJson = null;
    let currentCases = Array.isArray(window.crmDashboardCases) ? window.crmDashboardCases : [];
    let barriosRestoreQueued = false;
    let barriosInteractionsBound = false;

    const setStatus = (message, isError) => {
        if (!statusElement) {
            return;
        }

        statusElement.textContent = message;
        statusElement.classList.toggle('is-error', !!isError);
    };

    const barrioKey = (value) => {
        const key = normalize(value);

        return BARRIO_ALIASES[key] || key;
    };

    const countCasesByBarrio = (cases) => {
        const counts = {};

        cases.forEach((caseItem) => {
            const raw = String(caseItem.cBarrioPeticionario || '').trim();

            if (!raw || raw === 'Seleccione una opción') {
                return;
            }

            const key = barrioKey(raw);
            counts[key] = (counts[key] || 0) + 1;
        });

        return counts;
    };

    const buildBarriosGeoJson = () => {
        if (!barriosGeoJson) {
            return null;
        }

        const counts = countCasesByBarrio(currentCases);

        return {
            type: 'FeatureCollection',
            features: barriosGeoJson.features.map((feature) => {
                const properties = Object.assign({}, feature.properties || {});
                const name = properties.nom_barrio || 'Barrio sin nombre';
                properties.crmBarrio = name;
                properties.crmCasos = counts[barrioKey(name)] || 0;

                return Object.assign({}, feature, {properties: properties});
            }),
        };
    };

    const showBarrios = () => {
        const data = buildBarriosGeoJson();

        if (!data || !map.isStyleLoaded()) {
            return;
        }

        const source = map.getSource(BARRIOS_SOURCE);

        if (source) {
            source.setData(data);
        } else {
            map.addSource(BARRIOS_SOURCE, {type: 'geojson', data: data});
            map.addLayer({
                id: BARRIOS_FILL_LAYER,
                type: 'fill',
                source: BARRIOS_SOURCE,
                paint: {
                    'fill-color': ['interpolate', ['linear'], ['get', 'crmCasos'], 0, '#dcebe7', 1, '#b9d8cf', 3, '#75ad9d', 6, '#387866', 12, '#184b40'],
                    'fill-opacity': ['case', ['>', ['get', 'crmCasos'], 0], 0.72, 0.3],
                },
            });
            map.addLayer({
                id: BARRIOS_LINE_LAYER,
                type: 'line',
                source: BARRIOS_SOURCE,
                paint: {'line-color': '#356d62', 'line-width': 1.2, 'line-opacity': 0.8},
            });
            if (!barriosInteractionsBound) {
                barriosInteractionsBound = true;
                map.on('mouseenter', BARRIOS_FILL_LAYER, () => { map.getCanvas().style.cursor = 'pointer'; });
                map.on('mouseleave', BARRIOS_FILL_LAYER, () => { map.getCanvas().style.cursor = ''; });
                map.on('click', BARRIOS_FILL_LAYER, (event) => {
                    const feature = event.features && event.features[0];

                    if (!feature) {
                        return;
                    }

                    const props = feature.properties || {};
                    new maplibregl.Popup({closeButton: true, maxWidth: '240px'})
                        .setLngLat(event.lngLat)
                        .setHTML('<strong>' + String(props.crmBarrio || 'Barrio') + '</strong><br>'
                            + String(props.crmCasos || 0) + ' caso(s) en el Dashboard')
                        .addTo(map);
                });
            }
        }

        const registered = Object.values(countCasesByBarrio(currentCases)).reduce((sum, value) => sum + value, 0);
        setStatus(registered + ' caso(s) ubicados por barrio. Seleccione un barrio para ver su total.');
    };

    const map = new maplibregl.Map({
        container: mapElement,
        style: MAP_STYLES.osm,
        center: ENVIGADO_CENTER,
        zoom: 12.8,
        minZoom: 8,
        attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-right');
    map.addControl(new maplibregl.ScaleControl({maxWidth: 110, unit: 'metric'}), 'bottom-left');

    const scheduleBarriosRestore = () => {
        if (barriosRestoreQueued) {
            return;
        }

        barriosRestoreQueued = true;
        map.once('idle', () => {
            barriosRestoreQueued = false;
            showBarrios();
        });
    };

    map.on('load', () => {
        setStatus('Cargando casos agregados por barrio…');
        map.resize();
    });

    // setStyle elimina sources y layers personalizados. Esperar a que el
    // nuevo estilo quede en idle asegura que los barrios se añadan otra vez.
    map.on('style.load', scheduleBarriosRestore);

    window.addEventListener('crm-dashboard-cases', (event) => {
        currentCases = (event.detail && Array.isArray(event.detail.casos)) ? event.detail.casos : [];
        scheduleBarriosRestore();
    });

    fetch(BARRIOS_GEOJSON_URL)
        .then((response) => {
            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            return response.json();
        })
        .then((data) => {
            if (!data || !Array.isArray(data.features)) {
                throw new Error('Formato territorial no válido');
            }

            barriosGeoJson = data;
            scheduleBarriosRestore();
        })
        .catch(() => {
            setStatus('No fue posible cargar los límites de barrios. Inténtelo nuevamente.', true);
        });

    map.on('error', (event) => {
        if (event && event.error) {
            setStatus('No fue posible cargar una parte del mapa. Revise su conexión e inténtelo nuevamente.', true);
        }
    });

    layerButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const styleName = button.dataset.mapStyle;

            if (!MAP_STYLES[styleName]) {
                return;
            }

            layerButtons.forEach((item) => {
                const selected = item === button;
                item.classList.toggle('is-active', selected);
                item.setAttribute('aria-pressed', String(selected));
            });

            setStatus(styleName === 'satellite'
                ? 'Vista satelital activa. Cargando casos agregados por barrio…'
                : 'OpenStreetMap activo. Cargando casos agregados por barrio…');
            map.setStyle(MAP_STYLES[styleName]);
        });
    });
}
