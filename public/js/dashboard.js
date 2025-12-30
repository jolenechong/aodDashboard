
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
		`${b.percentage}% · ${b.plugged == "PLUGGED_AC" ? 'Charging' : 'On battery'} · ${b.temperature}°C`;
}

fetchBattery();
setInterval(fetchBattery, REFRESH_MS);

// ram and storage usages
async function renderStats(ram, sto) {
	const res = await fetch('components/radial.html');
	const text = await res.text();

	const temp = document.createElement('div');
	temp.innerHTML = text;

	const template = temp.querySelector('#progress-circle');
	const container = document.getElementById('radial_container');

	const circlesData = [
		{ percent: ram, label: "RAM" },
		{ percent: sto, label: "STO" }
	];

	circlesData.forEach(data => {
		const clone = template.content.cloneNode(true);
		clone.querySelector("span.text-2xl").textContent = `${data.percent}%`;
		clone.querySelector("div.absolute.bottom-0").textContent = data.label;
		const progressCircle = clone.querySelectorAll("svg circle")[1];
		const r = 40;
		const dashArray = 2 * Math.PI * r; // ≈ 251.33

		progressCircle.setAttribute("stroke-dasharray", dashArray);
		progressCircle.setAttribute(
    		"stroke-dashoffset",
    		dashArray * (1 - data.percent / 100)
		);
		container.appendChild(clone);
	
	});
}

async function fetchStats() {
	try {
		const res = await fetch('/api/dashboard/ram', { cache: 'no-store' });
		const ramJson = await res.json();
		const ram = ramJson.used_pct;
		const sto = 20; // TODO update this

		renderStats(ram, sto);
	} catch (err) {
		console.warn('RAM fetch failed', err);
	}
}

fetchStats();
setInterval(fetchStats, REFRESH_MS);

// clock
function updateClock() {
	const now = new Date();
	const options = { hour: '2-digit', minute: '2-digit', hour12: false };
	document.getElementById('clock').textContent = now.toLocaleTimeString([], options);
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
function stopAllAudio() {
	document.querySelectorAll('audio').forEach(a => {
		a.pause();
		a.currentTime = 0;
	});
}

function startVisualizer(element) {
	const bars = ["ı", "l"];
	element._interval = setInterval(() => {
		let line = "";
		for (let i = 0; i < 5; i++) {
			line += bars[Math.floor(Math.random() * bars.length)];
		}
		element.textContent = line;
	}, 400);
}

function stopVisualizer(element, interval) {
	if (element._interval) {
		clearInterval(element._interval);
		element._interval = null;
	}
	element.textContent = "ııııı"; // reset
}

function toggleStudyMusic(btn) {
	const audio = document.getElementById('studyAudio');
	const stat = document.getElementById('status');
	const vis = document.getElementById('studyVis');

	if (audio.paused) {
		audio.play();
		stat.textContent = "focusing..."; // status will be last playiny thing
		startVisualizer(vis);
	} else {
		audio.pause();
		audio.currentTime = 0;
		stat.textContent = "today...";
		stopVisualizer(vis);
	}
}

function toggleRainMusic(btn) {
	const audio = document.getElementById('rainAudio');
	const stat = document.getElementById('status');
	const vis = document.getElementById('rainVis');

	if (audio.paused) {
		audio.play();
		stat.textContent = "rain...";
		startVisualizer(vis);
	} else {
		audio.pause();
		audio.currentTime = 0;
		stat.textContent = "today...";
		stopVisualizer(vis);
	}
}

function toggleRelaxMusic(btn) {
	const audio = document.getElementById('relaxAudio');
	const stat = document.getElementById('status');
	const vis = document.getElementById('relaxVis');

	if (audio.paused) {
		audio.play();
		stat.textContent = "relax...";
		startVisualizer(vis);
	} else {
		audio.pause();
		audio.currentTime = 0;
		stat.textContent = "today...";
		stopVisualizer(vis);
	}
}

stopAllAudio();
