// Create map
const map = L.map('map').setView([33.8, 35.8], 8);

// Add geographic background
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Load your GeoJSON file
fetch('./frontline.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error('GeoJSON file not found');
        }
        return response.json();
    })
    .then(data => {

        const frontline = L.geoJSON(data, {

            style: function(feature) {
                const geometry = feature.geometry.type;

                if (geometry.includes('Polygon')) {
                    return {
                        color: '#ff3333',
                        weight: 2,
                        fillColor: '#ff3333',
                        fillOpacity: 0.3
                    };
                }

                return {
                    color: '#ff3333',
                    weight: 3
                };
            },

            onEachFeature: function(feature, layer) {
                const properties = feature.properties || {};
                const name = properties.name || properties.Name;

                if (name) {
                    layer.bindPopup(name);
                }
            }

        }).addTo(map);

        // Automatically zoom to your GeoJSON
        if (frontline.getBounds().isValid()) {
            map.fitBounds(frontline.getBounds());
        }

    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
        alert('Could not load frontline.geojson');
    });