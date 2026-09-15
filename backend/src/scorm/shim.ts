/**
 * Generates the <script> injected into a SCORM package's launch HTML so its
 * own JS (unmodified, exactly as exported by Articulate/Captivate/iSpring/
 * whatever authored it) can report progress — without ever granting it
 * `allow-same-origin` on the iframe (see ScormPlayer.tsx's doc comment on
 * why that's the one thing that must never happen).
 *
 * The trick: real SCORM content looks for `window.API` (SCORM 1.2) or
 * `window.API_1484_11` (SCORM 2004) starting with its *own* window before
 * ever trying to reach into a parent frame. Defining the adapter directly
 * in the SCO's own document means it's found immediately, with zero
 * cross-frame property access — so the sandboxed iframe never needs a real
 * origin to make this work. The adapter itself only ever talks back to the
 * app via `fetch()` (an outbound network call, which `sandbox="allow-scripts"`
 * permits even with no `allow-same-origin`) carrying the single-purpose
 * launch token instead of the learner's real session.
 *
 * GetValue/SetValue must be *synchronous* per the SCORM spec — a SCO calls
 * `API.LMSGetValue(...)` and expects an immediate string back, not a
 * Promise. So the initial CMI state is embedded inline as JSON at serve
 * time (a real network round-trip server-side, done once, before this HTML
 * is ever sent) rather than fetched by the shim itself — every GetValue is
 * then just a synchronous read of that same in-memory object. SetValue/
 * Commit/Terminate are fire-and-forget `fetch()` POSTs; nothing in the
 * SCORM contract requires those to block on a network round trip.
 */
export interface ScormInitialState {
  lessonStatus: string; // "not attempted" | "incomplete" | "completed" | "passed" | "failed"
  scoreRaw: number | null;
  suspendData: string;
}

/**
 * Sandboxed with allow-scripts but deliberately no allow-same-origin (see
 * this file's own top comment), which gives every document served under
 * `/api/scorm/*` — the launch page AND every other HTML file the package
 * serves, e.g. Articulate Storyline's own `analytics-frame.html` — an
 * opaque origin. Per spec, `window.localStorage`/`sessionStorage` throw a
 * SecurityError for an opaque origin rather than just returning an empty
 * store. Real packages (confirmed: Storyline's own runtime, in more than
 * one of its own HTML files) call these directly, unguarded, during boot;
 * the throw is uncaught and kills that document's init sequence right
 * there — on the launch page specifically, that's the exact "stuck at 0%,
 * spinner forever" symptom, since the code that would hide the spinner
 * never runs. Shadowing both with an in-memory Storage-alike (an *own*
 * property on window, so the native opaque-origin getter on
 * Window.prototype is never reached) fixes it without ever granting the
 * frame real storage or real-origin access. Injected into every HTML
 * response the route handler serves, not just the launch page — see the
 * route handler's own doc comment.
 */
export function buildStorageShimScript(): string {
  return `<script>
(function () {
  function fakeStorage() {
    var data = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; },
      clear: function () { data = {}; },
      key: function (i) { return Object.keys(data)[i] ?? null; },
      get length() { return Object.keys(data).length; },
    };
  }
  ["localStorage", "sessionStorage"].forEach(function (name) {
    try {
      window[name]; // eslint-disable-line no-unused-expressions
    } catch (e) {
      try {
        Object.defineProperty(window, name, { value: fakeStorage(), configurable: true });
      } catch (e2) {}
    }
  });

  // Sandboxed without allow-modals, so window.confirm/alert/prompt are
  // blocked by the browser itself — but a blocked confirm() silently
  // returns false, not an exception, and package boot code that branches
  // on it (e.g. a "best viewed in landscape — continue anyway?" check,
  // confirmed present in a real Storyline mobile export via its own
  // console warning about the blocked call) reads that false as "user
  // said no" and never runs whatever shows the actual content, leaving
  // the loading spinner in place forever with no error anywhere. Shadow
  // all three so package code sees the same answer a learner clicking
  // "OK"/dismissing every prompt would have produced.
  window.confirm = function () { return true; };
  window.alert = function () {};
  window.prompt = function () { return ""; };
})();
</script>`;
}

export function buildScormShimScript(opts: {
  token: string;
  progressUrl: string;
  initial: ScormInitialState;
}): string {
  // JSON-encode, then defensively break up "</script" so a value containing
  // it (there currently isn't one — every field here is server-controlled —
  // but this cannot become an HTML-injection footgun later) can never close
  // the surrounding <script> tag early.
  const payload = JSON.stringify({ token: opts.token, progressUrl: opts.progressUrl, initial: opts.initial }).replace(
    /<\/script/gi,
    "<\\/script",
  );

  return `${buildStorageShimScript()}
<script>
(function () {
  var CONFIG = ${payload};
  var cmi = {
    "cmi.core.lesson_status": CONFIG.initial.lessonStatus,
    "cmi.completion_status": CONFIG.initial.lessonStatus === "completed" || CONFIG.initial.lessonStatus === "passed" ? "completed" : "incomplete",
    "cmi.success_status": CONFIG.initial.lessonStatus === "passed" ? "passed" : CONFIG.initial.lessonStatus === "failed" ? "failed" : "unknown",
    "cmi.core.score.raw": CONFIG.initial.scoreRaw === null ? "" : String(CONFIG.initial.scoreRaw),
    "cmi.score.raw": CONFIG.initial.scoreRaw === null ? "" : String(CONFIG.initial.scoreRaw),
    "cmi.suspend_data": CONFIG.initial.suspendData || "",
    "cmi.core.student_id": "",
    "cmi.core.student_name": "",
    "cmi.core.entry": "",
    "cmi.core.exit": "",
    "cmi.core.session_time": "0000:00:00.00"
  };
  var dirty = false;

  function report() {
    if (!dirty) return;
    dirty = false;
    var status = cmi["cmi.core.lesson_status"] || cmi["cmi.completion_status"];
    var scoreRaw = cmi["cmi.core.score.raw"] || cmi["cmi.score.raw"];
    try {
      fetch(CONFIG.progressUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + CONFIG.token },
        body: JSON.stringify({
          lessonStatus: status || "incomplete",
          scoreRaw: scoreRaw === "" ? null : Number(scoreRaw),
          suspendData: cmi["cmi.suspend_data"] || ""
        }),
        keepalive: true
      }).catch(function () {});
      // Local UI progress bar in ScormPlayer, best-effort — the real
      // completion record is the fetch() above, this is only cosmetic.
      var percent = status === "completed" || status === "passed" ? 100 : status === "incomplete" ? 50 : 0;
      parent.postMessage({ type: "scorm:progress", percent: percent }, "*");
    } catch (e) {}
  }

  function makeAdapter() {
    return {
      LMSInitialize: function () { return "true"; },
      Initialize: function () { return "true"; },
      LMSFinish: function () { report(); return "true"; },
      Terminate: function () { report(); return "true"; },
      LMSGetValue: function (key) { return cmi[key] !== undefined ? cmi[key] : ""; },
      GetValue: function (key) { return cmi[key] !== undefined ? cmi[key] : ""; },
      LMSSetValue: function (key, value) { cmi[key] = value; dirty = true; return "true"; },
      SetValue: function (key, value) { cmi[key] = value; dirty = true; return "true"; },
      LMSCommit: function () { report(); return "true"; },
      Commit: function () { report(); return "true"; },
      LMSGetLastError: function () { return "0"; },
      GetLastError: function () { return "0"; },
      LMSGetErrorString: function () { return "No error"; },
      GetErrorString: function () { return "No error"; },
      LMSGetDiagnostic: function () { return ""; },
      GetDiagnostic: function () { return ""; }
    };
  }

  // Both surfaces point at the same adapter/state — a package built against
  // either version finds what it expects on its own window immediately.
  window.API = makeAdapter();
  window.API_1484_11 = makeAdapter();

  // Some players don't call Commit/Finish reliably on tab close — catch
  // that case too, best-effort (keepalive lets the request outlive unload).
  window.addEventListener("beforeunload", report);
})();
</script>`;
}
