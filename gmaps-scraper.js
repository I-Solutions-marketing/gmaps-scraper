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

    const forceBtn = overlay.querySelector("#gmaps-scraper-force-reset");
    if (forceBtn) forceBtn.onclick = fullReset;

    return overlay;
  }

  function createInitialUI() {
    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:bold;font-size:14px;">Google Maps Scraper</div>
        <button id="gmaps-scraper-close" style="border:none;background:none;font-size:14px;cursor:pointer;">✕</button>
      </div>

      <div style="margin-bottom:8px;">Paste Google Maps business URLs (one per line):</div>
      <textarea id="gmaps-scraper-urls" style="width:100%;height:150px;font-size:12px;"></textarea>

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
        Then on each page, click the bookmarklet again to scrape and advance.
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

      const state = { urls, currentIndex: 0, results: [], done: false };
      saveState(state);

      alert("Sequence started! Navigating to the first URL...");
      window.location.href = urls[0];
    };
  }

  function scrapeCurrentPage() {
    let businessName = "";
    let website = "";
    let phone = "";
    let email = "";

    try {
      const newUIName =
        document.querySelector('h1[class*="DUwDvf"] span') ||
        document.querySelector('h1[class*="DUwDvf"]') ||
        document.querySelector('div[data-attrid="title"] span');

      if (newUIName && newUIName.textContent.trim()) {
        businessName = newUIName.textContent.trim();
      }
    } catch (e) {}

    if (!businessName) {
      try {
        const oldUIName =
          document.querySelector("h1 span") ||
          document.querySelector("h1") ||
          document.querySelector('[role=\"heading\"] span') ||
          document.querySelector('[aria-level=\"1\"] span');

        if (oldUIName && oldUIName.textContent.trim()) {
          businessName = oldUIName.textContent.trim();
        }
      } catch (e) {}
    }

    if (!businessName) {
      try {
        const og = document.querySelector('meta[property="og:title"]');
        if (og && og.content) {
          businessName = og.content.split("·")[0].trim();
        }
      } catch (e) {}
    }

    try {
      const w = document.querySelector("a[data-item-id='authority']");
      if (w) website = w.href.trim();
    } catch (e) {}

    try {
      const p = document.querySelector("button[data-item-id^='phone:tel']");
      if (p) phone = p.textContent.trim();
    } catch (e) {}

    try {
      const em = document.querySelector("a[href^='mailto:']");
      if (em) email = em.href.replace(/^mailto:/i, "").trim();
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

  function createProgressUI(state) {
    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:bold;font-size:14px;">Google Maps Scraper</div>
        <button id="gmaps-scraper-close"
          style="border:none;background:none;font-size:14px;cursor:pointer;">✕</button>
      </div>

      <div>Progress: <b>${state.results.length}</b> of <b>${state.urls.length}</b></div>
      <div style="font-size:11px;color:#555;margin-top:4px;">
        Current: <b>${state.currentIndex + 1}</b> / ${state.urls.length}<br>
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

      const csv = rows
        .map(row =>
          row
            .map(field => {
              const s = String(field || "");
              return s.includes(",") || s.includes('"')
                ? `"${s.replace(/"/g, '""')}"`
                : s;
            })
            .join(",")
        )
        .join("\r\n");

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

  const state = loadState();

  if (!state || !state.urls || !Array.isArray(state.urls) || state.urls.length === 0) {
    createInitialUI();
    return;
  }

  if (state.done) {
    createDoneUI(state);
    return;
  }

  const currentIndex = state.currentIndex;
  const row = scrapeCurrentPage();

  // NEW: prevent duplicate rows
  if (!state.results.some(r => r.url === row.url)) {
    state.results.push(row);
  }

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
