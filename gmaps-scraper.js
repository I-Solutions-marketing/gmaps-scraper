(() => {
  const STORAGE_KEY = "gmaps_scraper_state_v1";

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function resetState() {
    localStorage.removeItem(STORAGE_KEY);
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
    return overlay;
  }

  function createInitialUI() {
    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:bold;font-size:14px;">Google Maps Scraper</div>
        <button id="gmaps-scraper-close" style="border:none;background:none;font-size:14px;cursor:pointer;">✕</button>
      </div>
      <div style="margin-bottom:8px;">
        Paste Google Maps business URLs (one per line):
      </div>
      <textarea id="gmaps-scraper-urls" style="width:100%;height:150px;font-size:12px;"></textarea>
      <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center;">
        <button id="gmaps-scraper-start" style="padding:6px 10px;border-radius:4px;border:1px solid #007bff;background:#007bff;color:#fff;cursor:pointer;">
          Start sequence
        </button>
        <button id="gmaps-scraper-reset" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;background:#f5f5f5;cursor:pointer;font-size:11px;">
          Reset state
        </button>
      </div>
      <div style="margin-top:8px;color:#555;font-size:11px;">
        Workflow: paste URLs → click <b>Start sequence</b>.<br>
        The tab will go to the first URL.<br>
        On each page, click the bookmarklet again to capture and move to the next URL.
      </div>
    `;

    const overlay = createOverlay(html);

    overlay.querySelector("#gmaps-scraper-close").onclick = () => overlay.remove();

    overlay.querySelector("#gmaps-scraper-reset").onclick = () => {
      resetState();
      alert("Google Maps Scraper state has been reset.");
    };

    overlay.querySelector("#gmaps-scraper-start").onclick = () => {
      const textarea = overlay.querySelector("#gmaps-scraper-urls");
      const raw = textarea.value.trim();
      if (!raw) {
        alert("Please paste at least one URL.");
        return;
      }
      const urls = raw
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(Boolean);

      if (!urls.length) {
        alert("No valid URLs detected.");
        return;
      }

      const state = {
        urls,
        currentIndex: 0,
        results: [],
        done: false
      };
      saveState(state);

      alert(
        "Sequence started.\n\nThe tab will now go to the first URL.\nAfter it loads, click the bookmarklet again to capture data and continue."
      );

      window.location.href = urls[0];
    };
  }

  function scrapeCurrentPage() {
    let businessName = "";
    let website = "";
    let phone = "";
    let email = "";

    try {
      const nameEl =
        document.querySelector("h1 span") ||
        document.querySelector("h1") ||
        document.querySelector("[role='heading'] span");
      if (nameEl) businessName = nameEl.textContent.trim();
    } catch (e) {}

    try {
      const websiteEl = document.querySelector("a[data-item-id='authority']");
      if (websiteEl) {
        website = (websiteEl.getAttribute("href") || "").trim();
      }
    } catch (e) {}

    try {
      const phoneEl = document.querySelector("button[data-item-id^='phone:tel']");
      if (phoneEl) {
        phone = phoneEl.textContent.trim();
      }
    } catch (e) {}

    try {
      const emailEl = document.querySelector("a[href^='mailto:']");
      if (emailEl) {
        const href = emailEl.getAttribute("href") || "";
        email = href.replace(/^mailto:/i, "").trim();
      }
    } catch (e) {}

    const opportunityName = businessName || "";
    const url = window.location.href;

    return {
      opportunityName,
      businessName,
      website,
     phone,
      email,
      url
    };
  }

  function createDoneUI(state) {
    const total = state.urls.length;
    const collected = state.results.length;

    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:bold;font-size:14px;">Google Maps Scraper</div>
        <button id="gmaps-scraper-close" style="border:none;background:none;font-size:14px;cursor:pointer;">✕</button>
      </div>
      <div style="margin-bottom:8px;">
        ✅ Done! Collected <b>${collected}</b> rows from <b>${total}</b> URLs.
      </div>
      <button id="gmaps-scraper-download" style="padding:6px 10px;border-radius:4px;border:1px solid #28a745;background:#28a745;color:#fff;cursor:pointer;">
        Download CSV
      </button>
      <button id="gmaps-scraper-reset" style="margin-left:6px;padding:4px 8px;border-radius:4px;border:1px solid #ccc;background:#f5f5f5;cursor:pointer;font-size:11px;">
        Reset state
      </button>
      <div style="margin-top:8px;color:#555;font-size:11px;">
        Tip: if something looks off, reset state and run again.
      </div>
    `;

    const overlay = createOverlay(html);

    overlay.querySelector("#gmaps-scraper-close").onclick = () => overlay.remove();

    overlay.querySelector("#gmaps-scraper-reset").onclick = () => {
      resetState();
      alert("Google Maps Scraper state has been reset.");
      overlay.remove();
    };

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

      const csvContent = rows
        .map(row =>
          row
            .map(field => {
              const s = String(field || "");
              if (s.includes('"') || s.includes(",") || s.includes("\n")) {
                return `"${s.replace(/"/g, '""')}"`;
              }
              return s;
            })
            .join(",")
        )
        .join("\r\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "google_maps_scraper_results.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };
  }

  function createProgressUI(state) {
    const total = state.urls.length;
    const idx = state.currentIndex;
    const collected = state.results.length;

    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:bold;font-size:14px;">Google Maps Scraper</div>
        <button id="gmaps-scraper-close" style="border:none;background:none;font-size:14px;cursor:pointer;">✕</button>
      </div>
      <div style="margin-bottom:4px;">
        Progress: <b>${collected}</b> collected out of <b>${total}</b> URLs.
      </div>
      <div style="margin-bottom:8px;font-size:11px;color:#555;">
        Current URL index: <b>${idx + 1}</b> / ${total}<br>
        Click the bookmarklet on each loaded business page to capture and move to the next one.
      </div>
      <button id="gmaps-scraper-reset" style="padding:4px 8px;border-radius:4px;border:1px solid #ccc;background:#f5f5f5;cursor:pointer;font-size:11px;">
        Reset state
      </button>
    `;

    const overlay = createOverlay(html);

    overlay.querySelector("#gmaps-scraper-close").onclick = () => overlay.remove();
    overlay.querySelector("#gmaps-scraper-reset").onclick = () => {
      resetState();
      alert("Google Maps Scraper state has been reset.");
      overlay.remove();
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

  const currentIndex = state.currentIndex || 0;
  const urls = state.urls;
  const total = urls.length;

  const row = scrapeCurrentPage();
  state.results.push(row);

  const nextIndex = currentIndex;
  if (nextIndex >= total) {
    state.currentIndex = nextIndex;
    state.done = true;
    saveState(state);
    alert("Sequence complete! Click the bookmarklet once more to show the Download CSV button.");
    createDoneUI(state);
  } else {
    saveState(state);
    createProgressUI(state);

    const nextUrl = urls[nextIndex];
    setTimeout(() => {
      window.location.href = nextUrl;
    }, 1000);
  }
})();
