import express from "express";
import fetch from "node-fetch";

const app = express();
const PORT = process.env.PORT || 3000;
const SELF_URL = "https://mojotxdata.onrender.com/leaderboard/top14";
const API_KEY = "3duNGys32gmPaDvgBVDoyXFy0LMkhb8P";

let cachedData = [];

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

function maskUsername(username) {
  if (username.length <= 4) return username;
  return username.slice(0, 2) + "***" + username.slice(-2);
}

function getDynamicApiUrl() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);

  return `https://services.rainbet.com/v1/external/affiliates?start_at=${startStr}&end_at=${endStr}&key=${API_KEY}`;
}

async function fetchAndCacheData() {
  try {
    const response = await fetch(getDynamicApiUrl());
    const json = await response.json();
    if (!json.affiliates) throw new Error("No data received");

    const sorted = json.affiliates
      .filter((a) => a.username && a.wagered_amount)
      .map((entry) => ({
        username: maskUsername(entry.username),
        wagered: Math.round(parseFloat(entry.wagered_amount)),
        weightedWager: Math.round(parseFloat(entry.wagered_amount)),
      }))
      .sort((a, b) => b.wagered - a.wagered);

    cachedData = sorted;
    console.log("[✅] Leaderboard updated");
  } catch (err) {
    console.error("[❌] Failed to fetch Rainbet data:", err.message);
  }
}

// Initial fetch + 5-min refresh
fetchAndCacheData();
setInterval(fetchAndCacheData, 5 * 60 * 1000);

// Leaderboard endpoint with VirgzilZos injected and top2 split
app.get("/leaderboard/top14", (req, res) => {
  const injectedUser = {
    username: maskUsername("VirgzilZos"),
    wagered: 176866,
    weightedWager: 176866
  };

  // Remove existing masked VirgzilZos
  const filtered = cachedData.filter(
    (entry) => entry.username !== injectedUser.username
  );

  // Add new VirgzilZos
  filtered.push(injectedUser);

  // Sort descending by wagered and slice top 10
  const top10 = filtered
    .sort((a, b) => b.wagered - a.wagered)
    .slice(0, 10);

  // Swap position 0 and 1
  if (top10.length >= 2) {
    [top10[0], top10[1]] = [top10[1], top10[0]];
  }

  // Send flat top 10 with swapped top 2
  res.json(top10);
});


// Keep Render service alive
setInterval(() => {
  fetch(SELF_URL)
    .then(() => console.log(`[🔁] Self-pinged ${SELF_URL}`))
    .catch((err) => console.error("[⚠️] Self-ping failed:", err.message));
}, 270000);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
