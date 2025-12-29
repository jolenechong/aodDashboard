const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

// battery
async function fetchBattery() {
	try {
		const res = await fetch('/api/dashboard/battery', { cache: 'no-store' });
		const json = await res.json();
		if (!json?.data) return;

		renderBattery(json.data);
	} catch (err) {
		console.warn('Battery fetch failed', err);
	}
}
function renderBattery(b) {
	const fill = document.getElementById('batteryFill');
	const text = document.getElementById('batteryText');

	if (!fill || !text) return;

	fill.style.width = `${b.percentage}%`;
	text.textContent =
		`${b.percentage}% · ${b.plugged == "PLUGGED" ? 'Charging' : 'On battery'} · ${b.temperature}°C`;
}

fetchBattery();
setInterval(fetchBattery, REFRESH_MS);

// clock
function updateClock() {
	document.getElementById('clock').textContent = new Date().toLocaleTimeString().slice(0, -3);
}
setInterval(updateClock, 1000);
updateClock();

// weather
async function fetchWeather() {
	try {
		const url =
			'https://api.open-meteo.com/v1/forecast' +
			'?latitude=1.3521&longitude=103.8198' + // Singapore
			'&current=temperature_2m,relative_humidity_2m,pressure_msl,apparent_temperature,weather_code';

		const res = await fetch(url);
		const json = await res.json();

		const w = {
			temp: json.current.temperature_2m,
			feels: json.current.apparent_temperature,
			code: json.current.weather_code,
			updated: Date.now()
		};
		console.log("here", w);

		renderWeather(w);
	} catch (e) {
		console.warn('Weather fetch failed', e);
	}
}

function renderWeather(w) {
	document.getElementById('weatherTemp').textContent =
		`${Math.round(w.temp)}°C`;

	document.getElementById('weatherDesc').textContent =
		`Feels like ${Math.round(w.feels)}°C`;

	document.getElementById('weatherIcon').textContent =
		weatherIcon(w.code);
}

function weatherIcon(code) {
	if (code === 0) return '☀️';
	if (code < 3) return '🌤️';
	if (code < 50) return '☁️';
	if (code < 70) return '🌧️';
	return '⛈️';
}

// initial load + refresh every hour
fetchWeather();
setInterval(fetchWeather, 60 * 60 * 1000);


// audio
let isStudyPlaying = false;

function toggleStudyMusic(btn) {
	const audio = document.getElementById('studyAudio');
	const stat = document.getElementById('status');

	if (!isStudyPlaying) {
		audio.play();
		isStudyPlaying = true;
		stat.textContent = "focusing...";
	} else {
		audio.pause();
		audio.currentTime = 0;
		isStudyPlaying = false;
		stat.textContent = "today...";
	}
}

let isRainPlaying = false;

function toggleRainMusic(btn) {
	const audio = document.getElementById('rainAudio');
	const stat = document.getElementById('status'); // status will show last playing thing (fix this)

	if (!isStudyPlaying) {
		audio.play();
		isRainPlaying = true;
		stat.textContent = "rain...";
	} else {
		audio.pause();
		audio.currentTime = 0;
		isRainPlaying = false;
		stat.textContent = "today...";
	}
}
