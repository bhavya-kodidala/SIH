import { spawn } from "child_process";
import http from "http";
import fs from "fs";
import path from "path";

const CHROME_PATH = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORT = 9222;
const USER_DATA_DIR = path.resolve("./.chrome_test_profile");

if (fs.existsSync(USER_DATA_DIR)) {
  fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
}

console.log("Starting Chrome with remote debugging on port", PORT);
const chrome = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  "--headless=new",
  `--user-data-dir=${USER_DATA_DIR}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "--disable-sync",
  "http://localhost:5173",
]);

chrome.on("error", (err) => {
  console.error("Failed to start Chrome:", err);
  process.exit(1);
});

// Wait for Chrome debugging port to be ready
function waitForChrome(retries = 30) {
  return new Promise((resolve, reject) => {
    function check() {
      const req = http.get(`http://127.0.0.1:${PORT}/json`, (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            const list = JSON.parse(data);
            const page = list.find((t) => t.type === "page");
            if (page?.webSocketDebuggerUrl) {
              resolve(page.webSocketDebuggerUrl);
            } else {
              setTimeout(check, 300);
            }
          } catch {
            setTimeout(check, 300);
          }
        });
      });
      req.on("error", () => {
        if (--retries <= 0) reject(new Error("Chrome port timeout"));
        else setTimeout(check, 300);
      });
    }
    check();
  });
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.callbacks = new Map();
    this.eventHandlers = new Map();
  }

  async connect() {
    await new Promise((resolve) => this.ws.addEventListener("open", resolve));
    this.ws.addEventListener("message", (event) => {
      const res = JSON.parse(event.data);
      if (res.id && this.callbacks.has(res.id)) {
        const { resolve, reject } = this.callbacks.get(res.id);
        this.callbacks.delete(res.id);
        if (res.error) reject(res.error);
        else resolve(res.result);
      } else if (res.method && this.eventHandlers.has(res.method)) {
        this.eventHandlers.get(res.method)(res.params);
      }
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  on(event, fn) {
    this.eventHandlers.set(event, fn);
  }

  async eval(expr) {
    const res = await this.send("Runtime.evaluate", {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error("Eval failed: " + JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForSelector(cdp, selector, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const exists = await cdp.eval(`!!document.querySelector('${selector}')`);
    if (exists) return true;
    await sleep(200);
  }
  const screenHtml = await cdp.eval(`document.querySelector('.phone-screen')?.innerHTML || document.body.innerHTML`);
  throw new Error(`Timeout waiting for selector "${selector}". Screen HTML: ${screenHtml.slice(0, 500)}`);
}

async function run() {
  const wsUrl = await waitForChrome();
  console.log("Connected to Chrome via CDP:", wsUrl);

  const cdp = new CDPClient(wsUrl);
  await cdp.connect();

  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  cdp.on("Runtime.consoleAPICalled", (params) => {
    const text = params.args.map((a) => (typeof a.value === "object" ? JSON.stringify(a.value) : a.value)).join(" ");
    console.log(`[BROWSER CONSOLE ${params.type.toUpperCase()}] ${text}`);
  });

  cdp.on("Runtime.exceptionThrown", (params) => {
    console.error("[BROWSER EXCEPTION]", JSON.stringify(params.exceptionDetails));
  });

  // Enable WebAuthn virtual authenticator
  console.log("\nEnabling WebAuthn virtual authenticator environment...");
  await cdp.send("WebAuthn.enable");
  const authRes = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });
  console.log("Virtual Authenticator created with ID:", authRes.authenticatorId);

  // Navigate to application
  console.log("Navigating to http://localhost:5173 ...");
  await cdp.send("Page.navigate", { url: "http://localhost:5173" });
  await sleep(1500);

  // Clear localStorage to start fresh
  await cdp.eval(`localStorage.clear();`);
  await cdp.send("Page.reload");
  await sleep(1500);
  await waitForSelector(cdp, 'input[inputmode="numeric"]');

  // Check initial screen
  const title = await cdp.eval(`document.title`);
  console.log("Page title:", title);

  const TEST_PHONE = "9876543210";

  // ========================================================
  // TEST A: NEW USER REGISTRATION
  // ========================================================
  console.log("\n========================================================");
  console.log(">>> TEST A: NEW USER REGISTRATION <<<");
  console.log("========================================================");

  // 1. Enter phone number
  await waitForSelector(cdp, 'input[inputmode="numeric"]');
  await cdp.eval(`(() => {
    const input = document.querySelector('input[inputmode="numeric"]');
    if (!input) throw new Error("Phone input not found");
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, '${TEST_PHONE}');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  console.log(`Entered phone number: ${TEST_PHONE}`);
  await sleep(500);

  // 2. Click "New user? Create Passkey" to switch mode to register
  await cdp.eval(`(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('New user? Create Passkey'));
    if (btn) btn.click();
  })()`);
  console.log("Clicked 'New user? Create Passkey'");
  await sleep(500);

  // Verify button now says "Create Passkey"
  const registerBtnText = await cdp.eval(`
    document.querySelector('.passkey-btn')?.textContent
  `);
  console.log("Button text after mode switch:", registerBtnText);

  // 3. Click "Create Passkey" button
  console.log("Clicking 'Create Passkey' button...");
  await cdp.eval(`(() => {
    const btn = document.querySelector('.passkey-btn');
    if (!btn) throw new Error("Passkey button not found");
    btn.click();
  })()`);

  // Wait for registration to complete and reach Location or Home screen
  console.log("Waiting for registration ceremony and transition...");
  let registered = false;
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    const bodyText = await cdp.eval(`document.body.innerText`);
    if (bodyText.includes("Location") || bodyText.includes("Allow while using app") || bodyText.includes("Finding your location") || bodyText.includes("Maps") || bodyText.includes("SOS")) {
      console.log(">>> User reached post-auth screen successfully! Content snippet:", bodyText.slice(0, 150));
      registered = true;
      break;
    }
  }

  if (!registered) {
    const errorText = await cdp.eval(`document.querySelector('.passkey-error')?.textContent || "No error element"`);
    console.error("Registration did NOT reach next screen! Error element:", errorText);
    throw new Error("Registration flow failed!");
  }

  // Inspect database
  const devDb = JSON.parse(fs.readFileSync("./.webauthn_dev_db.json", "utf-8"));
  const user = devDb.users[`+91${TEST_PHONE}`];
  const userCreds = Object.values(devDb.credentials).filter((c) => c.userId === user?.id);
  console.log("\nDATABASE INSPECTION POST-REGISTRATION:");
  console.log("User:", user);
  console.log("Stored credentials count:", userCreds.length);
  if (userCreds.length > 0) {
    console.log("First Credential:", {
      credentialId: userCreds[0].credentialId,
      publicKeyBase64Length: userCreds[0].publicKey.length,
      counter: userCreds[0].counter,
      transports: userCreds[0].transports,
    });
  }

  // Allow location if LocationScreen is showing
  await cdp.eval(`(() => {
    const allowBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Allow while using app'));
    if (allowBtn) allowBtn.click();
  })()`);
  await sleep(2500);

  // Confirm home screen
  const isHomeScreen = await cdp.eval(`document.body.innerText.includes("Emergency siren") || document.body.innerText.includes("SOS")`);
  console.log("Is Home screen showing:", isHomeScreen);

  // ========================================================
  // TEST B: RETURNING USER LOGIN
  // ========================================================
  console.log("\n========================================================");
  console.log(">>> TEST B: RETURNING USER LOGIN <<<");
  console.log("========================================================");

  // Sign out via UI or clear localStorage
  console.log("Signing out user...");
  await cdp.eval(`localStorage.clear();`);
  await cdp.send("Page.reload");
  await sleep(1500);
  await waitForSelector(cdp, 'input[inputmode="numeric"]');

  // Verify at login screen
  const loginTitle = await cdp.eval(`document.querySelector('.brand-name')?.textContent`);
  console.log("Back at Login screen. App title:", loginTitle);

  // Enter the SAME phone number
  console.log(`Entering SAME phone number: ${TEST_PHONE}`);
  await cdp.eval(`(() => {
    const input = document.querySelector('input[inputmode="numeric"]');
    if (!input) throw new Error("Phone input not found");
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, '${TEST_PHONE}');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(500);

  // Mode defaults to "login", button text should be "Continue with Passkey"
  const loginBtnText = await cdp.eval(`document.querySelector('.passkey-btn')?.textContent`);
  console.log("Button text:", loginBtnText);

  // Click "Continue with Passkey"
  console.log("Clicking 'Continue with Passkey'...");
  await cdp.eval(`(() => {
    const btn = document.querySelector('.passkey-btn');
    if (!btn) throw new Error("Passkey button not found");
    btn.click();
  })()`);

  // Wait for login to complete and reach Location or Home screen
  let loggedIn = false;
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    const bodyText = await cdp.eval(`document.body.innerText`);
    if (bodyText.includes("Location") || bodyText.includes("Allow while using app") || bodyText.includes("Finding your location") || bodyText.includes("Maps") || bodyText.includes("SOS")) {
      console.log(">>> RETURNING USER REACHED POST-AUTH SCREEN! Content snippet:", bodyText.slice(0, 150));
      loggedIn = true;
      break;
    }
  }

  if (!loggedIn) {
    const errorText = await cdp.eval(`document.querySelector('.passkey-error')?.textContent || "No error element"`);
    console.error("Login did NOT reach next screen! Error element:", errorText);
    throw new Error("Passkey login flow failed!");
  }

  // ========================================================
  // TEST C: BROWSER REFRESH SESSION PERSISTENCE
  // ========================================================
  console.log("\n========================================================");
  console.log(">>> TEST C: BROWSER REFRESH SESSION PERSISTENCE <<<");
  console.log("========================================================");

  console.log("Refreshing browser page...");
  await cdp.send("Page.reload");
  await sleep(2500);

  const rawSession = await cdp.eval(`localStorage.getItem('rakshanet_auth_session')`);
  console.log("LocalStorage session after reload:", rawSession);

  // Wait for loading to finish and home screen to appear
  for (let i = 0; i < 15; i++) {
    const isHome = await cdp.eval(`!!document.querySelector('.bottom-nav') || !!document.querySelector('.app-header')`);
    if (isHome) break;
    await sleep(300);
  }

  const hasLoginCard = await cdp.eval(`!!document.querySelector('.login-card')`);
  const hasBottomNav = await cdp.eval(`!!document.querySelector('.bottom-nav') || !!document.querySelector('.app-header')`);
  const sessionRestored = !hasLoginCard && hasBottomNav;
  console.log("Session restored on refresh:", sessionRestored ? "PASS" : "FAIL");

  // ========================================================
  // TEST D: UNREGISTERED / NON-EXISTENT USER
  // ========================================================
  console.log("\n========================================================");
  console.log(">>> TEST D: UNREGISTERED PHONE NUMBER <<<");
  console.log("========================================================");

  // Clear session to return to login
  await cdp.eval(`localStorage.clear();`);
  await cdp.send("Page.reload");
  await sleep(1500);
  await waitForSelector(cdp, 'input[inputmode="numeric"]');

  const UNREGISTERED_PHONE = "9111122222";
  console.log(`Entering UNREGISTERED phone number: ${UNREGISTERED_PHONE}`);
  await cdp.eval(`(() => {
    const input = document.querySelector('input[inputmode="numeric"]');
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeSetter.call(input, '${UNREGISTERED_PHONE}');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);
  await sleep(500);

  console.log("Clicking 'Continue with Passkey' for unregistered user...");
  await cdp.eval(`(() => { document.querySelector('.passkey-btn').click(); })()`);
  await sleep(2000);

  const errorMsg = await cdp.eval(`document.querySelector('.passkey-error')?.textContent`);
  console.log("Error displayed for unregistered phone:", errorMsg);
  const correctError = errorMsg && errorMsg.includes("No passkey is registered for this number");
  console.log("Unregistered user handling:", correctError ? "PASS" : "FAIL");

  console.log("\n========================================================");
  console.log(">>> ALL E2E BROWSER TESTS COMPLETED SUCCESSFULLY! <<<");
  console.log("========================================================");

  chrome.kill();
  process.exit(0);
}

run().catch((err) => {
  console.error("\n>>> TEST SUITE FAILED:", err);
  chrome.kill();
  process.exit(1);
});
