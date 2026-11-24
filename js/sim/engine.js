/* Kjøresimulator-motor: fysikk, trafikk (IDM), speil/blindsone, HUD, vurdering. */
(function () {
  'use strict';
  const KA = (window.KA = window.KA || {});
  if (!window.THREE) return;
  const SIM = KA.sim;
  const { clamp, lerp } = SIM;
  const KMH = 3.6;

  // ------------------------------------------------------------------
  // Kjøreprotokoll (sensorens notater)
  // ------------------------------------------------------------------
  class Protocol {
    constructor() { this.items = []; this.keys = {}; }
    add(cat, sev, title, text) { this.items.push({ cat, sev, title, text: text || '' }); }
    once(key, cat, sev, title, text) { if (this.keys[key]) return false; const it = { cat, sev, title, text: text || '', n: 1 }; this.keys[key] = it; this.items.push(it); return true; }
    // hendelse som kan gjentas: vises én gang med teller
    event(key, cat, sev, title, text) { if (this.keys[key]) { this.keys[key].n++; return false; } return this.once(key, cat, sev, title, text); }
    has(sev) { return this.items.some((i) => i.sev === sev); }
    count(sev) { return this.items.filter((i) => i.sev === sev).length; }
    score() {
      let s = 100;
      this.items.forEach((i) => { if (i.sev === 'minor') s -= 6; if (i.sev === 'major') s -= 25; if (i.sev === 'critical') s -= 60; });
      return clamp(s, 0, 100);
    }
  }
  SIM.Protocol = Protocol;

  // ------------------------------------------------------------------
  // Lyd
  // ------------------------------------------------------------------
  class Sound {
    constructor() { this.ok = false; this.muted = false; }
    init() {
      if (this.ok) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        const c = this.ctx;
        this.master = c.createGain(); this.master.gain.value = 0.9; this.master.connect(c.destination);
        this.eng = c.createOscillator(); this.eng.type = 'sawtooth';
        this.eng2 = c.createOscillator(); this.eng2.type = 'triangle';
        this.lp = c.createBiquadFilter(); this.lp.type = 'lowpass'; this.lp.frequency.value = 380;
        this.eg = c.createGain(); this.eg.gain.value = 0;
        this.eng.connect(this.lp); this.eng2.connect(this.lp); this.lp.connect(this.eg); this.eg.connect(this.master);
        this.eng.start(); this.eng2.start();
        // vind/dekkstøy
        const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.noiseBuf = buf;
        this.wind = c.createBufferSource(); this.wind.buffer = buf; this.wind.loop = true;
        this.wf = c.createBiquadFilter(); this.wf.type = 'bandpass'; this.wf.frequency.value = 500; this.wf.Q.value = 0.6;
        this.wg = c.createGain(); this.wg.gain.value = 0;
        this.wind.connect(this.wf); this.wf.connect(this.wg); this.wg.connect(this.master); this.wind.start();
        this.ok = true;
      } catch (e) { this.ok = false; }
    }
    setMuted(m) { this.muted = m; if (this.ok) this.master.gain.value = m ? 0 : 0.9; }
    engine(v, thr) {
      if (!this.ok) return;
      const t = this.ctx.currentTime;
      // enkel "girkasse" for realistisk turtall
      const gears = [0, 4.5, 9, 14.5, 21, 28, 60];
      let gi = 1; while (gi < gears.length - 1 && v > gears[gi]) gi++;
      const lo = gears[gi - 1], hi = gears[gi];
      const rpm = 900 + ((v - lo) / (hi - lo || 1)) * 2600 + thr * 500;
      const f = rpm / 60 * 1.0;
      this.eng.frequency.setTargetAtTime(f, t, 0.05);
      this.eng2.frequency.setTargetAtTime(f * 0.5, t, 0.05);
      this.lp.frequency.setTargetAtTime(260 + thr * 500 + rpm * 0.05, t, 0.08);
      this.eg.gain.setTargetAtTime(0.035 + thr * 0.045, t, 0.1);
      this.wg.gain.setTargetAtTime(Math.min(0.09, v * v * 0.00009), t, 0.2);
      this.wf.frequency.setTargetAtTime(300 + v * 18, t, 0.2);
    }
    click(hi) {
      if (!this.ok || this.muted) return;
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = 'square'; o.frequency.value = hi ? 1650 : 1250;
      g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.03);
      o.connect(g); g.connect(this.master); o.start(); o.stop(c.currentTime + 0.04);
    }
    crash() {
      if (!this.ok) return;
      const c = this.ctx, s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
      s.buffer = this.noiseBuf; f.type = 'lowpass'; f.frequency.value = 900;
      g.gain.setValueAtTime(0.7, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 1.2);
      s.connect(f); f.connect(g); g.connect(this.master); s.start(); s.stop(c.currentTime + 1.3);
    }
    horn(on) {
      if (!this.ok) return;
      if (on && !this.hornO) {
        const c = this.ctx; this.hornO = c.createOscillator(); this.hornO2 = c.createOscillator(); this.hornG = c.createGain();
        this.hornO.frequency.value = 420; this.hornO2.frequency.value = 520; this.hornO.type = this.hornO2.type = 'square';
        this.hornG.gain.value = 0.05; this.hornO.connect(this.hornG); this.hornO2.connect(this.hornG); this.hornG.connect(this.master);
        this.hornO.start(); this.hornO2.start();
      } else if (!on && this.hornO) { this.hornO.stop(); this.hornO2.stop(); this.hornO = null; }
    }
    stopAll() { try { if (this.ctx) this.ctx.close(); } catch (e) { /* */ } this.ok = false; }
  }

  // ------------------------------------------------------------------
  // Hjelpere
  // ------------------------------------------------------------------
  function rectCorners(x, z, h, L, W) {
    const c = Math.cos(h), s = Math.sin(h), l = L / 2, w = W / 2;
    return [[x + c * l - s * w, z + s * l + c * w], [x + c * l + s * w, z + s * l - c * w], [x - c * l + s * w, z - s * l - c * w], [x - c * l - s * w, z - s * l + c * w]];
  }
  function rectsOverlap(a, b) {
    const A = rectCorners(a.x, a.z, a.h, a.len, a.wid), B = rectCorners(b.x, b.z, b.h, b.len, b.wid);
    for (const P of [A, B]) {
      for (let i = 0; i < 4; i++) {
        const p1 = P[i], p2 = P[(i + 1) % 4];
        const nx = p2[1] - p1[1], nz = p1[0] - p2[0];
        let amin = Infinity, amax = -Infinity, bmin = Infinity, bmax = -Infinity;
        for (const q of A) { const d = q[0] * nx + q[1] * nz; amin = Math.min(amin, d); amax = Math.max(amax, d); }
        for (const q of B) { const d = q[0] * nx + q[1] * nz; bmin = Math.min(bmin, d); bmax = Math.max(bmax, d); }
        if (amax < bmin || bmax < amin) return false;
      }
    }
    return true;
  }
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  // ------------------------------------------------------------------
  // Motor
  // ------------------------------------------------------------------
  class Engine {
    constructor(host, scen, opts = {}) {
      this.host = host; this.scen = scen; this.opts = Object.assign({ coach: true, voice: false, sound: true }, opts);
      this.time = 0; this.running = false; this.paused = false; this.done = false;
      this.prot = new Protocol();
      this.vehicles = []; this.spawners = []; this.peds = []; this.crossings = []; this.roadShapes = []; this.holes = []; this.mapRoads = []; this.moose = [];
      this.night = !!scen.night;
      this.minCurveR = 300;
      this.camMode = 0;
      this.keys = {}; this.touch = { steer: 0, thr: 0, brk: 0 };
      this.sound = new Sound();
      this.forced = new Set();
      this._toastT = 0; this._coachT = {};
      this.buildDom();
      this.buildThree();
      this.player = {
        isPlayer: true, x: 0, z: 0, h: 0, v: 0, len: 4.5, wid: 1.82, steer: 0, thr: 0, brk: 0,
        blink: null, blinkOnAt: 0, blinkPhase: 0, high: false,
        mirrorAt: -99, shL: -99, shR: -99, lookYaw: 0, maxSteerSinceBlink: 0,
        lane: null, offT: 0,
      };
      this.ctx = scen.build(this, opts) || {};
      this.gb.build(this.scene, this.mats);
      this.createPlayerMesh();
      this.layout();
      this._onResize = () => this.layout();
      window.addEventListener('resize', this._onResize);
      this.bindInput();
      this.showIntro();
      this._raf = requestAnimationFrame((t) => this.loop(t));
    }

    // ---------------- DOM ----------------
    buildDom() {
      const r = (this.root = el('div', 'sim' + (this.night ? ' sim-night' : '')));
      this.host.innerHTML = '';
      this.host.appendChild(r);
      this.canvas = el('canvas', 'sim-canvas');
      r.appendChild(this.canvas);
      const hud = (this.hud = el('div', 'sim-hud'));
      r.appendChild(hud);
      this.elInstr = el('div', 'sim-instr');
      hud.appendChild(this.elInstr);
      this.mirrorFrames = ['rear', 'left', 'right'].map((k) => { const m = el('div', 'sim-mirror sim-mirror-' + k); hud.appendChild(m); return m; });
      this.elToast = el('div', 'sim-toast'); hud.appendChild(this.elToast);
      const dash = (this.elDash = el('div', 'sim-dash'));
      dash.innerHTML = `
        <div class="sd-blink sd-l" aria-label="Blinklys venstre">◀</div>
        <div class="sd-speed"><span class="sd-num">0</span><span class="sd-unit">km/t</span></div>
        <div class="sd-blink sd-r" aria-label="Blinklys høyre">▶</div>
        <div class="sd-limit"></div>
        <div class="sd-ind"><span class="sd-high" title="Fjernlys">≣D</span><span class="sd-look sd-mir" title="Speilsjekk">SPEIL</span><span class="sd-look sd-shl" title="Skulderblikk venstre">↶ SKULDER</span><span class="sd-look sd-shr" title="Skulderblikk høyre">SKULDER ↷</span></div>`;
      hud.appendChild(dash);
      this.elSpeed = dash.querySelector('.sd-num');
      this.elBL = dash.querySelector('.sd-l'); this.elBR = dash.querySelector('.sd-r');
      this.elLimit = dash.querySelector('.sd-limit');
      this.elHigh = dash.querySelector('.sd-high'); this.elMir = dash.querySelector('.sd-mir'); this.elShL = dash.querySelector('.sd-shl'); this.elShR = dash.querySelector('.sd-shr');
      this.mapCanvas = el('canvas', 'sim-map'); this.mapCanvas.width = 300; this.mapCanvas.height = 300; hud.appendChild(this.mapCanvas);
      const btns = el('div', 'sim-btns');
      btns.innerHTML = `<button type="button" data-a="pause" title="Pause (P)">II</button><button type="button" data-a="cam" title="Bytt kamera (V)">Kamera</button><button type="button" data-a="snd" title="Lyd av/på">Lyd</button>`;
      hud.appendChild(btns);
      btns.addEventListener('click', (e) => { const a = e.target.closest('button'); if (!a) return; const k = a.dataset.a; if (k === 'pause') this.togglePause(); if (k === 'cam') this.cycleCam(); if (k === 'snd') { this.sound.setMuted(!this.sound.muted); a.classList.toggle('off', this.sound.muted); } });
      // touch-kontroller
      const t = (this.elTouch = el('div', 'sim-touch'));
      t.innerHTML = `
        <div class="st-row st-top">
          <button type="button" data-k="bl">◀ Blink</button>
          <button type="button" data-k="shl" class="hold">↶ Skulder</button>
          <button type="button" data-k="mir">Speil</button>
          <button type="button" data-k="shr" class="hold">Skulder ↷</button>
          <button type="button" data-k="br">Blink ▶</button>
          ${this.night ? '<button type="button" data-k="hi">Fjernlys</button>' : ''}
        </div>
        <div class="st-wheel" aria-label="Ratt: dra til siden"><div class="st-knob"></div><span>Dra for å styre</span></div>
        <div class="st-pedals"><button type="button" class="st-brk hold" data-k="brk">BREMS</button><button type="button" class="st-thr hold" data-k="thr">GASS</button></div>`;
      hud.appendChild(t);
      this.overlay = el('div', 'sim-overlay'); r.appendChild(this.overlay);
    }

    // ---------------- THREE ----------------
    buildThree() {
      const R = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' }));
      R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
      R.autoClear = false;
      const sc = (this.scene = new THREE.Scene());
      const sky = this.night ? 0x070b14 : 0xa9c6de;
      sc.background = new THREE.Color(sky);
      sc.fog = new THREE.Fog(sky, this.night ? 40 : 180, this.night ? 420 : 1100);
      this.hemi = new THREE.HemisphereLight(this.night ? 0x334466 : 0xdfeaf5, this.night ? 0x0a0a0a : 0x4d5a3a, this.night ? 0.22 : 0.85);
      sc.add(this.hemi);
      this.sun = new THREE.DirectionalLight(this.night ? 0x6677aa : 0xfff3e0, this.night ? 0.12 : 0.85);
      this.sun.position.set(-300, 400, -200); sc.add(this.sun);
      this.mats = SIM.makeMaterials(this.night);
      this.gb = new SIM.GB();
      // bakke
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1), this.mats.ground);
      ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; sc.add(ground);
      // fjerne åser
      const hillM = SIM.lam(this.night ? 0x0d1410 : 0x58745a);
      for (let i = 0; i < 26; i++) {
        const a = (i / 26) * Math.PI * 2, d = 1400 + Math.random() * 500;
        const h = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), hillM);
        h.scale.set(250 + Math.random() * 300, 80 + Math.random() * 160, 250 + Math.random() * 300);
        h.position.set(Math.cos(a) * d + 400, -20, Math.sin(a) * d);
        sc.add(h);
      }
      this.camera = new THREE.PerspectiveCamera(62, 1, 0.12, 3000);
      // speil
      this.mirrors = [
        { key: 'rear', hfov: 44, rt: new THREE.WebGLRenderTarget(512, 140) },
        { key: 'left', hfov: 24, yaw: 0.2, rt: new THREE.WebGLRenderTarget(300, 200) },
        { key: 'right', hfov: 30, yaw: 0.27, rt: new THREE.WebGLRenderTarget(300, 200) },
      ];
      this.mirrors.forEach((m) => { m.cam = new THREE.PerspectiveCamera(20, 1.5, 0.3, 380); });
      this.hudScene = new THREE.Scene();
      this.hudCam = new THREE.OrthographicCamera(0, 100, 100, 0, -10, 10);
      this.mirrors.forEach((m) => {
        m.plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: m.rt.texture, side: THREE.DoubleSide, depthTest: false }));
        this.hudScene.add(m.plane);
      });
      if (this.night) {
        this.headL = [];
        for (const s of [-1, 1]) {
          const sp = new THREE.SpotLight(0xfff4dd, 2.2, 90, 0.5, 0.45, 1);
          sp.target = new THREE.Object3D();
          sc.add(sp); sc.add(sp.target);
          this.headL.push({ sp, s });
        }
        this.glareTex = (() => {
          const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
          const g = x.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.15, 'rgba(255,245,210,.65)'); g.addColorStop(1, 'rgba(255,240,200,0)');
          x.fillStyle = g; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c);
        })();
      }
    }

    createPlayerMesh() {
      const color = this.scen.playerColor || 0xc81e2a;
      const car = SIM.makeCar({ type: 'player', color });
      this.player.mesh = car.group; this.player.mats = car.mats; this.player.len = car.L; this.player.wid = car.W;
      this.player.body = car.group.children.slice();
      // interiør for førerperspektivet
      const cab = new THREE.Group();
      const dark = SIM.lam(0x17191c), trim = SIM.lam(0x24272b), hoodM = new THREE.MeshLambertMaterial({ color });
      SIM.box(cab, 0.5, 0.22, 1.72, dark, 0.98, 0.81, 0); // dashbord
      SIM.box(cab, 1.25, 0.1, 1.7, hoodM, 1.62, 0.78, 0); // panser
      SIM.box(cab, 0.16, 0.06, 0.5, SIM.lam(0x0d0e10), 0.86, 0.93, -0.38); // instrumenthus
      const beam = (a, b, t, m) => {
        const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(t, L, t), m);
        mesh.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L));
        cab.add(mesh);
      };
      for (const sd of [-1, 1]) {
        beam([1.08, 0.9, sd * 0.8], [0.32, 1.43, sd * 0.7], 0.075, trim); // A-stolpe
        beam([-0.75, 0.88, sd * 0.84], [-0.7, 1.42, sd * 0.76], 0.16, trim); // B-stolpe
        beam([1.0, 0.92, sd * 0.86], [-1.6, 0.92, sd * 0.86], 0.07, dark); // dørkarm
        beam([-1.7, 0.95, sd * 0.78], [-1.2, 1.4, sd * 0.7], 0.22, trim); // C-stolpe
      }
      SIM.box(cab, 2.0, 0.04, 1.56, trim, -0.68, 1.45, 0); // takhimling
      SIM.box(cab, 0.06, 0.08, 1.5, dark, 0.32, 1.42, 0); // øvre ruteramme
      SIM.box(cab, 0.08, 0.05, 0.22, dark, 0.38, 1.36, 0); // speilfeste
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.026, 8, 28), SIM.lam(0x0e0f11));
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.02), SIM.lam(0x1d1f22));
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 14), SIM.lam(0x1d1f22)); hub.rotation.x = Math.PI / 2;
      const spin = new THREE.Group(); spin.add(wheel, spoke, hub);
      const wg = new THREE.Group(); wg.add(spin); wg.rotation.y = Math.PI / 2;
      const tilt = new THREE.Group(); tilt.position.set(0.5, 0.84, -0.38); tilt.rotation.z = 0.42; tilt.add(wg);
      cab.add(tilt);
      cab.visible = false;
      car.group.add(cab);
      this.player.cab = cab;
      this.player.wheel = spin;
      this.scene.add(car.group);
    }

    layout() {
      const W = this.root.clientWidth || 800, H = this.root.clientHeight || 500;
      this.W = W; this.H = H;
      this.renderer.setSize(W, H, false);
      this.camera.aspect = W / H;
      this.camera.fov = W / H < 1 ? 74 : 60;
      this.camera.updateProjectionMatrix();
      this.hudCam.right = W; this.hudCam.top = H; this.hudCam.updateProjectionMatrix();
      const small = W < 700;
      const rw = Math.min(W * (small ? 0.42 : 0.3), 380), rh = rw * 0.27;
      const sw = Math.min(W * (small ? 0.24 : 0.17), 220), sh = sw * 0.64;
      const top = small ? 62 : 12;
      const sideTop = small ? H * 0.34 : H * 0.46;
      const boxes = { rear: [(W - rw) / 2, top, rw, rh], left: [10, sideTop, sw, sh], right: [W - sw - 10, sideTop, sw, sh] };
      this.mirrors.forEach((m, i) => {
        const [x, y, w, h] = boxes[m.key];
        m.box = [x, y, w, h];
        const f = this.mirrorFrames[i];
        Object.assign(f.style, { left: x - 4 + 'px', top: y - 4 + 'px', width: w + 8 + 'px', height: h + 8 + 'px' });
        m.plane.position.set(x + w / 2, H - (y + h / 2), 0);
        m.plane.scale.set(-w, h, 1); // speilvendt
        m.cam.aspect = w / h;
        m.cam.fov = (2 * Math.atan(Math.tan((m.hfov * Math.PI) / 360) / m.cam.aspect) * 180) / Math.PI;
        m.cam.updateProjectionMatrix();
        const pr = Math.min(window.devicePixelRatio || 1, 1.5);
        m.rt.setSize(Math.round(w * pr), Math.round(h * pr));
      });
      this.elToast.style.top = (top + rh + 18) + 'px';
      this.root.classList.toggle('sim-small', small);
      const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      this.root.classList.toggle('sim-has-touch', touch || this.opts.forceTouch);
    }

    // ---------------- input ----------------
    bindInput() {
      this._kd = (e) => {
        if (!this.root.isConnected) return;
        const k = e.code;
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(k)) e.preventDefault();
        if (this.keys[k]) return;
        this.keys[k] = true;
        if (k === 'KeyQ') this.toggleBlink('L');
        if (k === 'KeyE') this.toggleBlink('R');
        if (k === 'KeyR') this.mirrorCheck();
        if (k === 'KeyF') this.toggleHigh();
        if (k === 'KeyV') this.cycleCam();
        if (k === 'KeyH') this.sound.horn(true);
        if (k === 'KeyP' || k === 'Escape') { if (this.running && !this.done) this.togglePause(); }
      };
      this._ku = (e) => { this.keys[e.code] = false; if (e.code === 'KeyH') this.sound.horn(false); };
      window.addEventListener('keydown', this._kd);
      window.addEventListener('keyup', this._ku);
      // touch-knapper
      const t = this.elTouch;
      const holds = {};
      t.querySelectorAll('button').forEach((b) => {
        const k = b.dataset.k;
        const down = (e) => {
          e.preventDefault();
          b.classList.add('on');
          if (k === 'bl') this.toggleBlink('L');
          else if (k === 'br') this.toggleBlink('R');
          else if (k === 'mir') this.mirrorCheck();
          else if (k === 'hi') this.toggleHigh();
          else holds[k] = true;
          this.touch.holds = holds;
        };
        const up = (e) => { e.preventDefault(); b.classList.remove('on'); holds[k] = false; };
        b.addEventListener('pointerdown', down);
        b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
      });
      this.touch.holds = holds;
      const wheel = t.querySelector('.st-wheel'), knob = t.querySelector('.st-knob');
      let wid = null, wx = 0;
      wheel.addEventListener('pointerdown', (e) => { e.preventDefault(); wid = e.pointerId; wx = e.clientX; wheel.setPointerCapture(wid); });
      wheel.addEventListener('pointermove', (e) => {
        if (e.pointerId !== wid) return;
        const r = wheel.getBoundingClientRect();
        const v = clamp((e.clientX - wx) / (r.width * 0.42), -1, 1);
        this.touch.steer = v; this.touch.analog = true;
        knob.style.transform = `translateX(${v * r.width * 0.38}px)`;
      });
      const wup = () => { wid = null; this.touch.steer = 0; knob.style.transform = ''; };
      wheel.addEventListener('pointerup', wup); wheel.addEventListener('pointercancel', wup);
    }
    toggleBlink(dir) {
      const p = this.player;
      if (p.blink === dir) p.blink = null;
      else { p.blink = dir; p.blinkOnAt = this.time; p.maxSteerSinceBlink = 0; }
    }
    mirrorCheck() {
      this.player.mirrorAt = this.time;
      this.mirrorFrames.forEach((f) => { f.classList.remove('flash'); void f.offsetWidth; f.classList.add('flash'); });
      this.elMir.classList.add('on'); clearTimeout(this._mt); this._mt = setTimeout(() => this.elMir.classList.remove('on'), 700);
    }
    toggleHigh() { if (!this.night) return; this.player.high = !this.player.high; }
    cycleCam() { this.camMode = (this.camMode + 1) % 3; this.toast(['Førerperspektiv', 'Bak bilen', 'Ovenfra'][this.camMode], 'info'); }
    readInput(dt) {
      const k = this.keys, h = this.touch.holds || {};
      let thr = (k.ArrowUp || k.KeyW || h.thr) ? 1 : 0;
      let brk = (k.ArrowDown || k.KeyS || k.Space || h.brk) ? 1 : 0;
      let steer = 0, analog = false;
      if (k.ArrowLeft || k.KeyA) steer -= 1;
      if (k.ArrowRight || k.KeyD) steer += 1;
      if (this.touch.steer) { steer = this.touch.steer; analog = true; }
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const gp of pads) {
        if (!gp) continue;
        if (Math.abs(gp.axes[0]) > 0.08) { steer = gp.axes[0]; analog = true; }
        if (gp.buttons[7] && gp.buttons[7].value > 0.05) thr = gp.buttons[7].value;
        if (gp.buttons[6] && gp.buttons[6].value > 0.05) brk = gp.buttons[6].value;
        const edge = (i, fn) => { const pr = gp.buttons[i] && gp.buttons[i].pressed; const key = 'gp' + i; if (pr && !this[key]) fn(); this[key] = pr; };
        edge(4, () => this.toggleBlink('L')); edge(5, () => this.toggleBlink('R')); edge(3, () => this.mirrorCheck()); edge(1, () => this.cycleCam()); edge(9, () => this.togglePause());
        if (gp.buttons[2] && gp.buttons[2].pressed) h.shl = true; else if (this.gpSh) h.shl = false;
        this.gpSh = gp.buttons[2] && gp.buttons[2].pressed;
        break;
      }
      // myk gass for tastatur
      const p = this.player;
      p.thr = analog || this.touch.holds.thr ? thr : lerp(p.thr, thr, Math.min(1, dt * 4));
      p.brk = brk ? lerp(p.brk, brk, Math.min(1, dt * 6)) : 0;
      p.steerIn = steer; p.analog = analog;
      p.lookL = !!(k.KeyZ || h.shl); p.lookR = !!(k.KeyC || h.shr);
    }

    // ---------------- API for scenarioer ----------------
    addRoad(path, a, b, mat = 'asphalt', o = {}) {
      this.gb.ribbon(mat, path, o.s0 || 0, o.s1 != null ? o.s1 : path.length, a, b, o.y != null ? o.y : 0.02, o.ds || 1);
      if (o.drivable !== false) this.roadShapes.push({ path, a: typeof a === 'function' ? a : () => a, b: typeof b === 'function' ? b : () => b, s0: o.s0 || 0, s1: o.s1 != null ? o.s1 : path.length, hint: -1 });
      if (o.map !== false) this.mapRoads.push({ path, a, b, s0: o.s0 || 0, s1: o.s1 != null ? o.s1 : path.length });
    }
    addDisc(cx, cz, r0, r1, mat = 'asphalt', o = {}) {
      this.gb.annulus(mat, cx, cz, r0, r1, o.y != null ? o.y : 0.02, 96);
      if (o.drivable !== false) this.roadShapes.push({ disc: true, cx, cz, r0, r1 });
      this.mapRoads.push({ disc: true, cx, cz, r0, r1 });
    }
    addHole(cx, cz, r) { this.holes.push({ cx, cz, r }); }
    addSign(ids, x, z, facing, o = {}) {
      const s = SIM.makeSign(ids, o);
      s.position.set(x, 0, z);
      s.rotation.y = -(facing + Math.PI);
      this.scene.add(s);
      return s;
    }
    // plasser skilt på høyre side av bane ved s
    signAt(ids, path, s, off = 5, o = {}) {
      const f = path.frame(s);
      return this.addSign(ids, f.x + f.nx * off, f.z + f.nz * off, f.h, o);
    }
    setPlayer(x, z, h, v) { Object.assign(this.player, { x, z, h, v }); }
    spawn(o) {
      const type = o.type || (Math.random() < (o.truckShare || 0) ? 'truck' : Math.random() < 0.08 ? 'van' : 'car');
      const car = SIM.makeCar({ type, color: o.color });
      const a = {
        id: Math.random().toString(36).slice(2, 7), type, path: o.path, s: o.s || 0, off: o.off || 0, targetOff: o.off || 0, pendingOff: null,
        v: o.v != null ? o.v : o.v0, v0: o.v0, amax: type === 'truck' ? 0.7 : o.amax || 1.4, b: o.b || 2.2, T: o.T || SIM.rand(1.15, 1.7), s0: o.gap0 || 2.5,
        len: car.L, wid: car.W, mesh: car.group, mats: car.mats, blink: null, latSpeed: o.latSpeed || 0.85, think: o.think || null,
        x: 0, z: 0, h: 0, acc: 0, stopS: null, data: o.data || {}, preBlink: o.preBlink || 2.0, glare: null, dead: false,
      };
      if (type === 'truck') a.v0 = Math.min(a.v0, o.truckV || 23.5);
      if (type === 'tractor') { a.amax = 0.6; }
      this.scene.add(a.mesh);
      if (this.night) this.addGlare(a);
      this.placeAI(a, 0);
      this.vehicles.push(a);
      return a;
    }
    addGlare(a) {
      a.glare = [];
      for (const s of [-1, 1]) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glareTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, fog: false }));
        sp.position.set(a.len / 2 + 0.2, 0.62, s * (a.wid / 2 - 0.32));
        sp.scale.set(1.5, 1.5, 1);
        a.mesh.add(sp); a.glare.push(sp);
      }
      a.high = true;
    }
    addSpawner(o) {
      // o: {path, off, rate (kjt/t), v:[min,max] km/t, truckShare, think, minGap, prefill:true}
      const sp = Object.assign({ t: 0, next: 0, minGap: 30 }, o);
      sp.next = this.nextGap(sp);
      this.spawners.push(sp);
      if (o.prefill !== false) {
        let s = o.prefillFrom != null ? o.prefillFrom : 10;
        const end = o.prefillTo != null ? o.prefillTo : o.path.length - 30;
        while (s < end) {
          const v0 = SIM.rand(o.v[0], o.v[1]) / KMH;
          const skip = o.prefillSkip && o.prefillSkip(s);
          if (!skip) this.spawnFrom(sp, s, v0);
          s += Math.max(sp.minGap, v0 * (3600 / o.rate) * SIM.rand(0.4, 1.6));
        }
      }
      return sp;
    }
    nextGap(sp) { const mean = 3600 / sp.rate; return Math.max(1.2, -Math.log(1 - Math.random()) * mean); }
    spawnFrom(sp, s, v0) {
      v0 = v0 || SIM.rand(sp.v[0], sp.v[1]) / KMH;
      const off = typeof sp.off === 'function' ? sp.off() : sp.off || 0;
      const route = sp.route ? sp.route(s) : null;
      const a = this.spawn({ path: route ? route.path : sp.path, s, off, v0, v: v0 * SIM.rand(0.9, 1), truckShare: sp.truckShare, think: sp.think, data: Object.assign({}, sp.data || {}, route ? route.data : {}), type: sp.type && sp.type() });
      a.spawner = sp;
      if (sp.onSpawn) sp.onSpawn(a, this);
      return a;
    }
    tickSpawners(dt) {
      this.spawners.forEach((sp) => {
        if (sp.until && this.time > sp.until) return;
        sp.t += dt;
        if (sp.t < sp.next) return;
        // ledig plass ved start?
        const clear = !this.vehicles.some((a) => !a.dead && (a.spawner === sp || a.path === sp.path) && a.s < sp.minGap + 5 && a.path.p[0] === (sp.path || a.path).p[0]) && !(sp.blocked && sp.blocked(this));
        if (clear) { this.spawnFrom(sp, 0); sp.t = 0; sp.next = this.nextGap(sp); }
      });
    }
    addPed(o) {
      const m = SIM.makePed(o.color);
      this.scene.add(m);
      const p = Object.assign({ x: o.from[0], z: o.from[1], state: 'wait', t: 0, speed: o.speed || 1.35, mesh: m, delay: o.delay || 0, phase: Math.random() * 6, len: 0.5, wid: 0.5, h: 0, v: 0 }, o);
      p.h = Math.atan2(o.to[1] - o.from[1], o.to[0] - o.from[0]);
      if (o.crossing) o.crossing.peds.push(p);
      this.peds.push(p);
      return p;
    }
    addCrossing(path, s, o = {}) {
      // gangfelt på tvers av banen ved s, fra offset a til b
      const f = path.frame(s);
      const a = o.a != null ? o.a : -3.5, b = o.b != null ? o.b : 3.5, depth = o.depth || 3;
      const c = { path, s, x: f.x + f.nx * ((a + b) / 2), z: f.z + f.nz * ((a + b) / 2), tx: f.tx, tz: f.tz, half: (b - a) / 2, depth, sOn: {}, peds: [], passed: false };
      // sebrastriper
      for (let q = a + 0.3; q < b - 0.3; q += 1.0) this.gb.ribbon('white', path, s - depth / 2, s + depth / 2, q, q + 0.5, 0.05, depth);
      this.crossings.push(c);
      return c;
    }
    crossingBusy(c) {
      return c.peds.some((p) => {
        if (p.state === 'walk') { const ac = this.acrossOf(c, p.x, p.z); return Math.abs(ac) < c.half + 0.6; }
        return p.state === 'intent';
      });
    }
    acrossOf(c, x, z) { return (x - c.x) * -c.tz + (z - c.z) * c.tx; }
    alongOf(c, x, z) { return (x - c.x) * c.tx + (z - c.z) * c.tz; }
    instruct(text, speak = true) {
      this.elInstr.innerHTML = `<span class="si-tag">Sensor</span> ${text}`;
      this.elInstr.classList.remove('pop'); void this.elInstr.offsetWidth; this.elInstr.classList.add('pop');
      if (speak && this.opts.voice && window.speechSynthesis) {
        try {
          const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ''));
          u.lang = 'nb-NO';
          const v = speechSynthesis.getVoices().find((x) => /^(nb|no|nn)/i.test(x.lang));
          if (v) u.voice = v;
          u.rate = 1.02;
          speechSynthesis.cancel(); speechSynthesis.speak(u);
        } catch (e) { /* */ }
      }
    }
    toast(text, kind = 'info', dur = 2.6) {
      this.elToast.innerHTML = text; this.elToast.className = 'sim-toast show ' + kind;
      clearTimeout(this._tt); this._tt = setTimeout(() => (this.elToast.className = 'sim-toast'), dur * 1000);
    }
    coach(key, text, every = 8) {
      if (!this.opts.coach) return;
      const last = this._coachT[key];
      if (last != null && this.time - last < every) return;
      this._coachT[key] = this.time;
      this.toast('<b>Tips:</b> ' + text, 'coach', 3.4);
    }
    // vurder en manøver (feltskifte, påkjøring, utkjøring)
    checkManeuver(dir, label, o = {}) {
      const p = this.player, t = this.time;
      const res = { signal: false, early: false, mirror: false, shoulder: false };
      const sigOn = p.blink === dir || (p.lastBlinkDir === dir && t - p.lastBlinkOff < 0.6);
      res.signal = sigOn;
      res.early = sigOn && t - p.blinkOnAt >= (o.minSignal || 1.5);
      res.mirror = t - p.mirrorAt < (o.mirrorWin || 7);
      res.shoulder = t - (dir === 'L' ? p.shL : p.shR) < (o.shoulderWin || 3.5);
      const side = dir === 'L' ? 'venstre' : 'høyre';
      if (!res.signal) this.prot.event('sig-' + label, 'Kommunikasjon', o.sevSignal || 'minor', `Ingen tegngiving: ${label}`, `Gi tegn til ${side} i god tid før du ${o.verb || 'skifter felt'}. Andre må forstå hva du skal gjøre.`);
      else if (!res.early) this.prot.event('sige-' + label, 'Kommunikasjon', 'minor', `Sen tegngiving: ${label}`, 'Blinklyset kom for sent. Gi tegn minst 3 blink før du begynner manøveren.');
      else this.prot.once('sigok-' + label, 'Kommunikasjon', 'good', `Tegngiving i god tid: ${label}`);
      if (o.needMirror !== false) {
        if (!res.mirror) this.prot.event('mir-' + label, 'Observasjon', 'minor', `Ingen speilsjekk: ${label}`, 'Sjekk innvendig speil og sidespeil (tast R) før du gir tegn og skifter felt.');
        else this.prot.once('mirok-' + label, 'Observasjon', 'good', `Speilsjekk: ${label}`);
      }
      if (o.needShoulder !== false) {
        if (!res.shoulder) this.prot.event('sh-' + label, 'Observasjon', o.sevShoulder || 'major', `Manglende skulderblikk ${side}: ${label}`, `Blindsonen ser du ikke i speilet. Ta skulderblikk til ${side} (tast ${dir === 'L' ? 'Z' : 'C'}) rett før du flytter deg.`);
        else this.prot.once('shok-' + label, 'Observasjon', 'good', `Skulderblikk til ${side}: ${label}`);
      }
      return res;
    }
    fail(title, text, cat = 'Risiko') {
      if (this.done) return;
      this.prot.add(cat, 'critical', title, text);
      this.finish();
    }
    onForcedBrake(a, acc) {
      if (this.forced.has(a.id)) return;
      this.forced.add(a.id);
      this.prot.event('forced', 'Samhandling', 'major', 'Du tvang en annen trafikant til å bremse kraftig', 'Plasser deg og tilpass farten slik at andre ikke må endre fart brått på grunn av deg. Det regnes som brudd på vikeplikt eller som farlig samhandling.');
      this.toast('En bil måtte bremse kraftig på grunn av deg', 'bad');
    }

    // ---------------- simulering ----------------
    loop(t) {
      if (this.destroyed) return;
      this._raf = requestAnimationFrame((tt) => this.loop(tt));
      const dt = Math.min(0.05, (t - (this._last || t)) / 1000);
      this._last = t;
      if (this.running && !this.paused && !this.done) {
        const n = Math.ceil(dt / 0.017) || 1;
        for (let i = 0; i < n && !this.done; i++) this.step(dt / n);
      }
      this.render(dt);
    }
    step(dt) {
      this.time += dt;
      this.readInput(dt);
      if (this.autopilot) this.autopilot(this, dt);
      this.updatePlayer(dt);
      this.tickSpawners(dt);
      this.updateAIAll(dt);
      this.updatePeds(dt);
      this.checkCollisions();
      if (this.done) return;
      this.monitors(dt);
      if (this.ctx.update) this.ctx.update(dt);
    }
    updatePlayer(dt) {
      const p = this.player;
      const v = p.v;
      // pedaler
      let a = 0;
      if (p.thr > 0) a += p.thr * 3.1 * Math.max(0.18, 1 - v / 52);
      if (p.brk > 0) a -= p.brk * 8.0;
      if (p.thr < 0.05) a -= 0.3; // motorbrems
      a -= 0.05 + 0.00042 * v * v; // rulle- og luftmotstand
      p.acc = a;
      p.v = Math.max(0, v + a * dt);
      // styring
      const maxD = 0.56 / (1 + (v * v) / 70);
      const target = clamp(p.steerIn, -1, 1) * maxD;
      const rate = p.analog ? maxD * 7 : (Math.sign(target) === Math.sign(p.steer) || target === 0 ? maxD * 1.9 : maxD * 3.2);
      const back = target === 0 && !p.analog ? maxD * 3.4 : rate;
      p.steer += clamp(target - p.steer, -back * dt, back * dt);
      p.h += (p.v / 2.7) * Math.tan(p.steer) * dt;
      p.x += Math.cos(p.h) * p.v * dt;
      p.z += Math.sin(p.h) * p.v * dt;
      // blinklys auto-avslag etter sving
      if (p.blink) {
        const sd = p.blink === 'R' ? p.steer : -p.steer; // styreutslag i blinkretningen
        if (p.v > 1 && p.v < 14) p.maxSteerSinceBlink = Math.max(p.maxSteerSinceBlink, sd);
        if (p.maxSteerSinceBlink > 0.25 && Math.abs(p.steer) < 0.04) { p.lastBlinkDir = p.blink; p.lastBlinkOff = this.time; p.blink = null; }
      }
      if (p.blink) { p.lastBlinkDir = p.blink; p.lastBlinkOff = this.time; }
      // skulderblikk
      const want = p.lookL ? 1.75 : p.lookR ? -1.75 : 0;
      p.lookYaw += clamp(want - p.lookYaw, -dt * 9, dt * 9);
      if (p.lookL && p.lookYaw > 1.2) { p.shL = this.time; this.elShL.classList.add('on'); } else this.elShL.classList.remove('on');
      if (p.lookR && p.lookYaw < -1.2) { p.shR = this.time; this.elShR.classList.add('on'); } else this.elShR.classList.remove('on');
      // terreng
      if (!this.onRoad(p)) { p.offT += dt; if (p.offT > 0.25) this.fail(this.ctx.offroadTitle || 'Du kjørte av vegen', this.ctx.offroadText || 'Bilen kom utenfor kjørebanen. Sensor ville grepet inn, og prøven er ikke bestått.'); }
      else p.offT = 0;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = -p.h;
      if (p.wheel) p.wheel.rotation.z = -p.steer * 8;
    }
    onRoad(p) {
      const pts = rectCorners(p.x, p.z, p.h, p.len - 0.3, p.wid - 0.3);
      for (const q of pts) if (!this.pointOnRoad(q[0], q[1])) return false;
      return true;
    }
    pointOnRoad(x, z) {
      for (const hl of this.holes) if (Math.hypot(x - hl.cx, z - hl.cz) < hl.r) return false;
      for (const sh of this.roadShapes) {
        if (sh.fn) { if (sh.fn(x, z)) return true; continue; }
        if (sh.disc) { const d = Math.hypot(x - sh.cx, z - sh.cz); if (d >= sh.r0 && d <= sh.r1) return true; continue; }
        let pr;
        if (sh.hint >= 0) { pr = sh.path.projectNear(x, z, sh.hint, 25); if (pr.d > 30) pr = sh.path.project(x, z); }
        else pr = sh.path.project(x, z);
        sh.hint = pr.s;
        if (pr.s < sh.s0 - 0.5 || pr.s > sh.s1 + 0.5) continue;
        if (pr.lat >= sh.a(pr.s) - 0.05 && pr.lat <= sh.b(pr.s) + 0.05) {
          // ender: kontroller at punktet ikke er forbi enden av banen
          if ((pr.s <= 0.01 || pr.s >= sh.path.length - 0.01)) continue;
          return true;
        }
      }
      return false;
    }
    actors() { return this.vehicles.concat([this.player]); }
    placeAI(a, latv) {
      const f = a.path.frame(a.s);
      a.x = f.x + f.nx * a.off; a.z = f.z + f.nz * a.off;
      a.h = f.h + Math.atan2(latv || 0, Math.max(a.v, 2));
      const p = this.player;
      const vis = !p || Math.abs(a.x - p.x) + Math.abs(a.z - p.z) < 700;
      a.mesh.visible = vis;
      if (!vis) return;
      a.mesh.position.set(a.x, 0, a.z);
      a.mesh.rotation.y = -a.h;
    }
    findLeader(a) {
      let best = Infinity, bv = 0, who = null;
      const look = 25 + a.v * 4.5;
      const fx = Math.cos(a.h), fz = Math.sin(a.h);
      const all = this.vehicles;
      const check = (o) => {
        if (o === a || o.dead) return;
        const dx = o.x - a.x, dz = o.z - a.z;
        if (dx * dx + dz * dz > look * look) return;
        if (dx * fx + dz * fz < -3) return;
        if (o.path !== a.path) { const lt = Math.abs(-dx * fz + dz * fx), d2 = dx * dx + dz * dz; if (lt > 8 + d2 / (2 * this.minCurveR)) return; }
        let ds, lat;
        if (o.path === a.path) { ds = o.s - a.s; lat = o.off; }
        else { const pr = a.path.project(o.x, o.z, a.s - 4, a.s + look + 6); if (pr.d > 7) return; ds = pr.s - a.s; lat = pr.lat; }
        if (ds <= 0) return;
        const pf = o.path === a.path ? null : a.path.frame(a.s + ds);
        const skew = pf ? Math.abs(Math.sin(SIM.wrapAng(o.h - pf.h))) * o.len / 2 : 0;
        const lw = (a.wid + o.wid) / 2 + 0.25 + skew;
        const changing = Math.abs(a.targetOff - a.off) > 0.3;
        const inLane = Math.abs(lat - a.off) < lw || (changing && Math.abs(lat - a.targetOff) < lw);
        if (!inLane) return;
        const gap = ds - (a.len + o.len) / 2;
        if (gap < best) { best = gap; const rel = Math.cos(SIM.wrapAng(o.h - a.h)); bv = Math.max(0, o.v * rel); who = o; }
      };
      for (let i = 0; i < all.length; i++) check(all[i]);
      check(this.player);
      // høflighet: slipp inn en bestemt bil
      if (a.yieldTo && !a.yieldTo.dead) {
        const o = a.yieldTo;
        const pr = a.path.project(o.x, o.z, a.s - 20, a.s + 60);
        const ds = pr.s - a.s;
        if (ds > -5 && pr.d < 9) {
          const gap = ds - (a.len + o.len) / 2 - 4.5;
          if (gap < best) { best = Math.max(gap, 0.5); bv = o.v; who = o === this.player ? this.player : o; a.yielding = true; }
        }
      }
      for (const m of this.moose) {
        const pr = a.path.project(m.x, m.z, a.s, a.s + look);
        if (pr.d < 6 && Math.abs(pr.lat - a.off) < 2 && pr.s > a.s) { const gap = pr.s - a.s - a.len / 2 - 1.5; if (gap < best) { best = gap; bv = 0; who = null; } }
      }
      return { gap: best, v: bv, who };
    }
    updateAIAll(dt) {
      for (const a of this.vehicles) if (!a.dead) this.updateAI(a, dt);
      if (this.vehicles.some((a) => a.dead)) {
        this.vehicles = this.vehicles.filter((a) => { if (a.dead) { this.scene.remove(a.mesh); return false; } return true; });
      }
      // blinkfase
      const ph = Math.floor(this.time * 3) % 2 === 0;
      if (ph !== this._ph) {
        this._ph = ph;
        if (this.player.blink) this.sound.click(ph);
      }
      const setB = (m, side, on) => { if (!m) return; m.bl.emissiveIntensity = side === 'L' && on ? 1.6 : 0; m.br.emissiveIntensity = side === 'R' && on ? 1.6 : 0; };
      for (const a of this.vehicles) {
        setB(a.mats, a.blink, ph);
        a.mats.tail.emissiveIntensity = a.acc < -0.6 || a.v < 0.3 ? 1.4 : this.night ? 0.6 : 0.2;
        if (a.mats.beacon) a.mats.beacon.emissiveIntensity = Math.floor(this.time * 2.5) % 2 ? 1.5 : 0.2;
      }
      const p = this.player;
      setB(p.mats, p.blink, ph);
      p.mats.tail.emissiveIntensity = p.brk > 0.1 ? 1.4 : this.night ? 0.6 : 0.2;
      p.mats.head.emissiveIntensity = this.night ? 1.2 : 0.35;
      this.elBL.classList.toggle('on', p.blink === 'L' && ph);
      this.elBR.classList.toggle('on', p.blink === 'R' && ph);
    }
    updateAI(a, dt) {
      a.stopS = null; a.yielding = false;
      if (a.think) a.think(a, this, dt);
      // gangfelt
      for (const c of this.crossings) {
        let so = c.sOn[a.path.id];
        if (!so) { const pr = a.path.project(c.x, c.z); so = c.sOn[a.path.id] = { s: pr.s, d: pr.d }; }
        if (so.d > c.half + 4) continue;
        const ds = so.s - a.s;
        if (ds > 0 && ds < 50 && this.crossingBusy(c)) { const st = so.s - c.depth / 2 - 2; a.stopS = a.stopS == null ? st : Math.min(a.stopS, st); }
      }
      if (a.pendingOff != null) { a.blinkT += dt; if (a.blinkT > a.preBlink) { a.targetOff = a.pendingOff; a.pendingOff = null; } }
      const L = this.findLeader(a);
      let gap = L.gap, lv = L.v;
      if (a.stopS != null) { const g2 = a.stopS - a.s - a.len / 2; if (g2 < gap) { gap = g2; lv = 0; L.who = null; } }
      const v = a.v, v0 = Math.max(0.1, a.v0 * (a.speedF || 1));
      let acc = v <= v0 ? a.amax * (1 - Math.pow(v / v0, 4)) : -Math.min(2.2, 0.8 + (v - v0) * 0.6);
      if (gap < 250) {
        const ss = a.s0 + Math.max(0, v * a.T + (v * (v - lv)) / (2 * Math.sqrt(a.amax * a.b)));
        acc -= a.amax * Math.pow(ss / Math.max(gap, 0.2), 2);
      }
      acc = clamp(acc, -9, a.amax);
      a.acc = acc;
      a.v = Math.max(0, v + acc * dt);
      if (gap < 0.2 && a.v > 0) a.v = Math.max(0, a.v - 9 * dt);
      if (L.who === this.player && acc < -3.6 && this.player.v > 1) this.onForcedBrake(a, acc);
      a.s += a.v * dt;
      const d = a.targetOff - a.off, mx = a.latSpeed * dt * clamp(a.v / 6, 0.3, 1);
      const st = clamp(d, -mx, mx);
      a.off += st;
      if (a.blinkAuto !== false && a.pendingOff == null && Math.abs(a.targetOff - a.off) < 0.12 && a.blinkLane) { a.blink = null; a.blinkLane = false; }
      if (a.s >= a.path.length - 0.5) {
        if (a.next) { const n = a.next; a.next = null; a.path = n.path; a.s = n.s || 0; a.off = n.off || 0; a.targetOff = n.off || 0; }
        else { a.dead = true; return; }
      }
      this.placeAI(a, st / Math.max(dt, 1e-3));
    }
    changeLane(a, newOff) {
      if (a.pendingOff != null || Math.abs(a.targetOff - newOff) < 0.1) return;
      a.pendingOff = newOff; a.blinkT = 0;
      a.blink = newOff < a.off ? 'L' : 'R'; a.blinkLane = true;
    }
    transfer(a, path, targetOff, s0, s1) {
      const pr = path.project(a.x, a.z, s0, s1);
      a.path = path; a.s = pr.s; a.off = pr.lat; a.targetOff = targetOff != null ? targetOff : 0;
    }
    // ledig plass i et felt (offset) rundt s på bane
    laneGap(path, s, off, back, front, ignore) {
      let gb = Infinity, gf = Infinity, vb = 0, vf = 0, ob = null, of = null;
      for (const o of this.actors()) {
        if (o === ignore || o.dead) continue;
        let os, ol;
        if (o.path === path) { os = o.s; ol = o.off; } else { const pr = path.project(o.x, o.z, s - back - 10, s + front + 10); if (pr.d > 8) continue; os = pr.s; ol = pr.lat; }
        if (Math.abs(ol - off) > 1.9) continue;
        const ds = os - s;
        if (ds >= 0 && ds < front && ds < gf) { gf = ds; vf = o.v; of = o; }
        if (ds < 0 && -ds < back && -ds < gb) { gb = -ds; vb = o.v; ob = o; }
      }
      return { back: gb, front: gf, vb, vf, ob, of };
    }
    updatePeds(dt) {
      for (const p of this.peds) {
        if (p.state === 'wait' && p.trigger && p.trigger(this, p)) { p.state = 'intent'; p.t = 0; }
        if (p.state === 'intent') { p.t += dt; if (p.t >= p.delay) p.state = 'walk'; }
        if (p.state === 'walk') {
          const dx = p.to[0] - p.x, dz = p.to[1] - p.z, d = Math.hypot(dx, dz);
          if (d < 0.1) { p.state = 'done'; if (p.onDone) p.onDone(this, p); }
          else { const st = Math.min(d, p.speed * dt); p.x += (dx / d) * st; p.z += (dz / d) * st; p.h = Math.atan2(dz, dx); }
          p.phase += dt * p.speed * 5.2;
        }
        const m = p.mesh;
        m.position.set(p.x, 0, p.z);
        m.rotation.y = -p.h;
        const sw = p.state === 'walk' ? Math.sin(p.phase) * 0.45 : 0;
        m.userData.legL.rotation.z = sw; m.userData.legR.rotation.z = -sw;
      }
    }
    checkCollisions() {
      const p = this.player;
      for (const a of this.vehicles) {
        const dx = a.x - p.x, dz = a.z - p.z;
        if (dx * dx + dz * dz > 400) continue;
        if (rectsOverlap(p, a)) {
          this.sound.crash();
          const behind = (dx * Math.cos(p.h) + dz * Math.sin(p.h)) < -2;
          if (behind && Math.abs(SIM.wrapAng(a.h - p.h)) < 0.6) this.fail('Kollisjon: bilen bak kjørte inn i deg', 'Bilen bak rakk ikke å stoppe. Typiske årsaker er at du skiftet felt rett foran den eller bremset brått uten grunn. Hold jevn fart og planlegg.');
          else this.fail('Kollisjon', 'Du kolliderte med et annet kjøretøy. Sensor ville ha grepet inn. Prøven er ikke bestått.');
          return;
        }
      }
      for (const q of this.peds) {
        if (q.state === 'done' && !q.keepSolid) continue;
        const c = rectCorners(p.x, p.z, p.h, p.len, p.wid);
        // punkt i rektangel
        const lx = (q.x - p.x) * Math.cos(p.h) + (q.z - p.z) * Math.sin(p.h);
        const lz = -(q.x - p.x) * Math.sin(p.h) + (q.z - p.z) * Math.cos(p.h);
        if (Math.abs(lx) < p.len / 2 + 0.25 && Math.abs(lz) < p.wid / 2 + 0.25) { this.sound.crash(); this.fail('Du kjørte på en fotgjenger', 'Dette er det mest alvorlige som kan skje. Senk farten mot gangfelt og der sikten er skjult.'); return; }
        void c;
      }
      for (const m of this.moose) {
        const lx = (m.x - p.x) * Math.cos(p.h) + (m.z - p.z) * Math.sin(p.h);
        const lz = -(m.x - p.x) * Math.sin(p.h) + (m.z - p.z) * Math.cos(p.h);
        if (Math.abs(lx) < p.len / 2 + 1.1 && Math.abs(lz) < p.wid / 2 + 0.5) { this.sound.crash(); this.fail('Kollisjon med elg', 'Brems kraftig og hold retningen. Fart tilpasset sikten med fjernlys gir deg tid til å stoppe.'); return; }
      }
    }
    monitors(dt) {
      const p = this.player, kmh = p.v * KMH;
      // fart
      const lim = this.ctx.limitAt ? this.ctx.limitAt() : this.ctx.limit || 80;
      this.limit = lim;
      if (kmh > lim + 5) {
        this._over = (this._over || 0) + dt;
        if (this._over > 3) this.prot.once('fart1', 'Fart', 'minor', `Over fartsgrensen (${lim} km/t)`, 'Du kjørte mer enn 5 km/t over fartsgrensen over tid. Fartsgrensen er en øvre grense.');
        if (this._over > 0.6) this.coach('fart', `Fartsgrensen er ${lim} km/t`, 6);
      } else this._over = 0;
      if (kmh > lim + 15) { this._over2 = (this._over2 || 0) + dt; if (this._over2 > 1.5) this.prot.once('fart2', 'Fart', 'major', `Klart over fartsgrensen (${lim} km/t)`, 'Mer enn 15 km/t over fartsgrensen gir ikke bestått på oppkjøring.'); } else this._over2 = 0;
      // feltskifte
      if (this.ctx.laneOf) {
        const ln = this.ctx.laneOf();
        if (ln != null && p.lane != null && ln !== p.lane) {
          const dir = ln < p.lane ? 'L' : 'R';
          const handled = this.ctx.onLane ? this.ctx.onLane(p.lane, ln, dir) : false;
          if (!handled) this.checkManeuver(dir, 'feltskifte');
        }
        if (ln != null) p.lane = ln;
      }
      // glemt blinklys
      if (p.blink && this.time - p.blinkOnAt > 14 && !this.ctx.allowLongBlink) {
        this.prot.once('blink-glemt', 'Kommunikasjon', 'minor', 'Glemte å slå av blinklyset', 'Et blinklys som står på uten grunn, gir andre feil informasjon.');
        this.coach('blinkoff', 'Husk å slå av blinklyset (Q/E)', 10);
      }
      this.crossingMonitor(kmh);
      // nattlys
      if (this.night) this.nightMonitor(dt);
    }
    crossingMonitor(kmh) {
      const p = this.player;
      for (const c of this.crossings) {
        const al = this.alongOf(c, p.x, p.z), ac = this.acrossOf(c, p.x, p.z);
        if (Math.abs(ac) > c.half + 2 || Math.abs(al) > 45) { c.pIn = false; continue; }
        const active = c.peds.filter((q) => q.state === 'intent' || (q.state === 'walk' && Math.abs(this.acrossOf(c, q.x, q.z)) < c.half + 0.8));
        // fart inn mot gangfelt med gående
        const appr = c._lastAl != null && Math.abs(al) < Math.abs(c._lastAl);
        c._lastAl = al;
        if (appr && Math.abs(al) > 10 && Math.abs(al) < 28 && active.length && kmh > 30) this.prot.once('gf-fart', 'Fart', 'minor', 'For høy fart mot gangfelt med gående', 'Senk farten tidlig når gående er på vei ut i gangfeltet. Vis tydelig at du skal stoppe.');
        if (appr && Math.abs(al) < 25 && active.length) this.coach('gf', 'Gående i gangfeltet. Stopp i god avstand.', 6);
        if (!c.pIn && Math.abs(al) < c.depth / 2 + 1.2) {
          c.pIn = true;
          if (active.length) {
            const near = active.some((q) => Math.abs(this.acrossOf(c, q.x, q.z) - ac) < 3.2);
            if (near) this.prot.once('gf-crit', 'Vikeplikt', 'critical', 'Farlig nær en fotgjenger i gangfeltet', 'Du kjørte gjennom gangfeltet rett ved en gående. Du har vikeplikt for gående som er ute i eller på vei ut i gangfeltet.');
            else this.prot.once('gf-vik', 'Vikeplikt', 'major', 'Brudd på vikeplikt for gående', 'Gående var ute i eller på vei ut i gangfeltet da du kjørte over. Vent til de har gått over, eller til de tydelig har kommet forbi ditt felt.');
            this.toast('Vikeplikt for gående i gangfelt!', 'bad');
          } else if (c.peds.some((q) => q.state === 'done' || q.state === 'walk')) this.prot.once('gf-ok-' + this.crossings.indexOf(c), 'Vikeplikt', 'good', 'Slapp gående over gangfeltet');
        }
      }
    }
    nightMonitor(dt) {
      const p = this.player;
      let oncoming = Infinity, ahead = Infinity;
      for (const a of this.vehicles) {
        const dx = a.x - p.x, dz = a.z - p.z, d = Math.hypot(dx, dz);
        const fwd = dx * Math.cos(p.h) + dz * Math.sin(p.h);
        if (fwd < 0) continue;
        const rel = Math.cos(SIM.wrapAng(a.h - p.h));
        if (rel < -0.5) oncoming = Math.min(oncoming, d); else ahead = Math.min(ahead, d);
      }
      this.oncomingDist = oncoming;
      const free = oncoming > 450 && ahead > 160;
      if (free) { this._freeT = (this._freeT || 0) + dt; if (p.high) this._highFreeT = (this._highFreeT || 0) + dt; else if (p.v > 8) this.coach('fjern', 'Vegen er fri. Bruk fjernlys (F).', 12); }
      if (p.high && (oncoming < 330 || ahead < 120)) {
        this._blindT = (this._blindT || 0) + dt;
        if (this._blindT > 1.2) {
          this._blindN = (this._blindN || 0) + 1; this._blindT = -999;
          this.prot.once('blend', 'Kommunikasjon', 'minor', 'Blendet andre med fjernlys', 'Blend av i god tid før du møter andre og når du kjører bak noen.');
          if (this._blindN === 3) this.prot.once('blend3', 'Kommunikasjon', 'major', 'Blendet andre gjentatte ganger', 'Du blendet andre trafikanter flere ganger. Det er farlig, fordi de mister sikten.');
          this.toast('Du blender en annen bil. Blend av (F).', 'bad');
        }
      } else if (!p.high) this._blindT = 0; else if (this._blindT < 0 && oncoming > 400 && ahead > 160) this._blindT = 0;
    }

    // ---------------- render ----------------
    camPose(mode) {
      const p = this.player;
      const fx = Math.cos(p.h), fz = Math.sin(p.h), rx = -fz, rz = fx;
      if (mode === 0) {
        const pos = new THREE.Vector3(p.x + fx * -0.12 + rx * -0.38, 1.17, p.z + fz * -0.12 + rz * -0.38);
        const y = p.lookYaw;
        const dx = fx * Math.cos(y) - rx * Math.sin(y), dz = fz * Math.cos(y) - rz * Math.sin(y);
        return { pos, look: new THREE.Vector3(pos.x + dx * 10, 1.0, pos.z + dz * 10), up: new THREE.Vector3(0, 1, 0) };
      }
      if (mode === 1) {
        const pos = new THREE.Vector3(p.x - fx * 9, 3.4, p.z - fz * 9);
        return { pos, look: new THREE.Vector3(p.x + fx * 10, 1.0, p.z + fz * 10), up: new THREE.Vector3(0, 1, 0), smooth: true };
      }
      const pos = new THREE.Vector3(p.x + fx * 14, 70, p.z + fz * 14);
      return { pos, look: new THREE.Vector3(p.x + fx * 14, 0, p.z + fz * 14), up: new THREE.Vector3(fx, 0, fz) };
    }
    render() {
      const p = this.player;
      const pose = this.camPose(this.camMode);
      if (pose.smooth && this._camPos) { this._camPos.lerp(pose.pos, 0.12); } else this._camPos = pose.pos.clone();
      this.camera.position.copy(this._camPos);
      this.camera.up.copy(pose.up);
      this.camera.lookAt(pose.look);
      // speil-kameraer
      const fx = Math.cos(p.h), fz = Math.sin(p.h), rx = -fz, rz = fx;
      this.mirrors.forEach((m) => {
        let pos, dir;
        if (m.key === 'rear') { pos = [p.x + fx * 0.25, 1.32, p.z + fz * 0.25]; dir = [-fx, -fz]; }
        else {
          const s = m.key === 'left' ? -1 : 1;
          pos = [p.x + fx * 0.85 + rx * s * 1.04, 1.0, p.z + fz * 0.85 + rz * s * 1.04];
          const y = m.yaw * s; // drei utover
          dir = [-fx * Math.cos(y) + rx * Math.sin(y), -fz * Math.cos(y) + rz * Math.sin(y)];
        }
        m.cam.position.set(pos[0], pos[1], pos[2]);
        m.cam.lookAt(pos[0] + dir[0] * 10, pos[1] - 0.1, pos[2] + dir[1] * 10);
      });
      // nattlys
      if (this.night) {
        this.headL.forEach(({ sp, s }) => {
          sp.position.set(p.x + fx * 2.2 + rx * s * 0.6, 0.65, p.z + fz * 2.2 + rz * s * 0.6);
          const far = p.high ? 60 : 24;
          sp.target.position.set(p.x + fx * far + rx * s * 1.2 + rx * (p.high ? 0 : 1.5), p.high ? 0.6 : 0, p.z + fz * far + rz * s * 1.2 + rz * (p.high ? 0 : 1.5));
          sp.distance = p.high ? 190 : 70; sp.angle = p.high ? 0.42 : 0.55; sp.intensity = p.high ? 3.0 : 2.2;
        });
        this.elHigh.classList.toggle('on', p.high);
        const cam = this.camera.position;
        for (const a of this.vehicles) {
          if (!a.glare) continue;
          const dx = cam.x - a.x, dz = cam.z - a.z, d = Math.hypot(dx, dz) || 1;
          const facing = (dx * Math.cos(a.h) + dz * Math.sin(a.h)) / d;
          // møtende bruker fjernlys til de er nærme
          const high = d > 380;
          if (!high && p.high && d < 300 && !a.flashed && facing > 0.8) { a.flashed = this.time; }
          const flash = a.flashed && this.time - a.flashed < 0.9 && Math.floor((this.time - a.flashed) * 6) % 2 === 0;
          const k = Math.max(0, facing) ** 6;
          const sc = (high || flash ? 4.5 : 2.2) * (0.6 + Math.min(d, 400) / 160);
          a.glare.forEach((g) => { g.material.opacity = k * (high || flash ? 1 : 0.75); g.scale.set(sc, sc, 1); });
        }
      }
      const R = this.renderer;
      // speil
      const setBody = (on) => { p.body.forEach((m) => (m.visible = on)); };
      p.cab.visible = false;
      this.mirrors.forEach((m) => { setBody(m.key !== 'rear'); R.setRenderTarget(m.rt); R.clear(); R.render(this.scene, m.cam); });
      R.setRenderTarget(null);
      R.clear();
      const cockpit = this.camMode === 0;
      setBody(!cockpit); p.cab.visible = cockpit;
      R.render(this.scene, this.camera);
      R.clearDepth();
      R.render(this.hudScene, this.hudCam);
      // HUD
      const kmh = Math.round(p.v * KMH);
      if (this.elSpeed.textContent !== String(kmh)) this.elSpeed.textContent = kmh;
      const lim = this.limit || (this.ctx.limitAt ? this.ctx.limitAt() : this.ctx.limit);
      if (lim && lim !== this._limShown) { this._limShown = lim; const id = 'fart-' + lim; this.elLimit.innerHTML = KA.signs.byId[id] ? KA.signs.svg(id) : ''; }
      this.elDash.classList.toggle('over', lim && kmh > lim + 4);
      this.drawMap();
    }
    drawMap() {
      const c = this.mapCanvas, g = c.getContext('2d');
      const W = c.width, H = c.height, p = this.player;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, W, H);
      g.fillStyle = 'rgba(20,28,22,.72)'; g.beginPath(); g.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); g.fill();
      g.save();
      g.beginPath(); g.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); g.clip();
      const sc = 1.7;
      g.translate(W / 2, H * 0.62); g.rotate(-p.h - Math.PI / 2); g.scale(sc, sc); g.translate(-p.x, -p.z);
      const R = 110;
      g.fillStyle = '#6b7178';
      for (const r of this.mapRoads) {
        if (r.disc) { g.beginPath(); g.arc(r.cx, r.cz, r.r1, 0, Math.PI * 2); g.arc(r.cx, r.cz, r.r0, 0, Math.PI * 2, true); g.fill(); continue; }
        const P = r.path, fa = typeof r.a === 'function' ? r.a : () => r.a, fb = typeof r.b === 'function' ? r.b : () => r.b;
        const pr = P.projectNear(p.x, p.z, r._h || 0, 140);
        let pr2 = pr; if (pr.d > 130) pr2 = P.project(p.x, p.z);
        r._h = pr2.s;
        if (pr2.d > R + 20) continue;
        const s0 = Math.max(r.s0, pr2.s - R * 1.3), s1 = Math.min(r.s1, pr2.s + R * 1.3);
        if (s1 <= s0) continue;
        g.beginPath();
        const st = 3; const left = [], right = [];
        for (let s = s0; s <= s1; s += st) { const f = P.frame(s); left.push([f.x + f.nx * fa(s), f.z + f.nz * fa(s)]); right.push([f.x + f.nx * fb(s), f.z + f.nz * fb(s)]); }
        left.forEach((q, i) => (i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])));
        for (let i = right.length - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
        g.closePath(); g.fill();
      }
      if (this.ctx.drawMap) this.ctx.drawMap(g);
      const drawCar = (o, col) => {
        g.save(); g.translate(o.x, o.z); g.rotate(o.h); g.fillStyle = col; g.fillRect(-o.len / 2, -o.wid / 2, o.len, o.wid); g.restore();
      };
      for (const a of this.vehicles) if (Math.abs(a.x - p.x) < R && Math.abs(a.z - p.z) < R) drawCar(a, a.blink && this._ph ? '#ffb000' : '#e8edf2');
      for (const q of this.peds) if (q.state !== 'done') { g.fillStyle = '#ffd23f'; g.beginPath(); g.arc(q.x, q.z, 0.8, 0, 7); g.fill(); }
      for (const m of this.moose) { g.fillStyle = '#c8873c'; g.beginPath(); g.arc(m.x, m.z, 1.4, 0, 7); g.fill(); }
      drawCar(p, '#ff3b3b');
      g.restore();
    }

    // ---------------- flyt ----------------
    showIntro() {
      const s = this.scen;
      const o = this.overlay;
      const night = this.night ? '<li><kbd>F</kbd> fjernlys av/på</li>' : '';
      o.innerHTML = `<div class="so-card">
        <div class="so-eyebrow">${s.group || 'Kjøreøvelse'} · ${s.level || ''}</div>
        <h2>${s.title}</h2>
        <p>${s.desc}</p>
        <div class="so-task"><b>Oppgaven</b><p>${s.task}</p></div>
        <details class="so-keys" ${'ontouchstart' in window ? '' : 'open'}><summary>Kontroller</summary>
        <ul class="so-keylist">
          <li><kbd>↑</kbd>/<kbd>W</kbd> gass · <kbd>↓</kbd>/<kbd>S</kbd> brems</li>
          <li><kbd>←</kbd><kbd>→</kbd> / <kbd>A</kbd><kbd>D</kbd> styring</li>
          <li><kbd>Q</kbd> / <kbd>E</kbd> blinklys venstre / høyre</li>
          <li><kbd>R</kbd> speilsjekk</li>
          <li>Hold <kbd>Z</kbd> / <kbd>C</kbd> skulderblikk venstre / høyre</li>
          ${night}
          <li><kbd>V</kbd> kamera · <kbd>P</kbd> pause · <kbd>H</kbd> horn</li>
        </ul>
        <p class="so-small">Mobil: bruk knappene på skjermen. Gamepad støttes også.</p></details>
        <div class="so-opts">
          <label><input type="checkbox" id="opt-coach" ${this.opts.coach ? 'checked' : ''}> Tips underveis (øvemodus)</label>
          <label><input type="checkbox" id="opt-voice" ${this.opts.voice ? 'checked' : ''}> Sensor leser instrukser høyt</label>
        </div>
        <div class="so-actions"><button type="button" class="btn btn-primary" data-a="start">Start kjøringen</button><button type="button" class="btn" data-a="exit">Tilbake</button></div>
      </div>`;
      o.classList.add('show');
      o.querySelector('[data-a="start"]').onclick = () => {
        this.opts.coach = o.querySelector('#opt-coach').checked;
        this.opts.voice = o.querySelector('#opt-voice').checked;
        this.sound.init();
        o.classList.remove('show');
        this.running = true;
        if (this.ctx.start) this.ctx.start();
        this._raf2 = setInterval(() => { if (this.running && !this.paused && !this.done) this.sound.engine(this.player.v, this.player.thr); }, 60);
      };
      o.querySelector('[data-a="exit"]').onclick = () => this.exit();
    }
    togglePause() {
      if (this.done || !this.running) return;
      this.paused = !this.paused;
      const o = this.overlay;
      if (this.paused) {
        o.innerHTML = `<div class="so-card so-pause"><h2>Pause</h2><div class="so-actions"><button type="button" class="btn btn-primary" data-a="go">Fortsett</button><button type="button" class="btn" data-a="restart">Start på nytt</button><button type="button" class="btn" data-a="exit">Avslutt</button></div></div>`;
        o.classList.add('show');
        o.querySelector('[data-a="go"]').onclick = () => this.togglePause();
        o.querySelector('[data-a="restart"]').onclick = () => this.restart();
        o.querySelector('[data-a="exit"]').onclick = () => this.exit();
        this.sound.engine(0, 0);
      } else o.classList.remove('show');
    }
    finish() {
      if (this.done) return;
      if (this.ctx.onEnd) this.ctx.onEnd();
      this.done = true;
      this.sound.engine(0, 0); this.sound.horn(false);
      const pr = this.prot;
      const crit = pr.has('critical'), major = pr.has('major');
      const score = pr.score();
      const passed = !crit && !major && score >= 70;
      const result = { id: this.scen.id, score, passed, items: pr.items.slice(), time: this.time };
      if (this.opts.onResult) this.opts.onResult(result);
      const sevName = { good: 'Bra', minor: 'Anmerkning', major: 'Alvorlig', critical: 'Farlig' };
      const order = { critical: 0, major: 1, minor: 2, good: 3 };
      const items = pr.items.slice().sort((a, b) => order[a.sev] - order[b.sev]);
      const verdict = crit ? 'Ikke bestått: farlig situasjon' : major ? 'Ikke bestått' : passed ? 'Bestått' : 'Ikke bestått: for mange anmerkninger';
      const o = this.overlay;
      o.innerHTML = `<div class="so-card so-result">
        <div class="so-eyebrow">Kjøreprotokoll · ${this.scen.title}</div>
        <div class="so-verdict ${passed ? 'pass' : 'fail'}"><span class="so-score">${score}</span><div><b>${verdict}</b><small>${pr.count('good')} bra · ${pr.count('minor')} anmerkninger · ${pr.count('major') + pr.count('critical')} alvorlige</small></div></div>
        <ul class="so-items">${items.map((i) => `<li class="sev-${i.sev}"><span class="sev">${sevName[i.sev]}</span><div><b>${i.title}${i.n > 1 ? ` (×${i.n})` : ''}</b><span class="cat">${i.cat}</span>${i.text ? `<p>${i.text}</p>` : ''}</div></li>`).join('') || '<li class="sev-good"><span class="sev">OK</span><div><b>Ingen merknader</b></div></li>'}</ul>
        <div class="so-tips"><b>Dette ser sensor etter her</b><ul>${(this.scen.tips || []).map((t) => `<li>${t}</li>`).join('')}</ul></div>
        <div class="so-actions"><button type="button" class="btn btn-primary" data-a="restart">Kjør igjen</button>${this.opts.nextLabel ? `<button type="button" class="btn" data-a="next">${this.opts.nextLabel}</button>` : ''}<button type="button" class="btn" data-a="exit">${this.opts.nextLabel ? 'Avbryt' : 'Tilbake til øvelser'}</button></div>
      </div>`;
      setTimeout(() => o.classList.add('show'), this.prot.has('critical') ? 900 : 300);
      o.querySelector('[data-a="restart"]').onclick = () => this.restart();
      o.querySelector('[data-a="exit"]').onclick = () => this.exit();
      const nx = o.querySelector('[data-a="next"]'); if (nx) nx.onclick = () => { const f = this.opts.onNext; this.destroy(); if (f) f(result); };
    }
    restart() { const host = this.host, scen = this.scen, opts = this.opts; this.destroy(); KA.sim.engine = new Engine(host, scen, opts); }
    exit() { const f = this.opts.onExit; this.destroy(); if (f) f(); }
    destroy() {
      this.destroyed = true;
      cancelAnimationFrame(this._raf); clearInterval(this._raf2);
      window.removeEventListener('keydown', this._kd); window.removeEventListener('keyup', this._ku); window.removeEventListener('resize', this._onResize);
      try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* */ }
      this.sound.stopAll();
      this.scene.traverse((o) => { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); });
      this.mirrors.forEach((m) => m.rt.dispose());
      this.renderer.dispose();
      if (this.renderer.forceContextLoss) this.renderer.forceContextLoss();
      this.host.innerHTML = '';
    }
  }
  SIM.Engine = Engine;
  SIM.KMH = KMH;
})();
