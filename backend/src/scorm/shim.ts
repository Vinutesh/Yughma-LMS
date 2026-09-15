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

  return `<script>
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
