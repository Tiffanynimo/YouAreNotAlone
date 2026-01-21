// app.js
// Combined UI behavior + map integration for the Survivor Safe Space
// Fully integrated: navigation, copy, panic, directory filter, Leaflet map (with invalidateSize fix)

(() => {
  /* ---------------------------
     Utility & DOM helpers
     --------------------------- */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------------------------
     Section navigation
     --------------------------- */
  function initNavigation() {
    const navTriggers = $$('.sidebar-item, .action-btn, .resource-link');

    navTriggers.forEach(el => {
      el.addEventListener('click', (e) => {
        const target = el.dataset.section || el.getAttribute('href')?.replace('#','');
        if (!target) return;
        e.preventDefault();

        // Hide all main sections
        $$('.main-section').forEach(s => s.hidden = true);

        // Show target section
        const section = document.querySelector('#' + target + '-section');
        if (section) {
          section.hidden = false;
          window.scrollTo({ top: 0, behavior: 'smooth' });

          // If the map section was just shown, invalidate Leaflet size so tiles render
          // Accept both "map" target and explicit section id "map-section"
          if (target === 'map' || section.id === 'map-section') {
            // allow layout to settle then invalidate
            setTimeout(() => {
              if (window.appMap && typeof window.appMap.invalidateSize === 'function') {
                try {
                  window.appMap.invalidateSize();
                  // optional: ensure a sensible center/zoom after invalidation
                  if (typeof window.appMap.getCenter === 'function') {
                    // if map has no center (rare), set default Nairobi view
                    const c = window.appMap.getCenter();
                    if (!c || isNaN(c.lat) || isNaN(c.lng)) {
                      window.appMap.setView([-1.286389, 36.817223], 12);
                    }
                  }
                } catch (err) {
                  // swallow errors to avoid breaking navigation
                  // console.warn('invalidateSize failed', err);
                }
              }
            }, 200);
          }
        }

        // Update active sidebar item
        $$('.sidebar-item').forEach(i => i.classList.remove('active'));
        if (el.classList.contains('sidebar-item')) el.classList.add('active');
      });
    });
  }

  /* ---------------------------
     Copy to clipboard (delegated)
     --------------------------- */
  function initCopyToClipboard() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.copy-btn');
      if (!btn) return;
      const text = btn.dataset.copy;
      if (!text) return;

      navigator.clipboard?.writeText(text).then(() => {
        const original = btn.textContent;
        btn.textContent = 'Copied';
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = original || 'Copy';
          btn.disabled = false;
        }, 1500);
      }).catch(() => {
        // Fallback
        alert('Copy failed. Please copy manually: ' + text);
      });
    });
  }

  /* ---------------------------
     Panic exit, clear form, sign out placeholders
     --------------------------- */
  function initUtilityButtons() {
    const panicBtn = $('#panic-btn');
    if (panicBtn) {
      panicBtn.addEventListener('click', () => {
        // Quick redirect to neutral site
        window.location.href = 'https://www.google.com';
      });
    }

    const clearFormBtn = $('#clear-form');
    if (clearFormBtn) {
      clearFormBtn.addEventListener('click', () => {
        const form = document.querySelector('.request-form');
        if (form) form.reset();
      });
    }

    const signoutBtn = $('#signout-btn');
    if (signoutBtn) {
      signoutBtn.addEventListener('click', () => {
        // Placeholder: implement Firebase sign out in your app
        alert('Sign out (implement in app)');
      });
    }
  }

  /* ---------------------------
     Map & facility search (Leaflet + Overpass + Nominatim)
     --------------------------- */
  function initMapFeatures() {
    // Ensure map container exists
    const mapEl = $('#map');
    const resultsEl = $('#results');
    if (!mapEl || !resultsEl) return;

    // Initialize map and expose globally so other code can invalidate/recenter it
    const map = L.map('map');
    window.appMap = map;

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Default view around Nairobi
    map.setView([-1.286389, 36.817223], 12);

    // Layers
    const facilityMarkers = L.layerGroup().addTo(map);
    const userMarkerLayer = L.layerGroup().addTo(map);

    // Custom icon
    const facilityIcon = L.icon({
      iconUrl: 'https://cdn-icons-png.flaticon.com/512/148/148753.png',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });

    // Distance helpers
    function toRad(deg) { return deg * Math.PI / 180; }
    function haversine(a, b) {
      const R = 6371;
      const dLat = toRad(b.lat - a.lat);
      const dLng = toRad(b.lng - a.lng);
      const lat1 = toRad(a.lat);
      const lat2 = toRad(b.lat);
      const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
      return 2 * R * Math.asin(Math.sqrt(h));
    }

    // Fetch facilities from Overpass
    async function fetchFacilities(lat, lng, radius = 10000) {
      const query = `
        [out:json];
        (
          node(around:${radius},${lat},${lng})[amenity=hospital];
          node(around:${radius},${lat},${lng})[amenity=clinic];
          node(around:${radius},${lat},${lng})[amenity=doctors];
          node(around:${radius},${lat},${lng})[healthcare=centre];
          node(around:${radius},${lat},${lng})[amenity=pharmacy];
        );
        out;
      `;
      const url = "https://overpass-api.de/api/interpreter?data=" + encodeURIComponent(query);

      const res = await fetch(url);
      const data = await res.json();

      const facilities = (data.elements || []).map(el => ({
        id: el.id,
        name: el.tags?.name || "Unnamed Facility",
        lat: el.lat,
        lng: el.lon,
        address: el.tags?.["addr:street"] || el.tags?.["addr:city"] || el.tags?.["addr:full"] || "No address available",
        type: el.tags?.amenity || el.tags?.healthcare || "Medical Facility"
      }));

      facilities.forEach(f => {
        f.distanceKm = haversine({ lat, lng }, { lat: f.lat, lng: f.lng });
      });

      const hospitals = facilities.filter(f => f.type === "hospital").sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,10);
      const clinics = facilities.filter(f => f.type === "clinic").sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,10);
      const pharmacies = facilities.filter(f => f.type === "pharmacy").sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,10);
      const doctors = facilities.filter(f => f.type === "doctors").sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,10);
      const centres = facilities.filter(f => f.type === "centre").sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,10);

      return { hospitals, clinics, pharmacies, doctors, centres };
    }

    // Render helpers
    function escapeHtml(str = '') {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function renderGroup(title, facilities) {
      if (!facilities || facilities.length === 0) return '';
      return `
        <h5>${title}</h5>
        <ol>
          ${facilities.map(c => `
            <li>
              <strong>${escapeHtml(c.name)}</strong> — ${escapeHtml(c.address)}
              <br><small>${escapeHtml(c.type)} • ${c.distanceKm.toFixed(2)} km away</small>
              <br><button class="btn btn-small show-on-map" data-lat="${c.lat}" data-lng="${c.lng}">Show on map</button>
            </li>`).join('')}
        </ol>
      `;
    }

    function showResults(origin, grouped) {
      userMarkerLayer.clearLayers();
      const userMarker = L.marker([origin.lat, origin.lng]).bindPopup('Selected location');
      userMarker.addTo(userMarkerLayer);

      facilityMarkers.clearLayers();

      const allFacilities = [
        ...(grouped.hospitals || []),
        ...(grouped.clinics || []),
        ...(grouped.pharmacies || []),
        ...(grouped.doctors || []),
        ...(grouped.centres || [])
      ];

      allFacilities.forEach(c => {
        L.marker([c.lat, c.lng], { icon: facilityIcon })
          .bindPopup(`<b>${escapeHtml(c.name)}</b><br>${escapeHtml(c.address)}<br><i>${escapeHtml(c.type)}</i>`)
          .addTo(facilityMarkers);
      });

      if (allFacilities.length > 0) {
        const group = L.featureGroup([userMarker, ...allFacilities.map(c => L.marker([c.lat, c.lng], { icon: facilityIcon }))]);
        map.fitBounds(group.getBounds().pad(0.2));
      }

      resultsEl.innerHTML = `
        <h4>Nearest medical centres</h4>
        ${renderGroup("Hospitals", grouped.hospitals)}
        ${renderGroup("Clinics", grouped.clinics)}
        ${renderGroup("Pharmacies", grouped.pharmacies)}
        ${renderGroup("Doctors", grouped.doctors)}
        ${renderGroup("Health Centres", grouped.centres)}
      `;

      // Attach handlers for show-on-map buttons
      $$('.show-on-map', resultsEl).forEach(btn => {
        btn.addEventListener('click', () => {
          const lat = parseFloat(btn.getAttribute('data-lat'));
          const lng = parseFloat(btn.getAttribute('data-lng'));
          if (!isNaN(lat) && !isNaN(lng)) map.setView([lat, lng], 15);
        });
      });
    }

    // Use my location
    const useLocationBtn = $('#use-location-btn');
    if (useLocationBtn) {
      useLocationBtn.addEventListener('click', async () => {
        resultsEl.textContent = 'Locating…';
        if (!navigator.geolocation) {
          resultsEl.textContent = 'Geolocation not supported.';
          return;
        }
        navigator.geolocation.getCurrentPosition(async pos => {
          const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          try {
            const grouped = await fetchFacilities(origin.lat, origin.lng);
            showResults(origin, grouped);
          } catch (err) {
            resultsEl.textContent = 'Failed to fetch nearby facilities.';
          }
        }, () => {
          resultsEl.textContent = 'Location access denied or unavailable.';
        }, { enableHighAccuracy: true, timeout: 10000 });
      });
    }

    // Search by address (Nominatim)
    const addressForm = $('#address-form');
    if (addressForm) {
      addressForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const q = ($('#address-input')?.value || '').trim();
        if (!q) return;
        resultsEl.textContent = 'Searching…';
        try {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
          const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
          const data = await res.json();
          if (!data || !data.length) {
            resultsEl.textContent = 'No location found.';
            return;
          }

          resultsEl.innerHTML = `
            <h4>Search results for "${escapeHtml(q)}"</h4>
            <ol>
              ${data.map(place => `
                <li>
                  ${escapeHtml(place.display_name)}
                  <br><button class="btn btn-small select-place" data-lat="${place.lat}" data-lng="${place.lon}">Select this location</button>
                </li>`).join('')}
            </ol>
          `;

          // Attach handlers for each result
          $$('.select-place', resultsEl).forEach(btn => {
            btn.addEventListener('click', async () => {
              const lat = parseFloat(btn.getAttribute('data-lat'));
              const lng = parseFloat(btn.getAttribute('data-lng'));
              if (isNaN(lat) || isNaN(lng)) return;
              const origin = { lat, lng };
              resultsEl.textContent = 'Finding nearby facilities…';
              try {
                const grouped = await fetchFacilities(lat, lng);
                showResults(origin, grouped);
                map.setView([lat, lng], 14);
              } catch {
                resultsEl.textContent = 'Failed to fetch nearby facilities.';
              }
            });
          });

        } catch {
          resultsEl.textContent = 'Search failed.';
        }
      });
    }

    // If the map was created while hidden, ensure tiles render when it becomes visible
    // Also call invalidateSize once when map is ready (defensive)
    map.whenReady(() => {
      setTimeout(() => {
        try {
          map.invalidateSize();
        } catch (err) {
          // ignore
        }
      }, 250);
    });
  }

  /* ---------------------------
     Directory filter (client-side)
     --------------------------- */
  function initDirectoryFilter() {
    const filter = $('#dir-filter');
    const grid = $('#directory-grid');
    if (!filter || !grid) return;

    filter.addEventListener('change', () => {
      const val = filter.value;
      $$('.directory-card', grid).forEach(card => {
        const type = card.dataset.type || 'all';
        if (val === 'all' || val === type) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  /* ---------------------------
     Initialize everything on DOM ready
     --------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initCopyToClipboard();
    initUtilityButtons();
    initMapFeatures();
    initDirectoryFilter();

    // Small accessibility: ensure first visible section is dashboard
    const firstSection = document.querySelector('.main-section:not([hidden])');
    if (firstSection) firstSection.hidden = false;
  });

})();
