import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const app = express();

const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });
console.log("WebSocket server running on ws://localhost:8080");

wss.on("connection", (ws) => {
  console.log("Client connected");
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MUSIC_DIR = '/data/data/com.termux/files/home/storage/shared/Music';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.post('/api/download', async (req, res) => {
	const url = req.body.url;
	if (!url) return res.status(400).send('No URL provided');

	try {
		const cmd = `yt-dlp -x --audio-format mp3 -o "${MUSIC_DIR}/%(title)s.%(ext)s" "${url}"`;

		await execAsync(cmd);

		// find the latest MP3 file
		const files = fs.readdirSync(MUSIC_DIR)
			.filter(f => f.endsWith('.mp3'))
			.map(f => ({ name: f, time: fs.statSync(path.join(MUSIC_DIR, f)).mtime }))
			.sort((a, b) => b.time - a.time);

		if (!files.length) return res.status(500).send('MP3 not found');

		const latestFile = path.join(MUSIC_DIR, files[0].name);
		res.download(latestFile, files[0].name);
		// TODO: delete file after

	} catch (err) {
		console.error(err);
		res.status(500).send(err.message);
	}
});

app.get('/api/search', async (req, res) => {
	const query = req.query.q;
	console.log(req.query);
	if (!query) return res.status(400).send('No Search Query provided');

	// TODO: if its a link then dont search check in fe, else /search onChange
	const links = await searchYT(query);
	res.json(links);
})

async function searchYT(query, limit=5) {
	try {
		const cmd = `yt-dlp "ytsearch${limit}:${query}" -j --flat-playlist --no-warnings --quiet`;
		const { stdout } = await execAsync(cmd);
		const lines = stdout
			.trim()
			.split("\n")
			.filter(line => line.startsWith("{"));

		const links = lines.map(line => {
			const v = JSON.parse(line);
			return {
				title: v.title,
				url: `https://youtu.be/${v.id}`,
				duration: v.duration || null
			};
		});

		return links;


	} catch (err) {
		console.error(err);
	}

}


app.get('/', async (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let batteryState = {
	lastUpdated: null,
	data: null,
	error: null
};

app.get('/api/dashboard/ram', async (req, res) => {
	try {
		const { stdout } = await execAsync(
			`awk '
		/MemTotal/ {t=$2}
		/MemAvailable/ {a=$2}
		END {
		  used=t-a
		  printf("%.2f %.2f %.1f",
				 used/1024/1024, t/1024/1024, used/t*100)
		}' /proc/meminfo`
		);

		const [usedGb, totalGb, usedPct] = stdout.trim().split(/\s+/).map(Number);

		await res.json({
			used_gb: usedGb,
			total_gb: totalGb,
			used_pct: usedPct
		});

	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to read RAM info' });
	}

})

app.get('/api/dashboard/battery', async (req, res) => {
	try {
		const { stdout } = await execAsync('termux-battery-status');
		batteryState.data = JSON.parse(stdout);
		batteryState.lastUpdated = new Date().toISOString();
		batteryState.error = null;
		await res.json(batteryState);
	} catch (err) {
		batteryState.error = err.message;
	}

});

app.get('/dashboard', async (req, res) => {
	res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
	console.log(`Server running on http://0.0.0.0:${PORT}`);

	// Termux-safe: keep Node alive
	setInterval(() => {}, 1e6);
});

