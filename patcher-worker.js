/* DN2 mod patcher: builds the mod in Python (Pyodide) off the page's thread.
 * In:  {zipUrl, zipSha, inputs, files: {dn2, dt2, md[, mnm][, dn2_112]}: {name, bytes}}
 *      (inputs: the files this version's build reads; v0.26 on adds mnm; a version built for
 *      OS 1.12 adds dn2_112, stock 1.12, which the build is moved onto)
 * Out: {log: text} ... then {done: bytes} or {error: text} */
const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
importScripts(PYODIDE + "pyodide.js");

let py = null;

async function hex(buf) {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}

self.onmessage = async (e) => {
  const { zipUrl, zipSha, files } = e.data;
  const inputs = e.data.inputs || ["dn2", "dt2", "md"];
  const log = (t) => self.postMessage({ log: t });
  try {
    if (!py) {
      log("Loading Python (Pyodide, about 10 MB, once)...");
      py = await loadPyodide({ indexURL: PYODIDE });
      // the build tool's closing note is for its command-line users (dnfw inspect, the
      // repository's docs); here the page's own sha256 check does that job: not shown
      const dev = /Nothing has been sent to an instrument|dnfw inspect|docs\/flashing\.md|recovery route .* is proven/;
      const out = (t) => { if (!dev.test(t)) log(t); };
      py.setStdout({ batched: out });
      py.setStderr({ batched: out });
    }
    log("Fetching the mod's build code (" + zipUrl + ")...");
    const r = await fetch(zipUrl, { cache: "no-cache" });
    if (!r.ok) throw new Error("could not fetch " + zipUrl + " (" + r.status + ")");
    const zip = new Uint8Array(await r.arrayBuffer());
    if ((await hex(zip)) !== zipSha) throw new Error("the build code's sha256 is not the one listed; stopping");
    const run = "/run" + Date.now();
    py.FS.mkdirTree(run + "/in");
    py.FS.mkdirTree(run + "/code");
    py.unpackArchive(zip, "zip", { extractDir: run + "/code" });
    for (const k of inputs) py.FS.writeFile(run + "/in/" + k, files[k].bytes);
    // v0.39 on: the build reads the mod's version from VERSION beside the code's folder
    // (dnfw/modversion.py: <root>/VERSION), which the bundle does not carry; it is the
    // version in the bundle's own name. A wrong one would change the file, and the page's
    // sha256 check against the cleared build would refuse it.
    // (2026-11-15, NiKo on v0.54-t1: a test build's name, dnfw-v0.54-t1.zip, did not match,
    // so no VERSION was written and the build stopped: "-tN" is part of the version)
    const vm = zipUrl.match(/dnfw-v([0-9]{1,3}\.[0-9]{1,3}(?:-t[0-9]{1,3})?)\.zip$/);
    if (vm) py.FS.writeFile(run + "/VERSION", vm[1] + "\n");   // (none before v0.39: none needed)
    log("Building (a few minutes; the page stays usable)...");
    py.globals.set("RUN", run);
    py.globals.set("MNM", inputs.includes("mnm") ? run + "/in/mnm" : null);
    py.globals.set("DN2_112", inputs.includes("dn2_112") ? run + "/in/dn2_112" : null);
    py.runPython(`
import sys, os, pathlib
for m in [m for m in sys.modules if m == "dnfw" or m.startswith("dnfw.") or m == "dn2patch"]:
    del sys.modules[m]
sys.path = [p for p in sys.path if not p.startswith("/run")]
sys.path.insert(0, RUN + "/code")
import dn2patch
dn2patch.WORK = pathlib.Path(RUN + "/work")
import hashlib
if hashlib.sha256(dn2patch.unzip(pathlib.Path(RUN + "/in/dn2").read_bytes(), (".syx",))).hexdigest() != "2af43e65e3d8390b41c9f66222620f8cce027d73ed87db00c80b440f628472e0":
    raise dn2patch.PatchError("the Digitone II file is not stock OS 1.11 (a later OS such as 1.12, or a modified file). The mod is built only from Elektron's OS 1.11 file.")
kw = {"mnm": MNM} if MNM else {}
if DN2_112:
    if hashlib.sha256(dn2patch.unzip(pathlib.Path(DN2_112).read_bytes(), (".syx",))).hexdigest() != "7e5b8a733d4ab1fdf7e5d22757f7d8eddaa3cbf71d0858874a791844c02ceb35":
        raise dn2patch.PatchError("the Digitone II OS 1.12 file is not stock OS 1.12 (another OS, or a modified file).")
    kw["dn2_112"] = DN2_112
SHA = dn2patch.build(RUN + "/in/dn2", RUN + "/in/dt2", RUN + "/in/md", RUN + "/out.syx", **kw)
`);
    const out = py.FS.readFile(run + "/out.syx");
    self.postMessage({ done: out }, [out.buffer]);
  } catch (err) {
    let msg = String(err && err.message || err);
    const m = msg.match(/PatchError: (.*)/);
    if (m) msg = m[1];
    else if (msg.includes("Traceback")) msg = msg.trim().split("\n").slice(-1)[0];
    self.postMessage({ error: msg });
  }
};
