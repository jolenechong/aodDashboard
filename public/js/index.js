const list = document.getElementById("suggestions");
const input = document.getElementById("url");

let timeout;

const hideDropdown = () => {
    list.classList.add("hidden");
};
const showDropdown = () => {
    if (list.children.length > 0) list.classList.remove("hidden");
};

document.addEventListener("click", (e) => {
    if (!list.contains(e.target) && e.target !== input) {
        hideDropdown();
    }
});
input.addEventListener("click", () => {
    if (list.classList.contains("hidden")) {
        showDropdown();
    } else {
        hideDropdown();
    }
});

document.getElementById("url").addEventListener("input", async (e) => {
	clearTimeout(timeout);
	const query = e.target.value;
	if (!query || query.startsWith("https://")) {
		list.classList.add("hidden");
		list.innerHTML = "";
		return;
	}

	timeout = setTimeout(async () => {
		try{
			const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
			const results = await res.json();
			console.log(results);
			list.innerHTML = "";

			if (!results.length) {
				hideDropdown();
				return;
			}

			results.forEach(item => {
				const li = document.createElement("li");
				li.className = "px-3 py-2 cursor-pointer bg-slate-900 hover:bg-gray-700 rounded-md flex justify-between items-center border-none outline-none appearance-none";

				const titleSpan = document.createElement("span");
				titleSpan.textContent = item.title;
				titleSpan.className = "truncate";

				const durationSpan = document.createElement("span")
				const dur = item.duration/60
				durationSpan.textContent = dur.toFixed(2) + "mins";
				durationSpan.className = "text-gray-400 text-sm";

				li.appendChild(titleSpan);
				li.appendChild(durationSpan);

				li.addEventListener("click", () => {
					document.getElementById("url").value = item.url;
					list.classList.add("hidden");
				});

				list.appendChild(li);
			});

			list.classList.remove("hidden");

		} catch (err) {
			console.error("Search API error:", err);
			list.classList.add("hidden");
		}
	}, 300);
});

// WS download updates
let wsId;
const ws = new WebSocket(`ws://${window.location.hostname}:8080`);

ws.onmessage = (msg) => {
	const data = JSON.parse(msg.data);
	if (data.id) {
		wsId = data.id;
	}

	if (data.progress !== undefined) {
		document.getElementById("status").innerText = `Retrieving: ${data.progress.toFixed(1)}%`;
	}
	if (data.status === "Downloading..." && data.file) {
		const a = document.createElement("a");
		a.href = `/api/download/${encodeURIComponent(data.file)}`;
		a.download = data.file;
		document.body.appendChild(a);
		a.click();
		a.remove();
		document.getElementById("status").innerText = "Downloaded";
	} else if (data.status == "connected") {
		console.log(data);
	} else if (data.status && data.status != "connected") {
		document.getElementById("status").innerText = data.status;
	} else if (data.error) {
		document.getElementById("status").innerText = "Error: " + data.error;
	}
};

document.getElementById("downloadForm").addEventListener("submit", async (e) => {
	e.preventDefault();
	const url = document.getElementById("url").value;

	if (!wsId) {
		alert("WebSocket not ready yet. Try again in a moment.");
		return;
	}

	document.getElementById("status").innerText = "Retrieving..."

	await fetch("/api/download", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ url, wsId })
	});
});

