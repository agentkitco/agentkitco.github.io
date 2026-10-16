/* AgentKit Co: instruction-file generator. Runs entirely in your browser: no network calls, no storage, no tracking. */
(function (root) {
  var CMD_KEYS = [["install", "Install"], ["dev", "Run / dev server"], ["typecheck", "Type-check"], ["lint", "Lint / format check"], ["test", "Run all tests"], ["testone", "Run one test file"], ["build", "Build"]];
  var BOUNDS = [
    ["dep", "Ask before adding a dependency", true],
    ["env", "Never read, print or commit .env files or secrets", true],
    ["gen", "Do not hand-edit generated files or lockfiles", true],
    ["mig", "Never edit an applied database migration; add a new one", false],
    ["ci", "Ask before changing CI, deployment or infrastructure config", true],
    ["destr", "Ask before destructive commands (rm -rf, DROP, force-push)", true],
    ["push", "Do not push or open pull requests unless asked", true],
    ["verify", "Say what you could not run or verify", true]
  ];
  var BOUND_TEXT = {
    dep: "Ask before adding a dependency.",
    env: "Never read, print or commit `.env*` files or secrets. Variable names belong in `.env.example`.",
    gen: "Do not hand-edit generated files or lockfiles. Change the source and regenerate.",
    mig: "Never edit an applied migration. Create a new one.",
    ci: "Ask before changing CI, deployment or infrastructure config.",
    destr: "Ask before running destructive commands (`rm -rf`, `DROP`, force-push).",
    push: "Do not push or open pull requests unless asked.",
    verify: "Say what you could not run or verify."
  };
  var COMMITS = {
    imperative: "Small commits with an imperative subject under 72 characters.",
    conventional: "Conventional Commits (`feat:`, `fix:`, `docs:`...) with a short subject.",
    none: ""
  };
  var PRESETS = {
    custom: { label: "Other / blank", stack: "", cmds: {}, layout: "", conv: "" },
    nextjs: { label: "Next.js (App Router) + TypeScript", stack: "Next.js (App Router), TypeScript",
      cmds: { install: "pnpm install", dev: "pnpm dev", typecheck: "pnpm tsc --noEmit", lint: "pnpm lint", test: "pnpm test", testone: "pnpm test path/to/file.test.ts", build: "pnpm build" },
      layout: "app/ routes, layouts and route handlers\ncomponents/ shared UI\nlib/ non-UI logic\nTests sit beside the file as name.test.ts(x)",
      conv: "Server Components by default. Add \"use client\" only for state, effects or browser APIs, and keep it on small leaf components.\nFetch data in Server Components or route handlers, not in useEffect.\nTypeScript strict. No any (use unknown and narrow).\nValidate every external input (request body, search params, env vars) at the boundary." },
    vite: { label: "React + Vite + TypeScript", stack: "React, TypeScript, Vite",
      cmds: { install: "npm install", dev: "npm run dev", typecheck: "npx tsc --noEmit", lint: "npm run lint", test: "npm test", testone: "npx vitest run path/to/file", build: "npm run build" },
      layout: "src/components/ UI, one folder per component\nsrc/hooks/ custom hooks\nsrc/api/ all network calls",
      conv: "Function components and hooks only; named exports.\nNo data fetching inside components: call functions from src/api/.\nType props with an explicit interface. No any.\nOnly VITE_-prefixed env vars reach the browser. Never put a secret in one." },
    node: { label: "Node.js API + TypeScript", stack: "Node.js, TypeScript, REST API",
      cmds: { install: "npm ci", dev: "npm run dev", typecheck: "npm run typecheck", lint: "npm run lint", test: "npm test", testone: "npx vitest run path/to/file", build: "npm run build" },
      layout: "src/routes/ thin HTTP handlers\nsrc/services/ business logic\nsrc/db/ queries and migrations\nsrc/schemas/ request and response validation",
      conv: "Handlers validate input, call a service and shape the response. No business logic or SQL in handlers.\nEvery route has an input and a response schema.\nNever build SQL from user input by string concatenation.\nNever log secrets, tokens or full request bodies.\nEvery new route needs a success test and an invalid-input test." },
    python: { label: "Python package or scripts", stack: "Python, pytest",
      cmds: { install: "uv sync", typecheck: "mypy src", lint: "ruff check . && ruff format --check .", test: "pytest -q", testone: "pytest path/to/test_file.py::test_name -q" },
      layout: "src/<package>/ code\ntests/ mirrors src/\nscripts/ one-off tools",
      conv: "Type hints on public functions. Use pathlib for paths.\nRaise specific exceptions; never a bare except.\nUse logging, not print, in library code.\nTests are plain pytest functions with assert. No network or real clock in unit tests." },
    fastapi: { label: "FastAPI service", stack: "Python, FastAPI, Pydantic",
      cmds: { install: "uv sync", dev: "uvicorn app.main:app --reload", lint: "ruff check . && ruff format --check .", test: "pytest -q", testone: "pytest path/to/test_file.py::test_name -q" },
      layout: "app/api/ routers\napp/schemas/ Pydantic models\napp/services/ business logic\napp/core/ settings and dependencies",
      conv: "Routers stay thin: validate with Pydantic, call a service, return a response model. Always set response_model.\nSeparate input schemas from output schemas.\nUse Depends for database sessions and the current user.\nAsync routes must not call blocking code.\nSettings come from one config module, not scattered os.environ calls." },
    django: { label: "Django", stack: "Python, Django",
      cmds: { install: "pip install -r requirements.txt", dev: "python manage.py runserver", lint: "ruff check .", test: "python manage.py test", testone: "python manage.py test app_name.tests.TestClass", build: "python manage.py makemigrations --check --dry-run" },
      layout: "One folder per app with models.py, views.py, urls.py and tests/\nProject settings in config/",
      conv: "Thin views; queries live in model methods or managers.\nAvoid N+1 queries: use select_related / prefetch_related.\nUse get_object_or_404 and reverse(), never hard-coded URLs.\nForms or serializers validate all user input.\nSecrets come from environment variables, not settings files." },
    go: { label: "Go", stack: "Go",
      cmds: { install: "go mod download", typecheck: "go vet ./...", lint: "gofmt -l .", test: "go test ./...", testone: "go test ./internal/foo -run TestName", build: "go build ./..." },
      layout: "cmd/<name>/ entry points\ninternal/ private packages",
      conv: "Return errors and wrap them with context using %w. Do not panic outside main or tests.\nPass context.Context first to anything that does I/O.\nTable-driven tests with t.Run subtests.\nAccept interfaces, return concrete types. No global mutable state.\nStandard library first." },
    rust: { label: "Rust", stack: "Rust, Cargo",
      cmds: { install: "cargo fetch", lint: "cargo clippy --all-targets -- -D warnings && cargo fmt --check", test: "cargo test", testone: "cargo test test_name", build: "cargo build" },
      layout: "src/lib.rs library root, src/main.rs or src/bin/ binaries\ntests/ integration tests",
      conv: "Use Result and ?. No unwrap() or expect() on user-influenced values in library code.\nPrefer borrowing over cloning.\nunsafe needs a // SAFETY: comment and my review: ask first.\nPublic items get doc comments." },
    unity: { label: "Unity (C#) game", stack: "Unity, C#",
      cmds: {}, layout: "Assets/Scripts/ code, one folder per feature\nAssets/Tests/ EditMode and PlayMode tests",
      conv: "You cannot see the editor. Never claim a scene, prefab or inspector setting is correct; list the manual steps for me instead.\nNever edit .unity, .prefab, .asset or .meta files by hand.\nUse [SerializeField] private fields, not public fields.\nCache component references in Awake(). No GetComponent, Find or LINQ in Update().\nTunable numbers live in ScriptableObjects, not in code." },
    godot: { label: "Godot 4 (GDScript) game", stack: "Godot 4, GDScript",
      cmds: { dev: "godot --path .", lint: "godot --headless --path . --quit" },
      layout: "scenes/ scenes\nscripts/ scripts, mirrored by feature\nresources/ custom Resources",
      conv: "You cannot run the editor. Never claim a scene works; list the manual editor steps for me.\nStatic typing everywhere: typed variables, parameters and return values.\nSignals up, function calls down. Avoid long get_node paths; use @export references or groups.\nUse @onready for node references and queue_free() to remove nodes.\nTunable numbers go in exported variables or Resources." }
  };

  function lines(t) { return String(t || "").split(/\r?\n/).map(function (l) { return l.replace(/^\s*[-*]\s+/, "").trim(); }).filter(Boolean); }
  function bullets(arr) { return arr.map(function (l) { return "- " + l; }); }
  function section(title, arr) { return arr.length ? ["## " + title].concat(arr, [""]) : []; }

  function core(s) {
    var out = [], p = PRESETS[s.preset] || PRESETS.custom, name = (s.name || "").trim(), desc = (s.desc || "").trim().replace(/\.$/, "");
    var proj = [];
    if (name || desc) proj.push((name ? name + (desc ? ": " : "") : "") + (desc ? desc + "." : "") + (p.stack ? " Stack: " + p.stack + "." : ""));
    else if (p.stack) proj.push("Stack: " + p.stack + ".");
    var cmds = [];
    CMD_KEYS.forEach(function (k) { var v = ((s.cmds || {})[k[0]] || "").trim(); if (v) cmds.push("- " + k[1] + ": `" + v + "`"); });
    if (cmds.length && s.done) cmds.push("", "A task is not done until the checks above pass for the files you touched.");
    var bounds = [];
    BOUNDS.forEach(function (b) { if ((s.bounds || {})[b[0]]) bounds.push(BOUND_TEXT[b[0]]); });
    lines(s.extraBounds).forEach(function (l) { bounds.push(l); });
    var git = COMMITS[s.commit] ? [COMMITS[s.commit]] : [];
    return { proj: proj, cmds: cmds, layout: lines(s.layout), conv: lines(s.conv), bounds: bounds, git: git, rawCmds: cmds };
  }

  function agents(s) {
    var c = core(s), o = ["# AGENTS.md", ""];
    if (s.credit) o.push("<!-- Starting point made with the AgentKit Co generator (agentkitco.com/tools/agents-md-generator/). Review every line before relying on it. -->", "");
    o = o.concat(section("Project", c.proj), c.cmds.length ? ["## Commands"].concat(c.cmds, [""]) : [],
      section("Layout", bullets(c.layout)), section("Conventions", bullets(c.conv)), section("Boundaries", bullets(c.bounds)), section("Git", bullets(c.git)));
    return o.join("\n").replace(/\n+$/, "\n");
  }
  function claude(s) {
    var o = ["@AGENTS.md", ""], extra = lines(s.claudeExtra);
    if (extra.length) o = o.concat(["## Claude Code"], bullets(extra), [""]);
    return o.join("\n").replace(/\n+$/, "\n");
  }
  function cursor(s) {
    var c = core(s), name = (s.name || "").trim(), o = ["---", "description: Baseline facts and rules for " + (name || "this project"), "alwaysApply: true", "---", ""];
    o = o.concat(c.proj.length ? [c.proj[0], ""] : [], c.cmds.length ? ["Commands:"].concat(c.cmds, [""]) : [], c.conv.length ? ["Conventions:"].concat(bullets(c.conv), [""]) : [], c.bounds.length ? ["Boundaries:"].concat(bullets(c.bounds), [""]) : []);
    return o.join("\n").replace(/\n+$/, "\n");
  }
  function copilot(s) {
    var c = core(s), name = (s.name || "").trim(), o = ["# Copilot instructions" + (name ? " for " + name : ""), ""];
    o = o.concat(c.proj.length ? [c.proj[0], ""] : [], section("Build and check", c.cmds), section("Layout", bullets(c.layout)), section("Code", bullets(c.conv)), section("Boundaries", bullets(c.bounds)), section("Git", bullets(c.git)));
    return o.join("\n").replace(/\n+$/, "\n");
  }
  function generate(s) { return { agents: agents(s), claude: claude(s), cursor: cursor(s), copilot: copilot(s) }; }

  var API = { generate: generate, PRESETS: PRESETS, BOUNDS: BOUNDS, CMD_KEYS: CMD_KEYS };
  if (typeof module !== "undefined" && module.exports) module.exports = API;
  if (typeof document === "undefined") return;

  /* ---------------- browser UI ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var app = $("gen-app");
  if (!app) return;
  var TABS = [["agents", "AGENTS.md", "AGENTS.md", "Save as AGENTS.md in the repo root. Cursor, GitHub Copilot, Codex and many other tools read it."],
    ["claude", "CLAUDE.md", "CLAUDE.md", "Save next to AGENTS.md. The first line imports it, so Claude Code reads the same rules."],
    ["cursor", "Cursor rule", "project-baseline.mdc", "Save as .cursor/rules/project-baseline.mdc. Cursor also reads AGENTS.md, so you may only need this for file-scoped rules."],
    ["copilot", "Copilot", "copilot-instructions.md", "Save as .github/copilot-instructions.md."]];
  var cur = "agents", live = $("live");

  function el(t, a, kids) { var e = document.createElement(t); for (var k in (a || {})) { if (k === "text") e.textContent = a[k]; else e.setAttribute(k, a[k]); } (kids || []).forEach(function (c) { e.appendChild(c); }); return e; }
  function field(id, label, node) { return el("div", { "class": "field" }, [el("label", { "for": id, text: label }), node]); }

  var f = {};
  function build() {
    var left = $("gen-form");
    f.name = el("input", { id: "g-name", type: "text", maxlength: "80", placeholder: "My project" });
    f.desc = el("input", { id: "g-desc", type: "text", maxlength: "200", placeholder: "One line on what it does and for whom" });
    f.preset = el("select", { id: "g-preset" });
    Object.keys(PRESETS).forEach(function (k) { f.preset.appendChild(el("option", { value: k, text: PRESETS[k].label })); });
    left.appendChild(field("g-name", "Project name", f.name)); left.appendChild(field("g-desc", "What it is", f.desc)); left.appendChild(field("g-preset", "Stack (fills in common defaults)", f.preset));
    var cm = el("fieldset", {}, [el("legend", { text: "Commands (leave blank to skip; check they match your project)" })]);
    f.cmds = {};
    CMD_KEYS.forEach(function (k) { var i = el("input", { id: "g-c-" + k[0], type: "text", maxlength: "160", autocomplete: "off" }); f.cmds[k[0]] = i; cm.appendChild(field("g-c-" + k[0], k[1], i)); });
    left.appendChild(cm);
    f.done = el("input", { id: "g-done", type: "checkbox", checked: "checked" });
    left.appendChild(el("div", { "class": "check-row" }, [f.done, el("label", { "for": "g-done", text: "Add \"a task is not done until the checks pass\"" })]));
    f.layout = el("textarea", { id: "g-layout", rows: "4", placeholder: "One line per folder or note" });
    f.conv = el("textarea", { id: "g-conv", rows: "6", placeholder: "One rule per line. Only rules that differ from the language defaults." });
    left.appendChild(field("g-layout", "Layout", f.layout)); left.appendChild(field("g-conv", "Conventions", f.conv));
    var bf = el("fieldset", {}, [el("legend", { text: "Boundaries" })]); f.bounds = {};
    BOUNDS.forEach(function (b) { var i = el("input", { id: "g-b-" + b[0], type: "checkbox" }); if (b[2]) i.checked = true; f.bounds[b[0]] = i; bf.appendChild(el("div", { "class": "check-row" }, [i, el("label", { "for": "g-b-" + b[0], text: b[1] })])); });
    left.appendChild(bf);
    f.extraBounds = el("textarea", { id: "g-xb", rows: "2", placeholder: "Any other \"never\" or \"ask first\" lines, one per line" });
    left.appendChild(field("g-xb", "Extra boundaries", f.extraBounds));
    f.commit = el("select", { id: "g-commit" });
    [["imperative", "Imperative subject under 72 characters"], ["conventional", "Conventional Commits"], ["none", "No commit rule"]].forEach(function (o) { f.commit.appendChild(el("option", { value: o[0], text: o[1] })); });
    left.appendChild(field("g-commit", "Commit style", f.commit));
    f.claudeExtra = el("textarea", { id: "g-cx", rows: "2", placeholder: "Optional, Claude Code only, one per line (for example: Use plan mode before changing src/billing/)" });
    left.appendChild(field("g-cx", "Claude-only notes (for CLAUDE.md)", f.claudeExtra));
    f.credit = el("input", { id: "g-credit", type: "checkbox" });
    left.appendChild(el("div", { "class": "check-row" }, [f.credit, el("label", { "for": "g-credit", text: "Add a one-line comment crediting this generator (off by default)" })]));

    var tabs = $("gen-tabs");
    TABS.forEach(function (t) { var b = el("button", { type: "button", "class": "chip", "data-tab": t[0], "aria-pressed": t[0] === cur ? "true" : "false", text: t[1] }); b.addEventListener("click", function () { cur = t[0]; refresh(); }); tabs.appendChild(b); });
    $("gen-copy").addEventListener("click", copy); $("gen-dl").addEventListener("click", download);
    f.preset.addEventListener("change", function () { applyPreset(f.preset.value); refresh(); });
    var inputs = left.querySelectorAll("input,textarea,select"); [].forEach.call(inputs, function (i) { i.addEventListener(i.type === "checkbox" || i.tagName === "SELECT" ? "change" : "input", function () { if (i !== f.preset) refresh(); }); });
  }
  function applyPreset(k) {
    var p = PRESETS[k] || PRESETS.custom;
    CMD_KEYS.forEach(function (c) { f.cmds[c[0]].value = (p.cmds || {})[c[0]] || ""; });
    f.layout.value = p.layout || ""; f.conv.value = p.conv || "";
    f.bounds.mig.checked = (k === "node" || k === "fastapi" || k === "django");
  }
  function state() {
    var s = { name: f.name.value, desc: f.desc.value, preset: f.preset.value, cmds: {}, done: f.done.checked, layout: f.layout.value, conv: f.conv.value, bounds: {}, extraBounds: f.extraBounds.value, commit: f.commit.value, claudeExtra: f.claudeExtra.value, credit: f.credit.checked };
    CMD_KEYS.forEach(function (c) { s.cmds[c[0]] = f.cmds[c[0]].value; }); BOUNDS.forEach(function (b) { s.bounds[b[0]] = f.bounds[b[0]].checked; });
    return s;
  }
  function refresh() {
    var out = generate(state()), t = TABS.filter(function (x) { return x[0] === cur; })[0], text = out[cur];
    $("gen-out").value = text; $("gen-file").textContent = t[2]; $("gen-where").textContent = t[3];
    var n = text.replace(/\n$/, "").split("\n").length;
    var msg = n + " lines, " + text.length + " characters.";
    if (cur !== "cursor" && n > 150) msg += " That is long: shorter files are followed more reliably. Trim what an agent can learn by reading the code.";
    $("gen-stats").textContent = msg;
    [].forEach.call($("gen-tabs").children, function (b) { b.setAttribute("aria-pressed", b.getAttribute("data-tab") === cur ? "true" : "false"); });
  }
  function say(m) { if (live) { live.textContent = ""; setTimeout(function () { live.textContent = m; }, 30); } }
  function copy() {
    var v = $("gen-out").value, b = $("gen-copy"), old = "Copy";
    function done(ok) { b.textContent = ok ? "Copied" : "Press Ctrl+C"; say(ok ? "Copied to clipboard" : "Copy failed. Select the text and press Ctrl+C"); setTimeout(function () { b.textContent = old; }, 1800); }
    function fb() { var o = $("gen-out"); o.focus(); o.select(); var ok = false; try { ok = document.execCommand("copy"); } catch (e) {} done(ok); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(v).then(function () { done(true); }, fb); else fb();
  }
  function download() {
    var t = TABS.filter(function (x) { return x[0] === cur; })[0];
    var blob = new Blob([$("gen-out").value], { type: "text/plain;charset=utf-8" }), a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = t[2]; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000); say("Downloading " + t[2]);
  }
  build();
  var m = location.hash.match(/stack=([a-z]+)/), start = m && PRESETS[m[1]] ? m[1] : "nextjs";
  f.preset.value = start; applyPreset(start);
  f.name.value = ""; refresh();
  app.hidden = false; var ns = $("gen-noscript"); if (ns) ns.hidden = true;
})(this);
