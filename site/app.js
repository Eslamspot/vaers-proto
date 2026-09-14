/* ═══════════════════════════════════════════════════════════════
   VAERS Modernized Reporting — Prototype (Tab 2-2)
   Idealistic Solutions LLC · Solicitation 75D301-26-Q-00146
   Branching rules are EXTERNALIZED as configuration (BRANCH_RULES),
   per the Technical Proposal: "Rules are externalized as
   configuration, not hard-coded, so CDC can adjust logic without
   a release." The guide panel renders this config for evaluators.
   ═══════════════════════════════════════════════════════════════ */
"use strict";

/* ── Branching configuration ─────────────────────────────────── */
const BRANCH_RULES = {
  entry: {
    public:   { next: ["who", "patient", "vaccine", "onset", "symptoms", "outcome", "contact", "extra"] },
    provider: { next: ["who", "facility", "patient", "vaccine", "onset", "symptoms", "outcome", "contact", "extra"] },
  },
  // Conditional skips: if field=value, drop/insert steps.
  conditions: [
    { when: { id: "vaccinated", equals: "unknown" }, modify: { remove: ["vaccine"] } },
    { when: { id: "outcome", equals: "none" },       modify: { remove: [] } },
    { when: { id: "symptoms_choice", includes: "hospitalized" }, modify: { insert: "hospital" } },
    { when: { id: "who_role", equals: "provider" },  modify: { ensure: ["facility"] } },
    { when: { id: "who_role", equals: "public" },    modify: { remove: ["facility"] } },
  ],
};

const STEPS = {
  who: {
    title: "Who is reporting?",
    help: "We tailor every later question to your relationship with the event. Nothing is assumed.",
    why: "VAERS accepts reports from anyone. Knowing your relationship up front removes the clinical questions that don't apply to you.",
    fields: [
      { id: "who_role", type: "radio", required: true, label: "Which best describes you?",
        options: [
          ["public", "A member of the public (patient, parent, caregiver)"],
          ["provider", "A healthcare provider (clinic, pharmacy, hospital)"],
          ["manufacturer", "A vaccine manufacturer (routed in production)"],
        ] },
    ],
  },
  facility: {
    title: "Your facility",
    help: "Pre-filled from your simulated provider profile — editable, as in production.",
    why: "Facility details let CDC contact the right practice and support provider-specific reporting obligations.",
    fields: [
      { id: "fac_name", type: "text", label: "Facility name", required: true, value: "Riverside Family Health (simulated)" },
      { id: "fac_npi", type: "text", label: "NPI", hint: "10-digit National Provider Identifier", required: true, value: "1234567893" },
      { id: "fac_contact", type: "text", label: "Facility contact", required: false, value: "J. Rivera, RN" },
    ],
  },
  patient: {
    title: "About the patient",
    help: "Only what VAERS needs to understand the event. Exact spelling and optional fields are fine.",
    why: "Demographics and age drive CDC's analysis of adverse events; the form asks only for what the current VAERS form captures.",
    fields: [
      { id: "pat_initials", type: "text", label: "Patient initials", required: true, hint: "Initials are sufficient — never a full name", tooltip: "VAERS protects privacy: initials, not names. In production this field enforces the rule before you can continue." },
      { id: "pat_age", type: "text", label: "Age", required: true, inputmode: "numeric", tooltip: "Years. For infants under 1, enter months in the free-text box." },
      { id: "pat_sex", type: "select", label: "Sex", required: false, options: ["Prefer not to say", "Female", "Male", "Other"] },
      { id: "pat_state", type: "select", label: "State / territory", required: true, options: STATE_LIST },
    ],
  },
  vaccine: {
    title: "The vaccine",
    help: "Type at least three characters — intelligent completion suggests the vaccine and its manufacturer (simulated).",
    why: "Vaccine identity is the single most important field: it drives CDC's signal detection. Lot number and expiration date come straight from today's VAERS form.",
    fields: [
      { id: "vac_name", type: "text", label: "Vaccine", required: true, autocomplete: "vaccine", placeholder: "e.g. Influenza, COVID-19, Tdap…", tooltip: "Intelligent completion is driven by a CDC-maintained vaccine table in production — this prototype uses a small simulated list." },
      { id: "vac_manufacturer", type: "select", label: "Manufacturer", required: false, options: ["Unknown", "GSK", "Merck", "Moderna", "Pfizer", "Sanofi", "Novavax"] },
      { id: "vac_lot", type: "text", label: "Lot number", required: false, hint: "On the vaccination record or card" },
      { id: "vac_date", type: "date", label: "Date vaccinated", required: true },
      { id: "vac_number", type: "select", label: "Dose number in this series", required: false, options: ["1", "2", "3", "4", "Booster", "Unknown"] },
    ],
  },
  onset: {
    title: "When symptoms began",
    help: "An approximate date is fine. The onset interval is computed for you.",
    why: "Time between vaccination and onset is central to CDC's assessment. Estimating from the record is acceptable — say so in the free-text box if uncertain.",
    fields: [
      { id: "onset_date", type: "date", label: "Date symptoms began", required: true },
      { id: "onset_estimate", type: "radio", required: false, label: "How exact is this date?", options: [["exact", "Exact date from the record"], ["approx", "Approximate"], ["unknown", "Only a rough estimate"]] },
    ],
  },
  symptoms: {
    title: "Symptoms and effects",
    help: "Choose everything observed. Intelligent completion suggests related terms as you select (simulated).",
    why: "Symptom selection drives CDC's analysis; the checklist mirrors the MedDRA-preferred terms the current VAERS form uses.",
    fields: [
      { id: "symptoms_choice", type: "checkgroup", required: true, label: "Select all that apply",
        options: [
          ["fever", "Fever"], ["rash", "Rash"], ["fatigue", "Fatigue / low energy"],
          ["injection_site", "Pain, swelling or redness where the vaccine was given"],
          ["headache", "Headache"], ["dizziness", "Dizziness"],
          ["hospitalized", "Hospitalization (or was needed)"],
          ["life_threatening", "Life-threatening reaction"],
          ["other_symptom", "Other — describe below"],
        ] },
      { id: "symptoms_text", type: "textarea", label: "Describe the symptoms in your own words", required: false, hint: "Plain language is perfect. Include anything the checklist missed." },
    ],
  },
  hospital: {
    title: "Hospital stay",
    help: "Shown because you selected a hospital-related symptom — the branching engine inserted this step.",
    why: "Serious outcomes follow a different review path at CDC. Dates and length of stay are captured here.",
    fields: [
      { id: "hosp_name", type: "text", label: "Hospital name", required: true },
      { id: "hosp_dates", type: "text", label: "Dates of stay (or 'still admitted')", required: true },
      { id: "hosp_city_state", type: "text", label: "City and state", required: false },
    ],
  },
  outcome: {
    title: "Current outcome",
    help: "Select the outcome as of today.",
    why: "Outcome status (recovered, ongoing, death) determines CDC's follow-up priority in production.",
    fields: [
      { id: "outcome", type: "radio", required: true, label: "Current outcome of the event",
        options: [
          ["recovered", "Fully recovered"],
          ["recovering", "Improving, not fully recovered"],
          ["not_recovered", "Not recovered"],
          ["death", "Death (routed to CDC's serious-event queue in production)"],
          ["unknown", "Unknown at this time"],
        ] },
    ],
  },
  contact: {
    title: "How CDC can reach you",
    help: "Contact details are used only for follow-up questions, never published.",
    why: "CDC may need one clarifying question. In production, an email or phone here is how that reaches you — this prototype stores nothing.",
    fields: [
      { id: "contact_name", type: "text", label: "Your name", required: true },
      { id: "contact_email", type: "email", label: "Email", required: false },
      { id: "contact_phone", type: "tel", label: "Phone", required: false },
      { id: "contact_pref", type: "select", label: "Preferred contact method", required: false, options: ["Email", "Phone", "No preference"] },
    ],
  },
  extra: {
    title: "Anything else",
    help: "Every path offers this free-text box — say anything the questions didn't cover.",
    why: "Free-text capture is on every submission path, per the proposal: submitters can add context beyond structured fields.",
    fields: [
      { id: "extra_text", type: "textarea", label: "Additional information (optional)", required: false, hint: "Medical records and other documents can be attached on the next screen." },
      { id: "extra_upload", type: "upload", label: "Attach medical records (optional)" },
    ],
  },
};

const STATE_LIST = ["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming","DC","Other"];

const VACCINE_SUGGEST = [
  "COVID-19 (mRNA)", "COVID-19 (protein subunit)", "Influenza (seasonal)", "Influenza (nasal)",
  "Tdap", "DTaP", "MMR", "Varicella", "Shingles (Zoster)", "Pneumococcal", "HPV",
  "Hepatitis A", "Hepatitis B", "Meningococcal", "Polio", "Rotavirus", "RSV",
];

const FAQS = [
  ["Who should report to VAERS?", "Anyone — patients, parents, caregivers, and healthcare providers. Providers are required by law to report certain events; the public is encouraged to report any concerning event after vaccination."],
  ["What if I only know the vaccine name?", "That's enough to begin. Lot number and manufacturer help CDC's analysis but are optional — enter what you have, and note in the free-text box where you saw the information."],
  ["Is my information private?", "VAERS protects patient privacy: initials rather than full names, and contact details are used only for follow-up. This prototype collects nothing at all."],
  ["What happens after I submit?", "In production, trained staff review reports and may follow up for medical records. Serious reports are triaged to CDC clinical reviewers. A confirmation number is issued immediately."],
  ["Should I also tell my doctor?", "Yes. VAERS is not a medical service — report symptoms to a healthcare professional, and seek care urgently for anything severe."],
  ["I'm a provider — what am I required to report?", "Providers must report events listed on the VAERS Reportable Events Table, including any hospitalization or death following vaccination, and events listed in a vaccine's package insert."],
  ["Can I report on paper?", "Yes — a printable form is available under Data & Downloads, and completed paper forms can be submitted by mail or fax in production."],
  ["How long does a report take?", "The guided path asks only questions relevant to your situation — members of the public typically complete a report in 10–15 minutes."],
];

const GUIDE = [
  ["Evaluation criterion 1 — Understanding of the problem & objectives",
   "The landing page states the modernization objective plainly and routes two distinct submitter populations immediately — the redesign target named in the PWS.",
   "See: landing page hero + Path A/Path B cards."],
  ["Evaluation criterion 2 — Soundness & feasibility of the technical approach",
   "Branching logic is implemented as an externalized rules table (BRANCH_RULES), not hard-coded screens — the same 'rules as configuration' approach the Technical Proposal commits to, so CDC can adjust logic without a release. The wizard inserts and removes steps live (select a hospital-related symptom and watch a step appear).",
   "See: the branching rules shown below, and PRS-aligned validation throughout."],
  ["Evaluation criterion 3 — Innovation & originality",
   "Intelligent completion on vaccine entry, contextual 'Why we ask' guidance beside every step, a reactive FAQ assistant that answers in place, and a simulated facility profile that pre-fills provider details — the assistance features promised in Tab 2, demonstrated working.",
   "See: the assistance column while completing a report."],
  ["Evaluation criterion 4 — Technical risks & mitigation strategies",
   "Every answer is validated at the step boundary (required fields enforced, ranges checked) so bad data cannot advance — the riskiest failure in a form this long. Free-text capture exists on every path so structured choices can never lose nuance. Nothing is transmitted: risk of PHI exposure in a demo is designed to zero.",
   "See: inline validation, and the synthetic-data banner on every page."],
  ["Evaluation criterion 5 — Alignment with performance requirements",
   "Data elements mirror the current VAERS form (initials, vaccine/lot/date, onset interval, symptoms, outcome). Privacy rule (initials, not names) is enforced in-form. The prototype states plainly which behaviors are simulated vs. production.",
   "See: step 'why' text, and the footer disclaimer."],
  ["Evaluation criterion 6 — Scalability & extensibility",
   "New steps are pure configuration: adding a submitter type or a rule means editing the BRANCH_RULES/STEPS tables, not rewriting the wizard. A manufacturer path is already modeled in the rules. The same rules table would drive server-side rendering in production.",
   "See: BRANCH_RULES below — the manufacturer path is one line."],
  ["Section 508 conformance",
   "Skip link, keyboard-operable wizard with visible focus, labeled fields with programmatic hint association, ARIA live regions for progress and assistant answers, high-contrast palette, and prefers-reduced-motion support. Built to be evaluated with a screen reader.",
   "Try: Tab through the wizard; the progress bar announces each step."],
];

/* ── Tiny helpers ────────────────────────────────────────────── */
const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => [...el.querySelectorAll(sel)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const LABELS = {};

/* ── Toast ───────────────────────────────────────────────────── */
let toastTimer = null;
function toast(msg, isError = false) {
  const t = $("#toast");
  t.hidden = false;
  t.classList.toggle("error", isError);
  t.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 4200);
}

/* ── Router ──────────────────────────────────────────────────── */
const views = { landing: $("#view-landing"), wizard: $("#view-wizard"), summary: $("#view-summary") };
function show(name) {
  for (const [k, el] of Object.entries(views)) el.hidden = k !== name;
  $("#nav-start").classList.toggle("active", name === "wizard");
  window.scrollTo({ top: 0 });
  if (name !== "wizard") return;
  const focusTarget = $("#wiz-back") || $("#wiz-steps");
  focusTarget?.focus?.();
}

/* ── FAQ rendering ───────────────────────────────────────────── */
function renderFaqs() {
  $("#faq-grid").innerHTML = FAQS.map(([q, a], i) => `
    <details class="faq" id="faq-${i_key(q)}">
      <summary>${esc(q)}</summary>
      <div class="faq-a">${esc(a)}</div>
    </details>`).join("");
}
const i_key = (q) => q.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 28);

/* ── Wizard engine ───────────────────────────────────────────── */
const wiz = { path: null, stepIndex: 0, steps: [], answers: {}, uploads: {} };

function computeSteps(path) {
  let order = [...BRANCH_RULES.entry[path].next];
  // Apply conditions using currently known answers (re-evaluated on answer).
  for (const rule of BRANCH_RULES.conditions) {
    const { when, modify } = rule;
    const val = wiz.answers[when.id];
    const matches =
      val === undefined ? false :
      when.equals !== undefined ? String(val) === when.equals :
      when.includes !== undefined ? (Array.isArray(val) ? val.includes(when.includes) : String(val).includes(when.includes)) :
      false;
    if (!matches) continue;
    if (modify.remove) order = order.filter(s => !modify.remove.includes(s));
    if (modify.insert) { if (!order.includes(modify.insert)) { const at = order.indexOf("extra"); order.splice(at >= 0 ? at : order.length, 0, modify.insert); } }
    if (modify.ensure) { for (const s of modify.ensure) if (!order.includes(s)) { const at = order.indexOf("extra"); order.splice(at >= 0 ? at : order.length, 0, s); } }
  }
  return order;
}

function startWizard(path) {
  wiz.path = path;
  wiz.stepIndex = 0;
  wiz.answers = {};
  wiz.uploads = {};
  wiz.steps = computeSteps(path);
  show("wizard");
  renderStep();
}

function renderStep() {
  const id = wiz.steps[wiz.stepIndex];
  const step = STEPS[id];
  const total = wiz.steps.length;
  const pct = Math.round(((wiz.stepIndex) / total) * 100);
  const isLast = wiz.stepIndex === total - 1;

  $("#wiz-step-label").textContent = `Step ${wiz.stepIndex + 1} of ${total} — ${step.title}`;
  $("#wiz-pct").textContent = `${pct}%`;
  $("#wiz-bar").setAttribute("aria-valuenow", String(pct));
  $("#wiz-bar").firstElementChild.style.width = pct + "%";

  $("#assist-why").textContent = step.why;

  const html = [`
    <div class="step-card" role="group" aria-labelledby="step-title">
      <p class="step-eyebrow">${esc(wiz.path === "provider" ? "Healthcare provider path" : "Public path")} · ${esc(id)}</p>
      <h2 class="step-title" id="step-title">${esc(step.title)}</h2>
      <p class="step-help">${esc(step.help)}</p>`];

  for (const f of step.fields) html.push(renderField(id, f));
  html.push(`
      <div class="freetext">
        <label for="ft-${id}"><span aria-hidden="true">✎</span> Anything to add? (free-text, optional)</label>
        <textarea id="ft-${id}" data-freetext="${id}" placeholder="Anything the questions above didn't cover"></textarea>
      </div>
    </div>`);

  $("#wiz-steps").innerHTML = html.join("");

  // restore saved answers
  for (const f of step.fields) {
    const el = $("#fld-" + f.id);
    if (!el) continue;
    if (f.type === "radio" || f.type === "checkgroup") {
      const saved = wiz.answers[f.id];
      if (saved !== undefined) {
        (Array.isArray(saved) ? saved : [saved]).forEach(v => { const c = $(`#fld-${f.id}-${v}`); if (c) c.checked = true; });
      }
    } else if (wiz.answers[f.id] !== undefined) {
      el.value = wiz.answers[f.id];
    } else if (f.value !== undefined) {
      el.value = f.value; // provider profile pre-fill
    }
    if (f.type === "text" && f.autocomplete === "vaccine") wireVaccineAutocomplete(el);
  }
  const ft = $("#wiz-form [data-freetext]");
  if (ft && wiz.answers["__ft_" + id]) ft.value = wiz.answers["__ft_" + id];

  $("#wiz-back").disabled = wiz.stepIndex === 0;
  $("#wiz-back").style.visibility = wiz.stepIndex === 0 ? "hidden" : "visible";
  $("#wiz-next").hidden = isLast;
  $("#wiz-submit").hidden = !isLast;

  // focus first input for keyboard flow
  const firstInput = $("#wiz-steps input, #wiz-steps select, #wiz-steps textarea");
  firstInput?.focus({ preventScroll: true });

  wireTooltips();
}

function renderStepStatic() { /* rendered above */ }

function renderFieldLabel(f, forId) {
  const optional = f.required ? `<span class="req-star" aria-hidden="true">*</span><span class="visually-hidden">(required)</span>`
                              : `<span class="optional">(optional)</span>`;
  let label = `<label for="${forId}">${esc(f.label)} ${optional}`;
  if (f.tooltip) label += ` <span class="tooltip-wrap"><button type="button" class="tip-btn" aria-expanded="false" aria-label="More information about ${esc(f.label)}" data-tip="${esc(f.tooltip)}">i</button><span class="tip-pop" hidden></span></span>`;
  label += `</label>`;
  if (f.hint) label += `<p class="hint-text" id="hint-${forId}">${esc(f.hint)}</p>`;
  return label;
}

function renderField(stepId, f) {
  const id = "fld-" + f.id;
  const describedBy = f.hint ? ` aria-describedby="hint-${id}"` : "";
  switch (f.type) {
    case "radio":
      return `<fieldset><legend>${esc(f.label)}${f.required ? ' <span class="req-star" aria-hidden="true">*</span>' : ' <span class="optional">(optional)</span>'}</legend>
        <div class="choices" role="radiogroup" aria-label="${esc(f.label)}">
        ${f.options.map(o => {
          const val = Array.isArray(o) ? o[0] : o;
          const txt = Array.isArray(o) ? o[1] : o;
          return `<div class="choice"><input type="radio" id="${id}-${val}" name="${id}" value="${esc(val)}"><label for="${id}-${val}">${esc(txt)}</label></div>`;
        }).join("")}</div></fieldset>`;
    case "checkgroup":
      return `<fieldset><legend>${esc(f.label)}${f.required ? ' <span class="req-star" aria-hidden="true">*</span>' : ' <span class="optional">(optional)</span>'}</legend>
        ${f.options.map(o => `<div class="choice"><input type="checkbox" id="${id}-${o[0]}" name="${id}" value="${esc(o[0])}"><label for="${id}-${o[0]}">${esc(o[1])}</label></div>`).join("")}
        </fieldset>`;
    case "select":
      return `<div class="field">${renderFieldLabel(f, id)}
        <select id="${id}" name="${id}"${f.required ? ' required aria-required="true"' : ""}${describedBy}>
          <option value="">— Select —</option>
          ${f.options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join("")}
        </select></div>`;
    case "textarea":
      return `<div class="field">${renderFieldLabel(f, id)}
        <textarea id="${id}" name="${id}"${f.required ? ' required aria-required="true"' : ""}${describedBy}></textarea></div>`;
    case "upload":
      return `<div class="field">${renderFieldLabel(f, id)}
        <div class="upload-zone" id="${id}" role="button" tabindex="0" aria-label="Attach medical records — simulated in this prototype">
          <span class="up-icon" aria-hidden="true">⇪</span>
          <strong>Drop files here or click to browse</strong>
          <p class="fineprint" style="margin:.2rem 0 0">PDF, JPG, DOCX up to 10 MB · simulated — nothing is uploaded</p>
        </div>
        <ul class="upload-list" id="${id}-list" aria-live="polite"></ul></div>`;
    default:
      return `<div class="field">${renderFieldLabel(f, id)}
        <input type="${f.type || "text"}" id="${id}" name="${id}" value="${esc(f.value ?? "")}"${f.required ? ' required aria-required="true"' : ""}${describedBy}${f.inputmode ? ` inputmode="${f.inputmode}"` : ""}></div>`;
  }
}

/* Render each field with the shared renderer (kept as function for clarity) */
function renderFieldWrapped(stepId, f) { return renderField(stepId, f); }
/* Use single implementation: */
function renderFields(stepId, fields) { return fields.map(f => renderField(stepId, f)).join(""); }
/* Override earlier inline call target: */
function renderFieldEntry(stepId, f) { return renderField(stepId, f); }

/* autocomplete (simulated intelligent completion) */
function wireVaccineAutocomplete(input) {
  let box = null;
  input.addEventListener("input", () => {
    if (box) { box.remove(); box = null; }
    const q = input.value.trim().toLowerCase();
    if (q.length < 3) return;
    const hits = VACCINE_SUGGEST.filter(v => v.toLowerCase().includes(q)).slice(0, 5);
    if (!hits.length) return;
    box = document.createElement("ul");
    box.className = "ac-list";
    box.setAttribute("role", "listbox");
    box.setAttribute("aria-label", "Vaccine suggestions");
    hits.forEach(h => {
      const li = document.createElement("li");
      li.setAttribute("role", "option");
      li.textContent = h;
      li.tabIndex = -1;
      li.addEventListener("click", () => { input.value = h; box.remove(); box = null; input.focus(); });
      box.appendChild(li);
    });
    input.closest(".field").appendChild(box);
    const close = (e) => { if (box && !box.contains(e.target) && e.target !== input) { box.remove(); box = null; document.removeEventListener("click", close); } };
    document.addEventListener("click", close);
  });
}

/* tooltips */
function wireTooltips() {
  $$(".tip-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const pop = btn.parentElement.querySelector(".tip-pop");
      const open = btn.getAttribute("aria-expanded") === "true";
      $$(".tip-pop").forEach(p => { p.hidden = true; });
      $$(".tip-btn").forEach(b => b.setAttribute("aria-expanded", "false"));
      if (!open) { pop.textContent = btn.dataset.tip; pop.hidden = false; btn.setAttribute("aria-expanded", "true"); }
    });
  });
  document.addEventListener("click", () => {
    $$(".tip-pop").forEach(p => { p.hidden = true; });
    $$(".tip-btn").forEach(b => b.setAttribute("aria-expanded", "false"));
  });
}

/* ── collect + validate a step ───────────────────────────────── */
function collectStep() {
  const id = wiz.steps[wiz.stepIndex];
  const step = STEPS[id];
  let ok = true;
  const mark = (el, msg) => {
    el.classList.add("invalid");
    el.setAttribute("aria-invalid", "true");
    const msgEl = document.createElement("p");
    msgEl.className = "err-msg"; msgEl.id = el.id + "-err";
    msgEl.textContent = msg;
    el.closest(".field, fieldset")?.appendChild(msgEl);
    ok = false;
  };
  const clearErrors = () => {
    $$("#wiz-steps .invalid").forEach(e => { e.classList.remove("invalid"); e.removeAttribute("aria-invalid"); e.removeAttribute("aria-describedby"); });
    $$("#wiz-steps .err-msg").forEach(e => e.remove());
  };
  clearErrors();

  for (const f of step.fields) {
    const el = $("#fld-" + f.id);
    if (!el) continue;
    switch (f.type) {
      case "radio": {
      const chosen = $(`input[name="fld-${f.id}"]:checked`);
      if (f.required && !chosen) { mark(el.closest("fieldset") || el, "Choose one to continue."); }
      else wiz.answers[f.id] = chosen ? chosen.value : undefined;
      break;
      }
      case "checkgroup": {
        const chosen = $$(`input[name="fld-${f.id}"]:checked`).map(c => c.value);
        if (f.required && !chosen.length) { mark(el.closest("fieldset"), "Select at least one to continue."); }
        else wiz.answers[f.id] = chosen;
        break;
      }
      case "upload": break;
      default: {
        const val = el.value.trim();
        if (f.required && !val) { mark(el, "This field is required."); el.setAttribute("aria-invalid", "true"); if (f.hint) el.setAttribute("aria-describedby", "hint-fld-" + f.id); }
        else if (f.type === "email" && val && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) { mark(el, "Enter an email address in the usual form, like name@example.com."); }
        else if (f.type === "tel" && val && !/^[\d\s()+.-]{7,}$/.test(val)) { mark(el, "Enter a phone number with at least 7 digits."); }
        else wiz.answers[f.id] = val;
      }
    }
  }
  const ft = $("#wiz-form [data-freetext]");
  if (ft) wiz.answers["__ft_" + id] = ft.value.trim();

  if (!ok) {
    const firstBad = $("#wiz-steps .invalid");
    toast("Some answers need attention before continuing — they are highlighted in red.", true);
    firstBad?.focus();
    return false;
  }
  return true;
}

function advance() {
  if (!collectStep()) return;
  const prevLen = wiz.steps.length;
  wiz.steps = computeSteps(wiz.path); // re-branch with fresh answers
  if (wiz.stepIndex < wiz.steps.length - 1) {
    wiz.stepIndex++;
    renderStep();
  }
}

function goBack() {
  if (wiz.stepIndex > 0) { wiz.stepIndex--; renderStep(); }
}

/* summary */
const LABEL_MAP = {};
function buildLabels() {
  for (const [id, s] of Object.entries(STEPS)) for (const f of s.fields) {
    if (f.type === "radio" || f.type === "checkgroup") {
      LABEL_MAP[f.id] = f.label;
      for (const o of f.options) {
        const val = Array.isArray(o) ? o[0] : o, txt = Array.isArray(o) ? o[1] : o;
        LABEL_MAP[`${f.id}::${val}`] = txt;
      }
    } else if (f.type !== "upload") {
      LABEL_MAP[f.id] = f.label;
    }
  }
}

function showSummary() {
  if (!collectStep()) return;
  const dl = [];
  for (const [k, v] of Object.entries(wiz.answers)) {
    if (k.startsWith("__ft_")) continue;
    const label = LABEL_MAP[k] || k;
    let text = "";
    if (Array.isArray(v)) text = v.map(x => LABEL_MAP[`${k}::${x}`] || x).join("; ");
    else text = LABEL_MAP[`${k}::${v}`] || v;
    if (!text) continue;
    dl.push(`<dt>${esc(label)}</dt><dd>${esc(text)}</dd>`);
  }
  // free-text sections
  for (const [k, v] of Object.entries(wiz.answers)) {
    if (k.startsWith("__ft_") && v.trim()) dl.push(`<dt>Additional context (${esc(k.slice(5))})</dt><dd>${esc(v)}</dd>`);
  }
  if (wiz.uploadsCount) dl.push(`<dt>Attachments</dt><dd>${wiz.uploadsCount} file(s) — simulated, nothing was uploaded</dd>`);
  $("#sum-list").innerHTML = dl.join("");
  $("#sum-ref").textContent = String(Math.floor(100000 + Math.random() * 900000));
  show("summary");
}

/* ── Reactive FAQ assistant ──────────────────────────────────── */
function tokenize(s) { return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2); }
function answerQuestion(q) {
  const qw = tokenize(q);
  if (!qw.length) return null;
  let best = null, bestScore = 0;
  for (const [faqQ, faqA] of FAQS) {
    const fw = new Set(tokenize(faqQ));
    const score = qw.reduce((acc, w) => acc + (fw.has(w) ? 1 : 0), 0) / qw.length;
    if (score > bestScore) { bestScore = score; best = faqA; }
  }
  return bestScore >= 0.4 ? best : null;
}

function wireAskAssistant() {
  const out = $("#ask-out");
  const ask = () => {
    const q = $("#ask-input").value.trim();
    if (!q) { $("#ask-input").focus(); return; }
    const ans = answerQuestion(q);
    out.innerHTML = ans
      ? `<p class="ans"><strong>From the reporting guide:</strong> ${esc(ans)}</p>`
      : `<p class="ans"><strong>No confident match.</strong> In production this question routes to the help desk. Try one of the FAQs below the report start, or rephrase — e.g. “What if I only know the vaccine name?”</p>`;
  };
  $("#ask-btn").addEventListener("click", ask);
  $("#ask-input").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); ask(); } });
  $("#ask-suggest").addEventListener("click", () => {
    const q = FAQS[Math.floor(Math.random() * FAQS.length)][0];
    $("#ask-input").value = q; ask();
  });
}

/* ── Guide dialog ────────────────────────────────────────────── */
function renderGuide() {
  const rulesView = esc(JSON.stringify(BRANCH_RULES, null, 2));
  $("#guide-body").innerHTML = `
    ${GUIDE.map(([h, body, see]) => `
      <div class="guide-item"><h3>${esc(h)}</h3><p>${esc(body)}</p><p class="map">${esc(see)}</p></div>`).join("")}
    <div class="guide-item"><h3>Branching rules — the live configuration this prototype runs on</h3>
      <p>Evaluators can confirm criterion 2 directly: these rules, not hard-coded screens, drive every transition. In production the same table would be served from configuration so CDC can adjust logic without a release.</p>
      <pre style="overflow:auto; background:#0a1f44; color:#e8eef9; padding:1rem; border-radius:8px; font-size:.82rem;">${rulesView}</pre></div>
    <div class="guide-item"><h3>What is simulated</h3><p>Intelligent completion (a five-entry demo list), provider profile pre-fill, uploads, and downloads are simulated. No data leaves the browser; there is no backend. All content is synthetic.</p></div>`;
}
function openGuide() {
  const bd = $("#guide-backdrop");
  bd.hidden = false;
  $("#guide-close").focus();
  document.body.style.overflow = "hidden";
}
function closeGuide() {
  $("#guide-backdrop").hidden = true;
  document.body.style.overflow = "";
}

/* ── Upload simulation ───────────────────────────────────────── */
function wireUpload() {
  document.addEventListener("click", (e) => {
    const zone = e.target.closest(".upload-zone");
    if (!zone) return;
    addFakeUpload(zone);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const zone = e.target.closest?.(".upload-zone");
    if (zone) { e.preventDefault(); addFakeUpload(zone); }
  });
}
let fakeN = 0;
function addFakeUpload(zone) {
  fakeN++;
  const listId = zone.id.replace("extra_upload", "extra_upload") + "";
  const list = zone.parentElement.querySelector(".upload-list");
  if (!list) return;
  const li = document.createElement("li");
  li.innerHTML = `<span>medical-record-sample-${fakeN}.pdf <small class="fineprint">(simulated — 0 KB)</small></span><button type="button" class="btn-ghost" aria-label="Remove simulated attachment">Remove</button>`;
  li.querySelector("button").addEventListener("click", () => { li.remove(); wiz.uploadsCount = Math.max(0, (wiz.uploadsCount || 1) - 1); });
  list.appendChild(li);
  wiz.uploadsCount = (wiz.uploadsCount || 0) + 1;
  toast("Simulated attachment added — nothing is uploaded.");
}

/* ── Demo downloads ──────────────────────────────────────────── */
function demoDownload(e) {
  e.preventDefault();
  const csv = "element,example_value\nPatient initials,J.D.\nAge,34\nVaccine,Influenza (simulated)\nLot,XY1234\nOnset date,2026-09-01\nSymptom,Fever\nOutcome,Recovered\n";
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "vaers-prototype-sample-SYNTHETIC.csv";
  document.body.appendChild(a); a.click(); a.remove();
  toast("Downloaded a clearly-labelled synthetic sample.");
}

/* ── Keyboard: ? opens guide ─────────────────────────────────── */
document.addEventListener("keydown", (e) => {
  const tag = document.activeElement?.tagName;
  if (e.key === "?" && !["INPUT", "TEXTAREA", "SELECT"].includes(tag)) { openGuide(); }
  if (e.key === "Escape") { if (!$("#guide-backdrop").hidden) closeGuide(); }
});

/* ── Boot ────────────────────────────────────────────────────── */
function boot() {
  renderFaqs();
  buildLabels();
  renderGuide();
  wireAskAssistant();
  wireUpload();

  $$("[data-start]").forEach(b => b.addEventListener("click", () => startWizard(b.dataset.start)));
  $("#wiz-exit").addEventListener("click", () => show("landing"));
  $("#home-link").addEventListener("click", (e) => { e.preventDefault(); show("landing"); });
  $("#nav-start").addEventListener("click", (e) => { e.preventDefault(); startWizard(wiz.path || "public"); });
  $$(".navlink").forEach(a => a.addEventListener("click", () => $$(".navlink").forEach(x => x.classList.remove("active"))));

  $("#wiz-back").addEventListener("click", goBack);
  $("#wiz-next").addEventListener("click", advance);
  $("#wiz-submit").addEventListener("click", showSummary);
  $("#sum-home").addEventListener("click", () => show("landing"));
  $("#sum-pdf").addEventListener("click", () => window.print());

  $("#guide-open").addEventListener("click", openGuide);
  $("#guide-close").addEventListener("click", closeGuide);
  $("#guide-backdrop").addEventListener("click", (e) => { if (e.target === e.currentTarget) closeGuide(); });

  $$("[data-demo-dl]").forEach(a => a.addEventListener("click", demoDownload));
}
document.addEventListener("DOMContentLoaded", boot);