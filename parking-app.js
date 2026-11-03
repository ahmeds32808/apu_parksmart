const parkingForm = document.querySelector("#parking-form");
const vehicleSelect = document.querySelector("#parking-vehicle");
const parkingMessage = document.querySelector("#parking-message");
const parkingSubmit = document.querySelector("#parking-submit");
const priceNote = document.querySelector("#parking-price-note");
let accountData = null;

function updateParkingRate() {
  if (!accountData?.profile) return;
  const isVisitor = accountData.profile.user_type === "visitor";
  document.querySelector("#rate-description").textContent = isVisitor
    ? "RM 1.00 per hour for visitors"
    : "RM 5.00 per day for students and staff";
  priceNote.textContent = isVisitor
    ? "Visitors: RM 1.00 per hour, charged from the start. There is no grace period."
    : "Students and Lecturer / Staff: RM 5.00 per day. End parking within 10 minutes to avoid a charge.";
}

async function loadParkingForm() {
  parkingMessage.textContent = "";
  accountData = await window.ParkSmart.getAccountData();
  if (!accountData.client) {
    parkingMessage.textContent = window.ParkSmart.getSupabaseConfigurationMessage();
    vehicleSelect.replaceChildren(new Option("Supabase setup required", ""));
    return;
  }
  if (accountData.error) {
    parkingMessage.textContent = `Account data could not be loaded: ${accountData.error.message}`;
    console.error("ParkSmart could not load parking registration data.", accountData.error);
    return;
  }
  if (!accountData.user || !accountData.profile) {
    parkingMessage.textContent = "Create an account or sign in before registering parking.";
    vehicleSelect.replaceChildren(new Option("Sign in to load vehicles", ""));
    parkingSubmit.disabled = true;
    return;
  }
  updateParkingRate();

  const { data: activeSession, error } = await accountData.client
    .from("parking_sessions")
    .select("id")
    .eq("user_id", accountData.user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  if (error) {
    parkingMessage.textContent = `Could not check your parking session: ${error.message}`;
    console.error("ParkSmart could not check for an active session.", error);
    return;
  }
  if (activeSession) {
    parkingMessage.textContent = "You already have an active parking session. View or end it on Home.";
    vehicleSelect.replaceChildren(new Option("Active parking session", ""));
    parkingSubmit.disabled = true;
    return;
  }
  if (!accountData.vehicles.length) {
    parkingMessage.textContent = "No vehicle is saved to your account. Add one from the Profile panel on Home first.";
    vehicleSelect.replaceChildren(new Option("No registered vehicles", ""));
    parkingSubmit.disabled = true;
    return;
  }

  vehicleSelect.replaceChildren(new Option("Choose a registered vehicle", ""));
  accountData.vehicles.forEach((vehicle) => {
    const color = window.ParkSmart.vehicleColors[vehicle.color]?.label || "Orange";
    vehicleSelect.append(new Option(`${vehicle.plate_number} · ${color}`, vehicle.id));
  });
  if (accountData.vehicles.length === 1) vehicleSelect.value = accountData.vehicles[0].id;
  parkingSubmit.disabled = !vehicleSelect.value;
}

parkingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  parkingMessage.textContent = "";
  if (!parkingForm.reportValidity() || !accountData?.user) return;

  const vehicle = accountData.vehicles.find((item) => item.id === vehicleSelect.value);
  if (!vehicle) {
    parkingMessage.textContent = "Choose one of your registered vehicles.";
    return;
  }

  parkingSubmit.disabled = true;
  try {
    const { error } = await accountData.client.rpc("start_parking_session", {
      p_vehicle_id: vehicle.id
    });
    if (error) throw error;
    parkingMessage.textContent = "Parking started. Your car, time parked, and current price will appear on Home.";
    window.setTimeout(() => window.location.assign("index.html"), 1000);
  } catch (error) {
    parkingMessage.textContent = `Could not start parking: ${error.message || "Please try again."}`;
    console.error("ParkSmart could not start the parking session.", error);
    parkingSubmit.disabled = false;
  }
});

vehicleSelect.addEventListener("change", () => {
  parkingSubmit.disabled = !vehicleSelect.value || !accountData?.user;
});

loadParkingForm().catch((error) => {
  parkingMessage.textContent = `Parking setup failed: ${error.message || "Please refresh and try again."}`;
  console.error("ParkSmart could not initialize parking registration.", error);
});
