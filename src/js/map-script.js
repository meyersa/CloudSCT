var map = L.map("map", { minZoom: 4, maxZoom: 10, scrollWheelZoom: false }).setView([37.09024, -95.712891], 3);
var light = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
  attribution:
    '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>',
}).addTo(map);

// Layer to hold current markers
var currentGeoJSONLayer = null;

var customIcon = L.divIcon({
  className: "leaflet-div-icon",
  html: '<i class="fa-solid fa-map-pin" style="color: #ff4d4d; font-size: 24px;"></i>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

// Function to load GeoJSON data from the endpoint
function loadGeoJSONData(filename) {
  fetch(`/get-data-file?filename=${filename}`)
    .then((response) => response.json())
    .then((data) => {
      if (currentGeoJSONLayer) {
        map.removeLayer(currentGeoJSONLayer);
      }

      // Add new GeoJSON layer
      currentGeoJSONLayer = L.geoJSON(data, {
        // Add icon
        pointToLayer: function (feature, latlng) {
          return L.marker(latlng, { icon: customIcon });
        },
        // Add popup
        onEachFeature: function (feature, layer) {
          layer.bindPopup(`
                <h3>${feature.properties.title}</h3>
                <p>${feature.properties.description}</p>
                <a href="${feature.properties.link}" target="_blank">Read more</a>
              `);
        },
      }).addTo(map);
    })
    .catch((error) => console.error("Error loading GeoJSON data:", error));
}

// Function to load available timestamps
function loadTimestamps() {
  fetch("/get-data-files")
    .then((response) => response.json())
    .then((timestamps) => {      
      createSlider(timestamps);

      // Load the first timestamp's data to display the initial layer
      if (timestamps.length > 0) {
        loadGeoJSONData(timestamps[0]); // Automatically load the first timestamp's data
      }
    })
    .catch((error) => console.error("Error loading timestamps:", error));
}

// Function to create the slider as a Leaflet control
function createSlider(timestamps) {
  // Create a custom control for the slider
  var sliderControl = L.control({ position: "topright" });

  // Add slider HTML to the custom control
  sliderControl.onAdd = function () {
    var sliderContainer = L.DomUtil.create("div", "leaflet-bar leaflet-control leaflet-control-slider");
    var sliderElement = L.DomUtil.create("input", "");
    var timeLabel = L.DomUtil.create("h3", "time-label");

    sliderElement.type = "range";
    sliderElement.min = 0;
    sliderElement.max = timestamps.length - 1;
    sliderElement.value = timestamps.length - 1;
    sliderElement.step = 1;

    updateTimeLabel(timeLabel, timestamps[timestamps.length - 1]);

    sliderElement.addEventListener("input", function () {
      var timestamp = timestamps[sliderElement.value];
      loadGeoJSONData(timestamp);
      updateTimeLabel(timeLabel, timestamp);
    });

    sliderContainer.appendChild(sliderElement);
    sliderContainer.appendChild(timeLabel);

    return sliderContainer;
  };

  // Add the control to the map
  sliderControl.addTo(map);
}

// Function to update the time label on the map
function updateTimeLabel(timeLabel, timestamp) {
  timeMatch = timestamp.match(new RegExp("data([0-9]{4})([0-9]{2})"));
  timeParsed = `${timeMatch[1]}-${timeMatch[2]}`;

  if (timeLabel) {
    timeLabel.innerHTML = timeParsed; // Display the timestamp as time (you can format this further if needed)
  }
}

// Load available timestamps and set up the slider
loadTimestamps();
