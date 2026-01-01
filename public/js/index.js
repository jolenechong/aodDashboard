const list = document.getElementById("suggestions");

let timeout;
document.getElementById("search").addEventListener("input", async (e) => {
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
				list.classList.add("hidden");
				return;
			}

			results.forEach(item => {
				const li = document.createElement("li");
				li.textContent = item.title;
				li.className = "px-3 py-2 cursor-pointer bg-slate-900 hover:bg-gray-700 rounded-md";

				li.addEventListener("click", () => {
					document.getElementById("search").value = item.url;
					list.classList.add("hidden");
				});

				list.appendChild(li);
			});

			list.classList.remove("hidden");

		} catch (err) {
			console.error("Search API error:", err);
			list.classList.add("hidden");
		}
	}, 500); // wait 300ms after user stops typing
});

