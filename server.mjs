import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);
const app = express();


const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket server running on ws://0.0.0.0:8080");

wss.on("connection", (ws) => {
	ws.id = uuidv4();
	ws.send(JSON.stringify({ status: "connected", id: ws.id }));
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MUSIC_DIR = '/data/data/com.termux/files/home/storage/shared/Music';

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post('/api/download', async (req, res) => {
	const { url, wsId} = req.body;
	if (!url) return res.status(400).send('No URL provided');
	res.json({ status: "Starting" });

	try {
		const outputTemplate = `${MUSIC_DIR}/%(title)s.%(ext)s`;
		const ytdlp = spawn("yt-dlp", ["-x","--audio-format","mp3","-o",outputTemplate,url,"--newline","--no-warnings"]);

		// find the WS to send updates
		const ws = Array.from(wss.clients).find(c => c.id === wsId);
		if (!ws || ws.readyState !== ws.OPEN) {
			console.warn("WS client not found for ID", wsId);
		}

		ytdlp.stdout.on("data", (data) => {
			const lines = data.toString().split("\n");
			lines.forEach(line => {
				const match = line.match(/\[download\]\s+(\d+\.\d+)%/);
				if (match && ws && ws.readyState === ws.OPEN) {
					const percentage = parseFloat(match[1]);
					ws.send(JSON.stringify({ progress: percentage }));
				}
			});
		});

		ytdlp.on("close", () => {
			const files = fs.readdirSync(MUSIC_DIR)
				.filter(f => f.endsWith('.mp3'))
				.map(f => ({ name: f, time: fs.statSync(path.join(MUSIC_DIR, f)).mtime }))
				.sort((a,b) => b.time - a.time);

			if (!files.length) {
				if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify({ error: "MP3 not found" }));
				return;
			}

			if (ws && ws.readyState === ws.OPEN) {
				ws.send(JSON.stringify({ progress: 100, status: "Downloading...", file: files[0].name }));
			}
		});

	} catch (err) {
		console.error(err);
		res.status(500).send(err.message);
	}
});

app.get("/api/download/:file", async (req, res) => {
	const filePath = path.join(MUSIC_DIR, req.params.file);
	if (!fs.existsSync(filePath)) return res.status(404).send("File not found");

	res.download(filePath, (err) => {
		if (err) {
			console.error("Download error:", err);
		} else {
			fs.unlink(filePath, (err) => {
				if (err) console.error("Failed to delete file:", err);
			});
		}
	});
});

app.post("/api/batchdownload", async (req, res) => {
	// split by \n then searchYT and get first link then download on each	
})

app.get('/api/search', async (req, res) => {
	const query = req.query.q;
	if (!query) return res.status(400).send('No Search Query provided');

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
app.get('/api/dashboard/storage', async (req, res) => {
	try {
		const { stdout } = await execAsync(
			`df /data | awk -v advertised=128000000000 'NR==2 { used=$3*1024; total=$2*1024; reserved=advertised-total; android_used=used+reserved; printf "%.1f\\n", (android_used/advertised)*100+0.5 }'`
		);

		const usedPct = stdout.trim();

		await res.json({
			used_pct: usedPct
		});

	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Failed to read storage info' });
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

