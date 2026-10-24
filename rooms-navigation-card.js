/**
 * Rooms Navigation Card — a Home Assistant dashboard card.
 * Copyright (c) 2026 luigi-regolo.
 * SPDX-License-Identifier: GPL-3.0-only
 * Local Home Assistant data only; no remote dependencies or telemetry.
 */
(() => {
  'use strict';

  const CARD_TAG = 'rooms-navigation-card';
  const EDITOR_TAG = 'rooms-navigation-card-editor';
  const CARD_TYPE = `custom:${CARD_TAG}`;
  const DEFAULT_LINKS = [
    { id: 'information', name: 'Informazioni', icon: 'mdi:information-outline', path: '', show: true },
    { id: 'climate', name: 'Clima', icon: 'mdi:thermometer', path: '', show: true },
  ];
  const DEFAULTS = {
    type: CARD_TYPE,
    title: 'Le mie stanze',
    eyebrow: 'ROOMS NAVIGATION CARD',
    show_title: true,
    show_eyebrow: true,
    show_border: true,
    theme_mode: 'auto',
    show_all_areas: true,
    area_ids: [],
    hidden_area_ids: [],
    area_order: [],
    area_paths: {},
    links: DEFAULT_LINKS,
  };

  const string = (value, limit = 90) => String(value ?? '').trim().slice(0, limit);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const icon = (value, fallback = 'mdi:home-outline') => {
    const candidate = string(value, 85);
    return /^mdi:[a-z0-9]+(?:-[a-z0-9]+)*$/.test(candidate) ? candidate : fallback;
  };
  // Only same-origin, internal Home Assistant paths. Full URLs are accepted only
  // when the hostname and origin match the currently open HA instance.
  const path = (value) => {
    let candidate = string(value, 255);
    if (/^https?:\/\//i.test(candidate)) {
      try {
        const url = new URL(candidate);
        if (url.origin !== window.location.origin || url.username || url.password) return '';
        candidate = url.pathname + url.search + url.hash;
      } catch (_) { return ''; }
    }
    return /^\/(?!\/)[^\\<>\u0000-\u0020]*$/.test(candidate) ? candidate : '';
  };
  const areaId = (value) => string(value, 110);
  const uniqueIds = (value) => Array.isArray(value)
    ? [...new Set(value.map(areaId).filter((id) => /^[a-z0-9_]+$/.test(id)))].slice(0, 250)
    : [];
  const defaultLinkCopies = () => DEFAULT_LINKS.map((entry) => ({ ...entry }));
  const normalizeLink = (entry, index) => ({
    id: /^[a-z0-9_-]{1,70}$/.test(entry?.id ?? '') ? entry.id : `link-${index + 1}`,
    name: string(entry?.name, 60) || 'Collegamento',
    icon: icon(entry?.icon, 'mdi:home-outline'),
    path: path(entry?.path),
    show: entry?.show !== false,
  });
  function normalizeConfig(raw = {}) {
    const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const paths = {};
    if (r.area_paths && typeof r.area_paths === 'object' && !Array.isArray(r.area_paths)) {
      for (const [key, value] of Object.entries(r.area_paths).slice(0, 250)) {
        if (/^[a-z0-9_]+$/.test(key)) paths[key] = path(value);
      }
    }
    const links = Array.isArray(r.links) ? r.links.slice(0, 75).map(normalizeLink) : defaultLinkCopies();
    const ids = new Set();
    links.forEach((item, index) => {
      if (ids.has(item.id)) item.id = `link-${index + 1}-${ids.size}`;
      ids.add(item.id);
    });
    return {
      ...r, // Preserve HA visibility and layout configuration during editor changes.
      type: CARD_TYPE,
      eyebrow: string(r.eyebrow ?? DEFAULTS.eyebrow, 60),
      title: string(r.title ?? DEFAULTS.title, 60).replace(/\.+$/, '') || DEFAULTS.title,
      show_title: r.show_title !== false,
      show_eyebrow: r.show_eyebrow !== false,
      show_border: r.show_border !== false,
      theme_mode: ['auto', 'light', 'dark'].includes(r.theme_mode) ? r.theme_mode : 'auto',
      show_all_areas: r.show_all_areas !== false,
      area_ids: uniqueIds(r.area_ids),
      hidden_area_ids: uniqueIds(r.hidden_area_ids),
      area_order: uniqueIds(r.area_order),
      area_paths: paths,
      links,
    };
  }
  function normalizeAreas(result) {
    if (!Array.isArray(result)) return [];
    const ids = new Set();
    return result.filter((r) => r && typeof r.area_id === 'string')
      .map((r) => ({ area_id: areaId(r.area_id), name: string(r.name, 100), icon: icon(r.icon) }))
      .filter((r) => r.name && /^[a-z0-9_]+$/.test(r.area_id) && !ids.has(r.area_id) && ids.add(r.area_id));
  }
  function visibleAreas(allAreas, cfg) {
    const excluded = new Set(cfg.hidden_area_ids || []);
    const filtered = (cfg.show_all_areas
      ? allAreas
      : allAreas.filter((item) => cfg.area_ids.includes(item.area_id)))
      .filter((item) => !excluded.has(item.area_id));
    const positions = new Map(cfg.area_order.map((id, position) => [id, position]));
    return filtered.map((entry, index) => ({ ...entry, originalIndex: index }))
      .sort((a, b) => (positions.get(a.area_id) ?? (cfg.area_order.length + a.originalIndex))
        - (positions.get(b.area_id) ?? (cfg.area_order.length + b.originalIndex)));
  }
  async function fetchAreas(hass) {
    if (!hass || typeof hass.callWS !== 'function') throw new Error('API Home Assistant non disponibile.');
    return normalizeAreas(await hass.callWS({ type: 'config/area_registry/list' }));
  }
  // Read-only Home Assistant dashboard registry and stored view definitions.
  // There is no documented built-in view picker selector: we supply real views
  // to Home Assistant's supported select selector when it is available.
  async function fetchViews(hass) {
    if (!hass || typeof hass.callWS !== 'function') return [];
    let dashboards = [];
    try {
      const result = await hass.callWS({ type: 'lovelace/dashboards/list' });
      if (Array.isArray(result)) dashboards = result;
    } catch (error) {
      console.warn(`[${EDITOR_TAG}] Elenco dashboard non disponibile:`, error);
      /* The default dashboard may still be accessible. */
    }
    const targets = [{ slug: null, name: 'Dashboard principale' }];
    for (const dashboard of dashboards.slice(0, 60)) {
      const slug = string(dashboard?.url_path, 90);
      if (slug && /^[a-z0-9_-]+$/.test(slug) && slug !== 'lovelace') {
        targets.push({ slug, name: string(dashboard.title, 90) || slug });
      }
    }
    const responses = [];
    for (let index = 0; index < targets.length; index += 4) {
      responses.push(...await Promise.allSettled(targets.slice(index, index + 4).map((target) =>
        hass.callWS({ type: 'lovelace/config', url_path: target.slug, force: false }))));
    }
    const choices = new Map();
    responses.forEach((outcome, dashboardIndex) => {
      if (outcome.status !== 'fulfilled' || !Array.isArray(outcome.value?.views)) return;
      const target = targets[dashboardIndex];
      outcome.value.views.slice(0, 120).forEach((view, viewIndex) => {
        const segment = typeof view?.path === 'string' && view.path ? view.path : String(viewIndex);
        const destination = path(`/${target.slug || 'lovelace'}/${segment}`);
        if (!destination) return;
        const title = string(view?.title, 85) || `Vista ${viewIndex + 1}`;
        choices.set(destination, { value: destination, label: `${target.name} — ${title}` });
      });
    });
    return [...choices.values()].sort((a, b) => a.label.localeCompare(b.label, 'it'));
  }
  function markupIcon(name, cls = '') {
    return `<ha-icon class="${cls}" icon="${escapeHtml(icon(name))}" aria-hidden="true"></ha-icon>`;
  }

  const CARD_CSS = `
    :host{display:block;box-sizing:border-box;width:100%;min-width:0;max-width:100%;font-family:var(--ha-font-family-body,var(--paper-font-body1_-_font-family,Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif));font-size:14px;font-weight:400}
    *,*:before,*:after{box-sizing:border-box}
    .rn-container{container-type:inline-size;width:100%;min-width:0;--rn-accent:#0a7156;--rn-bg:#fafbf9;--rn-tile:#f0f2ef;--rn-hover:#e5eee5;--rn-circle:#fff;--rn-line:#e0e5df;--rn-fg:#18221c;--rn-muted:#56675c}
    .rn-container.rn-dark{--rn-accent:#0e795d;--rn-bg:#101211;--rn-tile:#191c1a;--rn-hover:#242b26;--rn-circle:#282b29;--rn-line:#2b302c;--rn-fg:#f5f7f4;--rn-muted:#bbc5bd}
    .rn-shell{width:100%;min-width:0;max-width:100%;background:var(--rn-bg);color:var(--rn-fg);border:1px solid var(--rn-line);border-radius:26px;padding:18px}
    .rn-shell.rn-borderless{background:transparent;border:0;border-radius:0;padding:0}
    .rn-eyebrow{font-size:10px;letter-spacing:1.7px;font-weight:750;color:var(--rn-muted);margin:0 0 7px}
    .rn-title{font-size:25px;line-height:1.14;font-weight:780;letter-spacing:-.7px;overflow-wrap:anywhere;margin:0}
    .rn-title b{color:var(--rn-accent);font-weight:800}
    .rn-heading{margin:2px 4px 17px}
    .rn-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .rn-room{appearance:none;display:flex;flex-direction:column;align-items:flex-start;justify-content:space-between;gap:12px;min-width:0;min-height:124px;padding:15px 15px 14px;border:1px solid transparent;border-radius:16px;background:var(--rn-tile);color:var(--rn-fg);text-decoration:none;text-align:left;transition:background .15s,transform .15s,border-color .15s}
    .rn-room[href]:hover{background:var(--rn-hover)}
    .rn-room[href]:active{transform:translateY(1px);border-color:var(--rn-accent)}
    .rn-room.rn-selected{border-color:var(--rn-accent)}
    .rn-room:not([href]){cursor:default;opacity:.67}
    .rn-room-icon{display:grid;place-items:center;width:47px;height:47px;border-radius:13px;background:var(--rn-circle);color:var(--rn-muted)}
    .rn-room-icon ha-icon{--mdc-icon-size:29px;width:29px;height:29px}
    .rn-room-name{font-weight:600;font-size:13px;line-height:1.3;overflow-wrap:anywhere;max-width:100%}
    .rn-links{border-top:1px solid var(--rn-line);margin-top:17px;padding-top:15px;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}
    .rn-chip{display:flex;align-items:center;gap:8px;min-height:35px;padding:9px 13px;border:0;border-radius:12px;background:var(--rn-accent);color:#fff;text-decoration:none;font-size:12px;font-weight:500;white-space:nowrap}
    .rn-chip[href]:hover{background:var(--rn-accent)}.rn-chip:not([href]){opacity:.67;cursor:default}
    .rn-chip ha-icon{--mdc-icon-size:17px;width:17px;height:17px;color:#fff}
    .rn-empty{font-size:13px;line-height:1.5;color:var(--rn-muted);padding:15px 4px}
    a:focus-visible{outline:2px solid var(--rn-accent);outline-offset:2px}
    @container (min-width:760px){.rn-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
    @container (max-width:439px){.rn-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.rn-room{min-height:117px;padding:13px}.rn-room-icon{width:43px;height:43px;border-radius:12px}.rn-room-icon ha-icon{--mdc-icon-size:26px;width:26px;height:26px}.rn-room-name{font-size:12px}.rn-shell:not(.rn-borderless){padding:13px;border-radius:22px}.rn-title{font-size:23px}}
    @container (max-width:300px){.rn-room{padding:10px;min-height:106px}.rn-room-name{font-size:11px}.rn-chip{flex:1;justify-content:center}}
    /* Tablets keep three room columns even inside narrow Home Assistant layout columns. */
    @media (min-width:600px) and (max-width:1199px), (min-width:600px) and (any-pointer:coarse){
      @container (min-width:0px){.rn-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
      @container (max-width:439px){.rn-room{min-height:106px;padding:10px}.rn-room-icon{width:39px;height:39px}.rn-room-icon ha-icon{--mdc-icon-size:25px;width:25px;height:25px}.rn-room-name{font-size:12px}}
    }
    @media(prefers-reduced-motion:reduce){.rn-room{transition:none}}
  `;

  class RoomsNavigationCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._config = normalizeConfig();
      this._hass = null;
      this._areas = [];
      this._areasLoaded = false;
      this._loadingAreas = false;
      this._areaError = '';
      this._fetchSeq = 0;
      this._unsubPromise = null;
      this._darkMode = null;
      this._selectedArea = null;
      this.shadowRoot.addEventListener('click', (event) => {
        const room = event.target.closest('a.rn-room[href]');
        if (!room || !room.dataset.areaId) return;
        this._selectedArea = room.dataset.areaId;
        this.shadowRoot.querySelectorAll('a.rn-room').forEach((tile) =>
          tile.classList.toggle('rn-selected', tile.dataset.areaId === this._selectedArea));
      });
    }
    static getConfigElement() { return document.createElement(EDITOR_TAG); }
    static getStubConfig() { const { type, ...rest } = normalizeConfig(); return rest; }
    setConfig(config) { this._config = normalizeConfig(config); this._render(); }
    set hass(value) {
      const oldConnection = this._hass?.connection;
      this._hass = value;
      const dark = this._isDark();
      if (dark !== this._darkMode) { this._darkMode = dark; this._render(); }
      if (this.isConnected && (oldConnection !== value?.connection || (!this._areasLoaded && !this._areaError && !this._loadingAreas))) {
        this._loadAreas();
        if (oldConnection !== value?.connection) this._subscribe();
      }
    }
    connectedCallback() { this._loadAreas(); this._subscribe(); this._render(); }
    disconnectedCallback() {
      this._fetchSeq++;
      if (this._unsubPromise) this._unsubPromise.then((unsubscribe) => unsubscribe?.()).catch(() => {});
      this._unsubPromise = null;
    }
    _isDark() { return this._config.theme_mode === 'dark' || (this._config.theme_mode === 'auto' && !!this._hass?.themes?.darkMode); }
    async _loadAreas() {
      if (!this.isConnected || !this._hass) return;
      const seq = ++this._fetchSeq;
      this._loadingAreas = true;
      try {
        const result = await fetchAreas(this._hass);
        if (seq !== this._fetchSeq || !this.isConnected) return;
        this._areas = result;
        this._areasLoaded = true;
        this._areaError = '';
      } catch (error) {
        if (seq !== this._fetchSeq || !this.isConnected) return;
        this._areaError = 'Impossibile leggere le Aree di Home Assistant.';
        this._areasLoaded = false;
        console.warn(`[${CARD_TAG}] Area registry:`, error);
      }
      this._loadingAreas = false;
      this._render();
    }
    _subscribe() {
      if (!this.isConnected || !this._hass?.connection?.subscribeEvents) return;
      const previous = this._unsubPromise;
      previous?.then((fn) => fn?.()).catch(() => {});
      this._unsubPromise = this._hass.connection.subscribeEvents(() => this._loadAreas(), 'area_registry_updated');
      this._unsubPromise.catch(() => {});
    }
    getCardSize() { return Math.max(2, Math.ceil(visibleAreas(this._areas, this._config).length / 3) + 1); }
    _render() {
      if (!this.isConnected) return;
      const cfg = this._config;
      const rooms = visibleAreas(this._areas, cfg);
      const header = cfg.show_eyebrow || cfg.show_title
        ? `<header class="rn-heading">${cfg.show_eyebrow ? `<div class="rn-eyebrow">${escapeHtml(cfg.eyebrow)}</div>` : ''}
            ${cfg.show_title ? `<h2 class="rn-title">${escapeHtml(cfg.title)}<b>.</b></h2>` : ''}</header>` : '';
      const tiles = rooms.map((r) => {
        const dest = path(cfg.area_paths[r.area_id]);
        const label = escapeHtml(r.name);
        return `<a class="rn-room ${dest && r.area_id === this._selectedArea ? 'rn-selected' : ''}" data-area-id="${escapeHtml(r.area_id)}" ${dest ? `href="${escapeHtml(dest)}"` : `aria-disabled="true" title="Configura una pagina per ${label}"`}
          ${dest ? `aria-label="Apri ${label}"` : `aria-label="${label}: destinazione non configurata"`}>
          <span class="rn-room-icon">${markupIcon(r.icon)}</span><span class="rn-room-name">${label}</span></a>`;
      }).join('');
      const links = cfg.links.filter((r) => r.show).map((r) => {
        const dest = path(r.path);
        return `<a class="rn-chip" ${dest ? `href="${escapeHtml(dest)}"` : 'aria-disabled="true" title="Destinazione non configurata"'}>
          ${markupIcon(r.icon)}<span>${escapeHtml(r.name)}</span></a>`;
      }).join('');
      const status = this._areaError || (!this._areasLoaded ? 'Caricamento Aree Home Assistant…' :
        (rooms.length ? '' : 'Nessuna Area selezionata. Configura le Aree nell’editor della card.'));
      const dark = this._isDark();
      this.shadowRoot.innerHTML = `<style>${CARD_CSS}</style><div class="rn-container ${dark ? 'rn-dark' : 'rn-light'}">
        <section class="rn-shell ${cfg.show_border ? '' : 'rn-borderless'}">
          ${header}<div class="rn-grid">${tiles}</div>${status ? `<div class="rn-empty" role="status">${escapeHtml(status)}</div>` : ''}
          ${links ? `<nav class="rn-links" aria-label="Collegamenti">${links}</nav>` : ''}
        </section></div>`;
      // Anchors use standard same-origin Home Assistant paths. Unconfigured items cannot navigate.
      this.shadowRoot.querySelectorAll('a[aria-disabled="true"]').forEach((a) => a.removeAttribute('href'));
    }
  }

  const EDITOR_CSS = `
    :host{display:block;color:var(--primary-text-color,#18221c);font-family:var(--ha-font-family-body,var(--paper-font-body1_-_font-family,Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif));font-size:14px}
    *,*:before,*:after{box-sizing:border-box}.rn-editor{display:block}
    .rn-tabs,.rn-subtabs{display:flex;gap:5px;overflow-x:auto;padding-bottom:14px;border-bottom:1px solid var(--divider-color,#dfe5df)}
    .rn-tab,.rn-subtab{border:0;background:transparent;color:var(--secondary-text-color,#536359);border-radius:13px;padding:10px 13px;white-space:nowrap;font:inherit;cursor:pointer}
    .rn-tab.active,.rn-subtab.active{color:var(--primary-text-color,#17231c);background:var(--secondary-background-color,#f0f2ef);font-weight:650}
    .rn-subtabs{padding-top:13px;padding-bottom:12px}.rn-subtab{font-size:13px;padding:10px 12px}
    .rn-heading{font-size:21px;font-weight:500;margin:25px 0 9px}
    .rn-desc{font-size:13px;color:var(--secondary-text-color,#55665a);line-height:1.5;margin-bottom:24px}
    .rn-field{display:block;margin:20px 0}.rn-label{font-size:14px;margin-bottom:10px}
    .rn-input{display:block;width:100%;background:var(--secondary-background-color,#f0f2ef);color:var(--primary-text-color,#18221c);border:0;border-bottom:1px solid var(--divider-color,#a5afa5);padding:14px 13px;min-height:50px;border-radius:11px 11px 0 0;font:inherit}
    .rn-row{border-bottom:1px solid var(--divider-color,#e3e7e3);padding:13px 0;display:flex;align-items:center;justify-content:space-between;gap:15px}
    .rn-row label{flex:1}.rn-row input[type=checkbox]{width:18px;height:18px;accent-color:var(--primary-color,#0c7157)}
    .rn-muted{font-size:12px;color:var(--secondary-text-color,#5e6c62);line-height:1.5}.rn-note{font-size:11px;color:var(--secondary-text-color,#55665a);margin:9px 0}
    .rn-item{border-bottom:1px solid var(--divider-color,#dfe5df);padding:7px 0}.rn-item summary{cursor:pointer;padding:12px 0;display:flex;gap:10px;align-items:center;list-style:none}
    .rn-item summary::-webkit-details-marker{display:none}.rn-item summary span{flex:1;overflow-wrap:anywhere}.rn-item summary ha-icon{--mdc-icon-size:20px;width:20px;height:20px}
    .rn-content{padding:0 0 12px}.rn-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px}
    .rn-button{background:var(--secondary-background-color,#eff2ee);border:1px solid var(--divider-color,#dbe2db);color:var(--primary-text-color,#18221c);padding:9px 13px;border-radius:11px;font:inherit;cursor:pointer}
    .rn-button:disabled{opacity:.45;cursor:not-allowed}.rn-add{margin:18px 0;width:100%}
    .rn-input:focus-visible,.rn-button:focus-visible,.rn-tab:focus-visible,.rn-subtab:focus-visible{outline:2px solid var(--primary-color,#0b7457);outline-offset:2px}
    ha-selector{display:block;width:100%}.rn-selector-fallback{display:none}
    .rn-no-native .rn-selector-fallback{display:block}.rn-no-native ha-selector{display:none}
    .rn-inline{display:flex;gap:8px;align-items:center}.rn-inline ha-selector{flex:1;min-width:0}
    .rn-no-native select.rn-input[multiple]{min-height:125px}
    .rn-view-search{margin-bottom:6px}
    .rn-view-results{display:block;max-height:240px;overflow-y:auto;border:1px solid var(--divider-color,#dfe5df);border-radius:10px;padding:4px;background:var(--card-background-color,var(--primary-background-color,#fff))}
    .rn-view-option{display:flex;align-items:flex-start;gap:6px;width:100%;background:transparent;border:0;border-radius:7px;color:var(--primary-text-color,#17231c);padding:9px 10px;text-align:left;font:inherit;cursor:pointer}
    .rn-view-option:hover,.rn-view-option:focus-visible{background:var(--secondary-background-color,#f0f2ef);outline-offset:0}
    .rn-view-option.is-selected{font-weight:650;color:var(--primary-color,#0b7457)}
    .rn-view-empty{padding:10px;font-size:12px;color:var(--secondary-text-color,#536359)}
    .rn-view-option small{display:block;margin-top:2px;color:var(--secondary-text-color,#536359);font-size:11px;overflow-wrap:anywhere}
    .rn-manual-label{font-size:12px;margin:14px 0 5px;color:var(--secondary-text-color,#536359)}
  `;

  class RoomsNavigationCardEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._config = normalizeConfig();
      this._hass = null;
      this._areas = [];
      this._areaError = '';
      this._views = [];
      this._viewFetchSeq = 0;
      this._tab = 'stanze';
      this._section = 'aree';
      this._fetchSeq = 0;
      this._unsubPromise = null;
      this._nativeTried = false;
      this._pendingChange = false;
      this.shadowRoot.addEventListener('click', (event) => this._click(event));
      this.shadowRoot.addEventListener('change', (event) => this._change(event));
      this.shadowRoot.addEventListener('input', (event) => this._input(event));
    }
    setConfig(raw) { this._config = normalizeConfig(raw); this._render(); }
    set hass(value) {
      const oldConn = this._hass?.connection;
      this._hass = value;
      this.shadowRoot.querySelectorAll('ha-selector').forEach((node) => { node.hass = value; });
      if (this.isConnected && oldConn !== value?.connection) { this._loadAreas(); this._loadViews(); this._subscribe(); }
    }
    connectedCallback() { this._render(); this._ensureNative(); this._loadAreas(); this._loadViews(); this._subscribe(); }
    disconnectedCallback() {
      this._fetchSeq++;
      this._viewFetchSeq++;
      this._unsubPromise?.then((unsubscribe) => unsubscribe?.()).catch(() => {});
      this._unsubPromise = null;
    }
    async _ensureNative() {
      if (this._nativeTried) return;
      this._nativeTried = true;
      if (!customElements.get('ha-selector')) {
        try { const helpers = await window.loadCardHelpers?.(); await helpers?.importSelector?.(); }
        catch (error) { console.warn(`[${EDITOR_TAG}] Selectors:`, error); }
      }
      if (this.isConnected) this._render();
    }
    async _loadAreas() {
      if (!this.isConnected || !this._hass) return;
      const seq = ++this._fetchSeq;
      try {
        const areas = await fetchAreas(this._hass);
        if (seq !== this._fetchSeq || !this.isConnected) return;
        this._areas = areas;
        this._areaError = '';
      } catch (error) {
        if (seq !== this._fetchSeq || !this.isConnected) return;
        this._areaError = 'Impossibile leggere le Aree. Controlla l’accesso a Home Assistant.';
        console.warn(`[${EDITOR_TAG}] Area registry:`, error);
      }
      this._render();
    }
    async _loadViews() {
      if (!this.isConnected || !this._hass) return;
      const seq = ++this._viewFetchSeq;
      try {
        const options = await fetchViews(this._hass);
        if (seq !== this._viewFetchSeq || !this.isConnected) return;
        this._views = options;
      } catch (_) {
        if (seq !== this._viewFetchSeq || !this.isConnected) return;
        this._views = [];
      }
      this._render();
    }
    _subscribe() {
      if (!this.isConnected || !this._hass?.connection?.subscribeEvents) return;
      const old = this._unsubPromise;
      old?.then((fn) => fn?.()).catch(() => {});
      this._unsubPromise = this._hass.connection.subscribeEvents(() => this._loadAreas(), 'area_registry_updated');
      this._unsubPromise.catch(() => {});
    }
    _update(patch) {
      const next = normalizeConfig({ ...this._config, ...patch });
      if (JSON.stringify(next) === JSON.stringify(this._config)) return;
      this._config = next;
      this._pendingChange = true;
      try {
        this.dispatchEvent(new CustomEvent('config-changed', {
          detail: { config: this._config }, bubbles: true, composed: true,
        }));
      } finally { this._pendingChange = false; this._render(); }
    }
    _field(label, inside, note = '') {
      return `<div class="rn-field"><div class="rn-label">${escapeHtml(label)}</div>${inside}${note ? `<p class="rn-note">${escapeHtml(note)}</p>` : ''}</div>`;
    }
    _text(label, field, value, placeholder = '') {
      return this._field(label, `<input class="rn-input" type="text" data-field="${field}" maxlength="255" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"/>`);
    }
    _toggle(label, field, value, desc = '') {
      return `<div class="rn-row"><label for="rn-${field}">${escapeHtml(label)}${desc ? `<div class="rn-muted">${escapeHtml(desc)}</div>` : ''}</label>
        <input id="rn-${field}" data-toggle="${field}" type="checkbox" ${value ? 'checked' : ''}/></div>`;
    }
    _destinationField(kind, id, current) {
      const attr = kind === 'area' ? 'data-area-path' : 'data-link-path';
      const key = `${kind}:${id}`;
      const currentPath = path(current);
      const known = this._views.some((view) => view.value === currentPath);
      const status = !this._views.length
        ? '<p class="rn-muted">Home Assistant non ha restituito un elenco di viste consultabili. Puoi inserire il percorso manualmente.</p>'
        : currentPath && !known
          ? '<p class="rn-muted">Il percorso salvato non è tra le viste rilevate. Verifica che la pagina esista e sia accessibile.</p>'
          : '';
      return this._field('Pagina di destinazione',
        `<input class="rn-input rn-view-search" type="search" data-view-search="${escapeHtml(key)}"
          placeholder="Cerca una dashboard o una vista di Home Assistant" autocomplete="off"
          aria-label="Cerca pagina per ${escapeHtml(id)}"/>
        <div class="rn-view-results" data-view-results="${escapeHtml(key)}"></div>
        ${status}
        <div class="rn-label rn-manual-label">Percorso salvato (modificabile)</div>
        <input class="rn-input rn-manual-path" type="text" ${attr}="${escapeHtml(id)}"
          value="${escapeHtml(current || '')}" maxlength="255" placeholder="/dashboard-hub/nome-vista"/>
        ${currentPath ? `<p class="rn-note">Destinazione: ${escapeHtml(currentPath)}</p>` : ''}`,
        'Scegli una vista rilevata in Home Assistant oppure inserisci un percorso locale. Le pagine devono già esistere.');
    }
    _areasTab() {
      const cfg = this._config;
      const selected = visibleAreas(this._areas, cfg);
      const all = visibleAreas(this._areas, { ...cfg, show_all_areas: true, hidden_area_ids: [] });
      let html = `<h3 class="rn-heading">Configurazione stanze</h3><p class="rn-desc">Utilizza le Aree già presenti in Home Assistant. Nomi e icone MDI sono quelli assegnati alle Aree.</p>
        <div class="rn-subtabs"><button class="rn-subtab ${this._section === 'aree' ? 'active' : ''}" data-section="aree">Aree</button>
          <button class="rn-subtab ${this._section === 'links' ? 'active' : ''}" data-section="links">Collegamenti</button></div>`;
      if (this._section === 'aree') {
        html += `<h3 class="rn-heading">Aree Home Assistant</h3>
          ${this._toggle('Mostra tutte le Aree', 'show_all_areas', cfg.show_all_areas, 'Attivo di default. Puoi anche nascondere singolarmente le Aree qui sotto.')}`;
        if (!cfg.show_all_areas) {
          html += this._field('Seleziona Aree', `<div data-selector="areas"></div><div class="rn-selector-fallback"><select class="rn-input" data-fallback-area multiple>
            ${this._areas.map((a) => `<option value="${escapeHtml(a.area_id)}" ${cfg.area_ids.includes(a.area_id) ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('')}</select></div>`);
        }
        if (this._areaError) html += `<p class="rn-muted">${escapeHtml(this._areaError)}</p>`;
        if (!all.length) html += '<p class="rn-desc">Nessuna Area disponibile.</p>';
        all.forEach((r, i) => {
          const visible = cfg.show_all_areas || cfg.area_ids.includes(r.area_id);
          const enabled = visible && !cfg.hidden_area_ids.includes(r.area_id);
          html += `<details class="rn-item" data-area-item="${escapeHtml(r.area_id)}"><summary>${markupIcon(r.icon)}<span>${escapeHtml(r.name)}</span><small>${enabled ? 'Visibile' : 'Nascosta'}</small></summary>
              <div class="rn-content"><p class="rn-muted">Nome e icona provengono dal registro Aree di Home Assistant.</p>
              ${this._toggle('Mostra questa Area', `area-visible-${r.area_id}`, enabled, 'La nasconde solo in questa card, senza eliminarla da Home Assistant.')}
              ${this._destinationField('area', r.area_id, cfg.area_paths[r.area_id])}
              <div class="rn-actions"><button class="rn-button" data-area-move="up" data-id="${escapeHtml(r.area_id)}" ${i === 0 ? 'disabled' : ''}>↑ Sposta su</button>
              <button class="rn-button" data-area-move="down" data-id="${escapeHtml(r.area_id)}" ${i === all.length - 1 ? 'disabled' : ''}>↓ Sposta giù</button></div></div></details>`;
        });
        html += '<p class="rn-note">Su tablet: 3 elementi per riga, senza centrare l’ultima riga.</p>';
      } else {
        html += `<h3 class="rn-heading">Collegamenti sotto le stanze</h3><p class="rn-desc">Informazioni e Clima sono presenti inizialmente. Puoi modificarli, nasconderli, rimuoverli o aggiungerne altri. Le icone utilizzano il selettore Home Assistant.</p>`;
        cfg.links.forEach((item, i) => {
          html += `<details class="rn-item" data-link-item="${escapeHtml(item.id)}"><summary>${markupIcon(item.icon)}<span>${escapeHtml(item.name)}</span><small>${i + 1} / ${cfg.links.length}</small></summary>
            <div class="rn-content">${this._field('Nome', `<input class="rn-input" data-link-name="${escapeHtml(item.id)}" value="${escapeHtml(item.name)}" maxlength="60"/>`)}
            ${this._field('Icona Home Assistant', `<div data-icon-slot="${escapeHtml(item.id)}"></div><div class="rn-selector-fallback"><input class="rn-input" data-link-icon="${escapeHtml(item.id)}" value="${escapeHtml(item.icon)}" placeholder="mdi:home-outline"/></div>`)}
            ${this._destinationField('link', item.id, item.path)}
            ${this._toggle('Mostra collegamento', `link-show-${item.id}`, item.show)}
            <div class="rn-actions"><button class="rn-button" data-link-move="up" data-id="${escapeHtml(item.id)}" ${i === 0 ? 'disabled' : ''}>↑ Sposta su</button>
            <button class="rn-button" data-link-move="down" data-id="${escapeHtml(item.id)}" ${i === cfg.links.length - 1 ? 'disabled' : ''}>↓ Sposta giù</button>
            <button class="rn-button" data-link-remove="${escapeHtml(item.id)}">Rimuovi</button></div></div></details>`;
        });
        html += '<button class="rn-button rn-add" data-add-link>+ Aggiungi collegamento</button>';
      }
      return html;
    }
    _appearanceTab() {
      const c = this._config;
      return `<h3 class="rn-heading">Aspetto Edera</h3><p class="rn-desc">Personalizza titoli e bordo mantenendo lo stile minimalista approvato.</p>
        ${this._text('Titolo della card', 'eyebrow', c.eyebrow)}
        ${this._toggle('Mostra titolo', 'show_eyebrow', c.show_eyebrow, 'Nome della card in piccolo, sopra il titolo principale.')}
        ${this._text('Titolo principale', 'title', c.title)}
        ${this._toggle('Mostra titolo principale', 'show_title', c.show_title, 'Il punto verde Edera segue sempre il titolo principale.')}
        ${this._toggle('Mostra bordo esterno', 'show_border', c.show_border, 'Attivo di default. Disattiva per la versione senza bordo.')}
        ${this._field('Tema', `<select class="rn-input" data-field="theme_mode">
          <option value="auto" ${c.theme_mode === 'auto' ? 'selected' : ''}>Automatico (Home Assistant)</option>
          <option value="light" ${c.theme_mode === 'light' ? 'selected' : ''}>Light Edera</option>
          <option value="dark" ${c.theme_mode === 'dark' ? 'selected' : ''}>Dark Edera</option></select>`)}`;
    }
    _render() {
      if (!this.isConnected) return;
      const openArea = [...this.shadowRoot.querySelectorAll('details[open]')].map((e) => e.getAttribute('data-area-item') || e.getAttribute('data-link-item'));
      this.shadowRoot.innerHTML = `<style>${EDITOR_CSS}</style><div class="rn-editor">
        <div class="rn-tabs"><button class="rn-tab ${this._tab === 'stanze' ? 'active' : ''}" data-tab="stanze">Stanze</button>
        <button class="rn-tab ${this._tab === 'aspetto' ? 'active' : ''}" data-tab="aspetto">Aspetto</button></div>
        ${this._tab === 'stanze' ? this._areasTab() : this._appearanceTab()}</div>`;
      this.shadowRoot.querySelectorAll('details').forEach((item) => {
        if (openArea.includes(item.getAttribute('data-area-item') || item.getAttribute('data-link-item'))) item.open = true;
      });
      this._attachNativeSelectors();
    }
    _attachNativeSelectors() {
      const native = !!customElements.get('ha-selector');
      const root = this.shadowRoot.querySelector('.rn-editor');
      if (!native) root.classList.add('rn-no-native');
      const areaSlot = root.querySelector('[data-selector="areas"]');
      if (areaSlot && native) {
        const selector = document.createElement('ha-selector');
        selector.hass = this._hass;
        selector.selector = { area: { multiple: true } };
        selector.value = this._config.area_ids;
        selector.setAttribute('aria-label', 'Seleziona Aree Home Assistant');
        selector.addEventListener('value-changed', (e) => {
          e.stopPropagation();
          if (!e.detail || !Object.prototype.hasOwnProperty.call(e.detail, 'value')) return;
          this._update({ area_ids: uniqueIds(e.detail.value) });
        });
        areaSlot.appendChild(selector);
      }
      root.querySelectorAll('[data-view-results]').forEach((results) => {
        const key = results.dataset.viewResults;
        this._renderViewResults(key, '');
      });
      if (!native) return;
      root.querySelectorAll('[data-icon-slot]').forEach((slot) => {
        const id = slot.getAttribute('data-icon-slot');
        const current = this._config.links.find((entry) => entry.id === id);
        if (!current) return;
        const selector = document.createElement('ha-selector');
        selector.hass = this._hass;
        selector.selector = { icon: {} };
        selector.value = current.icon;
        selector.setAttribute('aria-label', `Icona per ${current.name}`);
        selector.addEventListener('value-changed', (e) => {
          e.stopPropagation();
          if (!e.detail || !Object.prototype.hasOwnProperty.call(e.detail, 'value')) return;
          this._modifyLink(id, { icon: icon(e.detail.value) });
        });
        slot.appendChild(selector);
      });
    }
    _renderViewResults(key, query) {
      const results = [...this.shadowRoot.querySelectorAll('[data-view-results]')]
        .find((el) => el.dataset.viewResults === key);
      if (!results) return;
      const [kind, id] = key.split(':');
      const current = kind === 'area' ? this._config.area_paths[id] || ''
        : this._config.links.find((link) => link.id === id)?.path || '';
      const term = String(query || '').trim().toLocaleLowerCase('it');
      const matches = this._views.filter((item) =>
        !term || `${item.label} ${item.value}`.toLocaleLowerCase('it').includes(term)).slice(0, 20);
      results.innerHTML = matches.length ? matches.map((item) =>
        `<button type="button" class="rn-view-option ${current === item.value ? 'is-selected' : ''}"
          data-pick-view="${escapeHtml(key)}" data-pick-path="${escapeHtml(item.value)}">
          <span>${escapeHtml(item.label)}<small>${escapeHtml(item.value)}</small></span></button>`).join('')
        : `<div class="rn-view-empty">${this._views.length ? 'Nessuna vista trovata per questa ricerca.' : 'Nessuna vista disponibile automaticamente.'}</div>`;
    }
    _input(event) {
      const field = event.target.closest('[data-view-search]');
      if (field) this._renderViewResults(field.dataset.viewSearch, field.value);
    }
    _modifyLink(id, patch) {
      this._update({ links: this._config.links.map((entry) => entry.id === id ? { ...entry, ...patch } : entry) });
    }
    _click(e) {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.pickView) {
        const [kind, id] = t.dataset.pickView.split(':');
        const destination = path(t.dataset.pickPath);
        if (!destination) return;
        if (kind === 'area') this._update({ area_paths: { ...this._config.area_paths, [id]: destination } });
        else if (kind === 'link') this._modifyLink(id, { path: destination });
        return;
      }
      if (t.dataset.tab) { this._tab = t.dataset.tab; this._render(); return; }
      if (t.dataset.section) { this._section = t.dataset.section; this._render(); return; }
      if (t.hasAttribute('data-add-link')) {
        const ids = new Set(this._config.links.map((item) => item.id));
        let i = 1; while (ids.has(`extra-${i}`)) i++;
        this._update({ links: [...this._config.links, { id: `extra-${i}`, name: 'Nuovo collegamento', icon: 'mdi:home-outline', path: '', show: true }] });
        const el = [...this.shadowRoot.querySelectorAll('[data-link-item]')].find((item) => item.dataset.linkItem === `extra-${i}`);
        if (el) el.open = true;
        return;
      }
      if (t.dataset.linkRemove) {
        this._update({ links: this._config.links.filter((item) => item.id !== t.dataset.linkRemove) }); return;
      }
      if (t.dataset.linkMove) {
        const links = this._config.links.map((entry) => ({ ...entry }));
        const i = links.findIndex((item) => item.id === t.dataset.id);
        const j = i + (t.dataset.linkMove === 'up' ? -1 : 1);
        if (i >= 0 && j >= 0 && j < links.length) { [links[i], links[j]] = [links[j], links[i]]; this._update({ links }); }
        return;
      }
      if (t.dataset.areaMove) {
        const ids = visibleAreas(this._areas, { ...this._config, show_all_areas: true, hidden_area_ids: [] }).map((item) => item.area_id);
        const i = ids.indexOf(t.dataset.id);
        const j = i + (t.dataset.areaMove === 'up' ? -1 : 1);
        if (i >= 0 && j >= 0 && j < ids.length) {
          [ids[i], ids[j]] = [ids[j], ids[i]];
          const rest = this._config.area_order.filter((id) => !ids.includes(id));
          this._update({ area_order: [...ids, ...rest] });
        }
      }
    }
    _change(e) {
      const t = e.target;
      if (t.dataset.field) { this._update({ [t.dataset.field]: t.value }); return; }
      if (t.dataset.toggle) {
        const key = t.dataset.toggle;
        if (key.startsWith('area-visible-')) {
          const id = key.slice('area-visible-'.length);
          const hidden = this._config.hidden_area_ids.filter((entry) => entry !== id);
          const areaIds = t.checked && !this._config.show_all_areas
            ? [...new Set([...this._config.area_ids, id])] : this._config.area_ids;
          this._update({ hidden_area_ids: t.checked ? hidden : [...hidden, id], area_ids: areaIds });
        } else if (key.startsWith('link-show-')) this._modifyLink(key.slice(10), { show: t.checked });
        else this._update({ [key]: t.checked });
        return;
      }
      if (t.dataset.viewChoice) {
        const [kind, id] = t.dataset.viewChoice.split(':');
        if (kind === 'area') this._update({ area_paths: { ...this._config.area_paths, [id]: path(t.value) } });
        else if (kind === 'link') this._modifyLink(id, { path: path(t.value) });
        return;
      }
      if (t.dataset.areaPath || t.dataset.linkPath) {
        const entered = t.value.trim();
        const validated = path(entered);
        if (entered && !validated) {
          t.setCustomValidity('Inserisci un percorso interno che inizi con / oppure un URL dello stesso Home Assistant.');
          t.reportValidity();
          return; // Never erase a previously valid destination after a bad paste.
        }
        t.setCustomValidity('');
        if (t.dataset.areaPath) this._update({ area_paths: { ...this._config.area_paths, [t.dataset.areaPath]: validated } });
        else this._modifyLink(t.dataset.linkPath, { path: validated });
        return;
      }
      if (t.dataset.linkName) { this._modifyLink(t.dataset.linkName, { name: string(t.value, 60) }); return; }
      if (t.dataset.linkIcon) { this._modifyLink(t.dataset.linkIcon, { icon: icon(t.value) }); return; }
      if (t.hasAttribute('data-fallback-area')) {
        this._update({ area_ids: [...t.selectedOptions].map((item) => item.value) });
      }
    }
  }
  if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, RoomsNavigationCard);
  if (!customElements.get(EDITOR_TAG)) customElements.define(EDITOR_TAG, RoomsNavigationCardEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((item) => item.type === CARD_TAG)) {
    window.customCards.push({
      type: CARD_TAG,
      name: 'Rooms Navigation Card',
      description: 'A modern room navigation card for Home Assistant with native areas, optional shortcuts, and Edera design.',
      preview: true,
    });
  }
})();