const PARKING_RATE_RM_PER_HOUR = 1;
const DAILY_RATE_RM = 5;
const GRACE_PERIOD_MS = 10 * 60 * 1000;
const SESSION_TABLE = "parking_sessions";
const VEHICLE_COLORS = {
  orange: { label: "Orange", highlight: "#ffad62", color: "#f36a24", shadow: "#a83b14" },
  blue: { label: "Blue", highlight: "#83c9ff", color: "#3186d7", shadow: "#174674" },
  red: { label: "Red", highlight: "#ff9288", color: "#dc443c", shadow: "#8d2527" },
  green: { label: "Green", highlight: "#8de1a2", color: "#35a35f", shadow: "#1d5b3b" },
  purple: { label: "Purple", highlight: "#d0a6ff", color: "#8c56c7", shadow: "#4b307d" },
  silver: { label: "Silver", highlight: "#f3f6fa", color: "#9ba9b5", shadow: "#586570" },
  black: { label: "Black", highlight: "#68717a", color: "#343b43", shadow: "#111820" }
};
const zones = [
  { id: "zone-a", name: "Zone A", total: 36, available: 13 },
  { id: "zone-b", name: "Zone B", total: 42, available: 17 },
  { id: "zone-c", name: "Zone C", total: 30, available: 9 }
];
let supabaseInitializationError = null;

window.updateParkingScene = () => {};

function getSupabaseClient() {
  const config = window.PARKSMART_SUPABASE_CONFIG;
  if (!config || !config.url || !config.anonKey || !window.supabase) return null;
  if (!window.parkSmartSupabaseClient) {
    try {
      window.parkSmartSupabaseClient = window.supabase.createClient(config.url, config.anonKey);
    } catch (error) {
      supabaseInitializationError = error;
      console.error("ParkSmart could not initialize Supabase. Check supabase-config.js.", error);
      return null;
    }
  }
  return window.parkSmartSupabaseClient;
}

function getSupabaseConfigurationMessage() {
  const config = window.PARKSMART_SUPABASE_CONFIG;
  if (supabaseInitializationError) return `Supabase configuration is invalid: ${supabaseInitializationError.message}`;
  if (!config?.url || !config?.anonKey) return "Connect Supabase by adding the project URL and anon key to supabase-config.js.";
  if (!window.supabase) return "Supabase JS did not load. Check the internet connection or CDN availability.";
  return "Supabase is unavailable. Check the project URL and anon key.";
}

async function getAccountData() {
  const client = getSupabaseClient();
  if (!client) return { client: null, user: null, profile: null, vehicles: [], error: null };
  const { data: authData, error: authError } = await client.auth.getUser();
  if (authError?.name === "AuthSessionMissingError" || authError?.code === "auth_session_missing") {
    return { client, user: null, profile: null, vehicles: [], error: null };
  }
  if (authError) return { client, user: null, profile: null, vehicles: [], error: authError };
  if (!authData.user) return { client, user: null, profile: null, vehicles: [], error: null };

  const [profileResult, vehiclesResult] = await Promise.all([
    client.from("profiles").select("user_id, full_name, user_type, campus_id").eq("user_id", authData.user.id).maybeSingle(),
    client.from("vehicles").select("id, plate_number, color").eq("user_id", authData.user.id).order("created_at")
  ]);
  if (profileResult.error) return { client, user: authData.user, profile: null, vehicles: [], error: profileResult.error };
  if (vehiclesResult.error) return { client, user: authData.user, profile: profileResult.data, vehicles: [], error: vehiclesResult.error };
  return { client, user: authData.user, profile: profileResult.data, vehicles: vehiclesResult.data || [], error: null };
}

window.ParkSmart = {
  getSupabaseClient,
  getAccountData,
  getSupabaseConfigurationMessage,
  vehicleColors: VEHICLE_COLORS,
  zones,
  rates: { visitorHourly: PARKING_RATE_RM_PER_HOUR, daily: DAILY_RATE_RM, gracePeriodMs: GRACE_PERIOD_MS }
};

function initializeWordmarkAnimations() {
  document.querySelectorAll(".wordmark-animation").forEach((wordmark) => {
    const text = wordmark.dataset.wordmark;
    if (!text) return;
    const visual = document.createElement("span");
    visual.className = "wordmark-visual";
    visual.setAttribute("aria-hidden", "true");
    Array.from(text).forEach((character, index) => {
      if (character === " ") {
        const space = document.createElement("span");
        space.className = "wordmark-space";
        space.textContent = " ";
        visual.append(space);
        return;
      }
      const letter = document.createElement("span");
      letter.className = "wordmark-letter";
      letter.style.setProperty("--letter-index", String(index));
      const current = document.createElement("span");
      current.className = "wordmark-letter-current";
      current.textContent = character;
      const incoming = document.createElement("span");
      incoming.className = "wordmark-letter-incoming";
      incoming.textContent = character;
      letter.append(current, incoming);
      visual.append(letter);
    });
    const period = wordmark.querySelector(".hero-period");
    wordmark.replaceChildren(visual);
    if (period) wordmark.append(period);
  });
}

function initializeNavigation() {
  const toggle = document.querySelector(".menu-toggle");
  const menu = document.querySelector("#primary-nav");
  if (!toggle || !menu) return;
  toggle.addEventListener("click", () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    toggle.setAttribute("aria-label", expanded ? "Open navigation menu" : "Close navigation menu");
    menu.classList.toggle("is-open", !expanded);
  });
  menu.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      menu.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-label", "Open navigation menu");
    });
  });
}

function initializeSiteQrCode() {
  const qrContainer = document.querySelector("#site-qr-code");
  if (!qrContainer) return;
  const qrStatus = document.querySelector("#site-qr-status");
  const qrUrlLabel = document.querySelector("#site-qr-url");
  const downloadButton = document.querySelector("#download-site-qr");
  const instagramLink = document.querySelector(".footer-instagram");
  if (typeof QRCode === "undefined" || !instagramLink) {
    qrStatus.textContent = "QR code generator unavailable.";
    qrContainer.textContent = "QR code unavailable.";
    return;
  }
  new QRCode(qrContainer, {
    text: instagramLink.href,
    width: 118,
    height: 118,
    colorDark: "#12305c",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });
  qrStatus.textContent = "Scan to visit our Instagram page.";
  qrUrlLabel.textContent = instagramLink.href;
  downloadButton.disabled = false;
  downloadButton.addEventListener("click", () => {
    const image = qrContainer.querySelector("img");
    const canvas = qrContainer.querySelector("canvas");
    const url = image?.src || canvas?.toDataURL("image/png");
    if (!url) {
      qrStatus.textContent = "Could not create a downloadable QR image. Try refreshing the page.";
      return;
    }
    const link = document.createElement("a");
    link.href = url;
    link.download = "apusmart-site-qr.png";
    document.body.append(link);
    link.click();
    link.remove();
  });
}

function initializeDashboard() {
  const zoneList = document.querySelector("#zone-list");
  if (!zoneList) return;
  const totalElement = document.querySelector("#available-total");
  const capacityElement = document.querySelector("#capacity-total");
  const statusElement = document.querySelector("#campus-status");
  const updatedElement = document.querySelector("#last-updated");
  const alternativeBox = document.querySelector("#alternative-box");

  function render() {
    const total = zones.reduce((sum, zone) => sum + zone.total, 0);
    const available = zones.reduce((sum, zone) => sum + zone.available, 0);
    totalElement.textContent = String(available);
    capacityElement.textContent = String(total);
    const ratio = available / total;
    const status = available === 0 ? ["red", "Full"] : ratio <= 0.3 ? ["amber", "Nearly Full"] : ["green", "Available"];
    statusElement.textContent = status[1];
    statusElement.className = `status-label status-${status[0]}`;
    const now = new Date();
    updatedElement.textContent = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(now);
    updatedElement.dateTime = now.toISOString();
    zoneList.replaceChildren(...zones.map((zone) => {
      const zoneRatio = zone.available / zone.total;
      const zoneStatus = zone.available === 0 ? ["red", "Full"] : zoneRatio <= 0.3 ? ["amber", "Nearly Full"] : ["green", "Available"];
      const row = document.createElement("article");
      row.className = `zone-row status-${zoneStatus[0]}`;
      row.innerHTML = `<div class="zone-details"><span class="zone-name"></span><span class="zone-count"><strong></strong> / ${zone.total}</span></div><span class="status-label status-${zoneStatus[0]}">${zoneStatus[1]}</span><div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="${zone.total}" aria-valuenow="${zone.available}"><div class="progress-fill"></div></div>`;
      row.querySelector(".zone-name").textContent = zone.name;
      row.querySelector(".zone-count strong").textContent = String(zone.available);
      if (zone.id === "zone-c") {
        const accessNote = document.createElement("span");
        accessNote.className = "zone-access-note";
        accessNote.textContent = "Visitors only";
        row.insertBefore(accessNote, row.querySelector(".status-label"));
      }
      row.querySelector(".progress-track").setAttribute("aria-label", `${zone.name} available spaces`);
      row.querySelector(".progress-fill").style.width = `${zoneRatio * 100}%`;
      return row;
    }));
    if (alternativeBox) alternativeBox.hidden = zones.every((zone) => zone.available > 0);
    window.updateParkingScene(zones);
  }

  render();
  window.setInterval(() => {
    zones.forEach((zone) => {
      const delta = Math.floor(Math.random() * 3) + 1;
      zone.available = Math.max(0, Math.min(zone.total, zone.available + (Math.random() < 0.5 ? -delta : delta)));
    });
    render();
  }, 5000);
}

function initializeVisitorCounter() {
  const countElement = document.querySelector("#visitor-stat-count");
  const statusElement = document.querySelector("#visitor-stat-status");
  if (!countElement || !statusElement) return;
  const client = getSupabaseClient();
  if (!client) {
    statusElement.textContent = getSupabaseConfigurationMessage();
    return;
  }

  let visitorId;
  try {
    visitorId = localStorage.getItem("apusmart.dailyVisitorId");
    if (!visitorId) {
      visitorId = crypto.randomUUID();
      localStorage.setItem("apusmart.dailyVisitorId", visitorId);
    }
  } catch (error) {
    statusElement.textContent = "Daily visitor count is unavailable because this browser blocks local storage.";
    console.warn("ParkSmart could not store the anonymous daily visitor ID.", error);
    return;
  }
  client.rpc("record_daily_visitor", { p_visitor_id: visitorId })
    .then(({ data, error }) => {
      if (error) throw error;
      countElement.textContent = Number(data).toLocaleString();
      statusElement.textContent = "Approximate unique browsers today (Malaysia time). Clearing browser storage may count you again.";
    })
    .catch((error) => {
      statusElement.textContent = "Visitor count is not available. Check the Supabase setup.";
      console.error("ParkSmart could not load the daily visitor count.", error);
    });
}

function createTextElement(tagName, text) {
  const element = document.createElement(tagName);
  element.textContent = text;
  return element;
}

function initializeAccountPage() {
  const form = document.querySelector("#account-form");
  if (!form) return;
  const modeToggle = document.querySelector("#account-mode-toggle");
  const modeNote = document.querySelector("#account-mode-note");
  const submitButton = document.querySelector("#account-submit");
  const accountType = document.querySelector("#account-type");
  const campusId = document.querySelector("#campus-id");
  const campusLabel = document.querySelector("#campus-id-label");
  const campusHint = document.querySelector("#campus-id-hint");
  let signInMode = false;

  function updateFields() {
    const visitor = accountType.value === "visitor";
    document.querySelector("#campus-id-field").hidden = visitor;
    campusId.disabled = visitor || signInMode;
    campusId.required = !visitor && !signInMode;
    document.querySelector("#account-name-field").hidden = signInMode;
    document.querySelector("#account-type-field").hidden = signInMode;
    document.querySelector("#first-car-field").hidden = signInMode;
    document.querySelector("#first-car-color-field").hidden = signInMode;
    document.querySelector("#account-name").required = !signInMode;
    document.querySelector("#first-car-plate").required = !signInMode;
    accountType.disabled = signInMode;
    if (accountType.value === "student") {
      campusLabel.textContent = "Student TP number";
      campusId.placeholder = "TP012345";
      campusId.pattern = "[Tt][Pp][0-9]{6}";
      campusHint.textContent = "Format: TP followed by 6 digits.";
    } else {
      campusLabel.textContent = "Staff ID";
      campusId.placeholder = "Enter your staff ID";
      campusId.removeAttribute("pattern");
      campusHint.textContent = "Enter the staff ID issued by APU.";
    }
    document.querySelector("#account-password").autocomplete = signInMode ? "current-password" : "new-password";
    submitButton.textContent = signInMode ? "Sign in" : "Create account";
    modeNote.textContent = signInMode
      ? "Sign in with the email and password used to register."
      : "Your account is stored securely in Supabase when configured.";
    modeToggle.textContent = signInMode ? "New to ParkSmart? Create an account" : "Already registered? Sign in";
  }

  accountType.addEventListener("change", updateFields);
  modeToggle.addEventListener("click", () => {
    signInMode = !signInMode;
    document.querySelector("#account-password").setAttribute("minlength", signInMode ? "1" : "8");
    document.querySelector("#account-password").value = "";
    updateFields();
  });
  updateFields();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = document.querySelector("#account-message");
    status.textContent = "";
    if (!form.reportValidity()) return;
    const client = getSupabaseClient();
    if (!client) {
      status.textContent = getSupabaseConfigurationMessage();
      return;
    }
    submitButton.disabled = true;
    try {
      const email = document.querySelector("#account-email").value.trim();
      const password = document.querySelector("#account-password").value;
      if (signInMode) {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.assign("index.html");
        return;
      }
      const userType = accountType.value;
      const campusIdValue = campusId.value.trim().toUpperCase();
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: document.querySelector("#account-name").value.trim(),
            user_type: userType,
            campus_id: userType === "visitor" ? null : campusIdValue,
            vehicle_plate: document.querySelector("#first-car-plate").value.trim().toUpperCase(),
            vehicle_color: document.querySelector("#first-car-color").value
          }
        }
      });
      if (error) throw error;
      status.textContent = data.session
        ? "Account created. You can now register parking."
        : "Account created. Check your email to confirm the account, then sign in.";
      if (data.session) window.setTimeout(() => window.location.assign("index.html"), 1200);
    } catch (error) {
      status.textContent = error.message || "Account request failed. Please try again.";
      console.error("ParkSmart account request failed.", error);
    } finally {
      submitButton.disabled = false;
    }
  });
}

function initializeProfilePanel() {
  const status = document.querySelector("#profile-status");
  if (!status) return;
  const details = document.querySelector("#profile-details");
  const addCarForm = document.querySelector("#add-car-form");
  const addCarInput = document.querySelector("#additional-car-plate");
  const addCarColor = document.querySelector("#additional-car-color");
  const profileMessage = document.querySelector("#profile-message");
  const signOutButton = document.querySelector("#sign-out-button");
  const addCarButton = addCarForm.querySelector('button[type="submit"]');

  async function loadProfile() {
    const result = await getAccountData();
    if (!result.client) {
      status.textContent = getSupabaseConfigurationMessage();
      return;
    }
    if (result.error) {
      status.textContent = `Profile could not be loaded: ${result.error.message}`;
      console.error("ParkSmart could not load the profile.", result.error);
      return;
    }
    if (!result.user) {
      status.textContent = "Sign in to see your profile and saved vehicles.";
      return;
    }
    if (!result.profile) {
      status.textContent = "Your account profile is still being set up. Refresh in a moment or contact the site administrator.";
      return;
    }
    const roleLabel = { student: "Student", staff: "Lecturer / Staff", visitor: "Visitor" }[result.profile.user_type] || "Account";
    status.textContent = "";
    details.hidden = false;
    details.replaceChildren(
      createTextElement("h3", result.profile.full_name),
      createTextElement("p", `${roleLabel}${result.profile.campus_id ? ` · ${result.profile.campus_id}` : ""}`),
      createTextElement("h3", "Your registered vehicles")
    );
    if (result.vehicles.length) {
      const list = document.createElement("ul");
      list.className = "vehicle-list";
      result.vehicles.forEach((vehicle) => {
        const item = document.createElement("li");
        const swatch = document.createElement("span");
        const color = VEHICLE_COLORS[vehicle.color] || VEHICLE_COLORS.orange;
        swatch.className = "vehicle-color-swatch";
        swatch.style.backgroundColor = color.color;
        swatch.setAttribute("aria-label", `${color.label} car`);
        item.append(swatch, createTextElement("span", `${vehicle.plate_number} · ${color.label}`));
        list.append(item);
      });
      details.append(list);
    } else {
      details.append(createTextElement("p", "No vehicles are registered yet."));
    }
    addCarForm.hidden = false;
    signOutButton.hidden = false;
  }

  addCarForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    profileMessage.textContent = "";
    if (!addCarForm.reportValidity()) return;
    const result = await getAccountData();
    if (!result.user) {
      profileMessage.textContent = result.error?.message || "Sign in before adding a car.";
      return;
    }
    addCarButton.disabled = true;
    const plate = addCarInput.value.trim().toUpperCase();
    try {
      const { error } = await result.client.from("vehicles").insert({
        user_id: result.user.id,
        plate_number: plate,
        color: addCarColor.value
      });
      if (error) throw error;
      addCarInput.value = "";
      profileMessage.textContent = `${plate} added to your profile.`;
      await loadProfile();
    } catch (error) {
      profileMessage.textContent = `Could not add that vehicle: ${error.message || "Please try again."}`;
      console.error("ParkSmart could not add a vehicle.", error);
    } finally {
      addCarButton.disabled = false;
    }
  });

  signOutButton.addEventListener("click", async () => {
    const client = getSupabaseClient();
    if (!client) return;
    const { error } = await client.auth.signOut();
    if (error) {
      profileMessage.textContent = `Could not sign out: ${error.message}`;
      console.error("ParkSmart could not sign out.", error);
      return;
    }
    window.location.reload();
  });

  loadProfile().catch((error) => {
    status.textContent = `Profile could not be loaded: ${error.message || "Please refresh and try again."}`;
    console.error("ParkSmart could not initialize the profile panel.", error);
  });
}

function initializeParkingSessionSummary() {
  const elapsedElement = document.querySelector("#parking-elapsed");
  if (!elapsedElement) return;
  const vehicleElement = document.querySelector("#parking-session-vehicle");
  const statusElement = document.querySelector("#parking-grace-status");
  const messageElement = document.querySelector("#grace-countdown");
  const detailsElement = document.querySelector("#active-car-details");
  const leaveButton = document.querySelector("#left-without-parking");
  const carScene = document.querySelector("#parked-car-scene");
  const carModel = document.querySelector("#parked-car-model");
  const registerLink = document.querySelector("#register-parking-home");
  const introElement = document.querySelector("#parking-home-intro");
  const sessionCard = document.querySelector("#parking-home-session");
  const demoPaymentCard = document.querySelector("#demo-payment-card");
  const demoPaymentSummary = document.querySelector("#demo-payment-summary");
  const demoPaymentButton = document.querySelector("#demo-card-payment");
  const demoPaymentStatus = document.querySelector("#demo-payment-status");
  const previewColor = new URLSearchParams(window.location.search).get("carPreview");
  demoPaymentCard.hidden = true;
  const malaysiaDateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  const carTextureFilters = {
    orange: "none",
    blue: "hue-rotate(184deg) saturate(.88)",
    red: "hue-rotate(326deg) saturate(1.02)",
    green: "hue-rotate(92deg) saturate(.78)",
    purple: "hue-rotate(226deg) saturate(.77)",
    silver: "grayscale(.85) brightness(1.27)",
    black: "grayscale(.55) brightness(.66)"
  };
  const carTextureSource = new Image();
  carTextureSource.src = "assets/Textures/colormap.png";
  const carTextureCache = new Map();
  let currentSession = null;
  let currentUser = null;
  let userType = null;
  let currentCarColor = "orange";
  let lastRequestedCarColor = null;
  let carColorRequest = 0;
  function showDemoPayment(amount) {
    demoPaymentCard.dataset.amount = String(amount);
    demoPaymentCard.hidden = false;
    demoPaymentButton.disabled = amount <= 0;
    demoPaymentButton.hidden = amount <= 0;
    demoPaymentButton.textContent = "Pay by debit card (demo)";
    demoPaymentStatus.textContent = amount > 0
      ? "No real payment has been made. Select the button to see the demo result."
      : "No payment is due for this session.";
    demoPaymentSummary.textContent = amount > 0
      ? `Final demo amount: RM ${amount.toFixed(2)}.`
      : "Final demo amount: RM 0.00.";
  }

  function applyCarModelColor(colorName) {
    if (!carModel?.model || lastRequestedCarColor === colorName) return;
    lastRequestedCarColor = colorName;
    const request = ++carColorRequest;
    void (async () => {
      let texture = carTextureCache.get(colorName);
      if (!texture) {
        await carTextureSource.decode();
        const canvas = document.createElement("canvas");
        canvas.width = carTextureSource.naturalWidth;
        canvas.height = carTextureSource.naturalHeight;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("A canvas context is unavailable for car recolouring.");
        context.filter = carTextureFilters[colorName];
        context.drawImage(carTextureSource, 0, 0);
        texture = await carModel.createTexture(canvas.toDataURL("image/png"));
        carTextureCache.set(colorName, texture);
      }
      if (request !== carColorRequest || !carModel.model) return;
      const carMaterial = carModel.model.materials.find((material) => material.name === "colormap");
      const baseColorTexture = carMaterial?.pbrMetallicRoughness.baseColorTexture;
      if (!baseColorTexture) throw new Error("The 3D car paint texture could not be found.");
      baseColorTexture.setTexture(texture);
    })().catch((error) => {
      carScene.classList.remove("has-3d-car");
      console.error("ParkSmart could not recolour the 3D car model; showing its fallback illustration.", error);
    });
  }

  carModel?.addEventListener("load", () => {
    carScene.classList.add("has-3d-car");
    applyCarModelColor(currentCarColor);
  }, { once: true });
  carModel?.addEventListener("error", (error) => {
    console.warn("ParkSmart could not load the 3D car model; showing its fallback illustration.", error);
  }, { once: true });

  function render() {
    if (!currentSession) {
      sessionCard.hidden = true;
      elapsedElement.textContent = "00:00:00";
      vehicleElement.textContent = "No active parking session";
      statusElement.textContent = "Your parking details will appear here when you register parking.";
      detailsElement.hidden = true;
      carScene.hidden = true;
      leaveButton.disabled = true;
      registerLink.hidden = false;
      introElement.textContent = "Sign in and register parking to see your car, its sensor location, time parked, and current price here.";
      return;
    }
    const startedAt = new Date(currentSession.starts_at).getTime();
    const now = Date.now();
    const elapsed = Math.max(0, now - startedAt);
    sessionCard.hidden = false;
    elapsedElement.textContent = formatElapsedTime(elapsed);
    vehicleElement.textContent = currentSession.vehicles?.plate_number || "Registered vehicle";
    leaveButton.disabled = false;
    detailsElement.hidden = false;
    carScene.hidden = false;
    registerLink.hidden = true;
    introElement.textContent = "Your active parking details update automatically while your session is running.";
    const isVisitor = userType === "visitor";
    const graceRemaining = currentSession.grace_until
      ? Math.max(0, new Date(currentSession.grace_until).getTime() - now)
      : 0;
    const amount = isVisitor
      ? Math.ceil((elapsed / 3600000) * PARKING_RATE_RM_PER_HOUR * 100) / 100
      : elapsed >= GRACE_PERIOD_MS
        ? getDailyParkingCharge(startedAt, now)
        : 0;
    const location = currentSession.sensor_location || "Waiting for parking sensor";
    const colorName = VEHICLE_COLORS[currentSession.vehicles?.color] ? currentSession.vehicles.color : "orange";
    currentCarColor = colorName;
    carScene.dataset.carColor = colorName;
    carScene.setAttribute("aria-label", `3D ${colorName} car model parked between two yellow parking lines`);
    applyCarModelColor(colorName);
    detailsElement.replaceChildren(
      createTextElement("p", `Vehicle: ${currentSession.vehicles?.plate_number || "Registered car"}`),
      createTextElement("p", `Car location: ${location}`),
      createTextElement("p", `Current price: RM ${amount.toFixed(2)}`),
      createTextElement("p", `Rate: ${isVisitor ? "RM 1.00 per hour" : "RM 5.00 per day"}`)
    );
    if (currentSession.isPreview) {
      statusElement.textContent = "Illustration preview · not a real parking session";
      statusElement.className = "is-charge-applied";
      messageElement.textContent = "This is a visual example only. No account or parking session was created.";
      leaveButton.hidden = true;
      return;
    }
    leaveButton.hidden = false;
    if (isVisitor) {
      statusElement.textContent = "Visitor parking · charges from the start";
      statusElement.className = "is-charge-applied";
      messageElement.textContent = "No grace period applies to visitor parking.";
    } else if (graceRemaining > 0) {
      statusElement.textContent = `${formatElapsedTime(graceRemaining)} left in the 10-minute grace period`;
      statusElement.className = "is-grace-active";
      messageElement.textContent = "End parking within the grace period to avoid a charge.";
    } else {
      statusElement.textContent = "Grace period ended · RM 5.00 daily rate";
      statusElement.className = "is-charge-applied";
      messageElement.textContent = "End parking when you leave. The final demo charge is calculated then.";
    }
  }

  async function loadSession() {
    if (previewColor && Object.hasOwn(VEHICLE_COLORS, previewColor)) {
      const startedAt = Date.now() - 28 * 60 * 1000;
      currentSession = {
        isPreview: true,
        starts_at: new Date(startedAt).toISOString(),
        grace_until: new Date(startedAt + GRACE_PERIOD_MS).toISOString(),
        sensor_location: "Zone A · Space 254",
        vehicles: { plate_number: "WXY 1234", color: previewColor }
      };
      userType = "student";
      render();
      return;
    }
    const account = await getAccountData();
    currentUser = account.user;
    userType = account.profile?.user_type || null;
    if (!account.client || !account.user) {
      render();
      return;
    }
    if (account.error) {
      render();
      sessionCard.hidden = false;
      messageElement.textContent = `Parking account unavailable: ${account.error.message}`;
      console.error("ParkSmart could not load the parking account.", account.error);
      return;
    }
    if (!userType) {
      render();
      sessionCard.hidden = false;
      messageElement.textContent = "Your account profile is not ready to load parking details.";
      return;
    }
    const { data, error } = await account.client
      .from(SESSION_TABLE)
      .select("id, starts_at, grace_until, sensor_location, amount_rm, status, vehicles(plate_number, color)")
      .eq("user_id", account.user.id)
      .eq("status", "active")
      .order("starts_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      render();
      sessionCard.hidden = false;
      messageElement.textContent = `Parking session unavailable: ${error.message}`;
      console.error("ParkSmart could not load the active parking session.", error);
      return;
    }
    currentSession = data;
    demoPaymentCard.hidden = true;
    render();
  }

  leaveButton.addEventListener("click", async () => {
    if (!currentSession || !currentUser) return;
    leaveButton.disabled = true;
    const account = await getAccountData();
    if (!account.client || !account.user) {
      messageElement.textContent = "Sign in to end this parking session.";
      leaveButton.disabled = false;
      return;
    }
    const { data: endedSession, error } = await account.client.rpc("end_parking_session", { p_session_id: currentSession.id });
    if (error) {
      messageElement.textContent = `Could not end the session: ${error.message}`;
      console.error("ParkSmart could not end the parking session.", error);
      leaveButton.disabled = false;
      return;
    }
    const finalAmount = Number(endedSession?.amount_rm || 0);
    currentSession = null;
    render();
    showDemoPayment(finalAmount);
    if (finalAmount === 0) {
      messageElement.textContent = "Parking ended. No demo charge was recorded.";
    }
  });

  demoPaymentButton.addEventListener("click", () => {
    const amount = Number(demoPaymentCard.dataset.amount);
    if (!Number.isFinite(amount) || amount <= 0 || demoPaymentButton.disabled) return;
    demoPaymentButton.disabled = true;
    demoPaymentButton.textContent = "Demo payment complete";
    demoPaymentStatus.textContent = `Demo debit-card payment complete for RM ${amount.toFixed(2)}. No real transaction was made and no card details were collected.`;
  });

  function formatElapsedTime(milliseconds) {
    const seconds = Math.floor(Math.max(0, milliseconds) / 1000);
    return `${String(Math.floor(seconds / 3600)).padStart(2, "0")}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function getDailyParkingCharge(startedAt, endedAt) {
    function malaysiaDate(timestamp) {
      const parts = malaysiaDateFormatter.formatToParts(new Date(timestamp));
      const dateParts = Object.fromEntries(parts.map((part) => [part.type, part.value]));
      return Date.UTC(Number(dateParts.year), Number(dateParts.month) - 1, Number(dateParts.day));
    }

    const calendarDays = Math.floor((malaysiaDate(endedAt) - malaysiaDate(startedAt)) / 86400000) + 1;
    return Math.max(1, calendarDays) * DAILY_RATE_RM;
  }

  loadSession().catch((error) => {
    render();
    sessionCard.hidden = false;
    messageElement.textContent = `Parking session unavailable: ${error.message || "Please refresh and try again."}`;
    console.error("ParkSmart could not initialize the active parking session.", error);
  });
  window.setInterval(render, 1000);
}

initializeNavigation();
initializeWordmarkAnimations();
initializeSiteQrCode();
initializeDashboard();
initializeVisitorCounter();
initializeAccountPage();
initializeProfilePanel();
initializeParkingSessionSummary();
