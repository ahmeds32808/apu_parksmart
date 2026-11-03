const SLOT_UPDATE_INTERVAL_MS = 5000;
const PARKING_RATE_RM_PER_HOUR = 1.00;
const GRACE_PERIOD_MS = 10 * 60 * 1000;
const FAST_GRACE_PERIOD_MS = 15 * 1000;
const ACTIVE_PARKING_SESSION_KEY = "apusmart.activeParkingSession";
const VISITOR_ZONE_ID = "zone-c";
const zones = [
  { id: "zone-a", name: "Zone A", total: 36, available: 13 },
  { id: "zone-b", name: "Zone B", total: 42, available: 17 },
  { id: "zone-c", name: "Zone C", total: 30, available: 9 }
];

const zoneList = document.querySelector("#zone-list");
const availableTotal = document.querySelector("#available-total");
const capacityTotal = document.querySelector("#capacity-total");
const campusStatus = document.querySelector("#campus-status");
const lastUpdated = document.querySelector("#last-updated");
const userTypeSelect = document.querySelector("#user-type");
const userIdentifierField = document.querySelector("#user-identifier-field");
const userIdentifierInput = document.querySelector("#user-identifier");
const userIdentifierLabel = document.querySelector("#user-identifier-label");
const userIdentifierHint = document.querySelector("#user-identifier-hint");
const universityEmailField = document.querySelector("#university-email-field");
const receiptEmailInput = document.querySelector("#receipt-email");
const receiptEmailLabel = document.querySelector("#receipt-email-label");
const receiptEmailHint = document.querySelector("#receipt-email-hint");
const visitorEmailField = document.querySelector("#visitor-email-field");
const visitorEmailInput = document.querySelector("#visitor-email");
const visitorPhoneField = document.querySelector("#visitor-phone-field");
const visitorCountryCodeSelect = document.querySelector("#visitor-country-code");
const visitorPhoneInput = document.querySelector("#visitor-phone");
const visitorCustomCodeField = document.querySelector("#visitor-custom-code-field");
const visitorCustomCountryCodeInput = document.querySelector("#visitor-custom-country-code");
const zoneSelect = document.querySelector("#zone-select");
const durationSelect = document.querySelector("#duration");
const amountInput = document.querySelector("#amount");
const selectedAvailable = document.querySelector("#selected-available");
const availabilityDot = document.querySelector(".availability-mini-dot");
const registrationForm = document.querySelector("#registration-form");
const registrationMessage = document.querySelector("#registration-message");
const paymentDialog = document.querySelector("#payment-dialog");
const confirmationDialog = document.querySelector("#confirmation-dialog");
const paymentForm = document.querySelector("#payment-form");
const paymentError = document.querySelector("#payment-error");
const bookingSummary = document.querySelector("#booking-summary");
let pendingBooking = null;
let confirmedReceipt = null;
let fullZoneNoticeVisible = false;
let activeParkingSession = null;
let completedParkingSession = null;
let parkingSessionStorageWarning = "";

function initializeSiteQrCode() {
  const qrContainer = document.querySelector("#site-qr-code");
  if (!qrContainer) return;

  const qrStatus = document.querySelector("#site-qr-status");
  const qrUrlLabel = document.querySelector("#site-qr-url");
  const downloadButton = document.querySelector("#download-site-qr");
  const instagramUrl = document.querySelector(".footer-instagram").href;
  if (typeof QRCode === "undefined") {
    qrStatus.textContent = "QR code generator unavailable. Check your internet connection.";
    qrContainer.textContent = "QR code unavailable.";
    return;
  }

  qrContainer.replaceChildren();
  new QRCode(qrContainer, {
    text: instagramUrl,
    width: 118,
    height: 118,
    colorDark: "#12305c",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });
  qrStatus.textContent = "Scan to visit our Instagram page.";
  qrUrlLabel.textContent = instagramUrl;
  downloadButton.disabled = false;
  downloadButton.addEventListener("click", () => {
    const qrImage = qrContainer.querySelector("img");
    const qrCanvas = qrContainer.querySelector("canvas");
    const qrImageUrl = qrImage && qrImage.src
      ? qrImage.src
      : qrCanvas && qrCanvas.toDataURL("image/png");
    if (!qrImageUrl) {
      qrStatus.textContent = "Could not create a downloadable QR image. Try refreshing the page.";
      return;
    }

    const downloadLink = document.createElement("a");
    downloadLink.href = qrImageUrl;
    downloadLink.download = "apusmart-site-qr.png";
    document.body.append(downloadLink);
    downloadLink.click();
    downloadLink.remove();
  });
}

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

initializeSiteQrCode();
initializeWordmarkAnimations();

function getZone(id) {
  return zones.find((zone) => zone.id === id);
}

function isZoneAllowedForUserType(userType, zoneId) {
  return userType === "visitor"
    ? zoneId === VISITOR_ZONE_ID
    : zoneId !== VISITOR_ZONE_ID;
}

function getStatus(available, total) {
  const freeRatio = available / total;
  if (available === 0) return { key: "red", label: "Full" };
  if (freeRatio <= 0.3) return { key: "amber", label: "Nearly Full" };
  return { key: "green", label: "Available" };
}

function renderZoneCards() {
  zoneList.innerHTML = zones.map((zone) => {
    const status = getStatus(zone.available, zone.total);
    const percentage = (zone.available / zone.total) * 100;
    return `<article class="zone-row status-${status.key}">
      <div class="zone-details">
        <span class="zone-name">${zone.name}</span>
        <span class="zone-count"><strong>${zone.available}</strong> / ${zone.total}</span>
      </div>
      <span class="status-label status-${status.key}">${status.label}</span>
      <div class="progress-track" role="progressbar" aria-label="${zone.name} available spaces" aria-valuemin="0" aria-valuemax="${zone.total}" aria-valuenow="${zone.available}">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
    </article>`;
  }).join("");
}

function updateZoneChoices(previousZoneId) {
  const isVisitor = userTypeSelect.value === "visitor";
  const allowedZones = zones.filter((zone) => isZoneAllowedForUserType(userTypeSelect.value, zone.id));
  const options = Array.from(zoneSelect.options).filter((option) => option.value);
  zones.forEach((zone) => {
    const option = options.find((item) => item.value === zone.id);
    option.disabled = zone.available === 0 || !isZoneAllowedForUserType(userTypeSelect.value, zone.id);
    if (zone.available === 0) {
      option.textContent = `${zone.name} — Full`;
    } else if (!isZoneAllowedForUserType(userTypeSelect.value, zone.id)) {
      option.textContent = isVisitor
        ? `${zone.name} — Visitor parking is in Zone C`
        : `${zone.name} — Visitor parking only`;
    } else {
      option.textContent = `${zone.name} — ${zone.available} available`;
    }
  });

  let selectedZone = getZone(zoneSelect.value);
  if (!selectedZone || !allowedZones.includes(selectedZone) || selectedZone.available === 0) {
    const nextZone = allowedZones.find((zone) => zone.available > 0);
    zoneSelect.value = nextZone ? nextZone.id : "";
    if (selectedZone && allowedZones.includes(selectedZone) && selectedZone.available === 0) {
      const alternativeZone = allowedZones.find((zone) => zone.available > 0);
      registrationMessage.textContent = alternativeZone
        ? `${selectedZone.name} is full. Try ${alternativeZone.name}, which has ${alternativeZone.available} spaces available.`
        : isVisitor
          ? "Zone C is full. Visitor parking is only available in Zone C."
          : "Zones A and B are full. Student and staff parking is only available in Zones A and B.";
      fullZoneNoticeVisible = true;
    } else if (fullZoneNoticeVisible) {
      registrationMessage.textContent = "";
      fullZoneNoticeVisible = false;
    }
  } else if (previousZoneId !== zoneSelect.value && fullZoneNoticeVisible) {
    registrationMessage.textContent = "";
    fullZoneNoticeVisible = false;
  }

  registrationForm.querySelector('button[type="submit"]').disabled = !allowedZones.some((zone) => zone.available > 0);
  updateSelectedAvailability();
}

function updateSelectedAvailability() {
  const zone = getZone(zoneSelect.value);
  if (!zone) {
    selectedAvailable.value = "No spaces available";
    availabilityDot.classList.add("is-full");
    availabilityDot.classList.remove("is-low");
    return;
  }
  selectedAvailable.value = `${zone.available} ${zone.available === 1 ? "space" : "spaces"}`;
  const status = getStatus(zone.available, zone.total);
  availabilityDot.classList.toggle("is-low", status.key === "amber");
  availabilityDot.classList.toggle("is-full", status.key === "red");
}

function updateAlternativeBox() {
  const box = document.querySelector("#alternative-box");
  const fullZones = zones.filter((zone) => zone.available === 0);
  box.hidden = fullZones.length === 0;
  if (!fullZones.length) return;

  const suggestedZone = zones.find((zone) => zone.available > 0);
  const visitorParkingNote = getZone(VISITOR_ZONE_ID).available > 0
    ? "Visitor parking is available in Zone C, or choose outside parking."
    : "Zone C visitor parking is full; choose outside parking.";
  document.querySelector("#alternative-suggestion").textContent = suggestedZone
    ? `${fullZones.map((zone) => zone.name).join(", ")} ${fullZones.length === 1 ? "is" : "are"} full. Try ${suggestedZone.name} (${suggestedZone.available} spaces available). ${visitorParkingNote}`
    : `All campus zones are full. ${visitorParkingNote}`;
}

function updateDashboard() {
  const totalAvailable = zones.reduce((sum, zone) => sum + zone.available, 0);
  const totalCapacity = zones.reduce((sum, zone) => sum + zone.total, 0);
  availableTotal.textContent = String(totalAvailable);
  capacityTotal.textContent = String(totalCapacity);
  const overallStatus = getStatus(totalAvailable, totalCapacity);
  campusStatus.textContent = overallStatus.label;
  campusStatus.className = `status-label status-${overallStatus.key}`;
  const now = new Date();
  lastUpdated.textContent = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  }).format(now);
  lastUpdated.dateTime = now.toISOString();

  renderZoneCards();
  updateZoneChoices(zoneSelect.value);
  updateAlternativeBox();
  updateParkingScene(zones);
}

function updateAmount() {
  const duration = Number(durationSelect.value);
  amountInput.value = (duration * PARKING_RATE_RM_PER_HOUR).toFixed(2);
}

function createSummaryItem(label, value, className = "summary-item") {
  const item = document.createElement("div");
  item.className = className;
  const itemLabel = document.createElement("span");
  itemLabel.textContent = label;
  const itemValue = document.createElement("strong");
  itemValue.textContent = value;
  item.append(itemLabel, itemValue);
  return item;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[character]);
}

function downloadReceipt(receipt) {
  const receiptDate = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(receipt.confirmedAt);
  const receiptRows = [
    ["Receipt reference", receipt.reference],
    ["Date", receiptDate],
    ["Receipt email", receipt.receiptEmail],
    [receipt.identifierLabel, receipt.identifier],
    ["Vehicle", receipt.vehicleNumber],
    ["Zone", getZone(receipt.zoneId).name],
    ["Duration", `${receipt.duration} ${receipt.duration === 1 ? "hour" : "hours"}`],
    ["Amount", `RM ${receipt.amount}`],
    ["Payment status", "Demo only — no real payment was processed"]
  ];
  const receiptHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>APU ParkSmart receipt ${escapeHtml(receipt.reference)}</title>
  <style>
    body{margin:0;padding:32px;background:#f4f7fa;color:#17283d;font:15px/1.5 Arial,sans-serif}
    main{max-width:620px;margin:0 auto;padding:32px;border:1px solid #e4eaf0;border-radius:16px;background:#fff}
    h1{margin:0;color:#12305c;font-size:25px}p{color:#63738a}
    dl{margin:24px 0}dl div{display:flex;justify-content:space-between;gap:20px;padding:12px 0;border-bottom:1px solid #e4eaf0}
    dt{color:#63738a}dd{margin:0;color:#12305c;font-weight:700;text-align:right}
    .notice{padding:12px;border-radius:8px;background:#f0f7fb;font-size:12px}
    @media print{body{padding:0;background:#fff}main{border:0}}
  </style>
</head>
<body>
  <main>
    <h1>APU ParkSmart</h1>
    <p>Parking receipt · ${escapeHtml(receipt.reference)}</p>
    <dl>${receiptRows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl>
    <p class="notice">This is a student-project demo receipt. No real payment was processed. You can print this page or save it as a PDF.</p>
  </main>
</body>
</html>`;
  const receiptUrl = URL.createObjectURL(new Blob([receiptHtml], { type: "text/html;charset=utf-8" }));
  const downloadLink = document.createElement("a");
  downloadLink.href = receiptUrl;
  downloadLink.download = `apusmart-receipt-${receipt.reference.replace(/[^a-z0-9-]/gi, "")}.html`;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  window.setTimeout(() => URL.revokeObjectURL(receiptUrl), 1000);
}

function openPayment(booking) {
  pendingBooking = booking;
  const zone = getZone(booking.zoneId);
  bookingSummary.replaceChildren(
    createSummaryItem(booking.identifierLabel, booking.identifier),
    createSummaryItem("Receipt email", booking.receiptEmail),
    createSummaryItem("Vehicle", booking.vehicleNumber),
    createSummaryItem("Zone", zone.name),
    createSummaryItem("Duration", `${booking.duration} ${booking.duration === 1 ? "hour" : "hours"}`),
    createSummaryItem("Charge after grace period", `RM ${booking.amount}`)
  );
  paymentError.textContent = "";
  paymentForm.reset();
  paymentDialog.showModal();
}

function formatCardNumber(value) {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function formatExpiry(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

function createBookingReference() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const values = new Uint32Array(7);
  crypto.getRandomValues(values);
  return `APU-${Array.from(values, (value) => characters[value % characters.length]).join("")}`;
}

function closeDialog(dialog) {
  if (dialog.open) dialog.close();
}

function formatElapsedTime(milliseconds) {
  const totalSeconds = Math.floor(Math.max(0, milliseconds) / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}

function loadActiveParkingSession() {
  try {
    const storedSession = localStorage.getItem(ACTIVE_PARKING_SESSION_KEY);
    if (!storedSession) return null;
    const session = JSON.parse(storedSession);
    const validSession = session &&
      zones.some((zone) => zone.id === session.zoneId) &&
      Number.isFinite(session.startedAt) &&
      Number.isFinite(session.gracePeriodMs) &&
      [GRACE_PERIOD_MS, FAST_GRACE_PERIOD_MS].includes(session.gracePeriodMs) &&
      Number.isFinite(session.chargeAmount) &&
      session.chargeAmount >= 0 &&
      (session.chargeAppliedAt === null ||
        (Number.isFinite(session.chargeAppliedAt) && session.chargeAppliedAt >= session.startedAt)) &&
      typeof session.reference === "string";
    if (validSession) return session;

    localStorage.removeItem(ACTIVE_PARKING_SESSION_KEY);
    console.warn("ParkSmart removed an invalid saved demo parking session.");
    return null;
  } catch (error) {
    console.warn("ParkSmart could not restore the saved demo parking session.", error);
    return null;
  }
}

function saveActiveParkingSession() {
  try {
    localStorage.setItem(ACTIVE_PARKING_SESSION_KEY, JSON.stringify(activeParkingSession));
    parkingSessionStorageWarning = "";
  } catch (error) {
    console.warn("ParkSmart could not save the demo parking session in this browser.", error);
    parkingSessionStorageWarning = "Timer tracking will stop if you close or refresh this page.";
  }
}

function clearSavedParkingSession() {
  try {
    localStorage.removeItem(ACTIVE_PARKING_SESSION_KEY);
  } catch (error) {
    console.warn("ParkSmart could not clear the saved demo parking session.", error);
  }
}

function applyParkingChargeIfDue(now = Date.now()) {
  if (!activeParkingSession || activeParkingSession.chargeAppliedAt !== null) return;
  if (now - activeParkingSession.startedAt < activeParkingSession.gracePeriodMs) return;

  activeParkingSession.chargeAppliedAt = activeParkingSession.startedAt + activeParkingSession.gracePeriodMs;
  saveActiveParkingSession();
}

function renderParkingSession() {
  const elapsedElement = document.querySelector("#parking-elapsed");
  const zoneElement = document.querySelector("#parking-session-zone");
  const graceStatus = document.querySelector("#parking-grace-status");
  const message = document.querySelector("#grace-countdown");
  const leaveButton = document.querySelector("#left-without-parking");
  const speedUpDemo = document.querySelector("#speed-up-demo");

  if (activeParkingSession) {
    const now = Date.now();
    applyParkingChargeIfDue(now);
    const elapsed = Math.max(0, now - activeParkingSession.startedAt);
    const zone = getZone(activeParkingSession.zoneId);
    elapsedElement.textContent = formatElapsedTime(elapsed);
    const startedAt = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date(activeParkingSession.startedAt));
    zoneElement.textContent = `${zone.name} · started ${startedAt}`;
    leaveButton.disabled = false;
    speedUpDemo.disabled = true;
    if (elapsed < activeParkingSession.gracePeriodMs) {
      const remaining = activeParkingSession.gracePeriodMs - elapsed;
      graceStatus.textContent = `${formatElapsedTime(remaining)} grace time remaining`;
      graceStatus.className = "is-grace-active";
    } else {
      graceStatus.textContent = `Grace period ended · RM ${activeParkingSession.chargeAmount.toFixed(2)} simulated charge applied`;
      graceStatus.className = "is-charge-applied";
    }
    message.textContent = parkingSessionStorageWarning ||
      (elapsed < activeParkingSession.gracePeriodMs
        ? `RM ${activeParkingSession.chargeAmount.toFixed(2)} will be simulated if you stay past the grace period.`
        : "This is a demo charge only. No real money was taken.");
    return;
  }

  leaveButton.disabled = true;
  speedUpDemo.disabled = false;
  if (completedParkingSession) {
    elapsedElement.textContent = formatElapsedTime(completedParkingSession.elapsed);
    zoneElement.textContent = `${completedParkingSession.zoneName} · Session ended`;
    graceStatus.textContent = completedParkingSession.chargeWaived
      ? "Left within grace period · charge waived"
      : `RM ${completedParkingSession.chargeAmount.toFixed(2)} simulated charge applied`;
    graceStatus.className = completedParkingSession.chargeWaived ? "is-grace-active" : "is-charge-applied";
    message.textContent = completedParkingSession.chargeWaived
      ? `Session duration: ${formatElapsedTime(completedParkingSession.elapsed)}. No demo charge was applied.`
      : `Session duration: ${formatElapsedTime(completedParkingSession.elapsed)}. No real money was taken.`;
    return;
  }

  elapsedElement.textContent = "00:00:00";
  zoneElement.textContent = "No active parking session";
  graceStatus.textContent = "Complete a demo booking to start tracking.";
  graceStatus.className = "";
  message.textContent = "";
}

function initializeLegacyCampusScene() {
  const container = document.querySelector("#parking-scene");
  const canvas = container && container.querySelector("canvas");
  if (!container || !canvas || !window.THREE) return;

  const THREE = window.THREE;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (error) {
    console.warn("ParkSmart 3D scene could not start; showing the fallback illustration.", error);
    return;
  }

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdce8ed);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
  const target = new THREE.Vector3(0, 0, 0);
  const ambient = new THREE.HemisphereLight(0xffffff, 0x627b70, 0.72);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff3d9, 1.15);
  sun.position.set(-11, 20, 15);
  scene.add(sun);

  const mat = (color, roughness = 0.85, extra = {}) => new THREE.MeshStandardMaterial({
    color, roughness, ...extra
  });
  const grassMaterial = mat(0x568365);
  const asphaltMaterial = mat(0x344a57);
  const stripeMaterial = mat(0xf6f1dc);
  const signMaterial = mat(0x12305c);
  const windowMaterial = mat(0x537c8d, 0.4, { metalness: 0.12 });
  const carColors = [0xe3f0ef, 0xe0b75a, 0x6da6b8, 0xc9745b, 0x8093c0];
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(46, 38), grassMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.42;
  scene.add(ground);

  const road = new THREE.Mesh(new THREE.BoxGeometry(31, 0.16, 3.5), asphaltMaterial);
  road.position.set(0, -0.2, 0);
  scene.add(road);
  const roadDashMaterial = mat(0xe9d891);
  for (let index = 0; index < 9; index += 1) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.035, 0.09), roadDashMaterial);
    dash.position.set(-13 + index * 3.2, -0.1, 0);
    scene.add(dash);
  }

  const campusWallMaterial = mat(0xe4e9e1);
  const campusRoofMaterial = mat(0x24476a);
  const campusBuilding = new THREE.Mesh(new THREE.BoxGeometry(16, 3.3, 2.4), campusWallMaterial);
  campusBuilding.position.set(0, 1.45, -14);
  scene.add(campusBuilding);
  const campusRoof = new THREE.Mesh(new THREE.BoxGeometry(16.6, 0.28, 2.8), campusRoofMaterial);
  campusRoof.position.set(0, 3.24, -14);
  scene.add(campusRoof);
  const campusWindowMaterial = mat(0x426e85, 0.38, { metalness: 0.12 });
  for (let index = 0; index < 10; index += 1) {
    const windowPane = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.95, 0.08), campusWindowMaterial);
    windowPane.position.set(-6.6 + index * 1.47, 1.86, -12.76);
    scene.add(windowPane);
  }
  const campusLabelCanvas = document.createElement("canvas");
  campusLabelCanvas.width = 700;
  campusLabelCanvas.height = 140;
  const campusLabelContext = campusLabelCanvas.getContext("2d");
  campusLabelContext.fillStyle = "#12305c";
  campusLabelContext.fillRect(0, 0, campusLabelCanvas.width, campusLabelCanvas.height);
  campusLabelContext.fillStyle = "#ffffff";
  campusLabelContext.font = "700 64px Arial";
  campusLabelContext.textAlign = "center";
  campusLabelContext.textBaseline = "middle";
  campusLabelContext.fillText("APU CAMPUS", 350, 70);
  const campusLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 1.1),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(campusLabelCanvas) })
  );
  campusLabel.position.set(0, 2.82, -12.76);
  scene.add(campusLabel);

  const streetLampMaterial = mat(0xffedb5, 0.25, { emissive: 0xffc44e, emissiveIntensity: 1.5 });
  [-12, -4, 4, 12].forEach((x) => {
    [-2.7, 2.7].forEach((z) => {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.8, 5), signMaterial);
      post.position.set(x, 0.9, z);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.05, 0.05), signMaterial);
      arm.position.set(x + 0.18, 1.72, z);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 6), streetLampMaterial);
      lamp.position.set(x + 0.35, 1.67, z);
      scene.add(post, arm, lamp);
    });
  });

  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const bulbGeometry = new THREE.SphereGeometry(0.18, 8, 6);
  const postGeometry = new THREE.CylinderGeometry(0.035, 0.045, 0.58, 5);
  const carBodyGeometry = new THREE.BoxGeometry(0.92, 0.32, 1.38);
  const carCabinGeometry = new THREE.BoxGeometry(0.74, 0.26, 0.68);
  const wheelGeometry = new THREE.CylinderGeometry(0.13, 0.13, 0.08, 7);
  const wheelMaterial = mat(0x26343a);
  const greenBulb = mat(0x71ffa6, 0.28, { emissive: 0x1bd56b, emissiveIntensity: 2.8 });
  const redBulb = mat(0xff7474, 0.28, { emissive: 0xe32d3d, emissiveIntensity: 2.6 });
  const stripes = new THREE.InstancedMesh(unitBox, stripeMaterial, 216);
  const posts = new THREE.InstancedMesh(postGeometry, signMaterial, 108);
  const greenBulbs = new THREE.InstancedMesh(bulbGeometry, greenBulb, 108);
  const redBulbs = new THREE.InstancedMesh(bulbGeometry, redBulb, 108);
  const carBodies = new THREE.InstancedMesh(carBodyGeometry, mat(0xffffff), 108);
  const carCabins = new THREE.InstancedMesh(carCabinGeometry, windowMaterial, 108);
  const wheels = new THREE.InstancedMesh(wheelGeometry, wheelMaterial, 432);
  scene.add(stripes, posts, greenBulbs, redBulbs, carBodies, carCabins, wheels);
  const instanceTransform = new THREE.Object3D();
  function setInstance(mesh, index, x, y, z, scaleX = 1, scaleY = 1, scaleZ = 1) {
    instanceTransform.position.set(x, y, z);
    instanceTransform.rotation.set(0, 0, 0);
    instanceTransform.scale.set(scaleX, scaleY, scaleZ);
    instanceTransform.updateMatrix();
    mesh.setMatrixAt(index, instanceTransform.matrix);
  }
  const spots = [];
  const zoneSigns = [];
  const zoneLayouts = [
    { id: "zone-a", name: "A", columns: 6, x: -8, z: -6, accent: 0x17a88f },
    { id: "zone-b", name: "B", columns: 6, x: 8, z: -6, accent: 0x2684cb },
    { id: "zone-c", name: "C", columns: 6, x: 0, z: 8, accent: 0xd89523 }
  ];

  zoneLayouts.forEach((layout) => {
    const zone = zones.find((item) => item.id === layout.id);
    const rows = Math.ceil(zone.total / layout.columns);
    const zoneWidth = layout.columns * 1.55 + 1.2;
    const zoneDepth = rows * 1.28 + 1.35;
    const zoneBase = new THREE.Mesh(new THREE.BoxGeometry(zoneWidth, 0.28, zoneDepth), asphaltMaterial);
    zoneBase.position.set(layout.x, -0.24, layout.z);
    scene.add(zoneBase);
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(zoneWidth + 0.16, 0.12, zoneDepth + 0.16),
      mat(layout.accent)
    );
    border.position.set(layout.x, -0.36, layout.z);
    scene.add(border);
    const island = new THREE.Mesh(
      new THREE.BoxGeometry(0.13, 0.2, zoneDepth - 0.32),
      mat(0xe4e4d1)
    );
    island.position.set(layout.x, -0.04, layout.z);
    scene.add(island);

    const signZ = layout.z - zoneDepth / 2 - 0.18;
    const signPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.25, 6), signMaterial);
    signPost.position.set(layout.x, 0.55, signZ);
    scene.add(signPost);
    const zoneSign = new THREE.Mesh(new THREE.BoxGeometry(2.85, 1.2, 0.18), signMaterial);
    zoneSign.position.set(layout.x, 1.25, signZ);
    scene.add(zoneSign);
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 512;
    labelCanvas.height = 180;
    const labelContext = labelCanvas.getContext("2d");
    labelContext.fillStyle = `#${layout.accent.toString(16).padStart(6, "0")}`;
    labelContext.fillRect(0, 0, labelCanvas.width, labelCanvas.height);
    labelContext.fillStyle = "#ffffff";
    labelContext.font = "700 90px Arial";
    labelContext.textAlign = "center";
    labelContext.textBaseline = "middle";
    labelContext.fillText(`ZONE ${layout.name}`, 256, 91);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(2.6, 0.92),
      new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(labelCanvas) })
    );
    label.position.set(layout.x, 1.27, signZ + 0.105);
    scene.add(label);
    zoneSigns.push({ id: layout.id, name: layout.name, canvas: labelCanvas, context: labelContext, texture: label.material.map });

    for (let index = 0; index < zone.total; index += 1) {
      const column = index % layout.columns;
      const row = Math.floor(index / layout.columns);
      const x = layout.x - ((layout.columns - 1) * 1.55) / 2 + column * 1.55;
      const z = layout.z - ((rows - 1) * 1.28) / 2 + row * 1.28;

      const spotIndex = spots.length;
      [-0.31, 0.31].forEach((side, sideIndex) => {
        setInstance(stripes, spotIndex * 2 + sideIndex, x + side, -0.045, z, 0.035, 0.028, 1.08);
      });
      setInstance(posts, spotIndex, x + 0.55, 0.38, z - 0.43);
      setInstance(greenBulbs, spotIndex, x + 0.55, 0.73, z - 0.43, 1, 1, 1);
      setInstance(redBulbs, spotIndex, x + 0.55, 0.73, z - 0.43, 0, 0, 0);

      setInstance(carBodies, spotIndex, x, 0.2, z);
      carBodies.setColorAt(spotIndex, new THREE.Color(carColors[index % carColors.length]));
      setInstance(carCabins, spotIndex, x, 0.48, z - 0.03);
      let wheelIndex = spotIndex * 4;
      [-0.3, 0.3].forEach((wheelX) => {
        [-0.48, 0.48].forEach((wheelZ) => {
          instanceTransform.position.set(x + wheelX, 0.14, z + wheelZ);
          instanceTransform.rotation.set(0, 0, Math.PI / 2);
          instanceTransform.scale.set(1, 1, 1);
          instanceTransform.updateMatrix();
          wheels.setMatrixAt(wheelIndex, instanceTransform.matrix);
          wheelIndex += 1;
        });
      });
      spots.push({ zoneId: layout.id, index, spotIndex, layout });
    }
  });
  stripes.instanceMatrix.needsUpdate = true;
  posts.instanceMatrix.needsUpdate = true;
  wheels.instanceMatrix.needsUpdate = true;
  carBodies.instanceMatrix.needsUpdate = true;
  carBodies.instanceColor.needsUpdate = true;
  carCabins.instanceMatrix.needsUpdate = true;

  const treeMaterial = mat(0x4f8966);
  const trunkMaterial = mat(0x806950);
  [-19, 19].forEach((x, index) => {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.9, 5), trunkMaterial);
    trunk.position.set(x, 0.27, index % 2 ? 10 : -11);
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(0.78, 1.55, 5), treeMaterial);
    crown.position.set(x, 1.35, index % 2 ? 10 : -11);
    scene.add(crown);
  });

  function resizeScene() {
    const width = Math.max(1, container.clientWidth);
    const height = Math.max(1, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.setSize(width, height, false);
    const viewHeight = 21;
    const viewWidth = viewHeight * (width / height);
    camera.left = -viewWidth / 2;
    camera.right = viewWidth / 2;
    camera.top = viewHeight / 2;
    camera.bottom = -viewHeight / 2;
    camera.updateProjectionMatrix();
  }

  let pointerX = 0;
  let pointerY = 0;
  let orbit = 0;
  container.addEventListener("pointermove", (event) => {
    const bounds = container.getBoundingClientRect();
    pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 1.2;
    pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 0.55;
  });
  container.addEventListener("pointerleave", () => {
    pointerX = 0;
    pointerY = 0;
  });

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lastFrame = 0;
  function animate(timestamp) {
    window.requestAnimationFrame(animate);
    if (document.hidden || timestamp - lastFrame < 33) return;
    lastFrame = timestamp;
    if (!reducedMotion) orbit += 0.00018;
    const angle = orbit;
    camera.position.set(Math.sin(angle) * 1.2 + pointerX, 29 + pointerY, 34);
    camera.lookAt(target.x + pointerX * 0.18, target.y, target.z + 1.5 + pointerY * 0.15);
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", resizeScene);
  if ("ResizeObserver" in window) new ResizeObserver(resizeScene).observe(container);
  resizeScene();

  window.updateParkingScene = (currentZones) => {
    currentZones.forEach((zone) => {
      const sign = zoneSigns.find((item) => item.id === zone.id);
      if (sign) {
        sign.context.fillStyle = `#${zoneLayouts.find((item) => item.id === zone.id).accent.toString(16).padStart(6, "0")}`;
        sign.context.fillRect(0, 0, sign.canvas.width, sign.canvas.height);
        sign.context.fillStyle = "#ffffff";
        sign.context.textAlign = "center";
        sign.context.textBaseline = "middle";
        sign.context.font = "700 74px Arial";
        sign.context.fillText(`ZONE ${sign.name}`, 256, 63);
        sign.context.font = "600 38px Arial";
        sign.context.fillText(`${zone.available} / ${zone.total} FREE`, 256, 137);
        sign.texture.needsUpdate = true;
      }
      spots.forEach((spot) => {
        if (spot.zoneId !== zone.id) return;
        const available = spot.index < zone.available;
        const { spotIndex } = spot;
        const { layout } = spot;
        const column = spot.index % layout.columns;
        const row = Math.floor(spot.index / layout.columns);
        const rows = Math.ceil(zone.total / layout.columns);
        const x = layout.x - ((layout.columns - 1) * 1.55) / 2 + column * 1.55 + 0.55;
        const z = layout.z - ((rows - 1) * 1.28) / 2 + row * 1.28 - 0.43;
        if (available) {
          setInstance(redBulbs, spotIndex, 0, -20, 0, 0, 0, 0);
          setInstance(greenBulbs, spotIndex, x, 0.73, z);
        } else {
          setInstance(greenBulbs, spotIndex, 0, -20, 0, 0, 0, 0);
          setInstance(redBulbs, spotIndex, x, 0.73, z);
        }
        const carScale = available ? 0 : 1;
        setInstance(carBodies, spotIndex, x - 0.55, available ? -20 : 0.2, z + 0.43, carScale, carScale, carScale);
        setInstance(carCabins, spotIndex, x - 0.55, available ? -20 : 0.48, z + 0.4, carScale, carScale, carScale);
        const wheelPositions = [
          [-0.3, -0.48], [-0.3, 0.48], [0.3, -0.48], [0.3, 0.48]
        ];
        wheelPositions.forEach(([wheelX, wheelZ], wheelIndex) => {
          instanceTransform.position.set(x - 0.55 + wheelX, available ? -20 : 0.14, z + 0.43 + wheelZ);
          instanceTransform.rotation.set(0, 0, Math.PI / 2);
          instanceTransform.scale.set(carScale, carScale, carScale);
          instanceTransform.updateMatrix();
          wheels.setMatrixAt(spotIndex * 4 + wheelIndex, instanceTransform.matrix);
        });
      });
    });
    greenBulbs.instanceMatrix.needsUpdate = true;
    redBulbs.instanceMatrix.needsUpdate = true;
    carBodies.instanceMatrix.needsUpdate = true;
    carCabins.instanceMatrix.needsUpdate = true;
    wheels.instanceMatrix.needsUpdate = true;
  };
  window.updateParkingScene(zones);
  camera.position.set(0, 27, 34);
  camera.lookAt(target.x, target.y, target.z + 1.5);
  renderer.render(scene, camera);
  container.classList.add("three-ready");
  window.requestAnimationFrame(animate);
}

window.updateParkingScene = () => {};

document.querySelectorAll(".menu-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const isExpanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!isExpanded));
    button.setAttribute("aria-label", isExpanded ? "Open navigation menu" : "Close navigation menu");
    document.querySelector("#primary-nav").classList.toggle("is-open", !isExpanded);
  });
});

document.querySelectorAll(".primary-nav .nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    const menu = document.querySelector("#primary-nav");
    const toggle = document.querySelector(".menu-toggle");
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
  });
});

if (registrationForm) {
  activeParkingSession = loadActiveParkingSession();
  if (activeParkingSession) {
    const activeZone = getZone(activeParkingSession.zoneId);
    activeZone.available = Math.max(0, activeZone.available - 1);
  }
  renderParkingSession();
  window.setInterval(renderParkingSession, 1000);

  durationSelect.addEventListener("change", updateAmount);
  zoneSelect.addEventListener("change", () => {
    registrationMessage.textContent = "";
    fullZoneNoticeVisible = false;
    updateSelectedAvailability();
  });

  function updateRegistrationFields() {
    const isVisitor = userTypeSelect.value === "visitor";
    userIdentifierField.hidden = isVisitor;
    userIdentifierInput.disabled = isVisitor;
    userIdentifierInput.required = !isVisitor;
    universityEmailField.hidden = isVisitor;
    receiptEmailInput.disabled = isVisitor;
    receiptEmailInput.required = !isVisitor;
    visitorEmailField.hidden = !isVisitor;
    visitorEmailInput.disabled = !isVisitor;
    visitorEmailInput.required = isVisitor;
    visitorPhoneField.hidden = !isVisitor;
    visitorPhoneInput.disabled = !isVisitor;
    visitorPhoneInput.required = isVisitor;
    visitorCountryCodeSelect.disabled = !isVisitor;
    visitorCountryCodeSelect.required = isVisitor;

    const usesCustomCountryCode = visitorCountryCodeSelect.value === "other";
    visitorCustomCodeField.hidden = !isVisitor || !usesCustomCountryCode;
    visitorCustomCountryCodeInput.disabled = !isVisitor || !usesCustomCountryCode;
    visitorCustomCountryCodeInput.required = isVisitor && usesCustomCountryCode;

    if (!isVisitor) {
      const identifierSettings = {
        student: {
          label: "Student TP number",
          placeholder: "TP012345",
          hint: "Format: TP followed by 6 digits",
          maxLength: 8,
          pattern: "[Tt][Pp][0-9]{6}"
        },
        lecturer: {
          label: "Staff ID",
          placeholder: "Enter your staff ID",
          hint: "Enter your staff ID",
          maxLength: 30
        }
      }[userTypeSelect.value];

      userIdentifierLabel.textContent = identifierSettings.label;
      userIdentifierInput.placeholder = identifierSettings.placeholder;
      userIdentifierInput.maxLength = identifierSettings.maxLength;
      if (identifierSettings.pattern) {
        userIdentifierInput.pattern = identifierSettings.pattern;
      } else {
        userIdentifierInput.removeAttribute("pattern");
      }
      userIdentifierHint.textContent = identifierSettings.hint;
      receiptEmailLabel.textContent = "University Outlook email";
      if (userTypeSelect.value === "student") {
        receiptEmailInput.readOnly = true;
        receiptEmailInput.removeAttribute("pattern");
        receiptEmailHint.textContent = "Filled automatically from your TP number.";
        updateStudentEmail();
      } else {
        receiptEmailInput.readOnly = false;
        receiptEmailInput.pattern = "[^\\s@]+@apu[.]edu[.]my";
        receiptEmailHint.textContent = "Enter your university email ending in @apu.edu.my.";
      }
    }
    updateZoneChoices(zoneSelect.value);
  }

  function updateStudentEmail() {
    const studentId = userIdentifierInput.value.trim();
    receiptEmailInput.value = /^TP[0-9]{6}$/i.test(studentId)
      ? `${studentId.toLowerCase()}@mail.apu.edu.my`
      : "";
  }

  userTypeSelect.addEventListener("change", () => {
    if (userTypeSelect.value === "lecturer") receiptEmailInput.value = "";
    updateRegistrationFields();
  });
  visitorCountryCodeSelect.addEventListener("change", updateRegistrationFields);
  userIdentifierInput.addEventListener("input", () => {
    if (userTypeSelect.value === "student") {
      userIdentifierInput.value = userIdentifierInput.value.toUpperCase();
      updateStudentEmail();
    }
  });
  visitorPhoneInput.addEventListener("input", (event) => {
    event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 15);
  });
  visitorCustomCountryCodeInput.addEventListener("input", (event) => {
    const digits = event.currentTarget.value.replace(/\D/g, "").slice(0, 3);
    event.currentTarget.value = digits ? `+${digits}` : "";
  });
  updateRegistrationFields();
  document.querySelector("#vehicle-number").addEventListener("input", (event) => {
    event.currentTarget.value = event.currentTarget.value.toUpperCase();
  });

  registrationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    registrationMessage.textContent = "";
    if (activeParkingSession) {
      registrationMessage.textContent = "End your current parking session before starting another demo booking.";
      return;
    }
    const vehicleNumber = document.querySelector("#vehicle-number");
    const identifier = userIdentifierInput.value.trim();
    const isVisitor = userTypeSelect.value === "visitor";
    const platePattern = /^[A-Z]{1,3}\s?\d{1,4}$/;
    if (!registrationForm.reportValidity()) return;
    if (!platePattern.test(vehicleNumber.value.trim())) {
      vehicleNumber.setCustomValidity("Enter a valid Malaysian plate, for example WXY 1234.");
      vehicleNumber.reportValidity();
      vehicleNumber.addEventListener("input", () => vehicleNumber.setCustomValidity(""), { once: true });
      return;
    }

    const zone = getZone(zoneSelect.value);
    if (!isZoneAllowedForUserType(userTypeSelect.value, zoneSelect.value)) {
      registrationMessage.textContent = isVisitor
        ? "Visitor parking is only available in Zone C."
        : "Student and staff parking is only available in Zones A and B.";
      updateZoneChoices(zoneSelect.value);
      return;
    }
    if (!zone || zone.available === 0) {
      registrationMessage.textContent = zone
        ? userTypeSelect.value === "visitor"
          ? "Zone C is full. Visitor parking is only available in Zone C."
          : `${zone.name} is full right now. Choose a zone with spaces available.`
        : "All campus zones are full. Use outside parking.";
      updateDashboard();
      return;
    }
    const visitorCountryCode = visitorCountryCodeSelect.value === "other"
      ? visitorCustomCountryCodeInput.value.trim()
      : visitorCountryCodeSelect.value;
    pendingBooking = {
      userType: userTypeSelect.value,
      identifierLabel: isVisitor ? "Phone" : userIdentifierLabel.textContent,
      identifier: isVisitor
        ? `${visitorCountryCode} ${visitorPhoneInput.value.trim()}`
        : userTypeSelect.value === "student" ? identifier.toUpperCase() : identifier,
      receiptEmail: isVisitor ? visitorEmailInput.value.trim() : receiptEmailInput.value.trim(),
      vehicleNumber: vehicleNumber.value.trim().toUpperCase(),
      zoneId: zone.id,
      duration: Number(durationSelect.value),
      amount: amountInput.value,
      gracePeriodMs: document.querySelector("#speed-up-demo").checked
        ? FAST_GRACE_PERIOD_MS
        : GRACE_PERIOD_MS
    };
    openPayment(pendingBooking);
  });

  document.querySelector("#card-number").addEventListener("input", (event) => {
    event.currentTarget.value = formatCardNumber(event.currentTarget.value);
  });
  document.querySelector("#card-expiry").addEventListener("input", (event) => {
    event.currentTarget.value = formatExpiry(event.currentTarget.value);
  });
  document.querySelector("#card-cvv").addEventListener("input", (event) => {
    event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 4);
  });

  paymentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    paymentError.textContent = "";
    if (!paymentForm.reportValidity()) return;
    const expiry = document.querySelector("#card-expiry").value;
    const [month, year] = expiry.split("/").map(Number);
    if (!month || !year) {
      paymentError.textContent = "Enter a valid expiry date in MM/YY format.";
      return;
    }

    const booking = pendingBooking;
    const zone = booking && getZone(booking.zoneId);
    if (booking && !isZoneAllowedForUserType(booking.userType, booking.zoneId)) {
      paymentError.textContent = booking.userType === "visitor"
        ? "Visitor bookings are only allowed in Zone C. Close this window and choose Zone C."
        : "Student and staff bookings are only allowed in Zones A and B. Close this window and choose another zone.";
      return;
    }
    if (!zone || zone.available === 0) {
      paymentError.textContent = "That zone has just filled up. Close this window and choose another zone.";
      return;
    }

    zone.available = Math.max(0, zone.available - 1);
    updateDashboard();
    const reference = createBookingReference();
    document.querySelector("#booking-reference").textContent = reference;
    activeParkingSession = {
      zoneId: zone.id,
      startedAt: Date.now(),
      gracePeriodMs: booking.gracePeriodMs,
      chargeAmount: Number(booking.amount),
      chargeAppliedAt: null,
      reference
    };
    completedParkingSession = null;
    saveActiveParkingSession();
    renderParkingSession();
    const confirmationDetails = document.querySelector("#confirmation-details");
    confirmedReceipt = {
      ...booking,
      reference,
      confirmedAt: new Date()
    };
    document.querySelector("#receipt-download-status").textContent = "";
    confirmationDetails.replaceChildren(
      createSummaryItem(booking.identifierLabel, booking.identifier, "confirmation-item"),
      createSummaryItem("Receipt email", booking.receiptEmail, "confirmation-item"),
      createSummaryItem("Vehicle", booking.vehicleNumber, "confirmation-item"),
      createSummaryItem("Zone", zone.name, "confirmation-item"),
      createSummaryItem("Duration", `${booking.duration} ${booking.duration === 1 ? "hour" : "hours"}`, "confirmation-item"),
      createSummaryItem("Charge after grace period", `RM ${booking.amount}`, "confirmation-item")
    );
    paymentForm.reset();
    closeDialog(paymentDialog);
    confirmationDialog.showModal();
    pendingBooking = null;
  });

  document.querySelector(".dialog-close").addEventListener("click", () => closeDialog(paymentDialog));
  document.querySelector("#download-receipt").addEventListener("click", () => {
    const status = document.querySelector("#receipt-download-status");
    if (!confirmedReceipt) {
      status.textContent = "Receipt details are unavailable. Complete a demo booking first.";
      return;
    }
    downloadReceipt(confirmedReceipt);
    status.textContent = "Receipt downloaded. Attach the file to an email to send it.";
  });
  document.querySelector("#confirmation-done").addEventListener("click", () => closeDialog(confirmationDialog));
  paymentDialog.addEventListener("click", (event) => {
    if (event.target === paymentDialog) closeDialog(paymentDialog);
  });

  document.querySelector("#directions-button").addEventListener("click", () => {
    const message = document.querySelector("#directions-message");
    message.textContent = "Visitor parking: use Zone C and follow the campus visitor parking signs. Outside parking: use marked public parking nearby.";
    message.hidden = false;
  });

  const graceButton = document.querySelector("#left-without-parking");
  graceButton.addEventListener("click", () => {
    if (!activeParkingSession) return;
    const now = Date.now();
    applyParkingChargeIfDue(now);
    const elapsed = Math.max(0, now - activeParkingSession.startedAt);
    const zoneName = getZone(activeParkingSession.zoneId).name;
    completedParkingSession = {
      elapsed,
      zoneName,
      chargeAmount: activeParkingSession.chargeAmount,
      chargeWaived: elapsed < activeParkingSession.gracePeriodMs
    };
    const zone = getZone(activeParkingSession.zoneId);
    zone.available = Math.min(zone.total, zone.available + 1);
    activeParkingSession = null;
    clearSavedParkingSession();
    renderParkingSession();
    updateDashboard();
  });

  updateAmount();
  updateDashboard();
  window.setInterval(() => {
    zones.forEach((zone) => {
      const change = Math.floor(Math.random() * 3) + 1;
      const direction = Math.random() < 0.5 ? -1 : 1;
      zone.available = Math.max(0, Math.min(zone.total, zone.available + change * direction));
    });
    updateDashboard();
  }, SLOT_UPDATE_INTERVAL_MS);
}
