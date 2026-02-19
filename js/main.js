// assign the access token
mapboxgl.accessToken = 'pk.eyJ1Ijoid2lsbHNlbmVua28iLCJhIjoiY21oNm9tenlzMGxmNzJpb211eWN4OWhzMiJ9.CNtId7OzmVwm4EajEwdCGg';

// declare the map object
let map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/dark-v10',
    zoom: 10.5, // starting zoom
    center: [-122.4, 47.6062] // starting center
});

const layers = [
    '0-499',
    '500-999',
    '1000-1499',
    '1500-1999',
    '2000+'
];

const colors = [
    '#FFEDA0', 
    '#FED976',   
    '#FEB24C',   
    '#FD8D3C',   
    '#FC4E2A' 
];

const legend = document.getElementById('legend');
legend.innerHTML = "<b>Crime Counts <br> By Neighborhood</b><br><br>";

layers.forEach((layer, i) => {
    const color = colors[i];
    const item = document.createElement('div');
    const key = document.createElement('span');
    key.className = 'legend-key';
    key.style.backgroundColor = color;

    const value = document.createElement('span');
    value.innerHTML = `${layer}`;
    item.appendChild(key);
    item.appendChild(value);
    legend.appendChild(item);
});

let crime;
let neighborhood;

async function geojsonFetch() {

    map.on('load', async () => {

        const crimeResponse = await fetch('assets/spd_crime.geojson');
        crime = await crimeResponse.json();

        const hoodResponse = await fetch('assets/neighborhoods_with_counts.geojson');
        neighborhood = await hoodResponse.json();

        map.addSource('crime', { type: 'geojson', data: crime });
        map.addSource('neighborhood', { type: 'geojson', data: neighborhood });

        map.addLayer({
            id: 'neighborhood-layer',
            type: 'fill',
            source: 'neighborhood',
            paint: {
                'fill-color': [
                    'step',
                    ['get', 'crimeCount'],

                    '#FFEDA0',   
                    500,
                    '#FED976',   
                    1000,
                    '#FEB24C',   
                    1500,
                    '#FD8D3C',  
                    2000,
                    '#FC4E2A' 
                ],
                'fill-opacity': 0.7
            }
        });

        map.addLayer({
            id: 'neighborhood-layer-outline',
            type: 'line',
            source: 'neighborhood',
            paint: { 'line-color': 'white', 'line-width': 1 }
        });

        map.addLayer({
            id: 'crime-layer',
            type: 'circle',
            source: 'crime',
            layout: { visibility: 'none' }
        });

        buildCrimeChart(crime.features);

        map.on('click', 'neighborhood-layer', (e) => {
            const hood = e.features[0];
            map.setFilter('crime-layer', [
                'within', { type: 'Feature', geometry: hood.geometry }
            ]);
            map.setLayoutProperty('crime-layer', 'visibility', 'visible');

            const filtered = crime.features.filter(f =>
                f.geometry && turf.booleanPointInPolygon(f.geometry.coordinates, hood.geometry)
            );
            buildCrimeChart(filtered);

            const coords = e.lngLat;
            map.flyTo({ center: [coords.lng, coords.lat], zoom: 12 });
            document.getElementById('welcome').innerText = hood.properties.S_HOOD;
            document.getElementById('welcome').innerText += ", " +  hood.properties.L_HOOD + " Neighborhood";
        });
    });
}
// call the function
geojsonFetch();
// capture the element reset and add a click event to it.
const reset = document.getElementById('reset');
reset.addEventListener('click', event => {
    map.setFilter('crime-layer', null);
    map.setLayoutProperty('crime-layer', 'visibility', 'none');
    buildCrimeChart(crime.features);
    // this event will trigger the map fly to its origin location and zoom level.
    map.flyTo({
        zoom: 10.5, // starting zoom
        center: [-122.4, 47.6062] // starting center
    });
    document.getElementById('welcome').innerText = "To get started click on a Seattle Neighborhood!";
});

function buildCrimeChart(crimeFeatures) {
    document.getElementById('crime-count').innerText = crimeFeatures.length;
    // count by offense category
    const counts = {};
    crimeFeatures.forEach(f => {
    const type = f.properties['Offense Category'];
    counts[type] = (counts[type] || 0) + 1;
    });

    // sort by count descending
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

    const labels = ['type', ...sorted.map(d => d[0])];
    const values = ['count', ...sorted.map(d => d[1])];

    c3.generate({
        size: { height: 350, width: 460 },
        data: {
            x: 'type',
            columns: [labels, values],
            type: 'bar',
            names: { 'count': 'Crimes' }
        },
        tooltip: {
            format: {
                value: function(value) {
                    return value + ' crimes';
                }
            }
        },
        axis: {
            x: {
            type: 'category',
            tick: {
                rotate: 45,
                multiline: false
            }
            },
            y: { label: 'Count' }
        },
        legend: { show: false },
        bindto: '#crime-chart'
    });
}