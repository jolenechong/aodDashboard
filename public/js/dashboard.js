const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

async function fetchBattery() {
  try {
	  console.log("fetching")
    const res = await fetch('/api/dashboard/battery', { cache: 'no-store' });
    const json = await res.json();
	  console.log(json);
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

  // color logic
  fill.className =
    'h-full transition-all duration-700 ease-out ' +
    (b.percentage < 20
      ? 'bg-red-500'
      : b.plugged
        ? 'bg-green-500'
        : 'bg-blue-500');

  text.textContent =
    `${b.percentage}% · ${b.plugged ? 'Charging' : 'On battery'} · ${b.temperature}°C`;
}

// initial load
fetchBattery();

// refresh every 5 minutes
setInterval(fetchBattery, REFRESH_MS);

