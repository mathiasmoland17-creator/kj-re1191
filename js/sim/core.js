/* Simulator-kjerne: baner (paths), geometribygger, 3D-modeller. Krever THREE (r128). */
(function () {
  'use strict';
  const KA = (window.KA = window.KA || {});
  if (!window.THREE) return;
  const SIM = (KA.sim = KA.sim || {});
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  SIM.clamp = clamp; SIM.lerp = lerp;
  SIM.wrapAng = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  SIM.rand = (a, b) => a + Math.random() * (b - a);

  // ------------------------------------------------------------------
  // Path: polylinje samplet med fast steg (meter). x = øst, z = sør.
  // Høyre normal for retning t er n = (-tz, tx).
  // ------------------------------------------------------------------
  let pathId = 0;
  class Path {
    constructor(pts, opts = {}) {
      this.id = ++pathId;
      this.name = opts.name || 'p' + this.id;
      const step = (this.step = opts.step || 1);
      const out = [[pts[0][0], pts[0][1]]];
      const cum = [0];
      let acc = 0, next = step;
      for (let i = 1; i < pts.length; i++) {
        const ax = pts[i - 1][0], az = pts[i - 1][1], bx = pts[i][0], bz = pts[i][1];
        const L = Math.hypot(bx - ax, bz - az);
        if (L < 1e-6) continue;
        while (next <= acc + L) {
          const t = (next - acc) / L;
          out.push([ax + (bx - ax) * t, az + (bz - az) * t]);
          cum.push(next);
          next += step;
        }
        acc += L;
      }
      const last = pts[pts.length - 1];
      if (acc - cum[cum.length - 1] > 0.01) { out.push([last[0], last[1]]); cum.push(acc); }
      this.p = out; this.cum = cum; this.n = out.length; this.length = cum[cum.length - 1];
      this.closed = !!opts.closed;
    }
    idx(s) { return clamp(Math.floor(s / this.step), 0, this.n - 2); }
    pos(s) {
      if (this.closed) s = ((s % this.length) + this.length) % this.length;
      s = clamp(s, 0, this.length);
      const i = this.idx(s), a = this.p[i], b = this.p[i + 1];
      const t = (s - this.cum[i]) / (this.cum[i + 1] - this.cum[i] || 1);
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    frame(s) {
      const [x, z] = this.pos(s);
      let s0 = s - 1.5, s1 = s + 1.5;
      if (!this.closed) { s0 = Math.max(0, s0); s1 = Math.min(this.length, s1); }
      const a = this.pos(s0), b = this.pos(s1);
      let tx = b[0] - a[0], tz = b[1] - a[1];
      const L = Math.hypot(tx, tz) || 1; tx /= L; tz /= L;
      return { x, z, tx, tz, nx: -tz, nz: tx, h: Math.atan2(tz, tx) };
    }
    // offset-punkt
    at(s, off) { const f = this.frame(s); return [f.x + f.nx * off, f.z + f.nz * off]; }
    // projiser punkt til banen. Returnerer {s, lat, d}
    project(x, z, s0, s1) {
      let i0 = 0, i1 = this.n - 2;
      if (s0 != null) { i0 = clamp(Math.floor(s0 / this.step), 0, this.n - 2); i1 = clamp(Math.ceil(s1 / this.step), 0, this.n - 2); }
      let best = Infinity, bs = 0, blat = 0;
      const P = this.p;
      for (let i = i0; i <= i1; i++) {
        const a = P[i], b = P[i + 1];
        const dx = b[0] - a[0], dz = b[1] - a[1];
        const L2 = dx * dx + dz * dz || 1;
        let t = ((x - a[0]) * dx + (z - a[1]) * dz) / L2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const px = a[0] + dx * t, pz = a[1] + dz * t;
        const ex = x - px, ez = z - pz;
        const d2 = ex * ex + ez * ez;
        if (d2 < best) {
          best = d2;
          const L = Math.sqrt(L2);
          bs = this.cum[i] + t * (this.cum[i + 1] - this.cum[i]);
          blat = (ex * -dz + ez * dx) / L; // høyre positiv
        }
      }
      return { s: bs, lat: blat, d: Math.sqrt(best) };
    }
    // projeksjon med lokalt søkevindu rundt et hint
    projectNear(x, z, hint, win = 60) { return this.project(x, z, Math.max(0, hint - win), hint + win); }
    reversed(name) { return new Path(this.p.slice().reverse(), { step: this.step, name }); }
  }
  SIM.Path = Path;

  // punktgeneratorer
  SIM.line = (x0, z0, x1, z1) => [[x0, z0], [x1, z1]];
  SIM.bez = (p0, p1, p2, p3, n = 40) => {
    const o = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, u = 1 - t;
      o.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
    return o;
  };
  SIM.arc = (cx, cz, r, a0, a1, n) => {
    n = n || Math.max(8, Math.ceil((Math.abs(a1 - a0) * r) / 1.5));
    const o = [];
    for (let i = 0; i <= n; i++) { const a = a0 + ((a1 - a0) * i) / n; o.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]); }
    return o;
  };
  SIM.join = (...arrs) => {
    const o = [];
    arrs.forEach((a) => a.forEach((p) => { const l = o[o.length - 1]; if (!l || Math.hypot(l[0] - p[0], l[1] - p[1]) > 0.05) o.push(p); }));
    return o;
  };
  // kurve fra segmenter med krumning: [{L, k}] (k = 1/R, positiv = høyresving)
  SIM.curvy = (x, z, h, segs) => {
    const o = [[x, z]];
    segs.forEach((sg) => {
      const n = Math.ceil(sg.L / 2);
      const ds = sg.L / n;
      for (let i = 0; i < n; i++) { h += (sg.k || 0) * ds; x += Math.cos(h) * ds; z += Math.sin(h) * ds; o.push([x, z]); }
    });
    return o;
  };

  // ------------------------------------------------------------------
  // GB: geometribygger som samler flater per materiale
  // ------------------------------------------------------------------
  class GB {
    constructor() { this.b = {}; }
    g(k) { return this.b[k] || (this.b[k] = { p: [], n: [] }); }
    tri(k, a, b, c, n = [0, 1, 0]) {
      const g = this.g(k);
      g.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
      g.n.push(n[0], n[1], n[2], n[0], n[1], n[2], n[0], n[1], n[2]);
    }
    // flat firkant (x,z) i høyde y, rekkefølge a-b-c-d rundt
    quad(k, a, b, c, d, y = 0) {
      const A = [a[0], y, a[1]], B = [b[0], y, b[1]], C = [c[0], y, c[1]], D = [d[0], y, d[1]];
      this.tri(k, A, B, C); this.tri(k, A, C, D);
    }
    // bånd langs bane mellom offsets oa..ob (tall eller funksjon av s)
    ribbon(k, path, s0, s1, oa, ob, y = 0.02, ds = 1) {
      const fa = typeof oa === 'function' ? oa : () => oa;
      const fb = typeof ob === 'function' ? ob : () => ob;
      s0 = Math.max(0, s0); s1 = Math.min(path.length, s1);
      if (s1 <= s0) return;
      let prev = null;
      for (let s = s0; ; s += ds) {
        const ss = Math.min(s, s1);
        const f = path.frame(ss);
        const A = fa(ss), Bo = fb(ss);
        const a = [f.x + f.nx * A, f.z + f.nz * A], b = [f.x + f.nx * Bo, f.z + f.nz * Bo];
        if (prev) this.quad(k, prev[0], prev[1], b, a, y);
        prev = [a, b];
        if (ss >= s1) break;
      }
    }
    dashes(k, path, s0, s1, off, w, dash, gap, y = 0.05) {
      for (let s = s0; s < s1; s += dash + gap) this.ribbon(k, path, s, Math.min(s + dash, s1), (q) => (typeof off === 'function' ? off(q) : off) - w / 2, (q) => (typeof off === 'function' ? off(q) : off) + w / 2, y, 0.5);
    }
    solid(k, path, s0, s1, off, w = 0.15, y = 0.05) {
      this.ribbon(k, path, s0, s1, (q) => (typeof off === 'function' ? off(q) : off) - w / 2, (q) => (typeof off === 'function' ? off(q) : off) + w / 2, y, 1);
    }
    // vertikal vegg langs bane (rekkverk, kantstein)
    wall(k, path, s0, s1, off, y0, y1, ds = 2) {
      s0 = Math.max(0, s0); s1 = Math.min(path.length, s1);
      let prev = null;
      for (let s = s0; ; s += ds) {
        const ss = Math.min(s, s1);
        const f = path.frame(ss);
        const o = typeof off === 'function' ? off(ss) : off;
        const p = [f.x + f.nx * o, f.z + f.nz * o];
        if (prev) {
          const nx = -(p[1] - prev[1]), nz = p[0] - prev[0];
          const L = Math.hypot(nx, nz) || 1;
          const n = [nx / L, 0, nz / L];
          this.tri(k, [prev[0], y0, prev[1]], [p[0], y0, p[1]], [p[0], y1, p[1]], n);
          this.tri(k, [prev[0], y0, prev[1]], [p[0], y1, p[1]], [prev[0], y1, prev[1]], n);
        }
        prev = p;
        if (ss >= s1) break;
      }
    }
    disc(k, cx, cz, r, y = 0.02, seg = 48) {
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        this.tri(k, [cx, y, cz], [cx + Math.cos(a1) * r, y, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, y, cz + Math.sin(a0) * r]);
      }
    }
    annulus(k, cx, cz, r0, r1, y = 0.02, seg = 72, a0 = 0, a1 = Math.PI * 2) {
      for (let i = 0; i < seg; i++) {
        const b0 = a0 + ((a1 - a0) * i) / seg, b1 = a0 + ((a1 - a0) * (i + 1)) / seg;
        const p = (a, r) => [cx + Math.cos(a) * r, cz + Math.sin(a) * r];
        this.quad(k, p(b0, r0), p(b1, r0), p(b1, r1), p(b0, r1), y);
      }
    }
    cylWall(k, cx, cz, r, y0, y1, seg = 48) {
      for (let i = 0; i < seg; i++) {
        const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2;
        const am = (a0 + a1) / 2, n = [Math.cos(am), 0, Math.sin(am)];
        const p0 = [cx + Math.cos(a0) * r, cz + Math.sin(a0) * r], p1 = [cx + Math.cos(a1) * r, cz + Math.sin(a1) * r];
        this.tri(k, [p0[0], y0, p0[1]], [p1[0], y0, p1[1]], [p1[0], y1, p1[1]], n);
        this.tri(k, [p0[0], y0, p0[1]], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], n);
      }
    }
    build(scene, mats) {
      Object.keys(this.b).forEach((k) => {
        const g = this.b[k];
        if (!g.p.length) return;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.n, 3));
        geo.computeBoundingSphere();
        const m = new THREE.Mesh(geo, mats[k] || mats.default);
        m.matrixAutoUpdate = false;
        scene.add(m);
      });
    }
  }
  SIM.GB = GB;

  // ------------------------------------------------------------------
  // Materialer
  // ------------------------------------------------------------------
  SIM.makeMaterials = function (night) {
    const P = (c, o = {}) => new THREE.MeshPhongMaterial(Object.assign({ color: c, shininess: 4, specular: 0x111111, side: THREE.DoubleSide }, o));
    const mark = (c) => P(c, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, emissive: night ? 0x000000 : 0x000000 });
    return {
      default: P(0x888888),
      ground: P(night ? 0x2a3a24 : 0x5e7f45),
      grass2: P(night ? 0x26341f : 0x6b8b4c),
      asphalt: P(0x45484c, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
      asphalt2: P(0x52565b, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
      shoulder: P(0x5a5d61, { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
      white: mark(0xf2f2ee),
      yellow: mark(0xf0c010),
      sidewalk: P(0x9c9b95),
      curb: P(0xc8c6be),
      rail: P(0xb9bec4, { shininess: 40, specular: 0x666666 }),
      island: P(night ? 0x2f4428 : 0x6f9650),
      hedge: P(night ? 0x1d2e18 : 0x34572a),
      gravel: P(0x8a8172),
      rail2: P(0x7d6d5d),
    };
  };

  // ------------------------------------------------------------------
  // Biler og annet
  // ------------------------------------------------------------------
  const geoCache = {};
  const boxGeo = (l, h, w) => { const k = l + '|' + h + '|' + w; return geoCache[k] || (geoCache[k] = new THREE.BoxGeometry(l, h, w)); };
  const matCache = {};
  const lam = (c, o) => { const k = c + JSON.stringify(o || {}); return matCache[k] || (matCache[k] = new THREE.MeshLambertMaterial(Object.assign({ color: c }, o || {}))); };

  function box(g, l, h, w, mat, x, y, z) {
    const m = new THREE.Mesh(boxGeo(l, h, w), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  }
  const CAR_COLORS = [0xf4f4f2, 0x1d1f22, 0x7b8188, 0xaeb4ba, 0x1f3f75, 0x8a1c1c, 0x2f5f3a, 0x5a6d7d, 0xd9d4c7, 0x3b3f45, 0x9c2b1f, 0x274b8f];
  SIM.CAR_COLORS = CAR_COLORS;

  // ---- bilmodeller: geometri slås sammen per materialrolle (få tegnekall) ----
  const carGeoCache = {};
  const _m4 = new THREE.Matrix4(), _e = new THREE.Euler(), _q = new THREE.Quaternion(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);
  function partsBuilder() {
    const roles = {};
    const push = (role, geo, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const g = geo.index ? geo.toNonIndexed() : geo.clone();
      _e.set(rx, ry, rz); _q.setFromEuler(_e); _v.set(x, y, z);
      _m4.compose(_v, _q, _s);
      g.applyMatrix4(_m4);
      (roles[role] = roles[role] || []).push(g);
    };
    const merge = () => {
      const out = {};
      Object.entries(roles).forEach(([role, list]) => {
        let n = 0; list.forEach((g) => (n += g.attributes.position.count));
        const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
        let o = 0;
        list.forEach((g) => { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); });
        const G = new THREE.BufferGeometry();
        G.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        G.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
        G.computeBoundingSphere();
        G.userData.shared = true;
        out[role] = G;
      });
      return out;
    };
    return { push, box: (role, l, h, w, x, y, z) => push(role, new THREE.BoxGeometry(l, h, w), x, y, z), merge };
  }
  function addLights(P, len, frontY, rearY, halfW) {
    const fx = len / 2 + 0.01, rx = -len / 2 - 0.01;
    P.box('head', 0.06, 0.13, 0.36, fx, frontY, -halfW + 0.32); P.box('head', 0.06, 0.13, 0.36, fx, frontY, halfW - 0.32);
    P.box('tail', 0.06, 0.14, 0.38, rx, rearY, -halfW + 0.3); P.box('tail', 0.06, 0.14, 0.38, rx, rearY, halfW - 0.3);
    P.box('bl', 0.08, 0.09, 0.14, fx - 0.02, frontY, -halfW + 0.06); P.box('br', 0.08, 0.09, 0.14, fx - 0.02, frontY, halfW - 0.06);
    P.box('bl', 0.08, 0.09, 0.14, rx + 0.02, rearY + 0.14, -halfW + 0.08); P.box('br', 0.08, 0.09, 0.14, rx + 0.02, rearY + 0.14, halfW - 0.08);
    P.box('bl', 0.14, 0.06, 0.04, len / 2 - 0.8, frontY + 0.05, -halfW - 0.01); P.box('br', 0.14, 0.06, 0.04, len / 2 - 0.8, frontY + 0.05, halfW + 0.01);
  }
  function carGeometry(type, len) {
    const key = type + (len || '');
    if (carGeoCache[key]) return carGeoCache[key];
    const P = partsBuilder();
    let L = 4.5, W = 1.82;
    if (type === 'car' || type === 'van' || type === 'player') {
      if (type === 'van') { L = 5.1; W = 1.95; }
      P.box('body', L, 0.62, W, 0, 0.52, 0);
      P.box('black', L * 0.92, 0.12, W * 0.96, 0, 0.24, 0);
      if (type === 'van') {
        P.box('body', L * 0.78, 0.9, W * 0.98, -L * 0.1, 1.28, 0);
        P.box('glass', 0.05, 0.55, W * 0.86, L * 0.29 + 0.01, 1.3, 0);
        P.box('glass', L * 0.3, 0.45, 0.04, L * 0.16, 1.35, W * 0.49);
        P.box('glass', L * 0.3, 0.45, 0.04, L * 0.16, 1.35, -W * 0.49);
      } else {
        P.box('glass', 2.35, 0.55, W * 0.88, -0.25, 1.1, 0);
        P.box('body', 2.0, 0.07, W * 0.9, -0.32, 1.405, 0);
        P.box('body', 0.08, 0.55, 0.08, 0.88, 1.1, W * 0.42); P.box('body', 0.08, 0.55, 0.08, 0.88, 1.1, -W * 0.42);
        P.box('body', 0.1, 0.55, 0.08, -1.38, 1.1, W * 0.42); P.box('body', 0.1, 0.55, 0.08, -1.38, 1.1, -W * 0.42);
      }
      P.box('body', 0.12, 0.12, 0.18, 0.85, 0.98, -W / 2 - 0.08); P.box('body', 0.12, 0.12, 0.18, 0.85, 0.98, W / 2 + 0.08);
      const wg = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 12);
      [[1.42, 1], [1.42, -1], [-1.38, 1], [-1.38, -1]].forEach(([x, s]) => P.push('black', wg, x, 0.33, s * (W / 2 - 0.12), Math.PI / 2, 0, 0));
      addLights(P, L, 0.62, 0.72, W / 2);
    } else if (type === 'truck') {
      L = len || 14; W = 2.5;
      const cabL = 2.3;
      P.box('cab', cabL, 2.6, W, L / 2 - cabL / 2, 1.85, 0);
      P.box('glass', 0.05, 0.9, W * 0.9, L / 2 + 0.01, 2.45, 0);
      P.box('trailer', L - cabL - 0.3, 2.9, W, -cabL / 2 - 0.15, 2.25, 0);
      P.box('black', L, 0.3, W * 0.9, 0, 0.6, 0);
      const bw = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 14);
      for (const x of [L / 2 - 0.9, -L / 2 + 1.0, -L / 2 + 2.3, 0.6]) for (const s of [1, -1]) P.push('black', bw, x, 0.55, s * (W / 2 - 0.2), Math.PI / 2, 0, 0);
      addLights(P, L, 0.75, 0.85, W / 2);
    } else if (type === 'tractor') {
      L = 4.2; W = 2.2;
      P.box('green', 2.2, 1.0, 1.0, 0.9, 1.15, 0);
      P.box('green', 1.5, 1.6, 1.6, -0.8, 2.0, 0);
      P.box('glass', 1.3, 1.1, 1.5, -0.8, 2.25, 0);
      const bw = new THREE.CylinderGeometry(0.85, 0.85, 0.5, 18), fw = new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14), rim = new THREE.CylinderGeometry(0.4, 0.4, 0.52, 12);
      for (const s of [1, -1]) {
        P.push('black', bw, -1.1, 0.85, s * 0.95, Math.PI / 2, 0, 0);
        P.push('black', fw, 1.4, 0.5, s * 0.8, Math.PI / 2, 0, 0);
        P.push('yellow', rim, -1.1, 0.85, s * 0.96, Math.PI / 2, 0, 0);
      }
      P.box('beacon', 0.25, 0.2, 0.25, -0.8, 2.92, 0);
      P.push('lgf', new THREE.CircleGeometry(0.35, 3), -1.62, 1.7, 0, 0, -Math.PI / 2, Math.PI / 2);
      addLights(P, L, 1.0, 1.0, W / 2);
    }
    return (carGeoCache[key] = { geo: P.merge(), L, W });
  }

  SIM.makeCar = function (opts = {}) {
    const type = opts.type || 'car';
    const g = new THREE.Group();
    const color = opts.color != null ? opts.color : CAR_COLORS[(Math.random() * CAR_COLORS.length) | 0];
    const side = opts.side || THREE.FrontSide;
    const len = type === 'truck' ? opts.len || [12, 14, 16.5][(Math.random() * 3) | 0] : 0;
    const G = carGeometry(type, len);
    const mats = {
      body: new THREE.MeshLambertMaterial({ color, side }),
      glass: lam(0x1a2630, { side }),
      black: lam(0x141414),
      head: new THREE.MeshLambertMaterial({ color: 0xfff6dc, emissive: 0xfff2c8, emissiveIntensity: 0.35 }),
      tail: new THREE.MeshLambertMaterial({ color: 0x7a0b0b, emissive: 0xff1010, emissiveIntensity: 0.25 }),
      bl: new THREE.MeshLambertMaterial({ color: 0x8a5200, emissive: 0xff9a00, emissiveIntensity: 0 }),
      br: new THREE.MeshLambertMaterial({ color: 0x8a5200, emissive: 0xff9a00, emissiveIntensity: 0 }),
      cab: lam(opts.cabColor || [0xd8d8d8, 0x1d3f7a, 0xa12020, 0xe0e0e0][(Math.random() * 4) | 0]),
      trailer: lam(opts.trailerColor || [0xe8e8e4, 0xc9c9c4, 0x2b5aa0, 0x6b6b6b][(Math.random() * 4) | 0]),
      green: lam(0x2e7d32), yellow: lam(0xf2c200),
      beacon: new THREE.MeshLambertMaterial({ color: 0xff8a00, emissive: 0xff8a00, emissiveIntensity: 0.8 }),
      lgf: new THREE.MeshLambertMaterial({ color: 0xff5a1f, emissive: 0x6a1a00, side: THREE.DoubleSide }),
    };
    Object.entries(G.geo).forEach(([role, geo]) => g.add(new THREE.Mesh(geo, mats[role])));
    if (type !== 'tractor') mats.beacon = null;
    g.userData.len = G.L; g.userData.wid = G.W;
    return { group: g, L: G.L, W: G.W, mats, bodyMat: mats.body };
  };

  SIM.makePed = function (color) {
    const g = new THREE.Group();
    const shirt = lam(color || [0xd23c3c, 0x2b6cb0, 0xf2c94c, 0x3a9d5d, 0x8e44ad, 0xe67e22][(Math.random() * 6) | 0]);
    const pants = lam(0x2c3440), skin = lam(0xe0b48f), hair = lam(0x3b2a1e);
    const legL = new THREE.Group(), legR = new THREE.Group();
    box(legL, 0.16, 0.85, 0.16, pants, 0, -0.42, 0); legL.position.set(0, 0.88, -0.11);
    box(legR, 0.16, 0.85, 0.16, pants, 0, -0.42, 0); legR.position.set(0, 0.88, 0.11);
    g.add(legL, legR);
    box(g, 0.28, 0.62, 0.44, shirt, 0, 1.2, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skin); head.position.set(0, 1.66, 0); g.add(head);
    const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.135, 12, 10, 0, Math.PI * 2, 0, Math.PI / 2), hair); h2.position.set(0, 1.68, 0); g.add(h2);
    // refleks
    const refl = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x000000 });
    box(g, 0.05, 0.08, 0.08, refl, -0.15, 0.9, 0.2);
    g.userData = { legL, legR, refl };
    return g;
  };

  SIM.makeMoose = function () {
    const g = new THREE.Group();
    const br = lam(0x4a3524), dk = lam(0x2c1f15), ant = lam(0xcbb79a);
    box(g, 2.2, 1.0, 0.8, br, 0, 1.75, 0);
    box(g, 0.8, 0.5, 0.6, br, 1.3, 2.0, 0);
    box(g, 0.7, 0.35, 0.35, dk, 1.75, 2.0, 0);
    for (const [x, z] of [[0.85, 0.28], [0.85, -0.28], [-0.85, 0.28], [-0.85, -0.28]]) box(g, 0.18, 1.35, 0.18, dk, x, 0.68, z);
    box(g, 0.1, 0.12, 1.2, ant, 1.4, 2.4, 0);
    box(g, 0.5, 0.08, 0.3, ant, 1.4, 2.5, 0.55);
    box(g, 0.5, 0.08, 0.3, ant, 1.4, 2.5, -0.55);
    return g;
  };

  // skilt på stolpe. svgId fra KA.signs eller svg-streng
  const texCache = {};
  SIM.signTexture = function (key, svg) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas'); c.width = 256; c.height = 256;
    const tex = new THREE.CanvasTexture(c);
    const img = new Image();
    img.onload = () => { const x = c.getContext('2d'); x.clearRect(0, 0, 256, 256); x.drawImage(img, 0, 0, 256, 256); tex.needsUpdate = true; };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    texCache[key] = tex;
    return tex;
  };
  SIM.makeSign = function (ids, opts = {}) {
    // ids: én id eller liste (stablet ovenfra)
    if (!Array.isArray(ids)) ids = [ids];
    const g = new THREE.Group();
    const size = opts.size || 0.9;
    const h = opts.height || 2.1;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, h + size * (ids.length - 0.5), 8), lam(0x9aa0a6));
    post.position.y = (h + size * (ids.length - 0.5)) / 2;
    g.add(post);
    ids.forEach((id, i) => {
      const svg = typeof id === 'string' && id.startsWith('<svg') ? id : KA.signs.svg(id);
      const tex = SIM.signTexture(typeof id === 'string' && id.length < 40 ? id : 'c' + i + Math.random(), svg);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.FrontSide }));
      const y = h + size * (ids.length - 1 - i) + size / 2 - size * 0.5 + size * 0.5;
      m.position.set(0.03, y, 0); m.rotation.y = Math.PI / 2; // vender mot +x lokalt
      g.add(m);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(size * 0.95, size * 0.95), lam(0x8b9096, { side: THREE.FrontSide }));
      back.position.set(0.0, y, 0); back.rotation.y = -Math.PI / 2;
      g.add(back);
    });
    return g;
  };
  // tekstskilt (blå vegvisning)
  SIM.textSignSvg = function (lines, opts = {}) {
    const bg = opts.bg || '#0b4ea2', fg = opts.fg || '#fff';
    const h = 100, w = 100;
    const t = lines.map((l, i) => `<text x="50" y="${(h / (lines.length + 1)) * (i + 1)}" font-family="Arial" font-weight="700" font-size="${opts.fs || 15}" fill="${fg}" text-anchor="middle" dominant-baseline="central">${l}</text>`).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="256" height="256"><rect x="2" y="12" width="96" height="76" rx="6" fill="#fff"/><rect x="5" y="15" width="90" height="70" rx="4" fill="${bg}"/>${t}</svg>`;
  };

  // instanser (trær, stolper)
  SIM.instanced = function (scene, geo, mat, list) {
    if (!list.length) return null;
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    list.forEach((it, i) => {
      p.set(it[0], it[1], it[2]);
      e.set(0, it[4] || 0, 0); q.setFromEuler(e);
      const sc = it[3] || 1; s.set(sc, it[5] || sc, sc);
      m.compose(p, q, s);
      im.setMatrixAt(i, m);
    });
    scene.add(im);
    return im;
  };
  SIM.addForest = function (scene, pts, night) {
    // pts: [[x,z,scale]]
    const trunk = new THREE.CylinderGeometry(0.18, 0.25, 2, 6);
    const cone1 = new THREE.ConeGeometry(1.9, 4.2, 7), cone2 = new THREE.ConeGeometry(1.3, 3.2, 7);
    const tm = lam(0x4a3726), gm = lam(night ? 0x14261a : 0x1f4a2b), gm2 = lam(night ? 0x183020 : 0x2a5c35);
    SIM.instanced(scene, trunk, tm, pts.map(([x, z, s]) => [x, 1 * s, z, s]));
    SIM.instanced(scene, cone1, gm, pts.map(([x, z, s]) => [x, 3.6 * s, z, s, Math.random() * 3]));
    SIM.instanced(scene, cone2, gm2, pts.map(([x, z, s]) => [x, 5.8 * s, z, s, Math.random() * 3]));
  };
  SIM.addBirches = function (scene, pts, night) {
    const trunk = new THREE.CylinderGeometry(0.12, 0.16, 4, 6);
    const crown = new THREE.SphereGeometry(1.6, 8, 6);
    SIM.instanced(scene, trunk, lam(0xe8e4da), pts.map(([x, z, s]) => [x, 2 * s, z, s]));
    SIM.instanced(scene, crown, lam(night ? 0x2a3a1c : 0x6f9a3a), pts.map(([x, z, s]) => [x, 4.6 * s, z, s, 0, s * 1.3]));
  };
  SIM.addHouse = function (scene, x, z, rot, w, d, h, color, roof) {
    const g = new THREE.Group();
    box(g, w, h, d, lam(color), 0, h / 2, 0);
    const rr = d * 0.6;
    const r = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, w + 0.4, 3, 1, false, Math.PI / 2), lam(roof || 0x3a3a3a));
    r.rotation.z = Math.PI / 2; r.scale.set(0.7, 1, 1); r.position.set(0, h + rr * 0.5 * 0.7, 0);
    g.add(r);
    // vinduer
    const win = lam(0x24323d, { emissive: 0x000000 });
    for (let i = -1; i <= 1; i += 2) box(g, 0.9, 0.9, 0.05, win, i * w * 0.25, h * 0.55, d / 2 + 0.03);
    for (let i = -1; i <= 1; i += 2) box(g, 0.9, 0.9, 0.05, win, i * w * 0.25, h * 0.55, -d / 2 - 0.03);
    g.position.set(x, 0, z); g.rotation.y = rot || 0;
    scene.add(g);
    return g;
  };
  SIM.addBlock = function (scene, x, z, rot, w, d, h, color) {
    const g = new THREE.Group();
    box(g, w, h, d, lam(color), 0, h / 2, 0);
    const win = lam(0x2a3a48);
    const floors = Math.floor(h / 3.1);
    for (let f = 0; f < floors; f++) for (let i = 0; i < Math.floor(w / 3); i++) {
      const xx = -w / 2 + 1.5 + i * 3;
      box(g, 1.4, 1.5, 0.05, win, xx, 2 + f * 3.1, d / 2 + 0.03);
      box(g, 1.4, 1.5, 0.05, win, xx, 2 + f * 3.1, -d / 2 - 0.03);
    }
    g.position.set(x, 0, z); g.rotation.y = rot || 0;
    scene.add(g);
    return g;
  };
  SIM.addLamp = function (scene, list, night) {
    // list: [[x,z,dirAngle]]
    const pole = new THREE.CylinderGeometry(0.07, 0.1, 8, 6);
    const head = new THREE.BoxGeometry(0.7, 0.18, 0.3);
    SIM.instanced(scene, pole, lam(0x8e949a), list.map(([x, z]) => [x, 4, z]));
    const hm = new THREE.MeshLambertMaterial({ color: 0xfff0c0, emissive: night ? 0xffe2a0 : 0x000000, emissiveIntensity: night ? 1 : 0 });
    SIM.instanced(scene, head, hm, list.map(([x, z, a]) => [x + Math.cos(a) * 0.6, 7.95, z + Math.sin(a) * 0.6, 1, -a]));
  };
  SIM.box = box;
  SIM.lam = lam;
})();
