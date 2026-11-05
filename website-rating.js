const websiteRatingForm = document.querySelector("#website-rating-form");
const websiteRatingStatus = document.querySelector("#website-rating-status");
const websiteRatingAverage = document.querySelector("#website-rating-average");
const wouldUseSummary = document.querySelector("#would-use-summary");
const websiteRatingSubmit = document.querySelector("#website-rating-submit");
const websiteRatingStorageKey = "parksmart.website-rating.submitted.v1";
const ratingLockExpiryMs = 2 * 60 * 1000;

function isPendingRating(value) {
  if (!value?.startsWith("pending:")) return false;
  const startedAt = Number(value.slice("pending:".length));
  return Number.isFinite(startedAt) && Date.now() - startedAt < ratingLockExpiryMs;
}

function getAnonymousRatingsClient() {
  const config = window.PARKSMART_SUPABASE_CONFIG;
  if (!config?.url || !config?.anonKey || !window.supabase) return null;
  return window.supabase.createClient(config.url, config.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
  });
}

async function loadWebsiteRatingSummary(client) {
  try {
    const { data, error } = await client.rpc("get_website_rating_summary");
    if (error) throw error;
    const summary = data?.[0];
    const total = Number(summary?.total_ratings || 0);
    websiteRatingAverage.textContent = total ? Number(summary.average_rating).toFixed(1) : "—";
    if (!Number(summary?.would_use_answers)) {
      wouldUseSummary.textContent = "No answers yet";
      return;
    }
    const yesPercent = Number(summary.would_use_percentage);
    const answers = Number(summary.would_use_answers);
    wouldUseSummary.textContent = `${yesPercent}% would use ParkSmart (from ${answers} ${answers === 1 ? "answer" : "answers"})`;
  } catch (error) {
    wouldUseSummary.textContent = "Could not load results. Run the ratings SQL in Supabase.";
    console.error("ParkSmart could not load the anonymous website rating summary.", error);
  }
}

if (websiteRatingForm && websiteRatingStatus && websiteRatingAverage && wouldUseSummary && websiteRatingSubmit) {
  let alreadySubmitted = false;
  try {
    const savedState = window.localStorage.getItem(websiteRatingStorageKey);
    alreadySubmitted = savedState === "true";
    if (savedState?.startsWith("pending:") && !isPendingRating(savedState)) {
      window.localStorage.removeItem(websiteRatingStorageKey);
    } else if (isPendingRating(savedState)) {
      websiteRatingForm.hidden = true;
      websiteRatingStatus.textContent = "A rating is being submitted in another tab.";
    }
  } catch (error) {
    console.warn("ParkSmart could not read this browser's rating state.", error);
  }

  if (alreadySubmitted) {
    websiteRatingForm.hidden = true;
    websiteRatingStatus.textContent = "Thanks for your rating";
  }

  window.addEventListener("storage", (event) => {
    if (event.key !== websiteRatingStorageKey) return;
    if (event.newValue === null && !alreadySubmitted) {
      websiteRatingForm.hidden = false;
      websiteRatingStatus.textContent = "";
      return;
    }
    if (event.newValue !== "true" && !isPendingRating(event.newValue)) return;
    alreadySubmitted = event.newValue === "true";
    websiteRatingForm.hidden = true;
    websiteRatingStatus.textContent = alreadySubmitted
      ? "Thanks for your rating"
      : "A rating is being submitted in another tab.";
  });

  const client = getAnonymousRatingsClient();
  if (client) loadWebsiteRatingSummary(client);
  else wouldUseSummary.textContent = "Connect Supabase to load the anonymous results.";

  websiteRatingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (alreadySubmitted || websiteRatingSubmit.disabled || !websiteRatingForm.reportValidity()) return;
    const formData = new FormData(websiteRatingForm);
    const rating = Number(formData.get("rating"));
    const wouldUseValue = formData.get("would_use");
    const feedback = String(formData.get("feedback") || "").trim();
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || !["true", "false"].includes(wouldUseValue)) return;

    const anonymousClient = client || getAnonymousRatingsClient();
    if (!anonymousClient) {
      websiteRatingStatus.textContent = "Ratings are unavailable until Supabase is connected.";
      return;
    }

    let browserLockSet = false;
    try {
      const browserState = window.localStorage.getItem(websiteRatingStorageKey);
      if (browserState === "true") {
        alreadySubmitted = true;
        websiteRatingForm.hidden = true;
        websiteRatingStatus.textContent = "Thanks for your rating";
        return;
      }
      if (isPendingRating(browserState)) {
        websiteRatingForm.hidden = true;
        websiteRatingStatus.textContent = "A rating is being submitted in another tab.";
        return;
      }
      window.localStorage.setItem(websiteRatingStorageKey, `pending:${Date.now()}`);
      browserLockSet = true;
    } catch (storageError) {
      console.warn("ParkSmart could not lock this browser's rating state.", storageError);
    }

    websiteRatingSubmit.disabled = true;
    websiteRatingStatus.textContent = "Submitting…";
    try {
      const { error } = await anonymousClient.from("ratings").insert({
        rating,
        would_use: wouldUseValue === "true",
        feedback: feedback || null
      });
      if (error) throw error;
      alreadySubmitted = true;
      try {
        window.localStorage.setItem(websiteRatingStorageKey, "true");
        alreadySubmitted = true;
      } catch (storageError) {
        console.warn("ParkSmart could not save this browser's rating state.", storageError);
      }
      websiteRatingForm.hidden = true;
      websiteRatingStatus.textContent = "Thanks for your rating";
      await loadWebsiteRatingSummary(anonymousClient);
    } catch (error) {
      websiteRatingStatus.textContent = `Could not submit your rating: ${error.message || "Please try again."}`;
      console.error("ParkSmart could not submit the anonymous website rating.", error);
      if (browserLockSet) {
        try {
          if (isPendingRating(window.localStorage.getItem(websiteRatingStorageKey))) {
            window.localStorage.removeItem(websiteRatingStorageKey);
          }
        } catch (storageError) {
          console.warn("ParkSmart could not clear this browser's pending rating state.", storageError);
        }
      }
    } finally {
      websiteRatingSubmit.disabled = false;
    }
  });
}
