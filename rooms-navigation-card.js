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
  // A one-time scroll fallback for returning from a room to the same dashboard view.
  // Home Assistant's built-in history scroll restoration always takes precedence.
  let pendingRoomReturn = null;
  const dashboardPath = () => `${window.location.pathname}${window.location.search}`;

  /* ------------------------------------------------------------ languages */
  const LANGS = [['it', 'Italiano'], ['en', 'English'], ['de', 'Deutsch'], ['fr', 'Français']];
  const TR = {
    it: {
      def_title: 'Le mie stanze', info: 'Informazioni', climate: 'Clima', new_link: 'Nuovo collegamento',
      links_aria: 'Collegamenti', open: 'Apri {n}', unset: '{n}: destinazione non configurata', set_page: 'Configura una pagina per {n}',
      loading: 'Caricamento Aree Home Assistant…', no_areas: 'Nessuna Area selezionata. Configura le Aree nell’editor della card.',
      area_err: 'Impossibile leggere le Aree di Home Assistant.', link_unset: 'Destinazione non configurata',
      secs: 'Sezioni', tSt: 'Stanze', tLi: 'Collegamenti', tAs: 'Aspetto',
      st_desc: 'Usa le Aree di Home Assistant: nome e icona arrivano da lì. La pillola mostra il piano dell’Area; puoi rinominarla o lasciarla vuota.',
      all_areas: 'Mostra tutte le Aree', all_areas_h: 'Acceso di default. Puoi nascondere le singole Aree qui sotto.',
      pick_areas: 'Seleziona Aree', no_area_list: 'Nessuna Area disponibile.',
      ed_area_err: 'Impossibile leggere le Aree. Controlla l’accesso a Home Assistant.',
      vis: 'Visibile', hid: 'Nascosta', show_area: 'Mostra questa Area', show_area_h: 'La nasconde solo in questa card, senza eliminarla da Home Assistant.',
      dest: 'Pagina di destinazione', search: 'Cerca una dashboard o una vista di Home Assistant', search_for: 'Cerca pagina per {n}',
      saved: 'Percorso salvato (modificabile)', dest_now: 'Destinazione: {p}',
      dest_h: 'Scegli una vista rilevata in Home Assistant oppure inserisci un percorso locale. Vuota: la stanza appare attenuata e non apre nulla.',
      no_views: 'Home Assistant non ha restituito un elenco di viste consultabili. Puoi inserire il percorso manualmente.',
      unknown_view: 'Il percorso salvato non è tra le viste rilevate. Verifica che la pagina esista e sia accessibile.',
      no_match: 'Nessuna vista trovata per questa ricerca.', no_view_list: 'Nessuna vista disponibile automaticamente.',
      bad_path: 'Inserisci un percorso interno che inizi con / oppure un URL dello stesso Home Assistant.',
      main_dash: 'Dashboard principale', view_n: 'Vista {n}',
      pill: 'Testo della pillola', pill_ph: 'Vuoto = nessuna pillola', pill_floor: 'Di base: {f} (piano dell’Area).', pill_nofloor: 'L’Area non ha un piano: scrivi un testo se vuoi una pillola.',
      reset_pill: 'Ripristina piano', up: '↑ Sposta su', down: '↓ Sposta giù', rm: 'Rimuovi',
      li_desc: 'Pulsanti sotto le stanze. Spenti di default: accendi quelli che ti servono.',
      on: 'Attivo', off: 'Spento', show_link: 'Mostra collegamento', name: 'Nome', icon: 'Icona Home Assistant', icon_for: 'Icona per {n}', add_link: '+ Aggiungi collegamento',
      eyebrow: 'Intestazione superiore', title: 'Titolo', title_h: 'Il punto verde finale lo aggiunge la card.',
      show_eyebrow: 'Mostra intestazione superiore', show_title: 'Mostra titolo',
      show_badges: 'Mostra pillole', show_badges_h: 'Il piano dell’Area, o il testo scelto, sopra ogni stanza.',
      border: 'Mostra bordo esterno', theme: 'Tema', th_auto: 'Automatico (Home Assistant)',
      lang: 'Lingua', lang_auto: 'Automatica (Home Assistant)',
      lang_h: 'Automatica segue la lingua dell’utente in Home Assistant. Se la lingua non è disponibile si usa l’inglese.',
    },
    en: {
      def_title: 'My rooms', info: 'Information', climate: 'Climate', new_link: 'New link',
      links_aria: 'Links', open: 'Open {n}', unset: '{n}: destination not set', set_page: 'Set a page for {n}',
      loading: 'Loading Home Assistant Areas…', no_areas: 'No Area selected. Set the Areas in the card editor.',
      area_err: 'Unable to read Home Assistant Areas.', link_unset: 'Destination not set',
      secs: 'Sections', tSt: 'Rooms', tLi: 'Links', tAs: 'Appearance',
      st_desc: 'Uses your Home Assistant Areas: name and icon come from there. The pill shows the Area’s floor; you can rename it or leave it empty.',
      all_areas: 'Show all Areas', all_areas_h: 'On by default. You can hide single Areas below.',
      pick_areas: 'Select Areas', no_area_list: 'No Area available.',
      ed_area_err: 'Unable to read the Areas. Check access to Home Assistant.',
      vis: 'Visible', hid: 'Hidden', show_area: 'Show this Area', show_area_h: 'Hides it only in this card, without deleting it from Home Assistant.',
      dest: 'Destination page', search: 'Search a Home Assistant dashboard or view', search_for: 'Search page for {n}',
      saved: 'Saved path (editable)', dest_now: 'Destination: {p}',
      dest_h: 'Pick a view found in Home Assistant or enter a local path. Empty: the room is dimmed and opens nothing.',
      no_views: 'Home Assistant returned no list of views. You can enter the path manually.',
      unknown_view: 'The saved path is not among the views found. Check that the page exists and is reachable.',
      no_match: 'No view found for this search.', no_view_list: 'No view available automatically.',
      bad_path: 'Enter an internal path starting with / or a URL of this same Home Assistant.',
      main_dash: 'Main dashboard', view_n: 'View {n}',
      pill: 'Pill text', pill_ph: 'Empty = no pill', pill_floor: 'Default: {f} (Area floor).', pill_nofloor: 'This Area has no floor: type a text if you want a pill.',
      reset_pill: 'Reset to floor', up: '↑ Move up', down: '↓ Move down', rm: 'Remove',
      li_desc: 'Buttons below the rooms. Off by default: turn on the ones you need.',
      on: 'On', off: 'Off', show_link: 'Show link', name: 'Name', icon: 'Home Assistant icon', icon_for: 'Icon for {n}', add_link: '+ Add link',
      eyebrow: 'Top label', title: 'Title', title_h: 'The card adds the green dot at the end.',
      show_eyebrow: 'Show top label', show_title: 'Show title',
      show_badges: 'Show pills', show_badges_h: 'The Area’s floor, or your text, above each room.',
      border: 'Show outer border', theme: 'Theme', th_auto: 'Automatic (Home Assistant)',
      lang: 'Language', lang_auto: 'Automatic (Home Assistant)',
      lang_h: 'Automatic follows the user’s Home Assistant language. English is used if the language is not available.',
    },
    de: {
      def_title: 'Meine Räume', info: 'Informationen', climate: 'Klima', new_link: 'Neuer Link',
      links_aria: 'Links', open: '{n} öffnen', unset: '{n}: Ziel nicht festgelegt', set_page: 'Lege eine Seite für {n} fest',
      loading: 'Bereiche von Home Assistant werden geladen…', no_areas: 'Kein Bereich ausgewählt. Lege die Bereiche im Karteneditor fest.',
      area_err: 'Die Bereiche von Home Assistant können nicht gelesen werden.', link_unset: 'Ziel nicht festgelegt',
      secs: 'Abschnitte', tSt: 'Räume', tLi: 'Links', tAs: 'Darstellung',
      st_desc: 'Nutzt die Bereiche von Home Assistant: Name und Symbol kommen von dort. Die Pille zeigt das Stockwerk des Bereichs; du kannst sie umbenennen oder leer lassen.',
      all_areas: 'Alle Bereiche anzeigen', all_areas_h: 'Standardmäßig an. Einzelne Bereiche kannst du unten ausblenden.',
      pick_areas: 'Bereiche auswählen', no_area_list: 'Kein Bereich verfügbar.',
      ed_area_err: 'Die Bereiche können nicht gelesen werden. Prüfe den Zugriff auf Home Assistant.',
      vis: 'Sichtbar', hid: 'Ausgeblendet', show_area: 'Diesen Bereich anzeigen', show_area_h: 'Blendet ihn nur in dieser Karte aus, ohne ihn in Home Assistant zu löschen.',
      dest: 'Zielseite', search: 'Dashboard oder Ansicht von Home Assistant suchen', search_for: 'Seite für {n} suchen',
      saved: 'Gespeicherter Pfad (bearbeitbar)', dest_now: 'Ziel: {p}',
      dest_h: 'Wähle eine in Home Assistant gefundene Ansicht oder gib einen lokalen Pfad ein. Leer: Der Raum wird abgeblendet und öffnet nichts.',
      no_views: 'Home Assistant hat keine Liste von Ansichten geliefert. Du kannst den Pfad manuell eingeben.',
      unknown_view: 'Der gespeicherte Pfad ist nicht unter den gefundenen Ansichten. Prüfe, ob die Seite existiert und erreichbar ist.',
      no_match: 'Keine Ansicht für diese Suche gefunden.', no_view_list: 'Keine Ansicht automatisch verfügbar.',
      bad_path: 'Gib einen internen Pfad ein, der mit / beginnt, oder eine URL desselben Home Assistant.',
      main_dash: 'Haupt-Dashboard', view_n: 'Ansicht {n}',
      pill: 'Text der Pille', pill_ph: 'Leer = keine Pille', pill_floor: 'Standard: {f} (Stockwerk des Bereichs).', pill_nofloor: 'Dieser Bereich hat kein Stockwerk: Gib einen Text ein, wenn du eine Pille möchtest.',
      reset_pill: 'Stockwerk wiederherstellen', up: '↑ Nach oben', down: '↓ Nach unten', rm: 'Entfernen',
      li_desc: 'Schaltflächen unter den Räumen. Standardmäßig aus: Aktiviere die, die du brauchst.',
      on: 'Aktiv', off: 'Aus', show_link: 'Link anzeigen', name: 'Name', icon: 'Home-Assistant-Symbol', icon_for: 'Symbol für {n}', add_link: '+ Link hinzufügen',
      eyebrow: 'Obere Überschrift', title: 'Titel', title_h: 'Den grünen Punkt am Ende fügt die Karte hinzu.',
      show_eyebrow: 'Obere Überschrift anzeigen', show_title: 'Titel anzeigen',
      show_badges: 'Pillen anzeigen', show_badges_h: 'Das Stockwerk des Bereichs oder dein Text über jedem Raum.',
      border: 'Äußeren Rahmen anzeigen', theme: 'Design', th_auto: 'Automatisch (Home Assistant)',
      lang: 'Sprache', lang_auto: 'Automatisch (Home Assistant)',
      lang_h: 'Automatisch folgt der Sprache des Benutzers in Home Assistant. Ist sie nicht verfügbar, wird Englisch verwendet.',
    },
    fr: {
      def_title: 'Mes pièces', info: 'Informations', climate: 'Climat', new_link: 'Nouveau lien',
      links_aria: 'Liens', open: 'Ouvrir {n}', unset: '{n} : destination non définie', set_page: 'Définis une page pour {n}',
      loading: 'Chargement des pièces Home Assistant…', no_areas: 'Aucune pièce sélectionnée. Définis les pièces dans l’éditeur de la carte.',
      area_err: 'Impossible de lire les pièces de Home Assistant.', link_unset: 'Destination non définie',
      secs: 'Sections', tSt: 'Pièces', tLi: 'Liens', tAs: 'Apparence',
      st_desc: 'Utilise les pièces de Home Assistant : le nom et l’icône viennent de là. La pastille affiche l’étage de la pièce ; tu peux la renommer ou la laisser vide.',
      all_areas: 'Afficher toutes les pièces', all_areas_h: 'Activé par défaut. Tu peux masquer des pièces ci-dessous.',
      pick_areas: 'Sélectionner les pièces', no_area_list: 'Aucune pièce disponible.',
      ed_area_err: 'Impossible de lire les pièces. Vérifie l’accès à Home Assistant.',
      vis: 'Visible', hid: 'Masquée', show_area: 'Afficher cette pièce', show_area_h: 'La masque seulement dans cette carte, sans la supprimer de Home Assistant.',
      dest: 'Page de destination', search: 'Chercher un tableau de bord ou une vue Home Assistant', search_for: 'Chercher une page pour {n}',
      saved: 'Chemin enregistré (modifiable)', dest_now: 'Destination : {p}',
      dest_h: 'Choisis une vue trouvée dans Home Assistant ou saisis un chemin local. Vide : la pièce est atténuée et n’ouvre rien.',
      no_views: 'Home Assistant n’a renvoyé aucune liste de vues. Tu peux saisir le chemin à la main.',
      unknown_view: 'Le chemin enregistré ne fait pas partie des vues trouvées. Vérifie que la page existe et est accessible.',
      no_match: 'Aucune vue trouvée pour cette recherche.', no_view_list: 'Aucune vue disponible automatiquement.',
      bad_path: 'Saisis un chemin interne commençant par / ou une URL de ce même Home Assistant.',
      main_dash: 'Tableau de bord principal', view_n: 'Vue {n}',
      pill: 'Texte de la pastille', pill_ph: 'Vide = pas de pastille', pill_floor: 'Par défaut : {f} (étage de la pièce).', pill_nofloor: 'Cette pièce n’a pas d’étage : saisis un texte si tu veux une pastille.',
      reset_pill: 'Rétablir l’étage', up: '↑ Monter', down: '↓ Descendre', rm: 'Supprimer',
      li_desc: 'Boutons sous les pièces. Désactivés par défaut : active ceux dont tu as besoin.',
      on: 'Actif', off: 'Désactivé', show_link: 'Afficher le lien', name: 'Nom', icon: 'Icône Home Assistant', icon_for: 'Icône pour {n}', add_link: '+ Ajouter un lien',
      eyebrow: 'En-tête supérieur', title: 'Titre', title_h: 'La carte ajoute le point vert final.',
      show_eyebrow: 'Afficher l’en-tête supérieur', show_title: 'Afficher le titre',
      show_badges: 'Afficher les pastilles', show_badges_h: 'L’étage de la pièce, ou ton texte, au-dessus de chaque pièce.',
      border: 'Afficher la bordure extérieure', theme: 'Thème', th_auto: 'Automatique (Home Assistant)',
      lang: 'Langue', lang_auto: 'Automatique (Home Assistant)',
      lang_h: 'Automatique suit la langue de l’utilisateur dans Home Assistant. Si elle n’est pas disponible, l’anglais est utilisé.',
    },
  };
  let CUR = 'en';
  const T = (k, v) => {
    let t = TR[CUR] && TR[CUR][k];
    if (t == null) t = TR.en[k];
    if (t == null) return k;
    return v ? t.replace(/\{(\w+)\}/g, (m, x) => (v[x] != null ? v[x] : m)) : t;
  };
  const baseLang = (h) => {
    const l = h && ((h.locale && h.locale.language) || h.language);
    return typeof l === 'string' ? l.toLowerCase().split(/[-_]/)[0] : 'en';
  };
  const pickLang = (cfgLang, h) => {
    const l = cfgLang && cfgLang !== 'auto' ? cfgLang : baseLang(h);
    return TR[l] ? l : 'en';
  };

  /* --------------------------------------------------------------- config */
  // Values saved automatically by version 1.2 in Italian: treated as "default" so they follow the language.
  const LEGACY_TITLE = 'Le mie stanze';
  const LEGACY_LINK_NAMES = { information: 'Informazioni', climate: 'Clima' };
  const DEFAULT_LINK_KEYS = { information: 'info', climate: 'climate' };
  const DEFAULT_LINKS = [
    { id: 'information', name: '', icon: 'mdi:information-outline', path: '', show: false },
    { id: 'climate', name: '', icon: 'mdi:thermometer', path: '', show: false },
  ];
  const DEFAULTS = { eyebrow: 'ROOMS NAVIGATION CARD' };

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
    return /^\/(?!\/)[^\\<>\u0000- ]*$/.test(candidate) ? candidate : '';
  };
  const areaId = (value) => string(value, 110);
  const uniqueIds = (value) => Array.isArray(value)
    ? [...new Set(value.map(areaId).filter((id) => /^[a-z0-9_]+$/.test(id)))].slice(0, 250)
    : [];
  const defaultLinkCopies = () => DEFAULT_LINKS.map((entry) => ({ ...entry }));
  const normalizeLink = (entry, index) => ({
    id: /^[a-z0-9_-]{1,70}$/.test(entry?.id ?? '') ? entry.id : `link-${index + 1}`,
    name: string(entry?.name, 60),
    icon: icon(entry?.icon, 'mdi:home-outline'),
    path: path(entry?.path),
    show: entry?.show !== false,
  });
  // Display name: an empty name or the untouched 1.2 Italian default follows the card language.
  const linkName = (link) => {
    const legacy = LEGACY_LINK_NAMES[link.id];
    if (link.name && link.name !== legacy) return link.name;
    if (DEFAULT_LINK_KEYS[link.id]) return T(DEFAULT_LINK_KEYS[link.id]);
    return link.name || T('new_link');
  };
  const cardTitle = (cfg) => (cfg.title && cfg.title !== LEGACY_TITLE ? cfg.title : T('def_title'));
  function normalizeConfig(raw = {}) {
    const r = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    const paths = {};
    if (r.area_paths && typeof r.area_paths === 'object' && !Array.isArray(r.area_paths)) {
      for (const [key, value] of Object.entries(r.area_paths).slice(0, 250)) {
        if (/^[a-z0-9_]+$/.test(key)) paths[key] = path(value);
      }
    }
    const badges = {};
    if (r.area_badges && typeof r.area_badges === 'object' && !Array.isArray(r.area_badges)) {
      for (const [key, value] of Object.entries(r.area_badges).slice(0, 250)) {
        if (/^[a-z0-9_]+$/.test(key) && value != null) badges[key] = string(value, 24);
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
      title: string(r.title, 60).replace(/\.+$/, ''),
      show_title: r.show_title !== false,
      show_eyebrow: r.show_eyebrow !== false,
      show_border: r.show_border !== false,
      show_badges: r.show_badges !== false,
      theme_mode: ['auto', 'light', 'dark'].includes(r.theme_mode) ? r.theme_mode : 'auto',
      language: ['auto', ...LANGS.map((l) => l[0])].includes(r.language) ? r.language : 'auto',
      show_all_areas: r.show_all_areas !== false,
      area_ids: uniqueIds(r.area_ids),
      hidden_area_ids: uniqueIds(r.hidden_area_ids),
      area_order: uniqueIds(r.area_order),
      area_paths: paths,
      area_badges: badges,
      links,
    };
  }

  /* ----------------------------------------------------------------- data */
  function normalizeAreas(result) {
    if (!Array.isArray(result)) return [];
    const ids = new Set();
    return result.filter((r) => r && typeof r.area_id === 'string')
      .map((r) => ({
        area_id: areaId(r.area_id), name: string(r.name, 100), icon: icon(r.icon),
        floor_id: typeof r.floor_id === 'string' ? string(r.floor_id, 110) : '',
      }))
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
  // Floors exist in the Home Assistant floor registry. If it cannot be read, the
  // frontend's own hass.floors is used; otherwise rooms simply have no floor pill.
  async function fetchFloors(hass) {
    const names = {};
    try {
      const result = await hass.callWS({ type: 'config/floor_registry/list' });
      if (Array.isArray(result)) {
        result.forEach((f) => { if (f && typeof f.floor_id === 'string') names[f.floor_id] = string(f.name, 60); });
        return names;
      }
    } catch (_) { /* fall back below */ }
    const local = hass && hass.floors && typeof hass.floors === 'object' ? hass.floors : {};
    Object.values(local).forEach((f) => { if (f && typeof f.floor_id === 'string') names[f.floor_id] = string(f.name, 60); });
    return names;
  }
  async function fetchAreas(hass) {
    if (!hass || typeof hass.callWS !== 'function') throw new Error('Home Assistant API not available.');
    const [areas, floors] = await Promise.all([
      hass.callWS({ type: 'config/area_registry/list' }).then(normalizeAreas),
      fetchFloors(hass),
    ]);
    return areas.map((a) => ({ ...a, floor: (a.floor_id && floors[a.floor_id]) || '' }));
  }
  // Text of the pill: a custom text (even empty) wins over the Area's floor.
  const badgeText = (cfg, room) => (Object.prototype.hasOwnProperty.call(cfg.area_badges, room.area_id)
    ? cfg.area_badges[room.area_id] : room.floor || '').trim();
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
      console.warn(`[${EDITOR_TAG}] Dashboard list not available:`, error);
      /* The default dashboard may still be accessible. */
    }
    const targets = [{ slug: null, name: T('main_dash') }];
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
        const title = string(view?.title, 85) || T('view_n', { n: viewIndex + 1 });
        choices.set(destination, { value: destination, label: `${target.name} — ${title}` });
      });
    });
    return [...choices.values()].sort((a, b) => a.label.localeCompare(b.label, CUR));
  }
  function markupIcon(name, cls = '') {
    return `<ha-icon class="${cls}" icon="${escapeHtml(icon(name))}" aria-hidden="true"></ha-icon>`;
  }

  /* ----------------------------------------------------------------- card */
  const CARD_CSS = `
    :host{display:block;box-sizing:border-box;width:100%;min-width:0;max-width:100%;font-family:var(--ha-font-family-body,var(--paper-font-body1_-_font-family,Roboto,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif));font-size:14px;font-weight:400;-webkit-tap-highlight-color:transparent}
    *,*:before,*:after{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    .rn-container{container-type:inline-size;width:100%;min-width:0;--rn-accent:#0a7156;--rn-bg:#fafbf9;--rn-line:#e0e5df;--rn-fg:#18221c;--rn-muted:#56675c;--rn-t1:#dcebe2;--rn-t2:#f4f8f5;--rn-tb:#c9ddd0;--rn-icon:#0E6B52;--rn-pill:#064E3B;--rn-pill-fg:#ffffff;--rn-chip:#f0f2ef;--rn-chip-icon:#0b9b77}
    .rn-container.rn-dark{--rn-accent:#0e795d;--rn-bg:#101211;--rn-line:#2b302c;--rn-fg:#f5f7f4;--rn-muted:#bbc5bd;--rn-t1:#0E6B52;--rn-t2:#0c2a20;--rn-tb:#1d5442;--rn-icon:#eaf4ee;--rn-pill:#e3f0e3;--rn-pill-fg:#0c2a20;--rn-chip:#191c1a}
    .rn-shell{width:100%;min-width:0;max-width:100%;background:var(--rn-bg);color:var(--rn-fg);border:1px solid var(--rn-line);border-radius:22px;padding:14px}
    .rn-shell.rn-borderless{background:transparent;border:0;border-radius:0;padding:0}
    .rn-eyebrow{font-size:10px;letter-spacing:1.7px;font-weight:750;color:var(--rn-muted);margin:0 0 4px}
    .rn-title{font-size:21px;line-height:1.14;font-weight:780;letter-spacing:-.5px;overflow-wrap:anywhere;margin:0}
    .rn-title b{color:var(--rn-accent);font-weight:800}
    .rn-heading{margin:0 2px 12px}
    .rn-grid{--rn-cols:4;--rn-gap:8px;display:flex;flex-wrap:wrap;justify-content:center;gap:var(--rn-gap)}
    .rn-grid.rn-has-badges{row-gap:20px;padding-top:11px}
    .rn-room{flex:0 0 calc((100% - (var(--rn-cols) - 1) * var(--rn-gap)) / var(--rn-cols));position:relative;appearance:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;min-width:0;min-height:104px;padding:18px 10px 14px;border:1px solid var(--rn-tb);border-radius:16px;background:linear-gradient(180deg,color-mix(in srgb,var(--rn-t1) 55%,var(--rn-t2)),var(--rn-t2));color:var(--rn-fg);text-decoration:none;text-align:center;transition:filter .15s,transform .15s;outline:none}
    .rn-room[href]{cursor:pointer}
    .rn-room[href]:hover{filter:brightness(1.06)}
    .rn-room[href]:active{transform:translateY(1px)}
    .rn-room:not([href]){cursor:default;opacity:.67}
    .rn-room-icon{display:grid;place-items:center;color:var(--rn-icon)}
    .rn-room-icon ha-icon{--mdc-icon-size:26px;width:26px;height:26px;display:flex}
    .rn-room-name{min-width:0;max-width:100%;font-weight:600;font-size:13px;line-height:1.25;overflow-wrap:anywhere}
    .rn-badge{position:absolute;top:0;left:50%;transform:translate(-50%,-50%);background:var(--rn-pill);color:var(--rn-pill-fg);font-size:11px;font-weight:600;line-height:1;padding:6px 11px;border-radius:999px;white-space:nowrap;max-width:calc(100% - 16px);overflow:hidden;text-overflow:ellipsis;box-shadow:0 0 0 3px var(--rn-bg)}
    .rn-borderless .rn-badge{box-shadow:none}
    .rn-links{margin-top:12px;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px}
    .rn-chip{border:1px solid var(--rn-line);background:var(--rn-chip);color:var(--rn-fg);border-radius:999px;padding:6px 14px;min-height:36px;display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;max-width:100%;white-space:normal;text-align:left;text-decoration:none;cursor:pointer;outline:none}
    .rn-chip:not([href]){opacity:.67;cursor:default}
    .rn-chip ha-icon{--mdc-icon-size:18px;width:18px;height:18px;display:flex;flex:none;color:var(--rn-chip-icon)}
    .rn-empty{font-size:13px;line-height:1.5;color:var(--rn-muted);padding:15px 4px}
    a:focus-visible{outline:2px solid var(--rn-accent);outline-offset:2px}
    @container (max-width:519px){.rn-grid{--rn-cols:2}}
    @container (max-width:439px){.rn-shell:not(.rn-borderless){padding:12px;border-radius:20px}.rn-room{min-height:92px;padding:16px 8px 12px}.rn-room-icon ha-icon{--mdc-icon-size:24px;width:24px;height:24px}.rn-title{font-size:20px}.rn-chip{flex:1;justify-content:center}}
    @container (max-width:300px){.rn-room-name{font-size:11px}.rn-badge{font-size:10px;padding:5px 8px}}
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
      this._unsubPromises = [];
      this._darkMode = null;
      this._lang = null;
      this.shadowRoot.addEventListener('click', (event) => {
        const room = event.target.closest('a.rn-room[href]');
        // Do not interfere with modified clicks, new tabs or Home Assistant's router.
        if (!room || event.defaultPrevented || event.button !== 0 || event.ctrlKey ||
            event.metaKey || event.shiftKey || event.altKey) return;
        const y = Math.max(0, window.scrollY || 0);
        if (y < 8) { pendingRoomReturn = null; return; }
        const destination = new URL(room.href, window.location.href);
        if (destination.origin !== window.location.origin ||
            `${destination.pathname}${destination.search}` === dashboardPath()) return;
        pendingRoomReturn = { source: dashboardPath(), y, at: Date.now() };
      });
    }
    static getConfigElement() { return document.createElement(EDITOR_TAG); }
    static getStubConfig() { const { type, ...rest } = normalizeConfig(); return rest; }
    setConfig(config) { this._config = normalizeConfig(config); this._render(); }
    set hass(value) {
      const oldConnection = this._hass?.connection;
      this._hass = value;
      const dark = this._isDark();
      const lang = pickLang(this._config.language, value);
      if (dark !== this._darkMode || lang !== this._lang) { this._darkMode = dark; this._lang = lang; this._render(); }
      if (this.isConnected && (oldConnection !== value?.connection || (!this._areasLoaded && !this._areaError && !this._loadingAreas))) {
        this._loadAreas();
        if (oldConnection !== value?.connection) this._subscribe();
      }
    }
    connectedCallback() {
      this._loadAreas(); this._subscribe(); this._render();
      this._restoreScrollOnReturn();
    }
    _restoreScrollOnReturn() {
      const saved = pendingRoomReturn;
      if (!saved) return;
      if (saved.source !== dashboardPath()) {
        if (Date.now() - saved.at > 3 * 60 * 1000) pendingRoomReturn = null;
        return;
      }
      pendingRoomReturn = null; // One return only, including if native restoration succeeds.
      if (Date.now() - saved.at > 3 * 60 * 1000 || saved.y < 8) return;
      // HA restores history scroll on popstate. Act only if the viewport stayed at the top.
      const restoreIfNeeded = () => {
        if (!this.isConnected || dashboardPath() !== saved.source) return;
        if (window.scrollY < 8) window.scrollTo({ top: saved.y, behavior: 'auto' });
      };
      requestAnimationFrame(() => requestAnimationFrame(() => {
        restoreIfNeeded();
        // One bounded retry for dashboard sections mounting after the view itself.
        setTimeout(restoreIfNeeded, 160);
      }));
    }
    disconnectedCallback() {
      this._fetchSeq++;
      this._unsubPromises.forEach((p) => p.then((unsubscribe) => unsubscribe?.()).catch(() => {}));
      this._unsubPromises = [];
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
        this._areaError = 'area_err';
        this._areasLoaded = false;
        console.warn(`[${CARD_TAG}] Area registry:`, error);
      }
      this._loadingAreas = false;
      this._render();
    }
    _subscribe() {
      if (!this.isConnected || !this._hass?.connection?.subscribeEvents) return;
      this._unsubPromises.forEach((p) => p.then((fn) => fn?.()).catch(() => {}));
      this._unsubPromises = ['area_registry_updated', 'floor_registry_updated'].map((type) => {
        const p = this._hass.connection.subscribeEvents(() => this._loadAreas(), type);
        p.catch(() => {});
        return p;
      });
    }
    getCardSize() {
      const rows = Math.ceil(visibleAreas(this._areas, this._config).length / 2);
      return Math.max(2, Math.ceil((88 + rows * 112 + 48) / 50));
    }
    _render() {
      if (!this.isConnected) return;
      const cfg = this._config;
      CUR = pickLang(cfg.language, this._hass);
      this._lang = CUR;
      const rooms = visibleAreas(this._areas, cfg);
      const header = cfg.show_eyebrow || cfg.show_title
        ? `<header class="rn-heading">${cfg.show_eyebrow ? `<div class="rn-eyebrow">${escapeHtml(cfg.eyebrow)}</div>` : ''}
            ${cfg.show_title ? `<h2 class="rn-title">${escapeHtml(cardTitle(cfg))}<b>.</b></h2>` : ''}</header>` : '';
      let anyBadge = false;
      const tiles = rooms.map((r) => {
        const dest = path(cfg.area_paths[r.area_id]);
        const name = escapeHtml(r.name);
        const badge = cfg.show_badges ? badgeText(cfg, r) : '';
        if (badge) anyBadge = true;
        return `<a class="rn-room" data-area-id="${escapeHtml(r.area_id)}" ${dest ? `href="${escapeHtml(dest)}"` : `aria-disabled="true" title="${escapeHtml(T('set_page', { n: r.name }))}"`}
          aria-label="${escapeHtml(dest ? T('open', { n: r.name }) : T('unset', { n: r.name }))}">
          ${badge ? `<span class="rn-badge">${escapeHtml(badge)}</span>` : ''}
          <span class="rn-room-icon">${markupIcon(r.icon)}</span><span class="rn-room-name">${name}</span></a>`;
      }).join('');
      const links = cfg.links.filter((r) => r.show).map((r) => {
        const dest = path(r.path);
        return `<a class="rn-chip" ${dest ? `href="${escapeHtml(dest)}"` : `aria-disabled="true" title="${escapeHtml(T('link_unset'))}"`}>
          ${markupIcon(r.icon)}<span>${escapeHtml(linkName(r))}</span></a>`;
      }).join('');
      const status = this._areaError ? T(this._areaError) : (!this._areasLoaded ? T('loading') :
        (rooms.length ? '' : T('no_areas')));
      const dark = this._isDark();
      this.shadowRoot.innerHTML = `<style>${CARD_CSS}</style><div class="rn-container ${dark ? 'rn-dark' : 'rn-light'}" lang="${CUR}">
        <section class="rn-shell ${cfg.show_border ? '' : 'rn-borderless'}">
          ${header}${rooms.length ? `<div class="rn-grid ${anyBadge ? 'rn-has-badges' : ''}">${tiles}</div>` : ''}${status ? `<div class="rn-empty" role="status">${escapeHtml(status)}</div>` : ''}
          ${links ? `<nav class="rn-links" aria-label="${escapeHtml(T('links_aria'))}">${links}</nav>` : ''}
        </section></div>`;
      // Anchors use standard same-origin Home Assistant paths. Unconfigured items cannot navigate.
      this.shadowRoot.querySelectorAll('a[aria-disabled="true"]').forEach((a) => a.removeAttribute('href'));
    }
  }

  /* --------------------------------------------------------------- editor */
  // Same tabs, fields, checkboxes and section titles as Alarm Keeper Card.
  const EDITOR_CSS = `
    :host{display:block;color:var(--primary-text-color,#19221E);font-family:var(--ha-font-family-body,Roboto,Arial,sans-serif)}
    *,*:before,*:after{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
    .ed{font-size:14px}
    button,input,select{font:inherit;color:inherit}
    .tabs{display:flex;gap:5px;overflow-x:auto;padding-bottom:14px;border-bottom:1px solid var(--divider-color,#E1E5E1)}
    .tab{border:0;background:none;color:var(--secondary-text-color,#68716C);border-radius:13px;padding:10px 13px;white-space:nowrap;cursor:pointer}
    .tab[aria-pressed="true"]{color:var(--primary-text-color,#19221E);background:var(--secondary-background-color,#F1F3EF);font-weight:650}
    .heading{font-size:21px;font-weight:500;margin:25px 0 9px}
    .desc{color:var(--secondary-text-color,#68716C);font-size:13px;line-height:1.5;margin:0 0 20px}
    .field{display:block;margin:18px 0}
    .label{font-size:14px;margin-bottom:10px}
    .input{display:block;width:100%;background:var(--secondary-background-color,#F1F3EF);color:var(--primary-text-color,#19221E);border:0;border-bottom:1px solid var(--divider-color,#E1E5E1);padding:14px 13px;min-height:50px;border-radius:11px 11px 0 0}
    .row{border-bottom:1px solid var(--divider-color,#E1E5E1);padding:13px 0;display:flex;align-items:center;justify-content:space-between;gap:15px}
    .row label{flex:1;min-width:0}
    .row input[type=checkbox]{width:18px;height:18px;accent-color:var(--primary-color,#064E3B);flex:none}
    .muted{font-size:12px;line-height:1.5;color:var(--secondary-text-color,#68716C)}
    .tiny{font-size:11px;color:var(--secondary-text-color,#68716C);margin:9px 0}
    .action{background:var(--secondary-background-color,#F1F3EF);border:1px solid var(--divider-color,#E1E5E1);color:var(--primary-text-color,#19221E);padding:9px 13px;min-width:34px;border-radius:10px;cursor:pointer}
    .action:disabled{opacity:.45;cursor:not-allowed}
    .add{width:100%;margin:18px 0}
    .mod{border-bottom:1px solid var(--divider-color,#E1E5E1)}
    .mod summary{cursor:pointer;padding:16px 0;display:flex;gap:10px;align-items:center;list-style:none}
    .mod summary::-webkit-details-marker{display:none}
    .mod summary .nm{flex:1;min-width:0;font-weight:600;font-size:15px;overflow-wrap:anywhere}
    .mod summary small{color:var(--secondary-text-color,#68716C);font-size:12px}
    .mod summary ha-icon{--mdc-icon-size:20px;width:20px;height:20px;color:var(--primary-color,#064E3B);flex:none}
    .mb{padding:0 0 14px}
    .ctl{display:flex;gap:6px;flex-wrap:wrap;margin-top:14px}
    .input:focus-visible,.action:focus-visible,.tab:focus-visible,.view-option:focus-visible{outline:2px solid var(--primary-color,#064E3B);outline-offset:2px}
    ha-selector{display:block;width:100%}.fallback{display:none}
    .no-native .fallback{display:block}.no-native ha-selector{display:none}
    .no-native select.input[multiple]{min-height:125px}
    .view-search{margin-bottom:6px}
    .view-results{display:block;max-height:240px;overflow-y:auto;border:1px solid var(--divider-color,#E1E5E1);border-radius:10px;padding:4px;background:var(--card-background-color,var(--primary-background-color,#fff))}
    .view-option{display:flex;align-items:flex-start;gap:6px;width:100%;background:transparent;border:0;border-radius:7px;color:var(--primary-text-color,#19221E);padding:9px 10px;text-align:left;cursor:pointer}
    .view-option:hover{background:var(--secondary-background-color,#F1F3EF)}
    .view-option.is-selected{font-weight:650;color:var(--primary-color,#064E3B)}
    .view-option small{display:block;margin-top:2px;color:var(--secondary-text-color,#68716C);font-size:11px;overflow-wrap:anywhere}
    .view-empty{padding:10px;font-size:12px;color:var(--secondary-text-color,#68716C)}
    .manual-label{font-size:12px;margin:14px 0 5px;color:var(--secondary-text-color,#68716C)}
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
      this._fetchSeq = 0;
      this._unsubPromises = [];
      this._nativeTried = false;
      this.shadowRoot.addEventListener('click', (event) => this._click(event));
      this.shadowRoot.addEventListener('change', (event) => this._change(event));
      this.shadowRoot.addEventListener('input', (event) => this._input(event));
    }
    setConfig(raw) { this._config = normalizeConfig(raw); this._render(); }
    set hass(value) {
      const oldConn = this._hass?.connection;
      const oldLang = pickLang(this._config.language, this._hass);
      this._hass = value;
      this.shadowRoot.querySelectorAll('ha-selector').forEach((node) => { node.hass = value; });
      if (this.isConnected && oldConn !== value?.connection) { this._loadAreas(); this._loadViews(); this._subscribe(); }
      else if (this.isConnected && oldLang !== pickLang(this._config.language, value)) this._render();
    }
    connectedCallback() { this._render(); this._ensureNative(); this._loadAreas(); this._loadViews(); this._subscribe(); }
    disconnectedCallback() {
      this._fetchSeq++;
      this._viewFetchSeq++;
      this._unsubPromises.forEach((p) => p.then((unsubscribe) => unsubscribe?.()).catch(() => {}));
      this._unsubPromises = [];
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
        this._areaError = 'ed_area_err';
        console.warn(`[${EDITOR_TAG}] Area registry:`, error);
      }
      this._render();
    }
    async _loadViews() {
      if (!this.isConnected || !this._hass) return;
      const seq = ++this._viewFetchSeq;
      CUR = pickLang(this._config.language, this._hass);
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
      this._unsubPromises.forEach((p) => p.then((fn) => fn?.()).catch(() => {}));
      this._unsubPromises = ['area_registry_updated', 'floor_registry_updated'].map((type) => {
        const p = this._hass.connection.subscribeEvents(() => this._loadAreas(), type);
        p.catch(() => {});
        return p;
      });
    }
    _update(patch) {
      const next = normalizeConfig({ ...this._config, ...patch });
      if (JSON.stringify(next) === JSON.stringify(this._config)) return;
      const langChanged = next.language !== this._config.language;
      this._config = next;
      this.dispatchEvent(new CustomEvent('config-changed', {
        detail: { config: this._config }, bubbles: true, composed: true,
      }));
      this._render();
      if (langChanged) this._loadViews();
    }
    _field(label, inside, note = '') {
      return `<div class="field"><div class="label">${escapeHtml(label)}</div>${inside}${note ? `<p class="tiny">${escapeHtml(note)}</p>` : ''}</div>`;
    }
    _text(label, field, value, note = '', max = 60) {
      return this._field(label, `<input class="input" type="text" id="f-${field}" data-field="${field}" maxlength="${max}" value="${escapeHtml(value)}"/>`, note);
    }
    _toggle(label, field, value, desc = '') {
      const id = `t-${field}`.replace(/[^a-zA-Z0-9_-]/g, '_');
      return `<div class="row"><label for="${id}">${escapeHtml(label)}${desc ? `<div class="muted">${escapeHtml(desc)}</div>` : ''}</label>
        <input id="${id}" data-toggle="${escapeHtml(field)}" type="checkbox" ${value ? 'checked' : ''}/></div>`;
    }
    _select(label, field, options, value, note = '') {
      return this._field(label, `<select class="input" id="f-${field}" data-field="${field}">${options.map((o) =>
        `<option value="${escapeHtml(o[0])}" ${value === o[0] ? 'selected' : ''}>${escapeHtml(o[1])}</option>`).join('')}</select>`, note);
    }
    _destinationField(kind, id, name, current) {
      const attr = kind === 'area' ? 'data-area-path' : 'data-link-path';
      const key = `${kind}:${id}`;
      const currentPath = path(current);
      const known = this._views.some((view) => view.value === currentPath);
      const status = !this._views.length
        ? `<p class="muted">${escapeHtml(T('no_views'))}</p>`
        : currentPath && !known ? `<p class="muted">${escapeHtml(T('unknown_view'))}</p>` : '';
      return this._field(T('dest'),
        `<input class="input view-search" type="search" data-view-search="${escapeHtml(key)}"
          placeholder="${escapeHtml(T('search'))}" autocomplete="off"
          aria-label="${escapeHtml(T('search_for', { n: name }))}"/>
        <div class="view-results" data-view-results="${escapeHtml(key)}"></div>
        ${status}
        <div class="manual-label">${escapeHtml(T('saved'))}</div>
        <input class="input" type="text" ${attr}="${escapeHtml(id)}"
          value="${escapeHtml(current || '')}" maxlength="255" placeholder="/dashboard/nome-vista"/>
        ${currentPath ? `<p class="tiny">${escapeHtml(T('dest_now', { p: currentPath }))}</p>` : ''}`,
        T('dest_h'));
    }
    _roomsTab() {
      const cfg = this._config;
      const all = visibleAreas(this._areas, { ...cfg, show_all_areas: true, hidden_area_ids: [] });
      let html = `<div class="heading">${escapeHtml(T('tSt'))}</div><p class="desc">${escapeHtml(T('st_desc'))}</p>
        ${this._toggle(T('all_areas'), 'show_all_areas', cfg.show_all_areas, T('all_areas_h'))}`;
      if (!cfg.show_all_areas) {
        html += this._field(T('pick_areas'), `<div data-selector="areas"></div><div class="fallback"><select class="input" data-fallback-area multiple>
          ${this._areas.map((a) => `<option value="${escapeHtml(a.area_id)}" ${cfg.area_ids.includes(a.area_id) ? 'selected' : ''}>${escapeHtml(a.name)}</option>`).join('')}</select></div>`);
      }
      if (this._areaError) html += `<p class="muted">${escapeHtml(T(this._areaError))}</p>`;
      if (!all.length) html += `<p class="desc">${escapeHtml(T('no_area_list'))}</p>`;
      all.forEach((r, i) => {
        const visible = cfg.show_all_areas || cfg.area_ids.includes(r.area_id);
        const enabled = visible && !cfg.hidden_area_ids.includes(r.area_id);
        const custom = Object.prototype.hasOwnProperty.call(cfg.area_badges, r.area_id);
        const pillValue = custom ? cfg.area_badges[r.area_id] : r.floor;
        html += `<details class="mod" data-area-item="${escapeHtml(r.area_id)}"><summary>${markupIcon(r.icon)}<span class="nm">${escapeHtml(r.name)}</span><small>${escapeHtml(T(enabled ? 'vis' : 'hid'))}</small></summary>
          <div class="mb">
          ${this._toggle(T('show_area'), `area-visible-${r.area_id}`, enabled, T('show_area_h'))}
          ${this._destinationField('area', r.area_id, r.name, cfg.area_paths[r.area_id])}
          ${this._field(T('pill'), `<input class="input" type="text" data-area-badge="${escapeHtml(r.area_id)}" maxlength="24" value="${escapeHtml(pillValue || '')}" placeholder="${escapeHtml(T('pill_ph'))}"/>`,
            r.floor ? T('pill_floor', { f: r.floor }) : T('pill_nofloor'))}
          <div class="ctl"><button type="button" class="action" data-area-move="up" data-id="${escapeHtml(r.area_id)}" ${i === 0 ? 'disabled' : ''}>${escapeHtml(T('up'))}</button>
          <button type="button" class="action" data-area-move="down" data-id="${escapeHtml(r.area_id)}" ${i === all.length - 1 ? 'disabled' : ''}>${escapeHtml(T('down'))}</button>
          <button type="button" class="action" data-badge-reset="${escapeHtml(r.area_id)}" ${custom ? '' : 'disabled'}>${escapeHtml(T('reset_pill'))}</button></div></div></details>`;
      });
      return html;
    }
    _linksTab() {
      const cfg = this._config;
      let html = `<div class="heading">${escapeHtml(T('tLi'))}</div><p class="desc">${escapeHtml(T('li_desc'))}</p>`;
      cfg.links.forEach((item, i) => {
        const name = linkName(item);
        html += `<details class="mod" data-link-item="${escapeHtml(item.id)}"><summary>${markupIcon(item.icon)}<span class="nm">${escapeHtml(name)}</span><small>${escapeHtml(T(item.show ? 'on' : 'off'))}</small></summary>
          <div class="mb">
          ${this._toggle(T('show_link'), `link-show-${item.id}`, item.show)}
          ${this._field(T('name'), `<input class="input" type="text" data-link-name="${escapeHtml(item.id)}" value="${escapeHtml(name)}" maxlength="60"/>`)}
          ${this._field(T('icon'), `<div data-icon-slot="${escapeHtml(item.id)}"></div><div class="fallback"><input class="input" type="text" data-link-icon="${escapeHtml(item.id)}" value="${escapeHtml(item.icon)}" placeholder="mdi:home-outline"/></div>`)}
          ${this._destinationField('link', item.id, name, item.path)}
          <div class="ctl"><button type="button" class="action" data-link-move="up" data-id="${escapeHtml(item.id)}" ${i === 0 ? 'disabled' : ''}>${escapeHtml(T('up'))}</button>
          <button type="button" class="action" data-link-move="down" data-id="${escapeHtml(item.id)}" ${i === cfg.links.length - 1 ? 'disabled' : ''}>${escapeHtml(T('down'))}</button>
          <button type="button" class="action" data-link-remove="${escapeHtml(item.id)}">${escapeHtml(T('rm'))}</button></div></div></details>`;
      });
      html += `<button type="button" class="action add" data-add-link>${escapeHtml(T('add_link'))}</button>`;
      return html;
    }
    _appearanceTab() {
      const c = this._config;
      return `<div class="heading">${escapeHtml(T('tAs'))}</div>
        ${this._text(T('eyebrow'), 'eyebrow', c.eyebrow)}
        ${this._text(T('title'), 'title', cardTitle(c), T('title_h'))}
        ${this._toggle(T('show_eyebrow'), 'show_eyebrow', c.show_eyebrow)}
        ${this._toggle(T('show_title'), 'show_title', c.show_title)}
        ${this._toggle(T('show_badges'), 'show_badges', c.show_badges, T('show_badges_h'))}
        ${this._toggle(T('border'), 'show_border', c.show_border)}
        ${this._select(T('theme'), 'theme_mode', [['auto', T('th_auto')], ['light', 'Light Edera'], ['dark', 'Dark Edera']], c.theme_mode)}
        ${this._select(T('lang'), 'language', [['auto', T('lang_auto')], ...LANGS], c.language, T('lang_h'))}`;
    }
    _render() {
      if (!this.isConnected) return;
      CUR = pickLang(this._config.language, this._hass);
      const open = [...this.shadowRoot.querySelectorAll('details[open]')].map((e) => e.getAttribute('data-area-item') || e.getAttribute('data-link-item'));
      if (this._openAfter) { open.push(this._openAfter); this._openAfter = null; }
      const active = this.shadowRoot.activeElement;
      const focusKey = active ? ['id', 'data-area-badge', 'data-link-name', 'data-area-path', 'data-link-path']
        .map((a) => active.getAttribute(a) && `[${a}="${CSS.escape(active.getAttribute(a))}"]`).find(Boolean) : '';
      const tabs = [['stanze', T('tSt')], ['collegamenti', T('tLi')], ['aspetto', T('tAs')]];
      this.shadowRoot.innerHTML = `<style>${EDITOR_CSS}</style><div class="ed">
        <div class="tabs" role="group" aria-label="${escapeHtml(T('secs'))}">${tabs.map((t) =>
          `<button type="button" class="tab" data-tab="${t[0]}" aria-pressed="${this._tab === t[0]}">${escapeHtml(t[1])}</button>`).join('')}</div>
        ${this._tab === 'stanze' ? this._roomsTab() : this._tab === 'collegamenti' ? this._linksTab() : this._appearanceTab()}</div>`;
      this.shadowRoot.querySelectorAll('details').forEach((item) => {
        if (open.includes(item.getAttribute('data-area-item') || item.getAttribute('data-link-item'))) item.open = true;
      });
      this._attachNativeSelectors();
      if (focusKey) {
        const el = this.shadowRoot.querySelector(focusKey);
        if (el && !el.disabled) el.focus({ preventScroll: true });
      }
    }
    _attachNativeSelectors() {
      const native = !!customElements.get('ha-selector');
      const root = this.shadowRoot.querySelector('.ed');
      if (!native) root.classList.add('no-native');
      const areaSlot = root.querySelector('[data-selector="areas"]');
      if (areaSlot && native) {
        const selector = document.createElement('ha-selector');
        selector.hass = this._hass;
        selector.selector = { area: { multiple: true } };
        selector.value = this._config.area_ids;
        selector.setAttribute('aria-label', T('pick_areas'));
        selector.addEventListener('value-changed', (e) => {
          e.stopPropagation();
          if (!e.detail || !Object.prototype.hasOwnProperty.call(e.detail, 'value')) return;
          this._update({ area_ids: uniqueIds(e.detail.value) });
        });
        areaSlot.appendChild(selector);
      }
      root.querySelectorAll('[data-view-results]').forEach((results) => this._renderViewResults(results.dataset.viewResults, ''));
      if (!native) return;
      root.querySelectorAll('[data-icon-slot]').forEach((slot) => {
        const id = slot.getAttribute('data-icon-slot');
        const current = this._config.links.find((entry) => entry.id === id);
        if (!current) return;
        const selector = document.createElement('ha-selector');
        selector.hass = this._hass;
        selector.selector = { icon: {} };
        selector.value = current.icon;
        selector.setAttribute('aria-label', T('icon_for', { n: linkName(current) }));
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
      const term = String(query || '').trim().toLocaleLowerCase(CUR);
      const matches = this._views.filter((item) =>
        !term || `${item.label} ${item.value}`.toLocaleLowerCase(CUR).includes(term)).slice(0, 20);
      results.innerHTML = matches.length ? matches.map((item) =>
        `<button type="button" class="view-option ${current === item.value ? 'is-selected' : ''}"
          data-pick-view="${escapeHtml(key)}" data-pick-path="${escapeHtml(item.value)}">
          <span>${escapeHtml(item.label)}<small>${escapeHtml(item.value)}</small></span></button>`).join('')
        : `<div class="view-empty">${escapeHtml(T(this._views.length ? 'no_match' : 'no_view_list'))}</div>`;
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
      if (t.hasAttribute('data-add-link')) {
        const ids = new Set(this._config.links.map((item) => item.id));
        let i = 1; while (ids.has(`extra-${i}`)) i++;
        this._openAfter = `extra-${i}`;
        this._update({ links: [...this._config.links, { id: `extra-${i}`, name: '', icon: 'mdi:home-outline', path: '', show: true }] });
        return;
      }
      if (t.dataset.linkRemove) {
        this._update({ links: this._config.links.filter((item) => item.id !== t.dataset.linkRemove) }); return;
      }
      if (t.dataset.badgeReset) {
        const badges = { ...this._config.area_badges };
        delete badges[t.dataset.badgeReset];
        this._update({ area_badges: badges });
        return;
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
      if (t.dataset.field) {
        let value = t.value;
        // Typing the localized default title keeps it "default", so it still follows the language.
        if (t.dataset.field === 'title' && string(value, 60).replace(/\.+$/, '') === T('def_title')) value = '';
        this._update({ [t.dataset.field]: value });
        return;
      }
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
      if (t.dataset.areaBadge) {
        const id = t.dataset.areaBadge;
        const area = this._areas.find((a) => a.area_id === id);
        const value = string(t.value, 24);
        const badges = { ...this._config.area_badges };
        // Same text as the floor: no custom value, so later floor renames are followed.
        if (area && area.floor && value === area.floor) delete badges[id];
        else badges[id] = value;
        this._update({ area_badges: badges });
        return;
      }
      if (t.dataset.areaPath || t.dataset.linkPath) {
        const entered = t.value.trim();
        const validated = path(entered);
        if (entered && !validated) {
          t.setCustomValidity(T('bad_path'));
          t.reportValidity();
          return; // Never erase a previously valid destination after a bad paste.
        }
        t.setCustomValidity('');
        if (t.dataset.areaPath) this._update({ area_paths: { ...this._config.area_paths, [t.dataset.areaPath]: validated } });
        else this._modifyLink(t.dataset.linkPath, { path: validated });
        return;
      }
      if (t.dataset.linkName) {
        const id = t.dataset.linkName;
        let value = string(t.value, 60);
        // The localized default name stays "default" for Information and Climate.
        if (DEFAULT_LINK_KEYS[id] && value === T(DEFAULT_LINK_KEYS[id])) value = '';
        this._modifyLink(id, { name: value });
        return;
      }
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
      description: 'A modern room navigation card for Home Assistant with native areas, floor pills, optional shortcuts, four languages and Edera design.',
      preview: true,
    });
  }
})();
