const ratingLabels = ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"];
const ratingStatus = document.querySelector("#ratings-status");
const refreshRatingsButton = document.querySelector("#refresh-ratings");
const ratingsSummary = document.querySelector("#ratings-summary");
const ratingsChartCard = document.querySelector("#ratings-chart-card");
const ratingsEmpty = document.querySelector("#ratings-empty");
const ratingBars = document.querySelector("#rating-bars");

function initializeRatingsNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#primary-nav");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    toggle.setAttribute("aria-label", expanded ? "Open navigation menu" : "Close navigation menu");
    menu.classList.toggle("is-open", !expanded);
  });
  menu.querySelectorAll(".nav-link").forEach((link) => link.addEventListener("click", () => {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
  }));
}

function showRatingBars(counts, total) {
  ratingBars.replaceChildren();
  counts.forEach((count, index) => {
    const row = document.createElement("div");
    row.className = "rating-bar-row";
    const label = document.createElement("span");
    label.className = "rating-bar-label";
    label.textContent = ratingLabels[index];
    const track = document.createElement("div");
    track.className = "rating-bar-track";
    track.setAttribute("role", "img");
    const fill = document.createElement("span");
    fill.className = "rating-bar-fill";
    const percent = total ? Math.round((count / total) * 100) : 0;
    fill.style.width = `${percent}%`;
    track.setAttribute("aria-label", `${ratingLabels[index]}: ${count} ratings, ${percent}%`);
    track.append(fill);
    const countLabel = document.createElement("strong");
    countLabel.className = "rating-bar-count";
    countLabel.textContent = String(count);
    row.append(label, track, countLabel);
    ratingBars.append(row);
  });
}

async function loadRatingSummary() {
  const config = window.PARKSMART_SUPABASE_CONFIG;
  if (!config?.url || !config?.anonKey || !window.supabase) {
    throw new Error("Supabase did not load. Check your connection and supabase-config.js.");
  }
  const client = window.supabase.createClient(config.url, config.anonKey);
  const { data, error } = await client.rpc("get_parksmart_rating_summary");
  if (error) throw error;
  const summary = data?.[0];
  ratingsSummary.hidden = true;
  ratingsChartCard.hidden = true;
  ratingsEmpty.hidden = true;
  if (!summary?.results_ready) {
    ratingStatus.textContent = "Results are hidden until at least five ratings are available.";
    ratingsEmpty.hidden = false;
    return;
  }

  const counts = [summary.one_star, summary.two_stars, summary.three_stars, summary.four_stars, summary.five_stars].map(Number);
  const total = Number(summary.total_ratings);
  const topIndex = counts.indexOf(Math.max(...counts));
  document.querySelector("#average-rating").textContent = Number(summary.average_rating).toFixed(1);
  document.querySelector("#total-ratings").textContent = String(total);
  document.querySelector("#top-rating").textContent = `${topIndex + 1} ★`;
  document.querySelector("#top-rating-detail").textContent = `${counts[topIndex]} ${counts[topIndex] === 1 ? "response" : "responses"}`;
  showRatingBars(counts, total);
  document.querySelector("#ratings-updated").textContent = `Updated ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`;
  ratingsSummary.hidden = false;
  ratingsChartCard.hidden = false;
  ratingStatus.textContent = "Ratings loaded.";
}

refreshRatingsButton.addEventListener("click", async () => {
  refreshRatingsButton.disabled = true;
  ratingStatus.textContent = "Refreshing ratings…";
  try {
    await loadRatingSummary();
  } catch (error) {
    ratingStatus.textContent = `Could not load ratings: ${error.message || "Please try again."} Run the latest supabase-setup.sql in Supabase if the dashboard function is missing.`;
  } finally {
    refreshRatingsButton.disabled = false;
  }
});

initializeRatingsNavigation();
loadRatingSummary().catch((error) => {
  ratingStatus.textContent = `Could not load ratings: ${error.message || "Please try again."} Run the latest supabase-setup.sql in Supabase if the dashboard function is missing.`;
});
