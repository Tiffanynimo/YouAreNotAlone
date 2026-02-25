// emergency.js

// --- Initialize map ---
const map = L.map('map');
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Default view around Nairobi
map.setView([-1.286389, 36.817223], 12);

// Layers
const facilityMarkers = L.layerGroup().addTo(map);
const userMarkerLayer = L.layerGroup().addTo(map);

// --- Custom medical facility icon ---
const facilityIcon = L.icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/148/148753.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// --- Distance helpers ---
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

// --- Fetch facilities dynamically from Overpass API ---
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

  // Map raw data into facility objects
  const facilities = data.elements.map(el => ({
    name: el.tags.name || "Unnamed Facility",
    lat: el.lat,
    lng: el.lon,
    address: el.tags["addr:street"] || el.tags["addr:city"] || "No address available",
    type: el.tags.amenity || el.tags.healthcare || "Medical Facility"
  }));

  // Add distance
  facilities.forEach(f => {
    f.distanceKm = haversine({ lat, lng }, { lat: f.lat, lng: f.lng });
  });

  // Group + limit results
  const hospitals = facilities.filter(f => f.type === "hospital").sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 10);
  const clinics = facilities.filter(f => f.type === "clinic").sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 10);
  const pharmacies = facilities.filter(f => f.type === "pharmacy").sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 10);
  const doctors = facilities.filter(f => f.type === "doctors").sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 10);
  const centres = facilities.filter(f => f.type === "centre").sort((a, b) => a.distanceKm - b.distanceKm).slice(0, 10);

  return { hospitals, clinics, pharmacies, doctors, centres };
}

// --- UI feedback ---
const resultsEl = document.getElementById('results');
function showResults(origin, grouped) {
  userMarkerLayer.clearLayers();
  const userMarker = L.marker([origin.lat, origin.lng]).bindPopup('Selected location');
  userMarker.addTo(userMarkerLayer);

  facilityMarkers.clearLayers();

  // Combine all groups for map markers
  const allFacilities = [...grouped.hospitals, ...grouped.clinics, ...grouped.pharmacies, ...grouped.doctors, ...grouped.centres];
  allFacilities.forEach(c => {
    L.marker([c.lat, c.lng], { icon: facilityIcon })
      .bindPopup(`<b>${c.name}</b><br>${c.address}<br><i>${c.type}</i>`)
      .addTo(facilityMarkers);
  });

  if (allFacilities.length > 0) {
    const group = L.featureGroup([userMarker, ...allFacilities.map(c => L.marker([c.lat, c.lng], { icon: facilityIcon }))]);
    map.fitBounds(group.getBounds().pad(0.2));
  }

  // Update results list grouped by category
  resultsEl.innerHTML = `
    <h4>Nearest medical centres</h4>
    ${renderGroup("Hospitals", grouped.hospitals, origin)}
    ${renderGroup("Clinics", grouped.clinics, origin)}
    ${renderGroup("Pharmacies", grouped.pharmacies, origin)}
    ${renderGroup("Doctors", grouped.doctors, origin)}
    ${renderGroup("Health Centres", grouped.centres, origin)}
  `;

  // Button handlers
  resultsEl.querySelectorAll('button[data-lat]').forEach(btn => {
    btn.addEventListener('click', () => {
      const lat = parseFloat(btn.getAttribute('data-lat'));
      const lng = parseFloat(btn.getAttribute('data-lng'));
      map.setView([lat, lng], 15);
    });
  });
}

// Helper to render each group
function renderGroup(title, facilities, origin) {
  if (!facilities.length) return "";
  return `
    <h5>${title}</h5>
    <ol>
      ${facilities.map(c => `
        <li>
          <strong>${c.name}</strong> — ${c.address}
          <br><small>${c.type} • ${c.distanceKm.toFixed(2)} km away</small>
          <br><button class="btn btn-small" data-lat="${c.lat}" data-lng="${c.lng}">Show on map</button>
        </li>`).join('')}
    </ol>
  `;
}

// --- Use my location ---
const useLocationBtn = document.getElementById('use-location-btn');
if (useLocationBtn) {
  useLocationBtn.addEventListener('click', async () => {
    if (!navigator.geolocation) {
      resultsEl.textContent = 'Geolocation not supported.';
      return;
    }
    resultsEl.textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition(async pos => {
      const origin = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      const grouped = await fetchFacilities(origin.lat, origin.lng);
      showResults(origin, grouped);
    },
    () => { resultsEl.textContent = 'Location access denied or unavailable.'; },
    { enableHighAccuracy: true, timeout: 10000 });
  });
}

// --- Search by address (Nominatim) ---
const addressForm = document.getElementById('address-form');
if (addressForm) {
  addressForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = document.getElementById('address-input').value.trim();
    if (!q) return;
    resultsEl.textContent = 'Searching…';

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      const data = await res.json();
      if (!data.length) {
        resultsEl.textContent = 'No location found.';
        return;
      }

      // Show all possible matches
      resultsEl.innerHTML = `
        <h4>Search results for "${q}"</h4>
        <ol>
          ${data.map(place => `
            <li>
              ${place.display_name}
              <br><button class="btn btn-small" data-lat="${place.lat}" data-lng="${place.lon}">Select this location</button>
            </li>`).join('')}
        </ol>
      `;

      // Add event listeners for each result button
      resultsEl.querySelectorAll('button[data-lat]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const lat = parseFloat(btn.getAttribute('data-lat'));
          const lng = parseFloat(btn.getAttribute('data-lng'));
          const origin = { lat, lng };

          // Fetch grouped facilities near this location
          const grouped = await fetchFacilities(lat, lng);

          // Show facilities + distances
          showResults(origin, grouped);

          // Center map
          map.setView([lat, lng], 14);
        });
      });

    } catch {
      resultsEl.textContent = 'Search failed.';
    }
  });
}
