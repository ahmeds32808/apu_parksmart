const ratingLabels = ["1 star", "2 stars", "3 stars", "4 stars", "5 stars"];
const ratingStatus = document.querySelector("#ratings-status");
const refreshRatingsButton = document.querySelector("#refresh-ratings");
const previewSampleRatingsButton = document.querySelector("#preview-sample-ratings");
const ratingsSummary = document.querySelector("#ratings-summary");
const ratingsChartCard = document.querySelector("#ratings-chart-card");
const ratingsEmpty = document.querySelector("#ratings-empty");
const ratingBars = document.querySelector("#rating-bars");
const ratingFeedbackCard = document.querySelector("#rating-feedback-card");
const ratingFeedbackList = document.querySelector("#rating-feedback-list");
const feedbackListStatus = document.querySelector("#feedback-list-status");
const websiteDashboardStatus = document.querySelector("#website-dashboard-status");
const websiteRatingBars = document.querySelector("#website-rating-bars");
const websiteFeedbackList = document.querySelector("#website-feedback-list");
const websiteFeedbackStatus = document.querySelector("#website-feedback-status");
let samplePreviewActive = false;

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

function showRatingBars(counts, total, target = ratingBars) {
  target.replaceChildren();
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
    target.append(row);
  });
}

function showWebsiteRatingResults(summary, rows, feedbackRows) {
  const total = Number(summary?.total_ratings || 0);
  const answers = rows.filter((entry) => entry.would_use !== null).length;
  const yesCount = rows.filter((entry) => entry.would_use === true).length;
  const noCount = rows.filter((entry) => entry.would_use === false).length;
  const counts = [1, 2, 3, 4, 5].map((rating) => rows.filter((entry) => Number(entry.rating) === rating).length);
  const yesPercent = answers ? Math.round((yesCount / answers) * 100) : 0;
  const noPercent = answers ? 100 - yesPercent : 0;

  document.querySelector("#website-average-rating").textContent = total
    ? Number(summary.average_rating).toFixed(1)
    : "—";
  document.querySelector("#website-total-ratings").textContent = String(total);
  document.querySelector("#website-would-use-percent").textContent = answers ? `${yesPercent}%` : "—";
  document.querySelector("#website-would-use-count").textContent = answers
    ? `from ${answers} ${answers === 1 ? "answer" : "answers"}`
    : "No answers yet";
  document.querySelector("#website-would-use-yes").textContent = String(yesCount);
  document.querySelector("#website-would-use-no").textContent = String(noCount);
  document.querySelector("#website-yes-fill").style.width = `${yesPercent}%`;
  document.querySelector("#website-no-fill").style.width = `${noPercent}%`;
  document.querySelector("#website-yes-percent").textContent = `${yesPercent}% (${yesCount})`;
  document.querySelector("#website-no-percent").textContent = `${noPercent}% (${noCount})`;
  showRatingBars(counts, total, websiteRatingBars);
  websiteDashboardStatus.textContent = total
    ? `Showing ${total} anonymous ${total === 1 ? "website rating" : "website ratings"} from Supabase.`
    : "No website ratings yet.";
  showWebsiteFeedback(feedbackRows);
}

function showWebsiteFeedback(entries) {
  websiteFeedbackList.replaceChildren();
  if (!entries.length) {
    websiteFeedbackStatus.textContent = "No written website feedback yet.";
    return;
  }
  websiteFeedbackStatus.textContent = "";
  entries.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "rating-feedback-entry";
    const stars = document.createElement("span");
    stars.className = "rating-feedback-stars";
    stars.textContent = `${entry.rating} ★`;
    const text = document.createElement("p");
    text.textContent = entry.feedback;
    card.append(stars, text);
    websiteFeedbackList.append(card);
  });
}

async function loadWebsiteRatingDashboard(client) {
  async function fetchRatingRows() {
    const allRows = [];
    let offset = 0;
    while (true) {
      const { data, error } = await client.from("ratings")
        .select("rating,would_use")
        .order("created_at", { ascending: false })
        .range(offset, offset + 999);
      if (error) throw error;
      allRows.push(...(data || []));
      if (!data || data.length < 1000) return allRows;
      offset += data.length;
    }
  }
  const [summaryResult, ratingsResult, feedbackResult] = await Promise.all([
    client.rpc("get_website_rating_summary"),
    fetchRatingRows(),
    client.from("ratings").select("rating,feedback,created_at").not("feedback", "is", null).order("created_at", { ascending: false }).limit(20)
  ]);
  if (summaryResult.error) throw summaryResult.error;
  if (feedbackResult.error) throw feedbackResult.error;
  if (samplePreviewActive) return;
  showWebsiteRatingResults(summaryResult.data?.[0], ratingsResult, feedbackResult.data || []);
}

function showRatingFeedback(entries, sample = false) {
  ratingFeedbackList.replaceChildren();
  feedbackListStatus.textContent = sample ? "Example comments only. They are not real responses." : "";
  if (!entries.length) {
    feedbackListStatus.textContent = "No written feedback yet.";
    return;
  }
  entries.forEach((entry) => {
    const card = document.createElement("article");
    card.className = "rating-feedback-entry";
    const stars = document.createElement("span");
    stars.className = "rating-feedback-stars";
    stars.textContent = `${entry.rating} ★`;
    const text = document.createElement("p");
    text.textContent = entry.feedback;
    card.append(stars, text);
    ratingFeedbackList.append(card);
  });
}

function showRatingSummary(summary, sample = false) {
  ratingsSummary.hidden = true;
  ratingsChartCard.hidden = true;
  ratingsEmpty.hidden = true;
  ratingFeedbackCard.hidden = true;
  if (!summary?.results_ready) {
    ratingStatus.textContent = "No chart yet. At least five real ratings are needed.";
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
  document.querySelector("#ratings-source-label").textContent = sample ? "Sample preview" : "From Supabase";
  document.querySelector("#ratings-updated").textContent = sample
    ? "Example data for preview only. It is not saved to Supabase."
    : `Updated ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date())}`;
  showRatingBars(counts, total);
  ratingsSummary.hidden = false;
  ratingsChartCard.hidden = false;
  ratingFeedbackCard.hidden = false;
  if (sample) {
    showRatingFeedback([
      { rating: 5, feedback: "Finding a parking space felt much easier." },
      { rating: 4, feedback: "The steps were clear and simple to follow." },
      { rating: 5, feedback: "I like seeing the parking information in one place." },
      { rating: 3, feedback: "A map with more details would make it even better." }
    ], true);
  } else {
    feedbackListStatus.textContent = "Loading comments…";
    ratingFeedbackList.replaceChildren();
  }
  ratingStatus.textContent = sample ? "Showing sample ratings. These are not real responses." : "Ratings loaded from Supabase.";
}

async function loadRatingSummary() {
  const config = window.PARKSMART_SUPABASE_CONFIG;
  if (!config?.url || !config?.anonKey || !window.supabase) {
    throw new Error("Supabase did not load. Check your connection and supabase-config.js.");
  }
  const client = window.supabase.createClient(config.url, config.anonKey);
  try {
    await loadWebsiteRatingDashboard(client);
  } catch (error) {
    websiteDashboardStatus.textContent = `Could not load website ratings: ${error.message || "Please try again."}`;
    console.error("ParkSmart could not load anonymous website ratings.", error);
  }
  try {
    const { data, error } = await client.rpc("get_parksmart_rating_summary");
    if (error) throw error;
    if (samplePreviewActive) return;
    const summary = data?.[0];
    showRatingSummary(summary);
    if (!summary?.results_ready) return;

    const { data: feedback, error: feedbackError } = await client.rpc("get_parksmart_rating_feedback");
    if (samplePreviewActive) return;
    if (feedbackError) {
      feedbackListStatus.textContent = `Could not load comments: ${feedbackError.message || "Please try again."} Run the latest supabase-setup.sql to enable written feedback.`;
      return;
    }
    showRatingFeedback((feedback || []).filter((entry) => entry.feedback));
  } catch (error) {
    if (!samplePreviewActive) ratingStatus.textContent = `Could not load parking ratings: ${error.message || "Please try again."}`;
  }
}

refreshRatingsButton.addEventListener("click", async () => {
  samplePreviewActive = false;
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

previewSampleRatingsButton.addEventListener("click", () => {
  samplePreviewActive = true;
  showRatingSummary({
    results_ready: true,
    average_rating: 4.3,
    total_ratings: 24,
    one_star: 0,
    two_stars: 1,
    three_stars: 3,
    four_stars: 8,
    five_stars: 12
  }, true);
  const sampleWebsiteRatings = [2, ...Array(3).fill(3), ...Array(8).fill(4), ...Array(12).fill(5)];
  showWebsiteRatingResults({ average_rating: 4.3, total_ratings: 24 }, sampleWebsiteRatings.map((rating, index) => ({
    rating,
    would_use: index < 20
  })), []);
  websiteDashboardStatus.textContent = "Sample preview only. These are not real website responses.";
});

initializeRatingsNavigation();
loadRatingSummary().catch((error) => {
  if (!samplePreviewActive) {
    ratingStatus.textContent = `Could not load ratings: ${error.message || "Please try again."} Run the latest supabase-setup.sql in Supabase if the dashboard function is missing.`;
  }
});
