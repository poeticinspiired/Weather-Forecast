document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    setupEventListeners();
    await loadWeatherData();
    initCharts();
    initMap();
    await initAIInsights();
    loadCommunityReports();
    setupCustomizableDashboard();
    initWeatherPatternAnalysis();
    setupMicroclimateDetection();
}

function setupEventListeners() {
    document.querySelector('.dashboard-toggle').addEventListener('click', toggleDashboard);
    document.getElementById('fetchHistoricalData').addEventListener('click', fetchHistoricalData);
    document.getElementById('submitReport').addEventListener('click', submitCommunityReport);
    
    document.querySelectorAll('.map-button').forEach(button => {
        button.addEventListener('click', () => toggleMapLayer(button.dataset.layer));
    });

    window.addEventListener('resize', debounce(handleResize, 250));
}

const API_KEY = 'aec86192931a0092f126a0fba5c624de';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

const weatherCache = new Map();
const cacheExpiration = 5 * 60 * 1000; // 5 minutes

async function fetchWeatherData(endpoint, params = {}) {
    const cacheKey = `${endpoint}-${JSON.stringify(params)}`;
    const cachedData = weatherCache.get(cacheKey);

    if (cachedData && Date.now() - cachedData.timestamp < cacheExpiration) {
        return cachedData.data;
    }

    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.append('appid', API_KEY);
    url.searchParams.append('units', 'metric');
    
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        weatherCache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
    } catch (error) {
        console.error("Could not fetch weather data:", error);
        return null;
    }
}

async function loadWeatherData() {
    const { lat, lon } = await getUserLocation();
    const [currentWeather, forecast, airQuality] = await Promise.all([
        fetchWeatherData('weather', { lat, lon }),
        fetchWeatherData('forecast', { lat, lon }),
        fetchWeatherData('air_pollution', { lat, lon })
    ]);

    updateCurrentWeather(currentWeather);
    updateHourlyForecast(forecast.list.slice(0, 24));
    updatePrecipitation(forecast.list.slice(0, 12));
    await updateDailyForecast(lat, lon);
    await updateHealthMetrics(lat, lon, airQuality);
    initMap(lat, lon);
}

function updateCurrentWeather(data) {
    document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°C`;
    document.getElementById('weatherDescription').textContent = data.weather[0].description;
    document.querySelector('[data-tooltip="Wind Speed"] p').textContent = `${data.wind.speed} m/s`;
    document.querySelector('[data-tooltip="Humidity"] p').textContent = `${data.main.humidity}%`;
    document.querySelector('[data-tooltip="Pressure"] p').textContent = `${data.main.pressure} hPa`;
    updateWeatherAnimation(data.weather[0].id);
}

function updateWeatherAnimation(weatherId) {
    const animationContainer = document.getElementById('weatherAnimation');
    animationContainer.innerHTML = '';
    
    const animation = getWeatherAnimation(weatherId);
    animationContainer.appendChild(animation);
}

function getWeatherAnimation(weatherId) {
    // Implement complex SVG or Canvas-based weather animations
    // This is a placeholder implementation
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "100");
    svg.setAttribute("height", "100");
    
    // Add animated elements based on weatherId
    // ...

    return svg;
}

function updateHourlyForecast(data) {
    const hourlyForecast = document.getElementById('hourlyForecast');
    hourlyForecast.innerHTML = '';
    data.forEach(item => {
        const hourElement = document.createElement('div');
        hourElement.className = 'forecast-item';
        hourElement.innerHTML = `
            <p>${new Date(item.dt * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            <img src="http://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="${item.weather[0].description}">
            <p>${Math.round(item.main.temp)}°C</p>
            <p>Humidity: ${item.main.humidity}%</p>
            <p>Wind: ${item.wind.speed} m/s</p>
            <p>${item.weather[0].description}</p>
            <p>Feels like: ${Math.round(item.main.feels_like)}°C</p>
            <p>Pressure: ${item.main.pressure} hPa</p>
            <p>Visibility: ${item.visibility / 1000} km</p>
        `;
        hourlyForecast.appendChild(hourElement);
    });

    // Add hourly temperature chart
    const ctx = document.getElementById('hourlyTempChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => new Date(item.dt * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})),
            datasets: [{
                label: 'Temperature (°C)',
                data: data.map(item => item.main.temp),
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });

    // Add machine learning-based trend analysis
    const trends = analyzeHourlyTrends(data);
    displayHourlyTrends(trends);
}

function analyzeHourlyTrends(data) {
    // Implement sophisticated trend analysis using machine learning techniques
    // This is a placeholder implementation
    const temperatures = data.map(item => item.main.temp);
    const trend = temperatures.reduce((a, b) => a + b, 0) / temperatures.length > temperatures[0] ? 'rising' : 'falling';
    return { temperature: trend };
}

function displayHourlyTrends(trends) {
    const trendContainer = document.getElementById('hourlyTrends');
    trendContainer.innerHTML = `<p>Temperature trend: ${trends.temperature}</p>`;
}

async function updateDailyForecast(lat, lon) {
    const forecast = await fetchWeatherData('onecall', { lat, lon, exclude: 'current,minutely,hourly,alerts' });
    const dailyForecast = document.getElementById('dailyForecast');
    dailyForecast.innerHTML = '';
    forecast.daily.slice(0, 10).forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'forecast-item';
        dayElement.innerHTML = `
            <p>${new Date(day.dt * 1000).toLocaleDateString([], {weekday: 'short'})}</p>
            <img src="http://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="${day.weather[0].description}">
            <p>H: ${Math.round(day.temp.max)}°C L: ${Math.round(day.temp.min)}°C</p>
            <p>Precipitation: ${day.pop * 100}%</p>
            <p>${day.weather[0].description}</p>
        `;
        dailyForecast.appendChild(dayElement);
    });

    // Add seasonal analysis
    const seasonalPatterns = analyzeSeasonalPatterns(forecast.daily);
    displaySeasonalPatterns(seasonalPatterns);
}

function analyzeSeasonalPatterns(dailyData) {
    // Implement complex seasonal pattern recognition
    // This is a placeholder implementation
    const avgTemp = dailyData.reduce((sum, day) => sum + day.temp.day, 0) / dailyData.length;
    return { averageTemperature: avgTemp };
}

function displaySeasonalPatterns(patterns) {
    const patternContainer = document.getElementById('seasonalPatterns');
    patternContainer.innerHTML = `<p>Average temperature for the period: ${patterns.averageTemperature.toFixed(1)}°C</p>`;
}

function updatePrecipitation(data) {
    const precipData = data.map(item => ({
        time: new Date(item.dt * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        rain: item.rain ? item.rain['3h'] || 0 : 0,
        snow: item.snow ? item.snow['3h'] || 0 : 0,
        probability: item.pop * 100
    }));

    const ctx = document.getElementById('precipChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: precipData.map(item => item.time),
            datasets: [
                {
                    label: 'Rain (mm)',
                    data: precipData.map(item => item.rain),
                    backgroundColor: 'rgba(0, 0, 255, 0.5)'
                },
                {
                    label: 'Snow (mm)',
                    data: precipData.map(item => item.snow),
                    backgroundColor: 'rgba(255, 255, 255, 0.5)'
                },
                {
                    label: 'Probability (%)',
                    data: precipData.map(item => item.probability),
                    type: 'line',
                    borderColor: 'rgba(255, 0, 0, 0.5)',
                    fill: false
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Update precipitation types
    const precipTypes = document.getElementById('precipTypes');
    precipTypes.innerHTML = `
        <p>Rain: ${precipData.reduce((sum, item) => sum + item.rain, 0).toFixed(2)} mm</p>
        <p>Snow: ${precipData.reduce((sum, item) => sum + item.snow, 0).toFixed(2)} mm</p>
        <p>Average Probability: ${(precipData.reduce((sum, item) => sum + item.probability, 0) / precipData.length).toFixed(2)}%</p>
    `;

    // Add filtering options
    const filterContainer = document.createElement('div');
    filterContainer.className = 'precipitation-filters';
    filterContainer.innerHTML = `
        <label>
            <input type="checkbox" id="filterRain" checked> Rain
        </label>
        <label>
            <input type="checkbox" id="filterSnow" checked> Snow
        </label>
        <label>
            Probability: <input type="range" id="probabilityFilter" min="0" max="100" value="0">
            <span id="probabilityValue">0%</span>
        </label>
    `;
    document.querySelector('.precipitation').prepend(filterContainer);

    // Add event listeners for filters
    document.getElementById('filterRain').addEventListener('change', updatePrecipitationChart);
    document.getElementById('filterSnow').addEventListener('change', updatePrecipitationChart);
    document.getElementById('probabilityFilter').addEventListener('input', updatePrecipitationChart);

    function updatePrecipitationChart() {
        const showRain = document.getElementById('filterRain').checked;
        const showSnow = document.getElementById('filterSnow').checked;
        const minProbability = parseInt(document.getElementById('probabilityFilter').value);
        document.getElementById('probabilityValue').textContent = `${minProbability}%`;

        // Update chart data based on filters
        // ... (implement filtering logic here)
    }

    // Add advanced precipitation type prediction
    const precipitationTypes = predictPrecipitationTypes(data);
    displayPrecipitationTypes(precipitationTypes);
}

function predictPrecipitationTypes(data) {
    // Implement sophisticated precipitation type prediction algorithm
    // This is a placeholder implementation
    return data.map(item => ({
        time: new Date(item.dt * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        type: item.main.temp > 0 ? 'rain' : 'snow',
        intensity: item.pop > 0.5 ? 'heavy' : 'light'
    }));
}

function displayPrecipitationTypes(types) {
    const typeContainer = document.getElementById('precipitationTypes');
    typeContainer.innerHTML = types.map(type => 
        `<p>${type.time}: ${type.intensity} ${type.type}</p>`
    ).join('');
}

async function updateHealthMetrics(lat, lon, airQuality) {
    try {
        const uvData = await fetchWeatherData('onecall', { lat, lon, exclude: 'minutely,hourly,daily,alerts' });

        const healthMetrics = document.getElementById('pollenCount');
        healthMetrics.innerHTML = `
            <h3>Health Metrics</h3>
            <div class="health-metric">
                <span class="metric-label">UV Index:</span>
                <span class="metric-value">${uvData.current.uvi || 'N/A'}</span>
                <span class="metric-description">${getUVDescription(uvData.current.uvi)}</span>
            </div>
            <div class="health-metric">
                <span class="metric-label">Air Quality Index:</span>
                <span class="metric-value">${airQuality.list[0].main.aqi || 'N/A'}</span>
                <span class="metric-description">${getAQIDescription(airQuality.list[0].main.aqi)}</span>
            </div>
            <div class="health-metric">
                <span class="metric-label">PM2.5:</span>
                <span class="metric-value">${airQuality.list[0].components.pm2_5 || 'N/A'} μg/m³</span>
            </div>
            <div class="health-metric">
                <span class="metric-label">PM10:</span>
                <span class="metric-value">${airQuality.list[0].components.pm10 || 'N/A'} μg/m³</span>
            </div>
            <div class="health-metric">
                <span class="metric-label">Ozone:</span>
                <span class="metric-value">${airQuality.list[0].components.o3 || 'N/A'} μg/m³</span>
            </div>
        `;

        // Add pollen data if available
        try {
            const pollenData = await fetchWeatherData('pollen', { lat, lon });
            healthMetrics.innerHTML += `
                <div class="health-metric">
                    <span class="metric-label">Pollen Count:</span>
                    <span class="metric-value">${pollenData.pollen_level || 'N/A'}</span>
                </div>
            `;
        } catch (error) {
            console.error('Error fetching pollen data:', error);
        }

        // Update AQI display
        const aqiValue = document.getElementById('aqiValue');
        const aqiLabel = document.getElementById('aqiLabel');
        const aqiIndicator = document.getElementById('aqiIndicator');
        const aqi = airQuality.list[0].main.aqi;
        aqiValue.textContent = aqi;
        aqiLabel.textContent = getAQILabel(aqi);
        aqiIndicator.style.left = `${(aqi / 5) * 100}%`;

        // Update UV Index display
        const uvValue = document.getElementById('uvValue');
        const uvLabel = document.getElementById('uvLabel');
        const uvIndicator = document.getElementById('uvIndicator');
        const uvi = uvData.current.uvi;
        uvValue.textContent = uvi;
        uvLabel.textContent = getUVLabel(uvi);
        uvIndicator.style.left = `${(uvi / 11) * 100}%`;

        // Add pollen prediction model
        const pollenPrediction = await predictPollenLevels(lat, lon);
        displayPollenPrediction(pollenPrediction);
    } catch (error) {
        console.error('Error updating health metrics:', error);
        document.getElementById('pollenCount').innerHTML = '<p>Failed to load health metrics. Please try again later.</p>';
    }
}

async function predictPollenLevels(lat, lon) {
    // Implement a sophisticated pollen prediction model
    // This is a placeholder implementation
    const seasonalData = await fetchWeatherData('forecast', { lat, lon, cnt: 30 });
    const avgTemp = seasonalData.list.reduce((sum, item) => sum + item.main.temp, 0) / seasonalData.list.length;
    return avgTemp > 15 ? 'high' : 'low';
}

function displayPollenPrediction(prediction) {
    const pollenContainer = document.getElementById('pollenPrediction');
    pollenContainer.innerHTML = `<p>Predicted pollen level: ${prediction}</p>`;
}

function getAQILabel(aqi) {
    if (aqi <= 1) return 'Good';
    if (aqi <= 2) return 'Fair';
    if (aqi <= 3) return 'Moderate';
    if (aqi <= 4) return 'Poor';
    return 'Very Poor';
}

function getAQIDescription(aqi) {
    if (aqi <= 1) return 'Air quality is satisfactory, and air pollution poses little or no risk.';
    if (aqi <= 2) return 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.';
    if (aqi <= 3) return 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.';
    if (aqi <= 4) return 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.';
    return 'Health alert: The risk of health effects is increased for everyone.';
}

function getUVLabel(uvi) {
    if (uvi <= 2) return 'Low';
    if (uvi <= 5) return 'Moderate';
    if (uvi <= 7) return 'High';
    if (uvi <= 10) return 'Very High';
    return 'Extreme';
}

function getUVDescription(uvi) {
    if (uvi <= 2) return 'No protection required. You can safely stay outside.';
    if (uvi <= 5) return 'Protection required. Seek shade during midday hours and use sunscreen.';
    if (uvi <= 7) return 'Protection essential. Reduce time in the sun between 10 a.m. and 4 p.m.';
    if (uvi <= 10) return 'Extra protection needed. Avoid being outside during midday hours.';
    return 'Take all precautions. Unprotected skin can burn in minutes.';
}

function initCharts() {
    // Additional charts can be initialized here
}

let map;
let currentLayer;

function initMap(lat, lon) {
    map = L.map('weatherMap').setView([lat, lon], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Initialize with temperature layer
    toggleMapLayer('temperature');

    // Add zoom controls
    map.addControl(L.control.zoom());

    // Add advanced map features
    addMicroclimateLayers(map, lat, lon);
    initializeWeatherRadar(map, lat, lon);
}

function toggleMapLayer(layer) {
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }

    switch (layer) {
        case 'temperature':
            currentLayer = L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`).addTo(map);
            break;
        case 'precipitation':
            currentLayer = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`).addTo(map);
            break;
        case 'wind':
            currentLayer = L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${API_KEY}`).addTo(map);
            break;
        case 'pressure':
            currentLayer = L.tileLayer(`https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${API_KEY}`).addTo(map);
            break;
        case 'satellite':
            currentLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
                attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
            }).addTo(map);
            break;
        case 'disasters':
            showDisasterPlaceholder();
            return;
        default:
            console.error('Unknown layer:', layer);
            return;
    }

    console.log(`Toggled ${layer} layer`);
}

function showDisasterPlaceholder() {
    if (currentLayer) {
        map.removeLayer(currentLayer);
    }

    const marker = L.marker([43.2557, -79.8711]).addTo(map);
    marker.bindPopup("Disaster information would be shown here. This is a placeholder.").openPopup();

    currentLayer = marker;
}

function addMicroclimateLayers(map, lat, lon) {
    // Implement microclimate detection and visualization
    // This is a placeholder implementation
    const microclimateLayers = L.layerGroup().addTo(map);
    // Add microclimate polygons or heatmaps based on terrain and urban features
    // ...
}

function initializeWeatherRadar(map, lat, lon) {
    // Implement an animated weather radar overlay
    // This is a placeholder implementation
    const radarLayer = L.imageOverlay('path/to/radar/image.png', 
        [[lat - 1, lon - 1], [lat + 1, lon + 1]], 
        {opacity: 0.5}
    ).addTo(map);
    // Animate the radar layer
    // ...
}

function setupCustomizableDashboard() {
    const dashboardOptions = document.querySelector('.dashboard-options');
    const sections = ['hourly-forecast', 'daily-forecast', 'precipitation', 'health-metrics', 'weather-map', 'historical-data', 'ai-insights', 'community-reports'];

    sections.forEach(section => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `toggle-${section}`;
        checkbox.checked = true;

        const label = document.createElement('label');
        label.htmlFor = `toggle-${section}`;
        label.textContent = section.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());

        checkbox.addEventListener('change', () => {
            document.querySelector(`.${section}`).style.display = checkbox.checked ? 'block' : 'none';
        });

        dashboardOptions.appendChild(checkbox);
        dashboardOptions.appendChild(label);
    });

    // Add advanced customization options
    implementDragAndDrop();
    addWidgetCustomization();
}

function implementDragAndDrop() {
    // Implement drag and drop functionality for dashboard widgets
    // This is a placeholder implementation
    // Use a library like interact.js or implement custom drag and drop logic
    // ...
}

function addWidgetCustomization() {
    // Allow users to customize individual widgets
    // This is a placeholder implementation
    document.querySelectorAll('.widget').forEach(widget => {
        const customizeButton = document.createElement('button');
        customizeButton.textContent = 'Customize';
        customizeButton.addEventListener('click', () => openWidgetCustomizationModal(widget));
        widget.appendChild(customizeButton);
    });
}

function openWidgetCustomizationModal(widget) {
    // Open a modal with widget customization options
    // This is a placeholder implementation
    alert(`Customizing widget: ${widget.id}`);
    // Implement actual customization logic
    // ...
}

function initWeatherPatternAnalysis() {
    // Implement advanced weather pattern analysis
    // This is a placeholder implementation
    setInterval(analyzeWeatherPatterns, 60000); // Run analysis every minute
}

function analyzeWeatherPatterns() {
    // Perform complex pattern analysis on recent weather data
    // This is a placeholder implementation
    console.log('Analyzing weather patterns...');
    // Implement actual pattern analysis logic
    // ...
}

function setupMicroclimateDetection() {
    // Set up microclimate detection based on user reports and sensor data
    // This is a placeholder implementation
    setInterval(detectMicroclimates, 300000); // Check for microclimates every 5 minutes
}

function detectMicroclimates() {
    // Analyze user reports and sensor data to detect microclimates
    // This is a placeholder implementation
    console.log('Detecting microclimates...');
    // Implement actual microclimate detection logic
    // ...
}

// Utility functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function handleResize() {
    // Handle responsive design adjustments
    console.log('Handling resize...');
    // Implement responsive design logic
    // ...
}

async function getUserLocation() {
    return new Promise((resolve, reject) => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                position => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
                error => {
                    console.error("Error getting user location:", error);
                    resolve({ lat: 43.2557, lon: -79.8711 }); // Default to Hamilton, ON
                }
            );
        } else {
            console.log("Geolocation is not available");
            resolve({ lat: 43.2557, lon: -79.8711 }); // Default to Hamilton, ON
        }
    });
}

async function fetchHistoricalData() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;

    if (!startDate || !endDate) {
        alert('Please enter both start and end dates.');
        return;
    }

    const historicalData = await fetchWeatherData('history/city', {
        lat: 43.2557,
        lon: -79.8711,
        start: Math.floor(new Date(startDate).getTime() / 1000),
        end: Math.floor(new Date(endDate).getTime() / 1000),
        type: 'hour'
    });

    if (historicalData && historicalData.list && historicalData.list.length > 0) {
        displayHistoricalData(historicalData.list);

        // Add climate change impact analysis
        const climateChangeImpact = analyzeClimateChangeImpact(historicalData.list, await fetchWeatherData('forecast', { lat: 43.2557, lon: -79.8711 }).then(data => data.list));
        displayClimateChangeImpact(climateChangeImpact);
    } else {
        alert('No historical data available for the selected date range.');
    }
}

function displayHistoricalData(data) {
    const historicalDataContainer = document.getElementById('historicalData');
    // Add drag and drop functionality for rearranging elements
    const container = document.querySelector('.container');
    new Sortable(container, {
        animation: 150,
        handle: '.section-handle', // Add a

# Clicked Code Block to apply Changes From

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    setupEventListeners();
    await loadWeatherData();
    initCharts();
    initMap();
    await initAIInsights();
    loadCommunityReports();
    setupCustomizableDashboard();
}

function setupEventListeners() {
    document.querySelector('.dashboard-toggle').addEventListener('click', toggleDashboard);
    document.getElementById('fetchHistoricalData').addEventListener('click', fetchHistoricalData);
    document.getElementById('submitReport').addEventListener('click', submitCommunityReport);
    
    document.querySelectorAll('.map-button').forEach(button => {
        button.addEventListener('click', () => toggleMapLayer(button.dataset.layer));
    });
}

const API_KEY = 'aec86192931a0092f126a0fba5c624de';
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

async function fetchWeatherData(endpoint, params = {}) {
    const url = new URL(`${BASE_URL}/${endpoint}`);
    url.searchParams.append('appid', API_KEY);
    url.searchParams.append('units', 'metric');
    
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Could not fetch weather data:", error);
        return null;
    }
}

async function loadWeatherData() {
    const lat = 43.2557; // Hamilton, ON latitude
    const lon = -79.8711; // Hamilton, ON longitude

    const currentWeather = await fetchWeatherData('weather', { lat, lon });
    updateCurrentWeather(currentWeather);

    const forecast = await fetchWeatherData('forecast', { lat, lon });
    updateHourlyForecast(forecast.list.slice(0, 24));
    updatePrecipitation(forecast.list.slice(0, 12));

    await updateDailyForecast(lat, lon);
    await updateHealthMetrics(lat, lon);

    initMap();
}

function updateCurrentWeather(data) {
    document.getElementById('temperature').textContent = `${Math.round(data.main.temp)}°C`;
    document.getElementById('weatherDescription').textContent = data.weather[0].description;
    document.querySelector('[data-tooltip="Wind Speed"] p').textContent = `${data.wind.speed} m/s`;
    document.querySelector('[data-tooltip="Humidity"] p').textContent = `${data.main.humidity}%`;
    document.querySelector('[data-tooltip="Pressure"] p').textContent = `${data.main.pressure} hPa`;
}

function updateHourlyForecast(data) {
    const hourlyForecast = document.getElementById('hourlyForecast');
    hourlyForecast.innerHTML = '';
    data.forEach(item => {
        const hourElement = document.createElement('div');
        hourElement.className = 'forecast-item';
        hourElement.innerHTML = `
            <p>${new Date(item.dt * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            <img src="http://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="${item.weather[0].description}">
            <p>${Math.round(item.main.temp)}°C</p>
            <p>Humidity: ${item.main.humidity}%</p>
            <p>Wind: ${item.wind.speed} m/s</p>
            <p>${item.weather[0].description}</p>
            <p>Feels like: ${Math.round(item.main.feels_like)}°C</p>
            <p>Pressure: ${item.main.pressure} hPa</p>
            <p>Visibility: ${item.visibility / 1000} km</p>
        `;
        hourlyForecast.appendChild(hourElement);
    });

    // Add hourly temperature chart
    const ctx = document.getElementById('hourlyTempChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(item => new Date(item.dt * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})),
            datasets: [{
                label: 'Temperature (°C)',
                data: data.map(item => item.main.temp),
                borderColor: 'rgb(255, 99, 132)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

async function updateDailyForecast(lat, lon) {
    const forecast = await fetchWeatherData('onecall', { lat, lon, exclude: 'current,minutely,hourly,alerts' });
    const dailyForecast = document.getElementById('dailyForecast');
    dailyForecast.innerHTML = '';
    forecast.daily.slice(0, 10).forEach(day => {
        const dayElement = document.createElement('div');
        dayElement.className = 'forecast-item';
        dayElement.innerHTML = `
            <p>${new Date(day.dt * 1000).toLocaleDateString([], {weekday: 'short'})}</p>
            <img src="http://openweathermap.org/img/wn/${day.weather[0].icon}.png" alt="${day.weather[0].description}">
            <p>H: ${Math.round(day.temp.max)}°C L: ${Math.round(day.temp.min)}°C</p>
            <p>Precipitation: ${day.pop * 100}%</p>
            <p>${day.weather[0].description}</p>
        `;
        dailyForecast.appendChild(dayElement);
    });
}

function updatePrecipitation(data) {
    const precipData = data.map(item => ({
        time: new Date(item.dt * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        rain: item.rain ? item.rain['3h'] || 0 : 0,
        snow: item.snow ? item.snow['3h'] || 0 : 0,
        probability: item.pop * 100
    }));

    const ctx = document.getElementById('precipChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: precipData.map(item => item.time),
            datasets: [
                {
                    label: 'Rain (mm)',
                    data: precipData.map(item => item.rain),
                    backgroundColor: 'rgba(0, 0, 255, 0.5)'
                },
                {
                    label: 'Snow (mm)',
                    data: precipData.map(item => item.snow),
                    backgroundColor: 'rgba(255, 255, 255, 0.5)'
                },
                {
                    label: 'Probability (%)',
                    data: precipData.map(item => item.probability),
                    type: 'line',
                    borderColor: 'rgba(255, 0, 0, 0.5)',
                    fill: false
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Update precipitation types
    const precipTypes = document.getElementById('precipTypes');
    precipTypes.innerHTML = `
        <p>Rain: ${precipData.reduce((sum, item) => sum + item.rain, 0).toFixed(2)} mm</p>
    try {
        const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(endDate).getTime() / 1000);

        // Improve date range functionality
        const days = (endTimestamp - startTimestamp) / (24 * 60 * 60);
        if (days > 5) {
            alert('Historical data is limited to a 5-day range. Please adjust your dates.');
            return;
        }

        // Fetch historical data
        const historicalData = await fetchWeatherData('forecast', { lat, lon, dt: startTimestamp });

        // Update historical chart
        const ctx = document.getElementById('historicalChart').getContext('2d');
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: historicalData.list.map(item => new Date(item.dt * 1000).toLocaleString()),
                datasets: [{
                    label: 'Temperature (°C)',
                    data: historicalData.list.map(item => item.main.temp),
                    borderColor: 'rgb(75, 192, 192)',
                    tension: 0.1
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error fetching historical data:', error);
        alert('Failed to fetch historical data. Please try again later.');
    }
}

async function initAIInsights() {
    const aiPredictions = document.getElementById('aiPredictions');
    const currentWeather = await fetchWeatherData('weather', { lat: 43.2557, lon: -79.8711 });
    const forecast = await fetchWeatherData('forecast', { lat: 43.2557, lon: -79.8711 });
    
    const currentTemp = currentWeather.main.temp;
    const tomorrowTemp = forecast.list[8].main.temp; // Roughly 24 hours from now
    
    let insight = "Based on current patterns, ";
    if (tomorrowTemp > currentTemp + 5) {
        insight += "expect significantly warmer weather tomorrow.";
    } else if (tomorrowTemp < currentTemp - 5) {
        insight += "expect significantly cooler weather tomorrow.";
    } else {
        insight += "expect similar weather conditions tomorrow.";
    }
    
    // Enhance AI insights
    const weatherPatterns = analyzeWeatherPatterns(forecast.list);
    insight += ` ${weatherPatterns}`;

    // Add more complex insights based on historical data
    const historicalData = await fetchWeatherData('forecast', { lat: 43.2557, lon: -79.8711, cnt: 40 }); // 5 days of historical data
    const anomalies = detectAnomalies(historicalData.list, forecast.list);
    if (anomalies.length > 0) {
        insight += ` Unusual weather patterns detected: ${anomalies.join(', ')}.`;
    }

    aiPredictions.textContent = insight;
}

function analyzeWeatherPatterns(forecastData) {
    // Implement pattern analysis logic here
    // This is a placeholder implementation
    const temperatures = forecastData.map(item => item.main.temp);
    const avgTemp = temperatures.reduce((sum, temp) => sum + temp, 0) / temperatures.length;
    return `The average temperature for the next few days will be around ${avgTemp.toFixed(1)}°C.`;
}

function detectAnomalies(historicalData, forecastData) {
    // Implement anomaly detection logic here
    // This is a placeholder implementation
    const anomalies = [];
    const historicalAvg = historicalData.reduce((sum, item) => sum + item.main.temp, 0) / historicalData.length;
    const forecastAvg = forecastData.reduce((sum, item) => sum + item.main.temp, 0) / forecastData.length;
    if (Math.abs(forecastAvg - historicalAvg) > 5) {
        anomalies.push('Significant temperature change');
    }
    return anomalies;
}

function submitCommunityReport() {
    const reportText = prompt("Enter your weather report:");
    if (reportText) {
        // Add geolocation to get user's current location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const { latitude, longitude } = position.coords;
                // Use reverse geocoding to get location name (you may need to use a geocoding service API)
                const locationName = "User's Location"; // Placeholder
                addReport(reportText, latitude, longitude, locationName);
            }, () => {
                alert('Unable to get your location. Using default location.');
                addReport(reportText);
            });
        } else {
            alert('Geolocation is not supported by your browser. Using default location.');
            addReport(reportText);
        }
    }
}

function addReport(reportText, lat = 43.2557, lon = -79.8711, location = "Hamilton, ON") {
    const reports = JSON.parse(localStorage.getItem('communityReports') || '[]');
    reports.unshift({ 
        user: "Anonymous", 
        report: reportText, 
        timestamp: new Date().toISOString(),
        location: location,
        coordinates: { lat, lon }
    });
    localStorage.setItem('communityReports', JSON.stringify(reports));
    updateCommunityReports(reports);
}

function updateCommunityReports(reports) {
    const reportsContainer = document.getElementById('communityReports');
    reportsContainer.innerHTML = '';

    // Add location-based filtering
    const filterInput = document.createElement('input');
    filterInput.type = 'text';
    filterInput.placeholder = 'Filter by location';
    filterInput.addEventListener('input', (e) => {
        const filteredReports = reports.filter(report => 
            report.location.toLowerCase().includes(e.target.value.toLowerCase())
        );
        displayReports(filteredReports);
    });
    reportsContainer.prepend(filterInput);

    displayReports(reports);
}

function displayReports(reports) {
    const reportsContainer = document.getElementById('communityReports');
    reportsContainer.innerHTML = '';
    reports.forEach(report => {
        const reportElement = document.createElement('div');
        reportElement.innerHTML = `<strong>${report.user} (${report.location}):</strong> ${report.report} <small>(${new Date(report.timestamp).toLocaleString()})</small>`;
        reportsContainer.appendChild(reportElement);
    });
}

function loadCommunityReports() {
    const reports = JSON.parse(localStorage.getItem('communityReports') || '[]');
    updateCommunityReports(reports);
}