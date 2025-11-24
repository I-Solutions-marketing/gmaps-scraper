(() => {
  const STORAGE_KEYS = [
    "gmaps_scraper_state_v1",
    "gmaps_scraper_state",
    "gmaps_state",
    "scraper_state",
    "gmaps"
  ];
  const MAIN_KEY = "gmaps_scraper_state_v1";

  /* ---------- STORAGE ---------- */
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
    alert("✔ Scraper state fully reset.\nReload and run again.");
  }

  /* ---------- UI ---------- */
  function createOverlay(html) {
    const old = document.getElementById("gmaps-scraper-overlay");
    if (old) old.remove();

    const box = document.createElement("div");
    box.id = "gmaps-scraper-overlay";
    box.style.position = "fixed";
    box.style.top = "20px";
    box.style.right = "20px";
    box.style.zIndex = "999999";
    box.style.background = "white";
    box.style.border = "1px solid #ccc";
    box.style.borderRadius = "8px";
    box.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
    box.style.padding = "12px";
    box.style.maxWidth = "420px";
    box.style.fontFamily = "Arial, sans-serif";
    box.style.fontSize = "13px";
    box.innerHTML = html;
    document.body.appendChild(box);

    const forceBtn = box.querySelector("#gmaps-scraper-force-reset");
    if (forceBtn) forceBtn.onclick = fullReset;

    return box;
  }

  function createInitialUI() {
    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:bold;font-size:14px;">Google Maps Scraper</div>
        <button id="gmaps-scraper-close" style="border:none;background:none;font-size:14px;cursor:pointer;">✕</button>
      </div>

      <div style="margin-bottom:8px;">Paste Google Maps URLs (one per line):</div>
      <textarea id="gmaps-scraper-urls" style="width:100%;height:150px;font-size:12px;"></textarea>

      <div style="margin-top:8px;display:flex;justify-content:space-between;">
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
        After each page loads → click the bookmarklet again.
      </div>
    `;

    const box = createOverlay(html);
    box.querySelector("#gmaps-scraper-close").onclick = () => box.remove();

    box.querySelector("#gmaps-scraper-start").onclick = () => {
      const raw = box.querySelector("#gmaps-scraper-urls").value.trim();
      if (!raw) return alert("Please paste URLs first.");

      const urls = raw.split(/\r?\n/).map(t => t.trim()).filter(Boolean);
      if (!urls.length) return alert("No valid URLs found.");

      const state = { urls, currentIndex: 0, results: [], done: false };
      saveState(state);

      alert("Starting… going to the first URL.");
      window.location.href = urls[0];
    };
  }

  /* ---------- SCRAPING ---------- */
  function scrapeCurrentPage() {
    let businessName = "";
    let website = "";
    let phone = "";
    let email = "";

    /* --- BUSINESS NAME (NEW 2024–2025 UI) --- */
    try {
      const el =
        document.querySelector('h1[class*="DUwDvf"] span') ||
        document.querySelector('h1[class*="DUwDvf"]') ||
        document.querySelector('div[data-attrid="title"] span') ||
        document.querySelector('div[aria-level="1"]') ||
        document.querySelector('h1[class*="fontHeadlineLarge"]') ||
        document.querySelector("h1 span") ||
        document.querySelector("h1");

      if (el && el.textContent.trim()) businessName = el.textContent.trim();
    } catch (e) {}

    /* --- Fallback: meta og:title --- */
    if (!businessName) {
      try {
        const og = document.querySelector('meta[property="og:title"]');
        if (og && og.content) {
          businessName = og.content.split("·")[0].trim();
        }
      } catch (e) {}
    }

    /* --- Website --- */
    try {
      const w = document.querySelector("a[data-item-id='authority']");
      if (w) website = w.href.trim();
    } catch (e) {}

    /* --- Phone --- */
    try {
      const p = document.querySelector("button[data-item-id^='phone:tel']");
      if (p) phone = p.textContent.trim();
    } catch (e) {}

    /* --- Email --- */
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

  /* ---------- UI DURING PROGRESS ---------- */
  function createProgressUI(state) {
    const html = `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <div style="font-weight:bold;font-size:14px;">Google Maps Scraper</div>
        <button id="gmaps-scraper-close" style="border:none;background:none;font-size:14px;cursor:pointer;">✕</button>
      </div>

      <div>Collected: <b>${state.results.length}</b> of <b>${state.urls.length}</b></div>
      <div style="font-size:11px;color:#555;margin-top:4px;">
        Current index: <b>${state.currentIndex + 1}</b> / ${state.urls.length}<br>
        Click the bookmarklet again to continue.
      </div>

      <button id="gmaps-scraper-force-reset"
        style="margin-top:8px;padding:4px 8px;border-radius:4px;border:1px solid #dc3545;background:#f8d7da;color:#721c24;cursor:pointer;font-size:11px;">
        Force Reset
      </button>
    `;

    const box = createOverlay(html);
    box.querySelector("#gmaps-scraper-close").onclick = () => box.remove();
  }

  /* ---------- DONE UI ---------- */
  function createDoneUI(state) {
    const html = `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
        <div style="font-weight:bold;font-size:14px;">Google Maps Scraper</div>
        <button id="gmaps-scraper-close" style="border:none;background:none;font-size:14px;cursor:pointer;">✕</button>
      </div>

      <div>✔ Done! Collected <b>${state.results.length}</b> rows.</div>

      <button id="gmaps-scraper-download"
        style="margin-top:8px;padding:6px 10px;border-radius:4px;border:1px solid #28a745;background:#28a745;color:#fff;cursor:pointer;">
        Download CSV
      </button>

      <button id="gmaps-scraper-force-reset"
        style="margin-left:6px;margin-top:8px;padding:4px 8px;border-radius:4px;border:1px solid #dc3545;background:#f8d7da;color:#721c24;cursor:pointer;font-size:11px;">
        Force Reset
      </button>
    `;

    const box = createOverlay(html);
    box.querySelector("#gmaps-scraper-close").onclick = () => box.remove();

    box.querySelector("#gmaps-scraper-download").onclick = () => {
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
        .map(r =>
          r
            .map(x => {
              const s = String(x || "");
              return s.includes(",") || s.includes('"')
                ? `"${s.replace(/"/g, '""')}"`
                : s;
            })
            .join(",")
        )
        .join("\r\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "gmaps_scraper_results.csv";
      a.click();
      URL.revokeObjectURL(url);
    };
  }

  /* ---------- MAIN LOGIC ---------- */
  const state = loadState();

  if (!state || !Array.isArray(state.urls) || !state.urls.length) {
    createInitialUI();
    return;
  }

  if (state.done) {
    createDoneUI(state);
    return;
  }

  /* SCRAPE */
  const row = scrapeCurrentPage();

  // Prevent duplicates
  if (!state.results.some(r => r.url === row.url)) {
    state.results.push(row);
  }

  /* MOVE TO NEXT */
  const nextIndex = state.currentIndex + 1;
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
