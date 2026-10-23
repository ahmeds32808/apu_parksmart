// Tuning values for the demo dashboard and registration pricing.
const SLOT_UPDATE_INTERVAL_MS = 5000;
const PARKING_RATE_RM_PER_HOUR = 1.00;

const zones = [
  { id: "zone-a", name: "Zone A", total: 36, available: 13 },
  { id: "zone-b", name: "Zone B", total: 42, available: 17 },
  { id: "zone-c", name: "Zone C", total: 30, available: 9 }
];

const zoneList = document.querySelector("#zone-list");
const availableTotal = document.querySelector("#available-total");
const capacityTotal = document.querySelector("#capacity-total");
const lastUpdated = document.querySelector("#last-updated");
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

function getZone(id) {
  return zones.find((zone) => zone.id === id);
}

function getStatus(zone) {
  const ratio = zone.available / zone.total;
  if (ratio <= 0.25) return { key: "red", label: "Almost full" };
  if (ratio <= 0.55) return { key: "amber", label: "Filling up" };
  return { key: "green", label: "Plenty of spaces" };
}

function updateDashboard() {
  const totalAvailable = zones.reduce((sum, zone) => sum + zone.available, 0);
  const totalCapacity = zones.reduce((sum, zone) => sum + zone.total, 0);
  availableTotal.textContent = String(totalAvailable);
  capacityTotal.textContent = String(totalCapacity);
  lastUpdated.textContent = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  }).format(new Date());

  zoneList.innerHTML = zones.map((zone) => {
    const status = getStatus(zone);
    const percentage = (zone.available / zone.total) * 100;
    return `<div class="zone-row status-${status.key}">
      <div class="zone-details"><span class="zone-name">${zone.name}</span><span class="zone-count"><strong>${zone.available}</strong> / ${zone.total}</span></div>
      <div class="progress-track" role="progressbar" aria-label="${zone.name} available slots" aria-valuemin="0" aria-valuemax="${zone.total}" aria-valuenow="${zone.available}">
        <div class="progress-fill" style="width: ${percentage}%"></div>
      </div>
      <span class="zone-status-text">${status.label}</span>
    </div>`;
  }).join("");

  updateSelectedAvailability();
}

function updateSelectedAvailability() {
  const zone = getZone(zoneSelect.value);
  if (!zone) return;
  selectedAvailable.value = `${zone.available} ${zone.available === 1 ? "space" : "spaces"}`;
  availabilityDot.classList.toggle("is-low", zone.available > 0 && zone.available / zone.total <= 0.55);
  availabilityDot.classList.toggle("is-full", zone.available === 0);
  if (zone.available === 0) {
    registrationMessage.textContent = `${zone.name} is full right now. Please choose another zone.`;
  } else if (registrationMessage.textContent.includes("is full right now")) {
    registrationMessage.textContent = "";
  }
}

function updateAmount() {
  const duration = Number(durationSelect.value);
  amountInput.value = (duration * PARKING_RATE_RM_PER_HOUR).toFixed(2);
}

function createSummaryItem(label, value) {
  return `<div class="summary-item"><span>${label}</span><strong>${value}</strong></div>`;
}

function openPayment(booking) {
  pendingBooking = booking;
  const zone = getZone(booking.zoneId);
  bookingSummary.innerHTML = [
    createSummaryItem("Student TP", booking.tpNumber),
    createSummaryItem("Vehicle", booking.vehicleNumber),
    createSummaryItem("Zone", zone.name),
    createSummaryItem("Duration", `${booking.duration} ${booking.duration === 1 ? "hour" : "hours"}`),
    createSummaryItem("Amount", `RM ${booking.amount}`)
  ].join("");
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
  durationSelect.addEventListener("change", updateAmount);
  zoneSelect.addEventListener("change", updateSelectedAvailability);

  document.querySelector("#tp-number").addEventListener("input", (event) => {
    event.currentTarget.value = event.currentTarget.value.toUpperCase();
  });
  document.querySelector("#vehicle-number").addEventListener("input", (event) => {
    event.currentTarget.value = event.currentTarget.value.toUpperCase();
  });

  registrationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    registrationMessage.textContent = "";
    const vehicleNumber = document.querySelector("#vehicle-number");
    const platePattern = /^[A-Z]{1,3}\s?\d{1,4}$/;
    if (!registrationForm.reportValidity()) return;
    if (!platePattern.test(vehicleNumber.value.trim())) {
      vehicleNumber.setCustomValidity("Enter a valid Malaysian plate, for example WXY 1234.");
      vehicleNumber.reportValidity();
      vehicleNumber.addEventListener("input", () => vehicleNumber.setCustomValidity(""), { once: true });
      return;
    }

    const zone = getZone(zoneSelect.value);
    if (zone.available === 0) {
      registrationMessage.textContent = `${zone.name} is full right now. Please choose another zone.`;
      selectedAvailable.value = "0 spaces";
      return;
    }
    pendingBooking = {
      tpNumber: document.querySelector("#tp-number").value.trim().toUpperCase(),
      vehicleNumber: vehicleNumber.value.trim().toUpperCase(),
      zoneId: zone.id,
      duration: Number(durationSelect.value),
      amount: amountInput.value
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
    if (!zone || zone.available === 0) {
      paymentError.textContent = "That zone has just filled up. Close this window and choose another zone.";
      return;
    }

    zone.available = Math.max(0, zone.available - 1);
    updateDashboard();
    const reference = createBookingReference();
    document.querySelector("#booking-reference").textContent = reference;
    document.querySelector("#confirmation-details").innerHTML = [
      ["Student TP", booking.tpNumber],
      ["Vehicle", booking.vehicleNumber],
      ["Zone", zone.name],
      ["Duration", `${booking.duration} ${booking.duration === 1 ? "hour" : "hours"}`],
      ["Amount", `RM ${booking.amount}`],
      ["Slots now available", `${zone.available} / ${zone.total}`]
    ].map(([label, value]) => `<div class="confirmation-item"><span>${label}</span><strong>${value}</strong></div>`).join("");
    closeDialog(paymentDialog);
    confirmationDialog.showModal();
    pendingBooking = null;
  });

  document.querySelector(".dialog-close").addEventListener("click", () => closeDialog(paymentDialog));
  document.querySelector("#confirmation-done").addEventListener("click", () => closeDialog(confirmationDialog));
  paymentDialog.addEventListener("click", (event) => {
    if (event.target === paymentDialog) closeDialog(paymentDialog);
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
