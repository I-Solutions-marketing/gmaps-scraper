(() => {
  const STORAGE_KEYS = [
    "gmaps_scraper_state_v1",
    "gmaps_scraper_state",
    "gmaps_state",
    "scraper_state",
    "gmaps"
  ];
  const MAIN_KEY = "gmaps_scraper_state_v1";

  function loadState() {
    try {
      const raw = localStorage.getItem(MAIN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveState(state) {
    localStorage.setItem(MAIN_KEY, JSON.stringify(state));
  }

  function fullReset() {
    STORAGE_KEYS.forEach(k => localStorage.removeItem(k));
    alert("✔ All Google Maps Scraper data has been fully reset.\nReload the page and click the bookmarklet again.");
  }

  // Create UI wrapper
  function createOverlay(html) {
    const existing = document.getElementById("gmaps-scraper-overlay");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "gmaps-scraper-overlay";
    overlay.style.position = "fixed";
    overlay.style.top = "20px";
    overlay.style.right = "20px";
    overlay.style.zIndex = "999999";
    overlay.style.background = "white";
    overlay.style.border = "1px solid #ccc";
    overlay.style.borderRadius = "8px";
    overlay.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    overlay.style.padding = "12px";
    overlay.style.maxWidth = "420px";
    overlay.style.fontFamily = "Arial, sans-serif";
    overlay.style.fontSize = "13px";

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    // Hook force reset button
    const forceBtn = overlay.querySelector("#gmaps-scraper-force-reset");
    if (forceBtn) forceBtn.onclick = fullReset;

    return overlay;
  }

  // UI: Initial
  function createInitialUI() {
    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:bold;font-size:14px;">Google Maps Scraper</div>
        <button id="gmaps-scraper-close" style="border:none;background:none;font-size:14px;cursor:pointer;">✕</button>
      </div>

      <div style="margin-bottom:8px;">Paste Google Maps business URLs (one per line):</div>
      <textarea id="gmaps-scraper-urls"
        style="width:100%;height:150px;font-size:12px;"></textarea>

      <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
        <button id="gmaps-scraper-start"
          style="padding:6px 10px;border-radius:4px;border:1px solid #007bff;background:#007bff;color:#fff;cursor:pointer;">
          Start Sequence
        </button>

        <button id="gmaps-scraper-force-reset"
          style="padding:4px 8px;border-radius:4px;border:1px solid #dc3545;background:#f8d7da;color:#721c24;cursor:pointer;font-size:11px;">
          Force Reset
        </button>
      </div>

      <div style="margin-top:8px;color:#555;font-size:11px;">
        Workflow: paste URLs → click <b>Start Sequence</b>.<br>
        Then on each page, click the bookmarklet again to scrape + auto-continue.
      </div>
    `;

    const overlay = createOverlay(html);
    overlay.querySelector("#gmaps-scraper-close").onclick = () => overlay.remove();

    overlay.querySelector("#gmaps-scraper-start").onclick = () => {
      const textarea = overlay.querySelector("#gmaps-scraper-urls");
      const raw = textarea.value.trim();
      if (!raw) return alert("Please paste at least one URL.");

      const urls = raw.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      if (!urls.length) return alert("No valid URLs found.");

      const state = {
        urls,
        currentIndex: 0,
        results: [],
        done: false
      };
      saveState(state);

      alert("Sequence started! Navigating to the first URL...");
      window.location.href = urls[0];
    };
  }

  // Scrape Google Maps Page
  function scrapeCurrentPage() {
    let businessName = "";
    let website = "";
    let phone = "";
    let email = "";

    try {
      const nameEl = document.querySelector("h1 span") ||
                     document.querySelector("h1") ||
                     document.querySelector("[role='heading'] span");
      if (nameEl) businessName = nameEl.textContent.trim();
    } catch (e) {}

    try {
      const websiteEl = document.querySelector("a[data-item-id='authority']");
      if (websiteEl) website = websiteEl.href.trim();
    } catch (e) {}

    try {
      const phoneEl = document.querySelector("button[data-item-id^='phone:tel']");
      if (phoneEl) phone = phoneEl.textContent.trim();
    } catch (e) {}

    try {
      const emailEl = document.querySelector("a[href^='mailto:']");
      if (emailEl) email = emailEl.href.replace(/^mailto:/i, "").trim();
    } catch (e) {}

    return {
      opportunityName: businessName,
      businessName,
      website,
      phone,
      email,
      url: window.location.href
    };
  }

  // UI: Progress screen
  function createProgressUI(state) {
    const total = state.urls.length;
    const idx = state.currentIndex;

    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:bold;font-size:14px;">Google Maps Scraper</div>
        <button id="gmaps-scraper-close"
          style="border:none;background:none;font-size:14px;cursor:pointer;">✕</button>
      </div>

      <div>Progress: <b>${state.results.length}</b> of <b>${total}</b></div>
      <div style="font-size:11px;color:#555;margin-top:4px;">
        Current: <b>${idx + 1}</b> / ${total}<br>
        Click the bookmarklet again to continue.
      </div>

      <button id="gmaps-scraper-force-reset"
        style="margin-top:8px;padding:4px 8px;border-radius:4px;border:1px solid #dc3545;background:#f8d7da;color:#721c24;cursor:pointer;font-size:11px;">
        Force Reset
      </button>
    `;

    const overlay = createOverlay(html);
    overlay.querySelector("#gmaps-scraper-close").onclick = () => overlay.remove();
  }

  // UI: Done
  function createDoneUI(state) {
    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:bold;font-size:14px;">Google Maps Scraper</div>
        <button id="gmaps-scraper-close" style="border:none;background:none;font-size:14px;cursor:pointer;">✕</button>
      </div>

      <div>✔ Done! Collected <b>${state.results.length}</b> rows.</div>

      <button id="gmaps-scraper-download"
        style="margin-top:8px;padding:6px 10px;border-radius:4px;border:1px solid #28a745;background:#28a745;color:white;cursor:pointer;">
        Download CSV
      </button>

      <button id="gmaps-scraper-force-reset"
        style="margin-left:6px;margin-top:8px;padding:4px 8px;border-radius:4px;border:1px solid #dc3545;background:#f8d7da;color:#721c24;cursor:pointer;font-size:11px;">
        Force Reset
      </button>
    `;

    const overlay = createOverlay(html);
    overlay.querySelector("#gmaps-scraper-close").onclick = () => overlay.remove();

    overlay.querySelector("#gmaps-scraper-download").onclick = () => {
      const rows = [
        ["Opportunity Name", "Business Name", "Website URL", "Phone", "Email", "Source URL"],
        ...state.results.map(r => [
          r.opportunityName || "",
          r.businessName || "",
          r.website || "",
          r.phone || "",
          r.email || "",
          r.url || ""
        ])
      ];

      const csv = rows.map(row =>
        row
          .map(field => {
            const s = String(field || "");
            return s.includes(",") || s.includes('"')
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          })
          .join(",")
      ).join("\r\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "gmaps_scraper_results.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    };
  }

  //
  // MAIN EXECUTION
  //
  const state = loadState();

  // No sequence → initial UI
  if (!state || !state.urls || !Array.isArray(state.urls) || state.urls.length === 0) {
    createInitialUI();
    return;
  }

  // If done → show done UI
  if (state.done) {
    createDoneUI(state);
    return;
  }

  // Scrape current page
  const currentIndex = state.currentIndex;
  const row = scrapeCurrentPage();
  state.results.push(row);

  // Advance
  const nextIndex = currentIndex + 1;

  if (nextIndex >= state.urls.length) {
    state.done = true;
    saveState(state);
    createDoneUI(state);
  } else {
    state.currentIndex = nextIndex;
    saveState(state);
    createProgressUI(state);

    setTimeout(() => {
      window.location.href = state.urls[nextIndex];
    }, 1200);
  }
})();
