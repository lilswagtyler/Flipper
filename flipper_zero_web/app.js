const statusEl = document.getElementById("status");
const telemetryEl = document.getElementById("telemetry");
const logEl = document.getElementById("commandLog");
const connectBtn = document.getElementById("connect");
const disconnectBtn = document.getElementById("disconnect");
const syncBtn = document.getElementById("sync");
const demoBtn = document.getElementById("demo");
const searchInput = document.getElementById("search");
const categorySelect = document.getElementById("category");
const scriptList = document.getElementById("scriptList");

const scriptCatalog = [
  {
    name: "Credential Harvester",
    category: "badusb",
    description: "BadUSB payloads for credential prompts and phishing flows.",
    path: "../BadUSB",
  },
  {
    name: "Remote Capture Kits",
    category: "subghz",
    description: "Signal scripts for Sub-GHz capture, replay, and analysis.",
    path: "../Sub-GHz",
  },
  {
    name: "NFC Fun Files",
    category: "nfc",
    description: "NFC tags, MIFARE tools, and dictionaries.",
    path: "../NFC",
  },
  {
    name: "Infrared Remote Library",
    category: "infrared",
    description: "IR device databases and Pronto conversions.",
    path: "../Infrared",
  },
  {
    name: "RFID Stash",
    category: "rfid",
    description: "RFID dumps, tags, and reader utilities.",
    path: "../RFID",
  },
  {
    name: "GPIO Playbook",
    category: "badusb",
    description: "Signal wiring guides and GPIO experiments.",
    path: "../GPIO",
  },
];

let port;
let reader;

const setStatus = (text, tone = "default") => {
  statusEl.textContent = `Status: ${text}`;
  statusEl.style.color = tone === "alert" ? "var(--warning)" : "var(--muted)";
};

const appendLog = (message) => {
  const time = new Date().toLocaleTimeString();
  logEl.value += `[${time}] ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
};

const renderScripts = () => {
  const query = searchInput.value.toLowerCase();
  const category = categorySelect.value;
  const filtered = scriptCatalog.filter((script) => {
    const matchesCategory = category === "all" || script.category === category;
    const matchesQuery =
      script.name.toLowerCase().includes(query) ||
      script.description.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  scriptList.innerHTML = "";
  filtered.forEach((script) => {
    const card = document.createElement("div");
    card.className = "script-card";
    card.innerHTML = `
      <strong>${script.name}</strong>
      <span>${script.description}</span>
      <a href="${script.path}">Open Library →</a>
    `;
    scriptList.appendChild(card);
  });
};

const updateTelemetry = (data) => {
  telemetryEl.innerHTML = data
    .map(
      ([label, value]) => `
      <div class="telemetry-row">
        <span>${label}</span>
        <span>${value}</span>
      </div>
    `
    )
    .join("");
};

const demoTelemetry = () => {
  updateTelemetry([
    ["Battery", `${Math.floor(Math.random() * 30) + 70}%`],
    ["Mode", "Demo Ops"],
    ["Channel", `${Math.floor(Math.random() * 40) + 300} MHz`],
    ["Last Script", "Signal Sweep"],
  ]);
};

const connectSerial = async () => {
  if (!("serial" in navigator)) {
    setStatus("Web Serial not supported", "alert");
    appendLog("Web Serial not supported in this browser.");
    return;
  }

  try {
    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });
    setStatus("Connected to Flipper Zero");
    appendLog("Serial connection established.");

    reader = port.readable?.getReader();
    if (reader) {
      readLoop();
    }
  } catch (error) {
    setStatus("Connection failed", "alert");
    appendLog(`Connection error: ${error.message}`);
  }
};

const disconnectSerial = async () => {
  try {
    if (reader) {
      await reader.cancel();
      reader.releaseLock();
    }
    if (port) {
      await port.close();
    }
    setStatus("Disconnected");
    appendLog("Serial connection closed.");
  } catch (error) {
    appendLog(`Disconnect error: ${error.message}`);
  }
};

const readLoop = async () => {
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) {
        const text = new TextDecoder().decode(value);
        appendLog(`Flipper: ${text.trim()}`);
      }
    }
  } catch (error) {
    appendLog(`Read error: ${error.message}`);
  }
};

const sendCommand = async (command) => {
  if (!port?.writable) {
    appendLog("No active connection. Launch demo mode or connect first.");
    return;
  }

  const writer = port.writable.getWriter();
  const payload = new TextEncoder().encode(`${command}\n`);
  await writer.write(payload);
  writer.releaseLock();
  appendLog(`Command sent: ${command}`);
};

connectBtn.addEventListener("click", connectSerial);

disconnectBtn.addEventListener("click", disconnectSerial);

syncBtn.addEventListener("click", () => {
  appendLog("Sync queued: pulling script list to device.");
  demoTelemetry();
});

demoBtn.addEventListener("click", () => {
  setStatus("Demo mode active");
  appendLog("Demo mode enabled. Commands will not reach hardware.");
  demoTelemetry();
});

document.querySelectorAll(".command").forEach((button) => {
  button.addEventListener("click", () => {
    const command = button.dataset.command;
    appendLog(`Queued action: ${button.textContent}`);
    sendCommand(command);
  });
});

searchInput.addEventListener("input", renderScripts);
categorySelect.addEventListener("change", renderScripts);

renderScripts();
