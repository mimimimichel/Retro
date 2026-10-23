/* Retro Live — standalone runtime.
   Provides the same window.claude.use() surface the page uses on claude.ai
   (db, user, room), backed by Supabase. AI ("sample") is not available here. */
(() => {
  "use strict";
  const CFG = {
    url: "https://xtfusfhtcoofyiaakife.supabase.co",
    key: "sb_publishable_8jQN1ILE-69GBcjsFKBuwg_p_sy0JMS",
  };
  const sb = window.supabase.createClient(CFG.url, CFG.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 20 } },
  });

  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (_) { return null; } };
  const rid = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => "abcdefghijklmnopqrstuvwxyz0123456789"[b % 36]).join("");
  let uid = store("retro-uid");
  if (!uid) { uid = "u_" + rid(22); store("retro-uid", uid); }
  const tabId = rid(12);

  /* ---------- people ---------- */
  const COLORS = ["#4b4ff0", "#ff4f8b", "#17a45b", "#e08a00", "#8a5cf6", "#0ea5b7", "#d9467a", "#2f855a"];
  const colorOf = id => COLORS[[...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];
  const avatar = (name, id) => {
    const ini = (name || "?").trim().split(/\s+/).map(w => w[0] || "").join("").slice(0, 2).toUpperCase().replace(/[^\p{L}\p{N}?]/gu, "");
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='64' height='64' fill='${colorOf(id)}'/><text x='32' y='41' font-family='Arial,sans-serif' font-size='25' font-weight='700' fill='white' text-anchor='middle'>${ini || "?"}</text></svg>`;
    return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  };
  const names = new Map();
  let myName = store("retro-name") || "";

  /* ---------- document store ---------- */
  const cache = new Map();      // collection -> Map(id -> data)
  const listeners = new Map();  // collection -> Set(fn)
  const loaded = new Set();
  const fetching = new Map();
  const split = p => { const i = p.lastIndexOf("/"); return [p.slice(0, i), p.slice(i + 1)]; };
  const meta = { fromCache: false, hasPendingWrites: false };

  function snapOf(col) {
    const m = cache.get(col) || new Map();
    const docs = [...m.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
      .map(([id, d]) => ({ id, exists: true, data: () => d, metadata: meta }));
    return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: meta };
  }
  function emit(col) {
    if (col === "people") { const m = cache.get(col); if (m) m.forEach((d, id) => { if (d && d.name) names.set(id, String(d.name)); }); }
    const fns = listeners.get(col); if (!fns || !fns.size) return;
    const snap = snapOf(col);
    fns.forEach(fn => { try { fn(snap); } catch (e) { console.error(e); } });
  }
  const put = (col, id, data) => { if (!cache.has(col)) cache.set(col, new Map()); cache.get(col).set(id, data); };
  const del = (col, id) => { const m = cache.get(col); if (m) m.delete(id); };

  async function fetchCol(col) {
    if (fetching.has(col)) return fetching.get(col);
    const p = (async () => {
      const { data, error } = await sb.from("docs").select("path,data").eq("collection", col).limit(5000);
      if (error) throw { code: "unavailable", message: error.message };
      const m = new Map(); data.forEach(r => m.set(split(r.path)[1], r.data));
      cache.set(col, m); loaded.add(col); emit(col);
    })().finally(() => fetching.delete(col));
    fetching.set(col, p); return p;
  }

  let firstSub = true;
  sb.channel("docs-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "docs" }, payload => {
      if (payload.eventType === "DELETE") {
        const p = payload.old && payload.old.path; if (!p) return;
        const [c, id] = split(p); if (!loaded.has(c)) return; del(c, id); emit(c);
      } else {
        const r = payload.new; if (!r || !loaded.has(r.collection)) return;
        put(r.collection, split(r.path)[1], r.data); emit(r.collection);
      }
    })
    .subscribe(status => {
      if (status === "SUBSCRIBED") { if (!firstSub) loaded.forEach(c => fetchCol(c).catch(() => {})); firstSub = false; }
    });
  // Safety net in case a realtime event is missed.
  setInterval(() => { if (!document.hidden) loaded.forEach(c => { if (listeners.get(c)?.size) fetchCol(c).catch(() => {}); }); }, 30000);

  function onSnap(col, next, err) {
    if (!listeners.has(col)) listeners.set(col, new Set());
    listeners.get(col).add(next);
    if (loaded.has(col)) setTimeout(() => { if (listeners.get(col)?.has(next)) next(snapOf(col)); }, 0);
    else fetchCol(col).catch(e => { if (err) err(e); });
    return () => { listeners.get(col)?.delete(next); };
  }
  const fail = error => { throw { code: error.code === "23514" ? "invalid_argument" : "unavailable", message: error.message }; };
  const touch = col => { if (loaded.has(col)) emit(col); };

  function docRef(path) {
    const [col, id] = split(path);
    return {
      id, path,
      async get() { if (!loaded.has(col)) await fetchCol(col); const d = cache.get(col)?.get(id); return { id, exists: d !== undefined, data: () => d, metadata: meta }; },
      async set(data) {
        put(col, id, data); touch(col);
        const { error } = await sb.from("docs").upsert({ path, collection: col, data, updated_at: new Date().toISOString() });
        if (error) fail(error);
      },
      async update(patch) {
        put(col, id, { ...(cache.get(col)?.get(id) || {}), ...patch }); touch(col);
        const { error } = await sb.rpc("doc_merge", { p_path: path, p_collection: col, p_patch: patch });
        if (error) fail(error);
      },
      async delete() {
        del(col, id); touch(col);
        const { error } = await sb.from("docs").delete().eq("path", path);
        if (error) fail(error);
      },
      onSnapshot(next, err) {
        return onSnap(col, () => { const d = cache.get(col)?.get(id); next({ id, exists: d !== undefined, data: () => d, metadata: meta }); }, err);
      },
      collection: sub => colRef(path + "/" + sub),
    };
  }
  function colRef(col) {
    return {
      path: col,
      doc: id => docRef(col + "/" + (id || rid(20))),
      async add(data) { const r = docRef(col + "/" + rid(20)); await r.set(data); return r; },
      onSnapshot: (next, err) => onSnap(col, next, err),
      async get() { if (!loaded.has(col)) await fetchCol(col); return snapOf(col); },
    };
  }
  const db = { doc: docRef, collection: colRef };
  onSnap("people", () => {});

  /* ---------- presence ---------- */
  let myPresence = {}, peers = [], subscribed = false;
  const peerFns = new Set();
  const ch = sb.channel("retro-room", { config: { presence: { key: tabId } } });
  const track = () => subscribed && ch.track({ uid, p: { ...myPresence } }).catch(() => {});
  ch.on("presence", { event: "sync" }, () => {
    const st = ch.presenceState(), prev = new Map(peers.map(p => [p.peer, p])), list = [];
    for (const [key, metas] of Object.entries(st)) {
      const m = metas[metas.length - 1] || {};
      const old = prev.get(key), pres = m.p || {};
      const same = old && JSON.stringify(old.presence) === JSON.stringify(pres) && old.by === m.uid;
      list.push(same ? old : Object.freeze({ peer: key, by: m.uid || null, isMe: m.uid === uid, sameTab: key === tabId, kind: "viewer", guest: false, presence: Object.freeze(pres), updatedAt: Date.now() }));
    }
    const joined = list.filter(p => !prev.has(p.peer)), left = [...prev.values()].filter(p => !list.some(q => q.peer === p.peer));
    peers = Object.freeze(list);
    peerFns.forEach(fn => { try { fn({ peers, joined, left, updated: [] }); } catch (e) { console.error(e); } });
  });
  ch.subscribe(status => { if (status === "SUBSCRIBED") { subscribed = true; track(); } });
  const room = {
    onPeers(fn) { peerFns.add(fn); if (peers.length) setTimeout(() => fn({ peers, joined: peers, left: [], updated: [] }), 0); return () => peerFns.delete(fn); },
    peers: () => peers,
    async presence(patch) { for (const [k, v] of Object.entries(patch || {})) { if (v === null) delete myPresence[k]; else myPresence[k] = v; } track(); },
    connected: () => subscribed,
    async emit() {}, on() { return () => {}; },
  };

  /* ---------- user ---------- */
  const profile = id => { const n = id === uid ? myName : (names.get(id) || ""); return { id, name: n, avatarUrl: avatar(n, id), color: colorOf(id), email: null, isMe: id === uid, guest: false }; };
  const user = {
    id: async () => uid,
    isOwner: async () => false,
    canEdit: async () => false,
    can: async () => true,
    name: async () => myName,
    email: async () => null,
    avatarUrl: async () => avatar(myName, uid),
    me: async () => ({ ...profile(uid), isOwner: false, canEdit: false }),
    profiles: async ids => Object.fromEntries([].concat(ids).map(id => [id, profile(id)])),
    search: async () => [],
  };
  const register = () => docRef("people/" + uid).set({ name: myName, at: Date.now() }).catch(() => {});

  function askName() {
    return new Promise(resolve => {
      const css = document.createElement("style");
      css.textContent = `.who{position:fixed;inset:0;z-index:90;display:grid;place-items:center;padding:16px;background:color-mix(in srgb,var(--band) 88%,transparent);backdrop-filter:blur(6px);animation:whoIn .4s ease both}
.who form{width:min(420px,100%);background:var(--surface);color:var(--ink);border-radius:20px;padding:28px 24px;box-shadow:0 30px 60px -20px rgba(0,0,0,.5);display:flex;flex-direction:column;gap:14px;animation:whoCard .6s cubic-bezier(.2,1.2,.4,1) both}
.who h2{font-family:var(--f-display);font-size:1.7rem;font-weight:800;letter-spacing:-.02em;margin:0}.who p{margin:0;color:var(--muted)}
.who .field{font-size:1.1rem;padding:12px 14px}.who .btn{justify-content:center}
@keyframes whoIn{from{opacity:0}}@keyframes whoCard{from{opacity:0;transform:translateY(30px) scale(.96)}}
@media (prefers-reduced-motion:reduce){.who,.who form{animation:none}}`;
      document.head.appendChild(css);
      const show = () => {
        const el = document.createElement("div");
        el.className = "who";
        el.innerHTML = `<form autocomplete="on"><div class="eyebrow">Retro Live</div><h2>Welcome to the retro</h2><p>What should the team call you?</p>
          <label class="lbl" for="who-name">Your name</label><input id="who-name" class="field" maxlength="40" placeholder="First name" autocomplete="given-name" required>
          <button class="btn primary big" type="submit">Join the retro →</button></form>`;
        document.body.appendChild(el);
        const input = el.querySelector("input");
        setTimeout(() => input.focus(), 50);
        el.querySelector("form").addEventListener("submit", e => {
          e.preventDefault();
          const v = input.value.trim().slice(0, 40); if (!v) { input.focus(); return; }
          myName = v; store("retro-name", v); el.remove(); resolve();
        });
      };
      const go = () => document.getElementById("intro") && !matchMedia("(prefers-reduced-motion: reduce)").matches ? setTimeout(show, 1700) : show();
      document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", go, { once: true }) : go();
    });
  }
  const userReady = (myName ? Promise.resolve() : askName()).then(() => { register(); return user; });

  const caps = { db: Promise.resolve(db), room: Promise.resolve(room), user: userReady };
  window.claude = Object.freeze({ use: name => caps[name] || Promise.resolve(null) });
})();
