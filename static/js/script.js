/*
  Portfolio main JavaScript
  ------------------------------------------------------------
  What this file does, at a glance:
  - Theme module: Sets light/dark mode by toggling a data-theme attribute
    on <html>, persists the preference in localStorage, and keeps button
    labels in sync. Uses system preference as a sensible default.
  - Greeting init: Computes a time-of-day greeting and fills it into the DOM,
    also updates the current year in the footer.
  - Navigation init: Wires the mobile hamburger button to open/close the menu;
    closes the menu when a navigation link is clicked.
  - Resume module: Holds a small local dataset, filters it by type and year
    range, then renders cards without a page reload.
  - Contact form module: Adds live (progressive enhancement) validation and
    constructs a mailto: action URL so submission opens the user’s email client.

  Notes on structure:
  - Each feature lives in a tiny module or function with a clear init().
  - We avoid globals: only well-named constants/functions are exposed.
  - All setup runs after DOMContentLoaded to ensure elements exist.
*/

// Minimal JS to meet all requirements: theme toggle, greeting, nav, resume filters, and live form validation.

// 1) Theme module
// Overview:
// - Stores the preferred theme under a localStorage key.
// - Applies the theme by setting data-theme="light|dark" on <html>.
// - Chooses a default based on system preference if nothing is saved.
// - Updates both theme buttons’ labels and wires click listeners to toggle.
const theme = (() => {
  // Storage key used to persist the theme between visits
  const key = "pref-theme";

  // Apply a given theme value ("light" or "dark") to the document and UI
  const set = (t) => {
    // Update <html data-theme="..."> so CSS variables switch palette
    document.documentElement.setAttribute("data-theme", t);

    // Compute the button label that hints the other mode
    const label = t === "dark" ? "☀️ Light" : "🌙 Dark";

    // Update both theme buttons’ text content if they exist in the DOM
    ["themeToggle", "footerThemeToggle"].forEach((id) => {
      const b = document.getElementById(id); // grab button by id
      if (b) b.textContent = label; // set label only if button is present
    });

    // Persist the choice; wrap in try/catch to survive blocked storage
    try { localStorage.setItem(key, t); } catch {}
  };

  // Flip the current theme: read attribute, decide the opposite, then set
  const toggle = () => set(
    (document.documentElement.getAttribute("data-theme") || "light") === "light"
      ? "dark"
      : "light"
  );

  // Initialize theme on page load
  const init = () => {
    let t = null; // holds the theme we will apply

    // Try to load a saved preference from localStorage
    try { t = localStorage.getItem(key); } catch {}

    // If no saved preference, fall back to system preference via matchMedia
    if (!t) t = (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";

    // Apply the chosen theme (this also sets button labels)
    set(t);

    // Wire click handlers to both theme buttons to toggle the theme
    ["themeToggle", "footerThemeToggle"].forEach((id) => {
      const b = document.getElementById(id); // find button
      if (b) b.addEventListener("click", toggle); // attach listener if present
    });
  };

  // Expose only the init() method to the outside
  return { init };
})();

// 2) Greeting + year
// Overview:
// - Picks a greeting based on the current hour and injects it.
// - Updates the current year in the footer to keep it fresh.
const initGreeting = () => {
  const h = new Date().getHours(); // current hour (0–23)
  // Choose a greeting string by comparing the hour against ranges
  const msg = h < 5 ? "Good night" : h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : h < 22 ? "Good evening" : "Good night";

  const g = document.getElementById("timeGreeting"); // greeting span
  if (g) g.textContent = msg; // set text if element is present

  const y = document.getElementById("yearNow"); // footer year span
  if (y) y.textContent = new Date().getFullYear(); // set to current year
};

// 3) Mobile navigation
// Overview:
// - Toggles a CSS class on the nav to open/close it on small screens.
// - Closes the menu when any nav link is clicked.
const initNav = () => {
  const btn = document.getElementById("navToggle"); // hamburger button
  const nav = document.getElementById("siteNav");   // nav element
  if (!btn || !nav) return; // bail out if either is missing

  // On click, toggle the "open" class
  btn.addEventListener("click", () => { nav.classList.toggle("open"); });

  // When a nav link is clicked, close the menu
  nav.querySelectorAll("a.nav-link").forEach((a) =>
    a.addEventListener("click", () => {
      nav.classList.remove("open");
    })
  );
};

// 4) Resume: data + filters + render
// Overview:
// - data: an in-memory array of resume entries (work/education) with years.
// - bounds: compute min/max year across the dataset to seed filter controls.
// - filters(): read current UI filter values (type checkboxes + year range).
// - render(): filter + sort + render cards into the container.
// - init(): query DOM, prime inputs, attach listeners, and render once.
const resume = (() => {
  // Local dataset of resume entries. Each object follows this shape:
  // { type: "work"|"education", title: string, org: string, location: string,
  //   start: number (year), end: number (year), details: string[] }
  const data = [
    { type: "work", title: "Frontend Developer", org: "Acme Corp", location: "Remote", start: 2022, end: 2025, details: ["Built accessible UI components", "Improved performance by 30%"] },
    { type: "education", title: "B.Sc. Computer Science", org: "Tech University", location: "City", start: 2018, end: 2021, details: ["Focus on web engineering", "Graduated with honors"] },
    { type: "work", title: "Web Developer", org: "Startup XYZ", location: "Berlin", start: 2020, end: 2022, details: ["Prototyped new features", "Worked across the stack"] },
    { type: "education", title: "Online Courses", org: "Various Platforms", location: "Online", start: 2021, end: 2024, details: ["Frontend frameworks", "UX fundamentals"] },
    { type: "work", title: "UI Engineer", org: "Design Studio", location: "Munich", start: 2016, end: 2019, details: ["Designed component library", "Collaborated with designers"] },
    { type: "work", title: "Senior Frontend Engineer", org: "NextGen Apps GmbH", location: "Hamburg", start: 2025, end: 2025, details: ["Led migration to modern build tooling", "Introduced design tokens and theming"] },
    { type: "education", title: "M.Sc. Human-Computer Interaction", org: "FH Musterstadt", location: "Musterstadt", start: 2023, end: 2025, details: ["Thesis on accessibility patterns", "Research assistant in UX lab"] },
    { type: "work", title: "Freelance Developer", org: "Self-employed", location: "Remote", start: 2019, end: 2020, details: ["Delivered SPA prototypes", "Optimized Lighthouse scores"] },
    { type: "education", title: "Frontend Nanodegree", org: "Udacity", location: "Online", start: 2017, end: 2017, details: ["Advanced JS and web performance", "Project-based learning"] },
  ];

  // DOM element handles (will be populated in init())
  const els = { list: null, chkWork: null, chkEdu: null, yearFrom: null, yearTo: null, reset: null };

  // Compute min and max year across all entries to initialize inputs
  const bounds = (() => {
    const years = data.flatMap((i) => [i.start, i.end]); // collect all years
    return { min: Math.min(...years), max: Math.max(...years) }; // extremes
  })();

  // Read current filter settings from the UI and return as an object
  const filters = () => ({
    showWork: els.chkWork?.checked ?? true, // include work items?
    showEdu: els.chkEdu?.checked ?? true,  // include education items?
    from: Number(els.yearFrom?.value || 0), // lower bound (defaults to 0)
    to: Number(els.yearTo?.value || 9999),  // upper bound (defaults high)
  });

  // Render filtered, sorted items as cards
  const render = () => {
    if (!els.list) return; // safety check: container exists

    const { showWork, showEdu, from, to } = filters(); // current filter state

    // Filter by type and by year overlap; sort by end desc, then start desc
    const items = data
      .filter((i) => ((i.type === "work" && showWork) || (i.type === "education" && showEdu)) && i.end >= from && i.start <= to)
      .sort((a, b) => b.end - a.end || b.start - a.start);

    // If nothing matches, show a short message and stop
    if (!items.length) { els.list.textContent = "No entries match your filter."; return; }

    // Otherwise, build the card markup efficiently with map + join
    els.list.innerHTML = items
      .map((i) => `
        <article class="card">
          <span class="badge ${i.type === "work" ? "work" : "edu"}">${i.type === "work" ? "Professional" : "Education"}</span>
          <h3 class="jet">${i.title}</h3>
          <div class="meta">${i.org} • ${i.location} • ${i.start}–${i.end}</div>
          <ul>${i.details.map((d) => `<li>${d}</li>`).join("")}</ul>
        </article>
      `).join("");
  };

  // Initialize: cache elements, seed inputs, add listeners, render once
  const init = () => {
    // Cache all relevant DOM nodes
    els.list = document.getElementById("resumeList");
    els.chkWork = document.getElementById("filterWork");
    els.chkEdu = document.getElementById("filterEducation");
    els.yearFrom = document.getElementById("yearFrom");
    els.yearTo = document.getElementById("yearTo");
    els.reset = document.getElementById("resetFilters");

    // Initialize year inputs with dataset bounds and sensible defaults
    if (els.yearFrom) { els.yearFrom.min = bounds.min; els.yearFrom.max = bounds.max; els.yearFrom.value = bounds.min; }
    if (els.yearTo)   { els.yearTo.min   = bounds.min; els.yearTo.max   = bounds.max; els.yearTo.value   = bounds.max; }

    // Re-render whenever a filter control changes
    [els.chkWork, els.chkEdu, els.yearFrom, els.yearTo].forEach((el) => el && el.addEventListener("input", render));

    // Reset button: restore defaults and re-render
    els.reset && els.reset.addEventListener("click", () => {
      if (els.chkWork)  els.chkWork.checked  = true;
      if (els.chkEdu)   els.chkEdu.checked   = true;
      if (els.yearFrom) els.yearFrom.value   = bounds.min;
      if (els.yearTo)   els.yearTo.value     = bounds.max;
      render();
    });

    // Initial paint
    render();
  };

  // Public API
  return { init };
})();

// 5) Contact form live validation (mailto)
// Overview:
// - Enhances the basic mailto form by showing inline errors as the user types.
// - Builds a mailto URL with subject/body/name/email when the form is valid.
// - Prevents submission if required fields are empty or invalid.
const contactForm = (() => {
  // Extract the recipient email address from a form action like "mailto:you@x?…"
  const pickRecipient = (action) => {
    if (typeof action !== "string") return "";           // non-string guard
    if (!action.startsWith("mailto:")) return "";         // only accept mailto
    const mail = action.split("?")[0].slice(7);            // strip protocol + query
    return mail || "";                                     // return address or empty
  };

  // Initialize validation and event handling
  const init = () => {
    const form = document.getElementById("contactForm"); // the <form>
    if (!form) return;                                    // stop if not present

    // Input elements (f = fields)
    const f = {
      name: document.getElementById("name"),       // text input
      email: document.getElementById("email"),     // email input
      subject: document.getElementById("subject"), // text input
      message: document.getElementById("message"), // textarea
      privacy: document.getElementById("privacy"), // checkbox
    };

  // Error elements (e = errors) — small helper elements
    const e = {
      name: document.getElementById("nameError"),
      email: document.getElementById("emailError"),
      subject: document.getElementById("subjectError"),
      message: document.getElementById("messageError"),
      privacy: document.getElementById("privacyError"),
    };

    // Use the form's action as the recipient if it contains a mailto address
    const recipient = pickRecipient(form.getAttribute("action")) || "superguido@example.com";

    // Validate fields and (if valid) update the form action with query params
    const validate = () => {
      let ok = true; // start optimistic; flip to false on any error

      // Clear previous errors so we only show current messages
      Object.values(e).forEach((el) => el && (el.textContent = ""));

      // Required: name (non-empty)
      if (!f.name.value.trim()) { e.name.textContent = "Please enter your name."; ok = false; }

      // Required + valid email syntax (uses built-in validity)
      if (!f.email.value.trim()) { e.email.textContent = "Please enter your email."; ok = false; }
      else if (!f.email.checkValidity()) { e.email.textContent = "Please enter a valid email."; ok = false; }

      // Required: subject (non-empty)
      if (!f.subject.value.trim()) { e.subject.textContent = "Please enter a subject."; ok = false; }

      // Required: message (non-empty)
      if (!f.message.value.trim()) { e.message.textContent = "Please enter a message."; ok = false; }

      // Required: privacy consent (must be checked)
      if (!f.privacy.checked) { e.privacy.textContent = "Please accept the privacy policy."; ok = false; }

      // Build the mailto action only when valid so the email client opens with prefilled fields
      form.setAttribute(
        "action",
        ok
          ? `mailto:${recipient}?${new URLSearchParams({
              Subject: f.subject.value.trim(),
              Name: f.name.value.trim(),
              Email: f.email.value.trim(),
              Message: f.message.value.trim(),
            }).toString()}`
          : `mailto:${recipient}`
      );
      return ok; // return validity to caller
    };

    // Live validation as the user types/checks
    [f.name, f.email, f.subject, f.message, f.privacy].forEach((el) => el && el.addEventListener("input", validate));

    // On submit: block sending if invalid
    form.addEventListener("submit", (ev) => { if (!validate()) ev.preventDefault(); });

    // On reset: wait one tick so inputs clear, then recompute state
    form.addEventListener("reset", () => setTimeout(validate, 0));

    // Do an initial validation pass to set initial button state/action
    validate();
  };

  // Expose only init() from this module
  return { init };
})();

// Application bootstrap
// - Wait for DOMContentLoaded so all elements are present in the document.
// - Initialize each feature in a clear, predictable order.
document.addEventListener("DOMContentLoaded", () => {
  theme.init();       // set theme & wire toggles
  initGreeting();     // inject greeting and current year
  initNav();          // wire hamburger menu behavior
  resume.init();      // populate resume list and attach filters
  contactForm.init(); // enhance contact form validation
});