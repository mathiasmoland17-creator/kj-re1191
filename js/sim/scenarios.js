/* Kjørescenarioer. Hvert scenario bygger veg, trafikk og sensorens vurdering. */
(function () {
  'use strict';
  const KA = (window.KA = window.KA || {});
  KA.scenarios = []; KA.scenarioById = {};
  if (!window.THREE || !KA.sim) return;
  const SIM = KA.sim;
  const { Path, clamp, lerp, rand } = SIM;
  const KMH = 3.6;

  // ---------------------------------------------------------------
  // felles hjelpere
  // ---------------------------------------------------------------
  function forestAlong(E, path, minOff, maxOff, step = 9, opts = {}) {
    const pts = [], birch = [];
    for (let s = opts.s0 || 0; s < (opts.s1 || path.length); s += step * rand(0.5, 1.5)) {
      for (const side of opts.sides || [-1, 1]) {
        if (Math.random() < (opts.gaps || 0.15)) continue;
        const off = side * rand(minOff, maxOff);
        const f = path.frame(s);
        const x = f.x + f.nx * off, z = f.z + f.nz * off;
        if (opts.avoid && opts.avoid(x, z)) continue;
        if (Math.random() < (opts.birch || 0.18)) birch.push([x, z, rand(0.8, 1.2)]);
        else pts.push([x, z, rand(0.75, 1.35)]);
      }
    }
    SIM.addForest(E.scene, pts, E.night);
    SIM.addBirches(E.scene, birch, E.night);
  }
  // feltindeks med hysterese. edges: grenser (lat) mellom felt, fra venstre mot høyre
  function laneHyst(lat, cur, edges, h = 0.3) {
    let raw = 0; while (raw < edges.length && lat > edges[raw]) raw++;
    if (cur == null || cur === raw) return raw;
    if (raw > cur) return lat > edges[cur] + h ? raw : cur;
    return lat < edges[cur - 1] - h ? raw : cur;
  }
  const rail = (E, path, s0, s1, off) => { E.gb.wall('rail', path, s0, s1, off, 0.45, 0.82, 2); E.gb.wall('rail', path, s0, s1, typeof off === 'function' ? (q) => off(q) + 0.08 : off + 0.08, 0.45, 0.82, 2); };
  function railPosts(E, path, s0, s1, off) {
    const list = [];
    for (let s = s0; s < s1; s += 4) { const o = typeof off === 'function' ? off(s) : off; const [x, z] = path.at(s, o); list.push([x, 0.35, z]); }
    SIM.instanced(E.scene, new THREE.BoxGeometry(0.12, 0.7, 0.12), SIM.lam(0x8f949a), list);
  }
  function hatch(E, path, s0, s1, offA, offB, every = 5) {
    // sperreområde: skrå striper mellom offA og offB
    for (let s = s0; s < s1; s += every) {
      const a = offA(s), b = offB(s);
      if (b - a < 0.4) continue;
      const k = 'white';
      const L = (b - a) * 0.9;
      const p0 = path.at(s, a + 0.1), p1 = path.at(s + 0.7, a + 0.1), p2 = path.at(s + 0.7 + L, b - 0.1), p3 = path.at(s + L, b - 0.1);
      E.gb.quad(k, p0, p1, p2, p3, 0.05);
    }
  }
  function haitenner(E, path, s, a, b, pointBack = true) {
    for (let q = a + 0.25; q < b - 0.3; q += 0.75) {
      const base0 = path.at(s, q), base1 = path.at(s, q + 0.5), tip = path.at(s + (pointBack ? -0.7 : 0.7), q + 0.25);
      E.gb.tri('white', [base0[0], 0.05, base0[1]], [base1[0], 0.05, base1[1]], [tip[0], 0.05, tip[1]]);
    }
  }
  function arrowPaint(E, path, s, off, dir) {
    // flettepil: pil som peker skrått mot dir (-1 venstre)
    const P = (ds, dl) => path.at(s + ds, off + dl * dir);
    E.gb.quad('white', P(-3, -0.15), P(-3, 0.15), P(1, 0.15), P(1, -0.15), 0.05);
    E.gb.quad('white', P(1, -0.15), P(1, 0.15), P(2.4, -0.9), P(2.1, -1.1), 0.05);
    const a = P(2.9, -1.6), b = P(1.2, -1.3), c = P(2.6, -0.3);
    E.gb.tri('white', [a[0], 0.05, a[1]], [b[0], 0.05, b[1]], [c[0], 0.05, c[1]]);
  }
  function lampsAlong(E, path, s0, s1, off, every, inward) {
    const list = [];
    for (let s = s0; s < s1; s += every) { const f = path.frame(s); const [x, z] = path.at(s, off); list.push([x, z, Math.atan2(f.nz * inward, f.nx * inward)]); }
    SIM.addLamp(E.scene, list, E.night);
  }

  // ---------------------------------------------------------------
  // MOTORVEG (påkjøring og avkjøring)
  // ---------------------------------------------------------------
  function buildMotorway(E, cfg) {
    const X0 = -900, X1 = cfg.mode === 'on' ? 1150 : 1500;
    const M = new Path([[X0, 0], [X1, 0]], { name: 'M' });
    const O = new Path([[X1, -14], [X0, -14]], { name: 'O' });
    const sM = (x) => x - X0;
    const limit = cfg.limit;
    const ctx = { limit, M, O, sM };

    // hovedbane
    E.addRoad(M, -6.1, 3.3, 'asphalt');
    E.addRoad(O, -6.1, 3.3, 'asphalt');
    // linjer: kantlinjer og feltlinje
    for (const P of [M, O]) {
      E.gb.solid('white', P, 0, P.length, -5.25, 0.2);
      E.gb.dashes('white', P, 0, P.length, -1.75, 0.15, 3, 9);
    }
    E.gb.solid('white', O, 0, O.length, 1.75, 0.2);
    // midtdeler
    rail(E, M, 0, M.length, -6.4); rail(E, O, 0, O.length, -6.4);
    railPosts(E, M, 0, M.length, -6.45); railPosts(E, O, 0, O.length, -6.45);
    rail(E, O, 0, O.length, 4.1); railPosts(E, O, 0, O.length, 4.15);

    let rightRail = () => 4.1;
    let rightEdgeSolid = [[0, M.length]];

    if (cfg.mode === 'on') {
      const A0 = 0, A1 = 240, A2 = 310;
      const c = (x) => (x < A1 ? 3.5 : x < A2 ? 3.5 * (1 - (x - A1) / (A2 - A1)) : 0);
      const R = new Path(SIM.join(SIM.line(-600, 150, -430, 150), SIM.bez([-430, 150], [-270, 150], [-160, 3.5], [-20, 3.5], 60), [[A1, 3.5], [A2, 0.3], [A2 + 30, 0.0]]), { name: 'R' });
      const sR0 = R.project(-20, 3.5).s;
      ctx.R = R; ctx.A0 = A0; ctx.A1 = A1; ctx.A2 = A2; ctx.c = c; ctx.sR0 = sR0;
      // akselerasjonsfelt
      E.addRoad(M, 1.75, (s) => Math.max(3.3, c(s + X0) + 1.75 + 0.7), 'asphalt', { s0: sM(-24), s1: sM(A2 + 10) });
      E.gb.dashes('white', M, sM(-20), sM(A2 - 8), 1.75, 0.3, 2, 2);
      E.gb.solid('white', M, sM(-20), sM(A2), (s) => c(s + X0) + 1.75, 0.2);
      rightEdgeSolid = [[0, sM(-20)], [sM(A2 - 8), M.length]];
      // rampe
      E.addRoad(R, -2.4, 2.7, 'asphalt', { s1: sR0 + 4 });
      E.gb.solid('white', R, 0, sR0, -1.75, 0.2);
      E.gb.solid('white', R, 0, sR0, 1.75, 0.2);
      rail(E, R, 0, sR0, 3.0); railPosts(E, R, 0, sR0, 3.05);
      // sperreområde mellom rampe og hovedbane
      const edgePts = [];
      for (let s = 0; s <= sR0; s += 1) edgePts.push(R.at(s, -1.75));
      const rampEdgeZ = (x) => { let best = null, bd = 1e9; for (const p of edgePts) { const d = Math.abs(p[0] - x); if (d < bd) { bd = d; best = p; } } return best ? best[1] : 99; };
      ctx.rampEdgeZ = rampEdgeZ;
      for (let x = -170; x < -20; x += 2) {
        const z0 = rampEdgeZ(x), z1 = rampEdgeZ(x + 2);
        if (z0 - 1.75 > 9) continue;
        E.gb.quad('asphalt2', [x, 1.75], [x + 2, 1.75], [x + 2, Math.max(1.75, z1)], [x, Math.max(1.75, z0)], 0.021);
      }
      hatch(E, M, sM(-150), sM(-24), () => 1.85, (s) => Math.min(rampEdgeZ(s + X0) - 0.1, 9), 4);
      E.roadShapes.push({ fn: (x, z) => x > -172 && x < -18 && z > 1.6 && z < rampEdgeZ(x) + 0.2 && rampEdgeZ(x) - 1.75 < 9 });
      rightRail = (s) => { const x = s + X0; return x < -200 ? 4.1 : Math.max(4.1, c(x) + 2.9); };
      rail(E, M, 0, sM(-200), 4.1); railPosts(E, M, 0, sM(-200), 4.15);
      rail(E, M, sM(-20), M.length, rightRail); railPosts(E, M, sM(-20), M.length, rightRail);
      // skilt
      E.signAt('motorveg', R, 60, 3.6);
      E.signAt('fart-' + limit, M, sM(A2 + 60), 5.0);
      E.signAt('fart-' + limit, M, sM(-500), 5.0);
      E.addSign(SIM.textSignSvg(['E18', 'Oslo'], { fs: 18 }), -380, 145.5, 0, { size: 1.6, height: 1.6 });
    }
    if (cfg.mode === 'off') {
      const D0 = 650, D1 = 710, D2 = 860;
      const c = (x) => (x < D0 ? 0 : x < D1 ? 0.3 + 3.2 * ((x - D0) / (D1 - D0)) : 3.5);
      const X = new Path(SIM.join([[D0 - 10, 0.3], [D1, 3.5], [D2, 3.5]], SIM.bez([D2, 3.5], [D2 + 100, 3.5], [D2 + 175, 40], [D2 + 195, 130], 60), [[D2 + 205, 300]]), { name: 'X' });
      const sX2 = X.project(D2, 3.5).s;
      ctx.X = X; ctx.D0 = D0; ctx.D1 = D1; ctx.D2 = D2; ctx.c = c; ctx.sX2 = sX2;
      E.addRoad(M, 1.75, (s) => Math.max(3.3, c(s + X0) + 1.75 + 0.7), 'asphalt', { s0: sM(D0), s1: sM(D2 + 2) });
      E.gb.dashes('white', M, sM(D0 + 4), sM(D2), 1.75, 0.3, 2, 2);
      E.gb.solid('white', M, sM(D0), sM(D2), (s) => c(s + X0) + 1.75, 0.2);
      rightEdgeSolid = [[0, sM(D0)], [sM(D2), M.length]];
      E.addRoad(X, -2.4, 2.7, 'asphalt', { s0: sX2 - 2 });
      E.gb.solid('white', X, sX2, X.length, -1.75, 0.2);
      E.gb.solid('white', X, sX2, X.length, 1.75, 0.2);
      rail(E, X, sX2, X.length, 3.0); railPosts(E, X, sX2, X.length, 3.05);
      const edgePts = [];
      for (let s = sX2; s < X.length; s += 1) edgePts.push(X.at(s, -1.75));
      const exitEdgeZ = (x) => { let best = 99, bd = 1e9; for (const p of edgePts) { const d = Math.abs(p[0] - x); if (d < bd && p[1] < 20) { bd = d; best = p[1]; } } return bd < 3 ? best : 99; };
      ctx.exitEdgeZ = exitEdgeZ;
      for (let x = D2; x < D2 + 160; x += 2) {
        const z0 = exitEdgeZ(x), z1 = exitEdgeZ(x + 2);
        if (z0 > 12) continue;
        E.gb.quad('asphalt2', [x, 1.75], [x + 2, 1.75], [x + 2, Math.min(12, z1)], [x, z0], 0.021);
      }
      hatch(E, M, sM(D2 + 3), sM(D2 + 150), () => 1.85, (s) => Math.min(exitEdgeZ(s + X0) - 0.1, 12), 4);
      E.roadShapes.push({ fn: (x, z) => x > D2 - 2 && x < D2 + 162 && z > 1.6 && z < Math.min(12, exitEdgeZ(x)) + 0.2 });
      rightRail = (s) => { const x = s + X0; return x <= D2 ? Math.max(4.1, c(x) + 2.9) : 4.1; };
      rail(E, M, 0, sM(D2), rightRail); railPosts(E, M, 0, sM(D2), rightRail);
      rail(E, M, sM(D2 + 120), M.length, 4.1); railPosts(E, M, sM(D2 + 120), M.length, 4.15);
      // skilt
      E.signAt('fart-' + limit, M, sM(-500), 5.0);
      E.addSign(SIM.textSignSvg(['23', 'Sentrum', '1000 m'], { fs: 16 }), D0 - 1000, 5.2, 0, { size: 1.8, height: 1.4 });
      E.addSign(SIM.textSignSvg(['23', 'Sentrum', '500 m'], { fs: 16 }), D0 - 500, 5.2, 0, { size: 1.8, height: 1.4 });
      E.addSign(SIM.textSignSvg(['↗', 'Sentrum'], { fs: 20 }), D2 + 4, 6.0, 0, { size: 1.8, height: 1.4 });
      E.signAt('fart-60', X, sX2 + 25, 3.6);
    }
    rightEdgeSolid.forEach(([a, b]) => E.gb.solid('white', M, a, b, 1.75, 0.2));

    // drivbar del: hovedbane (felles), ellers fra addRoad
    E.roadShapes = E.roadShapes.filter((sh) => sh.fn || sh.path !== M);
    E.roadShapes.push({ path: M, a: () => -6.2, b: (s) => { const x = s + X0; if (cfg.mode === 'on' && x >= -24 && x <= ctx.A2 + 10) return Math.max(3.3, ctx.c(x) + 1.75 + 0.7); if (cfg.mode === 'off' && x >= ctx.D0 && x <= ctx.D2) return Math.max(3.3, ctx.c(x) + 1.75 + 0.7); return 3.4; }, s0: 0, s1: M.length, hint: -1 });

    // skog og landskap
    forestAlong(E, M, 18, 70, 7, { sides: [1], avoid: (x, z) => (cfg.mode === 'on' && x < 30 && x > -650 && z > 0 && z < 175) || (cfg.mode === 'off' && x > ctx.D2 - 10 && z > 0 && z < 320) });
    forestAlong(E, O, 18, 70, 7, { sides: [1] });
    if (cfg.mode === 'on') forestAlong(E, ctx.R, 14, 50, 8, { s1: ctx.sR0 - 60, sides: [1, -1], avoid: (x, z) => z < 24 });
    if (cfg.mode === 'off') forestAlong(E, ctx.X, 12, 45, 8, { s0: ctx.sX2 + 70, sides: [1, -1] });

    // trafikk
    const dens = cfg.density;
    const vR = [limit - 12, limit - 1], vL = [limit - 2, limit + 8];
    const think = (a, E2) => mwThink(a, E2, ctx, cfg);
    E.addSpawner({ path: M, off: 0, rate: dens, v: vR, truckShare: cfg.truckShare, think, minGap: 32, prefillSkip: cfg.mode === 'off' ? (s) => Math.abs(s - sM(-250)) < 40 : null });
    E.addSpawner({ path: M, off: -3.5, rate: dens * 0.55, v: vL, truckShare: 0, think, minGap: 40, prefillSkip: cfg.mode === 'off' ? (s) => Math.abs(s - sM(-250)) < 30 : null });
    E.addSpawner({ path: O, off: 0, rate: dens * 0.55, v: vR, truckShare: cfg.truckShare, minGap: 45 });
    E.addSpawner({ path: O, off: -3.5, rate: dens * 0.25, v: vL, minGap: 60 });
    if (cfg.mode === 'on') E.addSpawner({ path: ctx.R, off: 0, rate: 120, v: [88, 98], think: (a, E2) => rampThink(a, E2, ctx), minGap: 40, prefill: false, blocked: (E2) => E2.time < 25 });
    return ctx;
  }

  function mwThink(a, E, ctx, cfg) {
    if (a.path !== ctx.M) return;
    const lane = a.targetOff < -1.75 ? 0 : 1;
    a.data.tl = (a.data.tl || 0) + 1 / 60;
    const p = E.player;
    // avkjøring for noen
    if (cfg.mode === 'off' && a.data.exit === undefined) a.data.exit = Math.random() < 0.22;
    if (cfg.mode === 'off' && a.data.exit && lane === 1) {
      if (a.x > ctx.D0 - 220 && a.x < ctx.D0 + 5) { a.blink = 'R'; }
      if (a.x >= ctx.D0 + 8 && a.x < ctx.D1) { E.transfer(a, ctx.X, 0, 0, 120); a.blink = 'R'; a.data.onExit = true; a.v0 = Math.min(a.v0, 62 / KMH); a.think = (b) => { if (b.s > ctx.sX2 + 10) b.blink = null; b.v0 = b.s > ctx.sX2 - 60 ? 58 / KMH : b.v0; }; return; }
    }
    if (a.pendingOff != null) return;
    // forbikjøring av saktere bil
    if (lane === 1 && a.type !== 'truck') {
      const F = E.laneGap(ctx.M, a.s, 0, 0, 70, a);
      if (F.front < 70 && F.vf < a.v0 - 2.8 && a.v > 15) {
        const G = E.laneGap(ctx.M, a.s, -3.5, 45, 45, a);
        if (G.back > 30 && G.front > 35 && (G.vb < a.v + 4 || G.back > 70)) { E.changeLane(a, -3.5); a.data.tl = 0; return; }
      }
    }
    if (lane === 0 && a.data.tl > 6) {
      const G = E.laneGap(ctx.M, a.s, 0, 28, 70, a);
      if (G.back > 26 && G.front > 60) { E.changeLane(a, 0); a.data.tl = 0; return; }
    }
    // samhandling ved påkjøring
    a.yieldTo = null;
    if (cfg.mode === 'on' && lane === 1 && a.x > -90 && a.x < ctx.A2) {
      const pr = ctx.M.projectNear(p.x, p.z, p.x - (-900), 30);
      const inAccel = pr.lat > 1.75 && p.x > -30 && p.x < ctx.A2;
      const rel = pr.s - a.s;
      if (inAccel && rel > -40 && rel < 20) {
        if (a.data.courtesy === undefined) { const r = Math.random(); a.data.courtesy = r < 0.38 ? 'move' : r < 0.72 ? 'yield' : 'none'; if (p.blink !== 'L' && a.data.courtesy === 'yield' && Math.random() < 0.5) a.data.courtesy = 'none'; }
        if (a.data.courtesy === 'move') {
          const G = E.laneGap(ctx.M, a.s, -3.5, 35, 35, a);
          if (G.back > 25 && G.front > 25) { E.changeLane(a, -3.5); a.data.tl = 0; }
          else a.data.courtesy = 'yield';
        }
        if (a.data.courtesy === 'yield' && rel > -9 && p.v > 12) a.yieldTo = p;
      }
    }
    // ramp-biler som fletter inn: slipp inn
    if (lane === 1 && a.data.letRamp) { a.yieldTo = a.data.letRamp.dead ? null : a.data.letRamp; }
  }
  function rampThink(a, E, ctx) {
    if (a.path !== ctx.R) return mwThink(a, E, ctx, { mode: 'on' });
    if (a.x > ctx.A0 - 60) a.blink = 'L';
    if (a.x > ctx.A0 + 20) {
      const sM = a.x + 900;
      const G = E.laneGap(ctx.M, sM, 0, 30, 25, a);
      const tb = G.back / Math.max(G.vb, 1);
      if (G.back > 16 && G.front > 14 && tb > 1.2) { E.transfer(a, ctx.M, 0, sM - 20, sM + 20); a.blinkLane = true; a.data.tl = 0; a.think = (b, E2) => mwThink(b, E2, ctx, { mode: 'on' }); return; }
    }
    if (a.x > ctx.A1 - 60) a.stopS = ctx.R.project(ctx.A1 + 30, 3.5).s;
  }

  function motorwayOnScenario(level) {
    const L = { lett: { density: 850, limit: 100, truck: 0.12 }, middels: { density: 1250, limit: 110, truck: 0.16 }, tett: { density: 1650, limit: 100, truck: 0.22 } }[level];
    return {
      id: 'pakjoring-' + level, base: 'pakjoring', group: 'Motorveg', level: { lett: 'Lett trafikk', middels: 'Middels trafikk', tett: 'Tett trafikk' }[level],
      title: 'Påkjøring på motorveg', icon: 'motorveg',
      desc: `Du kommer i rampen og skal inn på motorvegen. Fartsgrensen er ${L.limit} km/t. Trafikken reagerer på deg: noen gjør plass, andre gjør det ikke.`,
      task: 'Kjør inn på motorvegen fra akselerasjonsfeltet. Bruk speil, blinklys til venstre og skulderblikk, tilpass farten til trafikken, finn en trygg luke og slå av blinklyset etterpå.',
      tips: ['Fart: opp mot farten til trafikken før du glir inn. Lav fart er den vanligste feilen.', 'Observasjon: speil og skulderblikk til venstre rett før du flytter deg.', 'Kommunikasjon: blinklys i god tid, og av igjen etterpå.', 'Vikeplikt: det er du som må tilpasse deg. Det er ikke glidelås.', 'Plassering: hold deg i høyre felt etterpå.'],
      build(E) {
        const ctx = buildMotorway(E, { mode: 'on', limit: L.limit, density: L.density, truckShare: L.truck });
        const { R, M, A0, A1, A2 } = ctx;
        const f = R.frame(30);
        E.setPlayer(f.x, f.z, f.h, 50 / KMH);
        let state = 'ramp', tMerge = 0, hint = 0, leftT = 0;
        const p = E.player;
        return Object.assign(ctx, {
          limitAt: () => (state === 'ramp' && p.x < A0 - 60 ? 80 : L.limit),
          start() { E.instruct('Kjør inn på motorvegen. Følg skilting mot Oslo.'); },
          offroadTitle: 'Du kjørte av vegen eller i rekkverket',
          offroadText: 'Akselerasjonsfeltet tar slutt. Planlegg farten tidlig, og bruk luken du har sett deg ut.',
          laneOf() { if (state !== 'merged') return null; const pr = M.projectNear(p.x, p.z, hint, 30); return laneHyst(pr.lat, p.lane, [-1.75]); },
          update(dt) {
            const pr = M.projectNear(p.x, p.z, hint, 40); hint = pr.s;
            const lat = pr.lat, x = p.x, kmh = p.v * KMH;
            if (state === 'ramp') {
              if (x > A0 - 80 && x < A1 && p.blink !== 'L') E.coach('blinkL', 'Gi tegn til venstre (Q) i god tid.', 7);
              if (x > A0 + 30 && kmh < L.limit - 30) E.coach('fart', 'Øk farten! Du må opp i samme fart som trafikken.', 6);
              if (x > A0 + 50 && lat > 1.75 && lat < 4.2 && E.time - p.shL > 3) E.coach('sh', 'Speil (R) og skulderblikk til venstre (hold Z) før du glir inn.', 7);
              if (x > -170 && x < -20 && lat > 1.85 && p.z < ctx.rampEdgeZ(x) - 0.2) E.prot.once('sperre', 'Plassering', 'major', 'Kjørte inn i sperreområdet', 'Det skraverte området mellom rampen og motorvegen kan ikke kjøres i. Vent til akselerasjonsfeltet begynner.');
              if (lat > 1.75 && x > A0 && p.v < 1.5) E.prot.once('stopp', 'Fart', 'minor', 'Stoppet i akselerasjonsfeltet', 'Det kan være nødvendig hvis det er helt fullt, men som regel betyr det at farten ikke ble planlagt tidlig nok.');
              if (lat < 1.75 && x > -40) {
                state = 'merged'; tMerge = E.time; p.lane = 1;
                E.checkManeuver('L', 'påkjøring', { verb: 'glir inn på motorvegen', minSignal: 2 });
                const G = E.laneGap(M, pr.s, 0, 140, 140, p);
                const vs = []; if (G.front < 90) vs.push(G.vf); if (G.back < 90) vs.push(G.vb);
                const vt = Math.max(vs.length ? vs.reduce((s, v) => s + v, 0) / vs.length : 0, (L.limit - 18) / KMH);
                const dv = (p.v - vt) * KMH;
                if (dv < -28) E.prot.add('Fart', 'major', `For lav fart ved påkjøring (${Math.round(kmh)} km/t mot ca. ${Math.round(vt * KMH)})`, 'Du kjørte inn mye saktere enn trafikken og tvang andre til å tilpasse seg. Akselerer bestemt i feltet.');
                else if (dv < -13) E.prot.add('Fart', 'minor', `Litt lav fart ved påkjøring (${Math.round(kmh)} km/t)`, 'Prøv å komme helt opp i trafikkens fart før du glir inn.');
                else if (dv > 25) E.prot.add('Fart', 'minor', 'Høy fart ved påkjøring', 'Du kom inn mye fortere enn trafikken. Det gjør det vanskelig for andre å forutse deg.');
                else E.prot.add('Fart', 'good', `God fart inn (${Math.round(kmh)} km/t)`);
                const tf = G.front < 999 ? (G.front - p.len) / Math.max(p.v, 1) : 99;
                const tb = G.back < 999 ? (G.back - p.len) / Math.max(G.vb, 1) : 99;
                if (tf < 0.8) E.prot.add('Samhandling', 'major', 'For liten avstand til bilen foran da du glir inn', `Bare ${tf.toFixed(1)} s avstand. Du trenger minst 2 sekunder.`);
                else if (tf < 1.6) E.prot.add('Samhandling', 'minor', 'Kort avstand til bilen foran', `${tf.toFixed(1)} s. Bygg opp minst 2 sekunder raskt.`);
                if (tb < 1.0) E.prot.add('Vikeplikt', 'major', 'Du la deg rett foran en bil', `Bilen bak fikk bare ${tb.toFixed(1)} s avstand. Du har vikeplikt fra akselerasjonsfeltet.`);
                else if (tb < 1.8) E.prot.add('Vikeplikt', 'minor', 'Liten luke til bilen bak', `${tb.toFixed(1)} s. Velg en større luke eller tilpass farten.`);
                if (tf >= 1.6 && tb >= 1.8) E.prot.add('Samhandling', 'good', 'Valgte en trygg luke');
                if (x > A1) E.prot.add('Plassering', 'minor', 'Sent ute i akselerasjonsfeltet', 'Du brukte nesten hele feltet. Det gir lite rom for feil hvis luken forsvinner.');
                E.toast('Du er inne på motorvegen', 'good');
              }
            } else {
              if (E.time - tMerge > 4.5 && p.blink === 'L') { E.prot.once('blinkav', 'Kommunikasjon', 'minor', 'Glemte å slå av blinklyset etter påkjøring', 'Slå av blinklyset med en gang du er inne. Ellers tror andre at du skal videre til venstre felt.'); E.coach('blinkav', 'Slå av blinklyset (Q).', 6); }
              if (E.time - tMerge > 6 && kmh < L.limit - 35) E.prot.once('lav', 'Fart', 'minor', 'Lav fart på motorvegen', 'Hold en fart som passer med trafikken. Lav fart skaper farlige situasjoner.');
              if (lat < -1.75) { leftT += dt; if (leftT > 18) E.prot.once('venstre', 'Plassering', 'minor', 'Ble liggende i venstre felt', 'Bruk høyre felt, og venstre felt bare til forbikjøring.'); } else leftT = 0;
              if (x > A2 + 300) E.finish();
            }
          },
        });
      },
    };
  }

  function motorwayOffScenario() {
    return {
      id: 'avkjoring', base: 'avkjoring', group: 'Motorveg', level: 'Middels', title: 'Avkjøring fra motorveg', icon: 'slutt-motorveg',
      desc: 'Du kjører i høyre felt på motorvegen i 100 km/t. Du skal ta av mot Sentrum via retardasjonsfeltet.',
      task: 'Følg skiltene mot Sentrum. Gi tegn til høyre i god tid, skift over til retardasjonsfeltet der det begynner, og bremse først når du er inne i det. Tilpass farten til rampen (60 km/t).',
      tips: ['Hold farten i motorvegfeltet. Brems i retardasjonsfeltet.', 'Blinklys i god tid, før retardasjonsfeltet starter.', 'Kryss ikke sperreområdet.', 'Har du kjørt forbi avkjøringen, kjører du til neste. Du kan aldri rygge eller snu.'],
      build(E) {
        const ctx = buildMotorway(E, { mode: 'off', limit: 100, density: 1000, truckShare: 0.15 });
        const { M, X, D0, D1, D2, sX2 } = ctx;
        E.setPlayer(-250, 0, 0, 95 / KMH);
        const p = E.player;
        let state = 'main', hint = 650, vRef = null, minV = 99, hx = 0, exitedAt = 0;
        return Object.assign(ctx, {
          limitAt: () => (state === 'exit' && hx > sX2 + 20 ? 60 : 100),
          start() { E.instruct('Ta av ved neste avkjøring, mot Sentrum.'); },
          laneOf() { if (state !== 'main') return null; const pr = M.projectNear(p.x, p.z, hint, 30); return laneHyst(pr.lat, p.lane, [-1.75, 1.75]); },
          onLane(a, b, dir) {
            if (b === 2 && dir === 'R') {
              if (p.x < D0 - 5) return false;
              state = 'exit'; exitedAt = p.x;
              E.checkManeuver('R', 'avkjøring', { verb: 'skifter til retardasjonsfeltet', sevShoulder: 'minor' });
              if (p.x > D1 + 90) E.prot.add('Plassering', 'minor', 'Sent inn i retardasjonsfeltet', 'Skift over der feltet begynner, slik at du får god plass til å bremse.');
              else E.prot.add('Plassering', 'good', 'Skiftet til retardasjonsfeltet i god tid');
              if (vRef != null) {
                const drop = (vRef - p.v) * KMH;
                if (drop > 25) E.prot.add('Fart', 'major', `Bremset ned i motorvegfeltet (${Math.round(drop)} km/t)`, 'Du senket farten kraftig før du var i retardasjonsfeltet. Det er farlig for trafikken bak. Hold farten og brems i feltet.');
                else if (drop > 12) E.prot.add('Fart', 'minor', 'Senket farten litt for tidlig', 'Hold farten til du er inne i retardasjonsfeltet.');
                else E.prot.add('Fart', 'good', 'Holdt farten til retardasjonsfeltet');
              }
              E.toast('Inne i retardasjonsfeltet. Brems ned.', 'good');
              return true;
            }
            return false;
          },
          update() {
            const pr = M.projectNear(p.x, p.z, hint, 40); hint = pr.s;
            const kmh = p.v * KMH;
            if (p.x > D0 - 400 && vRef == null) vRef = p.v;
            if (state === 'main') {
              if (p.x > D0 - 450 && p.x < D0 && p.blink !== 'R') E.coach('blinkR', 'Gi tegn til høyre (E) i god tid før retardasjonsfeltet.', 8);
              if (p.x > D0 - 300 && p.x < D0 && p.acc < -2.5 && pr.lat < 1.75) E.coach('brems', 'Ikke brems her. Vent til du er i retardasjonsfeltet.', 6);
              if (p.x > D2 && p.x < D2 + 160 && p.z > 1.85 && p.z < ctx.exitEdgeZ(p.x)) E.prot.once('sperre', 'Plassering', 'major', 'Kjørte over sperreområdet', 'Du kan ikke krysse det skraverte området for å nå avkjøringen. Har du kommet for langt, kjører du til neste avkjøring.');
              if (p.x > D2 + 170 && pr.lat < 1.75) {
                E.prot.add('Plassering', 'minor', 'Du kjørte forbi avkjøringen', 'Det er ikke farlig. Det riktige er å fortsette til neste avkjøring, slik du gjorde. Les skiltene tidligere.');
                E.prot.add('Risiko', 'good', 'Fortsatte trygt i stedet for å bremse eller snu');
                E.finish();
              }
              // overgang til rampen via sperreområde
              const px = X.project(p.x, p.z, sX2, X.length);
              if (p.x > D2 + 20 && px.d < 2.2) { state = 'exit'; exitedAt = p.x; }
            } else {
              const px = X.project(p.x, p.z, 0, X.length); hx = px.s;
              minV = Math.min(minV, p.v);
              if (p.blink === 'R' && hx > sX2 + 40) E.prot.once('blinkav', 'Kommunikasjon', 'minor', 'Glemte å slå av blinklyset', 'Slå av blinklyset når du er ute på rampen.');
              if (hx > sX2 + 60 && kmh > 75) E.prot.once('rampfart', 'Fart', 'minor', 'For høy fart inn i rampen', 'Rampen har lavere fartsgrense og krappere sving. Senk farten i retardasjonsfeltet.');
              if (hx > sX2 + 180) { if (kmh <= 65) E.prot.add('Fart', 'good', 'Tilpasset farten til rampen'); E.finish(); }
            }
            void exitedAt; void D1;
          },
        });
      },
    };
  }

  // ---------------------------------------------------------------
  // GLIDELÅS i by
  // ---------------------------------------------------------------
  function zipperScenario() {
    return {
      id: 'glidelas', base: 'glidelas', group: 'By', level: 'Middels', title: 'Glidelås: to felt blir til ett', icon: 'feltet-slutter',
      desc: 'Bygate med fartsgrense 50 og tett trafikk. Feltet ditt (høyre) slutter. Ingen har vikeplikt etter skilt, så glidelåsprinsippet gjelder.',
      task: 'Bruk feltet ditt helt fram til der feltene går sammen. Gi tegn til venstre, sjekk speil og skulderblikk, og flett inn annenhver bil uten å tvinge noen til å bremse.',
      tips: ['Kjør helt fram til der feltet slutter. Å flette tidlig gjør køen lengre.', 'Annenhver: én fra hvert felt.', 'Blinklys og skulderblikk til venstre før du flytter deg.', 'Tilpass farten til luken. Ikke stopp unødvendig hvis det er en luke.'],
      build(E) {
        const X0 = -400;
        const C = new Path([[X0, 0], [800, 0]], { name: 'C' });
        const W = new Path([[800, -3.5], [X0, -3.5]], { name: 'W' });
        const sC = (x) => x - X0;
        const E0 = 260, E1 = 320;
        const rb = (s) => { const x = s + X0; return x < E0 ? 5.25 : x < E1 ? lerp(5.25, 1.75, (x - E0) / (E1 - E0)) : 1.75; };
        E.addRoad(C, -5.25, rb, 'asphalt');
        E.gb.dashes('yellow', C, 0, C.length, -1.75, 0.12, 3, 3);
        E.gb.dashes('white', C, 0, sC(E0 - 30), 1.75, 0.12, 3, 9);
        // fortau og kantstein
        E.gb.ribbon('sidewalk', C, 0, C.length, -9, -5.4, 0.13);
        E.gb.wall('curb', C, 0, C.length, -5.3, 0, 0.13);
        E.gb.ribbon('sidewalk', C, 0, C.length, (s) => rb(s) + 0.1, (s) => rb(s) + 3.6, 0.13);
        E.gb.wall('curb', C, 0, C.length, (s) => rb(s) + 0.05, 0, 0.13);
        arrowPaint(E, C, sC(E0 - 120), 3.5, -1);
        arrowPaint(E, C, sC(E0 - 50), 3.5, -1);
        // bygninger
        const cols = [0xd8cfc0, 0xb8b2a6, 0xc4a484, 0x9fa8a3, 0xe1d6c2, 0xa36a4f, 0xcfc8b8];
        for (let x = X0; x < 800; x += rand(24, 34)) {
          SIM.addBlock(E.scene, x, -15.5, 0, rand(18, 26), 12, rand(9, 19), cols[(Math.random() * cols.length) | 0]);
          const zz = x < E0 ? 15.5 : 12.5;
          SIM.addBlock(E.scene, x + 10, zz, 0, rand(18, 26), 12, rand(9, 19), cols[(Math.random() * cols.length) | 0]);
        }
        lampsAlong(E, C, 10, C.length, -6.3, 32, 1);
        E.signAt('fart-50', C, sC(-370), 6.2, { size: 0.75 });
        E.signAt('feltet-slutter', C, sC(E0 - 160), 6.2, { size: 0.9 });
        E.signAt('feltet-slutter', C, sC(E0 - 70), 6.2, { size: 0.9 });
        // trafikk
        const ctx = { C, E0, E1, limit: 50 };
        const sE0 = sC(E0), sE1 = sC(E1);
        const zipLeft = (a, E2) => {
          a.yieldTo = null;
          if (a.data.coop === undefined) a.data.coop = Math.random() < 0.82;
          if (!a.data.coop || a.data.letInUsed) { if (a.data.cand && a.data.cand.dead) a.data.cand = null; return; }
          if (a.s < sE0 - 70 || a.s > sE1 + 5) return;
          let cand = a.data.cand;
          if (cand && !cand.dead) {
            const pr = C.project(cand.x, cand.z, a.s - 30, a.s + 40);
            if (pr.lat < 1.4) { a.data.letInUsed = true; a.data.letWho = cand; a.data.cand = null; return; }
            if (pr.s - a.s < -6) { a.data.cand = null; cand = null; }
          }
          if (!cand) {
            for (const o of E2.actors()) {
              if (o === a || o.dead) continue;
              const pr = C.project(o.x, o.z, a.s - 10, a.s + 20);
              if (pr.d > 8 || pr.lat < 1.9) continue;
              const ds = pr.s - a.s;
              if (ds > -3 && ds < 13 && pr.s > sE0 - 50) {
                if (o === E2.player && E2.player.blink !== 'L' && Math.random() < 0.02) continue;
                cand = o; break;
              }
            }
            a.data.cand = cand || null;
          }
          if (a.data.cand) a.yieldTo = a.data.cand;
        };
        const zipRight = (a, E2) => {
          if (a.data.merged) return;
          a.stopS = sE1 - 3;
          if (a.s > sE0 - 70) a.blink = 'L';
          if (a.s > sE0 - 22) {
            const G = E2.laneGap(C, a.s, 0, 10, 12, a);
            const behindYield = G.ob && G.ob.data && G.ob.data.cand === a;
            if (G.front > a.len + 2.5 && (G.back > 9 || (behindYield && G.back > 5.5))) {
              a.targetOff = 0; a.data.merged = true; a.blinkLane = true;
              if (G.ob && G.ob.data && G.ob.data.cand === a) { G.ob.data.letInUsed = true; G.ob.data.letWho = a; }
            }
          }
        };
        E.addSpawner({ path: C, off: 0, rate: 1100, v: [36, 44], think: zipLeft, minGap: 11, prefillFrom: 10, prefillTo: sC(780) });
        E.addSpawner({ path: C, off: 3.5, rate: 700, v: [36, 44], think: zipRight, minGap: 11, prefillFrom: sC(-170), prefillTo: sE1 - 6 });
        E.addSpawner({ path: W, off: 0, rate: 600, v: [42, 50] });
        E.setPlayer(-200, 3.5, 0, 30 / KMH);
        const p = E.player;
        let state = 'right', hint = sC(-200);
        return Object.assign(ctx, {
          start() { E.instruct('Følg vegen rett fram. Feltet ditt slutter litt lenger fram.'); },
          offroadTitle: 'Du kjørte inn i fortauskanten',
          offroadText: 'Feltet tok slutt før du hadde flettet inn. Tilpass farten og ta plassen din i glidelåsen.',
          laneOf() { const pr = C.projectNear(p.x, p.z, hint, 30); return state === 'merged' ? laneHyst(pr.lat, p.lane, [-1.75]) : null; },
          update() {
            const pr = C.projectNear(p.x, p.z, hint, 40); hint = pr.s;
            if (state === 'right') {
              if (p.x > E0 - 110 && p.blink !== 'L') E.coach('blink', 'Gi tegn til venstre (Q). Du skal flette inn.', 8);
              if (p.x > E0 - 100 && p.x < E0 - 20) E.coach('fram', 'Kjør helt fram og flett annenhver.', 12);
              if (pr.lat < 1.75) {
                state = 'merged'; p.lane = 1;
                E.checkManeuver('L', 'fletting', { verb: 'fletter inn', minSignal: 1.2 });
                if (p.x < E0 - 95) E.prot.add('Plassering', 'minor', 'Flettet for tidlig', 'Ved glidelås skal begge felt brukes helt fram til der de går sammen.');
                else E.prot.add('Plassering', 'good', 'Brukte feltet helt fram til flettepunktet');
                const G = E.laneGap(C, pr.s, 0, 25, 25, p);
                const b = G.ob;
                if (b && b.data && b.data.letInUsed && b.data.letWho !== p) E.prot.add('Samhandling', 'minor', 'Tok en ekstra plass i glidelåsen', 'Bilen bak hadde allerede sluppet inn én. Glidelås betyr annenhver.');
                else if (b && b.data && b.data.cand === p) E.prot.add('Samhandling', 'good', 'Tok imot luken du fikk');
                if (b) { b.data.letInUsed = true; b.data.letWho = p; }
                E.toast('Flettet inn', 'good');
              }
            } else {
              if (pr.lat < -1.9) E.prot.once('motgaende', 'Plassering', 'major', 'Kjørte over i motgående felt', 'Hold deg i ditt eget felt.');
              if (p.blink === 'L' && pr.lat < 0.5 && p.x > E1 + 40) E.prot.once('blinkav', 'Kommunikasjon', 'minor', 'Glemte å slå av blinklyset', '');
              if (p.x > E1 + 150) E.finish();
            }
          },
        });
      },
    };
  }

  // ---------------------------------------------------------------
  // RUNDKJØRING
  // ---------------------------------------------------------------
  function roundaboutScenario() {
    return {
      id: 'rundkjoring', base: 'rundkjoring', group: 'By', level: 'Middels', title: 'Rundkjøring med trafikk', icon: 'rundkjoring',
      desc: 'Rundkjøring med ett felt, gangfelt på alle armer og trafikk fra alle retninger. Sensor gir deg beskjed om hvilken avkjøring du skal ta.',
      task: 'Senk farten inn mot rundkjøringen. Vik for trafikk som er i rundkjøringen, kjør mot klokka, gi tegn til høyre før du kjører ut, og vik for gående i gangfeltet.',
      tips: ['Fart: senk tidlig, slik at du rekker å observere.', 'Vikeplikt: for dem som er i rundkjøringen, og for gående ved utkjøringen.', 'Tegngiving: alltid høyre blink før du kjører ut. Ved første avkjøring blinker du allerede før innkjøring.', 'Ikke stopp unødvendig når det er god luke.'],
      build(E) {
        const Rc = 13, rIn = 9.5, rOut = 16.5;
        E.minCurveR = 11;
        const ARMS = { E: 0, S: Math.PI / 2, W: Math.PI, N: -Math.PI / 2 };
        const NAMES = { E: 'Industriområdet', N: 'Sentrum', W: 'Sjøen', S: 'Stasjonen' };
        const armPath = {};
        Object.entries(ARMS).forEach(([k, a]) => { armPath[k] = new Path([[Math.cos(a) * 14.5, Math.sin(a) * 14.5], [Math.cos(a) * 300, Math.sin(a) * 300]], { name: 'arm' + k }); });
        // overflater
        E.addDisc(0, 0, rIn, rOut + 0.3, 'asphalt');
        E.gb.disc('island', 0, 0, rIn - 0.1, 0.16, 64);
        E.gb.cylWall('curb', 0, 0, rIn, 0, 0.16, 64);
        E.addHole(0, 0, rIn - 0.2);
        E.gb.annulus('white', 0, 0, rOut - 0.25, rOut - 0.1, 0.05, 96);
        E.gb.annulus('white', 0, 0, rIn + 0.25, rIn + 0.4, 0.05, 96);
        // tre i midten
        SIM.addForest(E.scene, [[0, 0, 1.2], [3, -2, 0.8]], false);
        Object.entries(armPath).forEach(([k, P]) => {
          E.addRoad(P, -3.6, 3.6, 'asphalt');
          // avrundet utvidelse mellom ring og arm
          const flare = (s) => { const r = s + 14.5; return 3.6 + Math.max(0, 25 - r) ** 1.6 * 0.33; };
          E.addRoad(P, (s) => -flare(s), flare, 'asphalt', { s0: 0, s1: 11, ds: 0.5, map: false });
          E.gb.solid('white', P, 10.5, P.length, -3.4, 0.15); E.gb.solid('white', P, 10.5, P.length, 3.4, 0.15);
          E.gb.solid('yellow', P, 18, 45, 0, 0.12); E.gb.dashes('yellow', P, 45, P.length, 0, 0.12, 3, 9);
          // trafikkøy
          E.gb.ribbon('curb', P, 5, 17, (s) => -lerp(0.9, 0.15, (s - 5) / 12), (s) => lerp(0.9, 0.15, (s - 5) / 12), 0.15);
          for (const s of [6.2, 9.5]) { const [x, z] = P.at(s, 0); E.addHole(x, z, lerp(0.7, 0.3, (s - 5) / 12)); }
          haitenner(E, P, 2.4, -3.4, -0.3, false);
          // fortau
          E.gb.ribbon('sidewalk', P, 9, P.length, 3.8, 7.2, 0.13); E.gb.ribbon('sidewalk', P, 9, P.length, -7.2, -3.8, 0.13);
          E.gb.wall('curb', P, 9, P.length, 3.7, 0, 0.13); E.gb.wall('curb', P, 9, P.length, -3.7, 0, 0.13);
          // skilt
          const f = P.frame(6.5);
          E.addSign(['vikeplikt', 'rundkjoring'], f.x + f.nx * -5.0, f.z + f.nz * -5.0, f.h + Math.PI, { size: 0.75 });
          const cr = E.addCrossing(P, 15, { a: -3.6, b: 3.6, depth: 3 });
          armPath[k].crossing = cr;
          for (const sd of [-1, 1]) { const g = P.frame(15); E.addSign('gangfelt', g.x + g.nx * sd * 4.6, g.z + g.nz * sd * 4.6, sd < 0 ? g.h + Math.PI : g.h, { size: 0.7 }); }
          lampsAlong(E, P, 30, 260, 7.6, 34, -1);
        });
        // hjørnetomter: hus og trær
        for (const [qx, qz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          for (let i = 0; i < 5; i++) SIM.addHouse(E.scene, qx * rand(35, 160), qz * rand(35, 160), rand(0, 3), rand(8, 12), rand(7, 9), rand(5, 7), [0xa83a2c, 0xece6d6, 0xe3c35a, 0x6d8aa3][(Math.random() * 4) | 0]);
          const tr = []; for (let i = 0; i < 25; i++) tr.push([qx * rand(22, 200), qz * rand(22, 200), rand(0.7, 1.2)]);
          SIM.addBirches(E.scene, tr.filter(([x, z]) => Math.abs(x) > 14 && Math.abs(z) > 14), false);
        }
        const PS = armPath.S;
        E.signAt('rundkjoring-fare', PS, 140, -5.2, { size: 0.9 });
        E.signAt('fart-50', PS, 240, -5.2, { size: 0.75 });
        E.signAt(SIM.textSignSvg(['↑ Sentrum', '→ Industri', '← Sjøen'], { fs: 13 }), PS, 90, -5.4, { size: 1.8, height: 1.3 });

        // ruter
        const ringPt = (phi, r = Rc) => [Math.cos(phi) * r, Math.sin(phi) * r];
        const dirAt = (phi) => [Math.sin(phi), -Math.cos(phi)];
        const routeCache = {};
        const route = (ia, oa) => {
          const key = ia + oa;
          if (routeCache[key]) return routeCache[key];
          const a = ARMS[ia], b = ARMS[oa];
          const nOut = (ang) => [-Math.sin(ang), Math.cos(ang)];
          const laneIn = (ang, r) => { const n = nOut(ang); return [Math.cos(ang) * r - n[0] * 1.75, Math.sin(ang) * r - n[1] * 1.75]; };
          const laneOut = (ang, r) => { const n = nOut(ang); return [Math.cos(ang) * r + n[0] * 1.75, Math.sin(ang) * r + n[1] * 1.75]; };
          const pe = a - 0.42, px = b + 0.42;
          let sweep = pe - px; while (sweep <= 0.05) sweep += Math.PI * 2;
          const pts = [];
          for (let r = 290; r > 21; r -= 6) pts.push(laneIn(a, r));
          const e0 = laneIn(a, 21), e3 = ringPt(pe), d = dirAt(pe);
          pts.push(...SIM.bez(e0, laneIn(a, 16), [e3[0] - d[0] * 5, e3[1] - d[1] * 5], e3, 14));
          pts.push(...SIM.arc(0, 0, Rc, pe, pe - sweep));
          const x0 = ringPt(pe - sweep), dx = dirAt(pe - sweep), x3 = laneOut(b, 21);
          pts.push(...SIM.bez(x0, [x0[0] + dx[0] * 5, x0[1] + dx[1] * 5], laneOut(b, 16), x3, 14));
          for (let r = 27; r < 295; r += 6) pts.push(laneOut(b, r));
          const P = new Path(SIM.join(pts), { name: 'r' + key });
          const sEntry = P.project(...laneIn(a, 18.2)).s;
          const sRingEnd = P.project(...ringPt(pe - sweep)).s;
          return (routeCache[key] = { path: P, data: { ia, oa, sEntry, sRingEnd, phiE: pe } });
        };
        const ringThink = (a, E2) => {
          const d = a.data;
          const r = Math.hypot(a.x, a.z);
          a.speedF = a.s > d.sEntry - 28 && a.s < d.sRingEnd + 12 ? 0.62 : 1;
          a.blink = (a.s > d.sRingEnd - 20 && a.s < d.sRingEnd + 14) || (d.first && a.s > d.sEntry - 40 && a.s < d.sRingEnd + 14) ? 'R' : null;
          if (a.s < d.sEntry + 0.5 && a.s > d.sEntry - 35) {
            let conflict = false;
            for (const o of E2.actors()) {
              if (o === a) continue;
              const ro = Math.hypot(o.x, o.z);
              if (ro < 8 || ro > 18.5) continue;
              const phiO = Math.atan2(o.z, o.x);
              const dl = SIM.wrapAng(phiO - (d.phiE + 0.15));
              if (dl < -0.35 || dl > 1.9) continue;
              if (o.data && o.data.oa === d.ia && dl < 0.9) continue;
              const tta = (Math.max(0, dl) * Rc) / Math.max(o.v, 1.5);
              if (tta < 3.2 || dl < 0.3) { conflict = true; break; }
            }
            if (conflict) a.stopS = d.sEntry;
          }
          void r;
        };
        const others = { E: ['N', 'W', 'S'], N: ['W', 'S', 'E'], W: ['S', 'E', 'N'], S: ['E', 'N', 'W'] };
        const mkRoute = (ia) => () => { const oa = others[ia][(Math.random() * 3) | 0]; const R = route(ia, oa); const rr = { path: R.path, data: Object.assign({}, R.data) }; if (oa === others[ia][0]) rr.data.first = true; return rr; };
        ['E', 'N', 'W'].forEach((ia) => E.addSpawner({ route: mkRoute(ia), rate: 380, v: [40, 47], think: ringThink, minGap: 18, prefill: false }));
        E.addSpawner({ route: mkRoute('S'), rate: 200, v: [40, 47], think: ringThink, minGap: 18, prefill: false, blocked: (E2) => E2.time < 12 });
        // forhåndsfyll: noen biler i og mot rundkjøringen
        ['E', 'N', 'W'].forEach((ia) => {
          for (const s0 of [rand(170, 220), rand(230, 270)]) {
            const R = mkRoute(ia)();
            const a = E.spawn({ path: R.path, s: s0, v0: rand(40, 47) / KMH, think: ringThink, data: R.data });
            a.spawner = null;
          }
        });
        // oppgave
        const k = 1 + ((Math.random() * 3) | 0);
        const target = ['E', 'N', 'W'][k - 1];
        const ord = ['første', 'andre', 'tredje'][k - 1];
        // fotgjenger ved utkjøringen
        const tc = armPath[target].crossing;
        const tf = armPath[target].frame(15);
        const side = Math.random() < 0.5 ? 1 : -1;
        let pedReady = false;
        E.addPed({ from: [tf.x + tf.nx * side * 5.2, tf.z + tf.nz * side * 5.2], to: [tf.x - tf.nx * side * 5.4, tf.z - tf.nz * side * 5.4], crossing: tc, trigger: () => pedReady, delay: 0.3, speed: 1.25 });
        // innkjøring (sør)
        const fs = PS.frame(170);
        E.setPlayer(fs.x - fs.nx * 1.75, fs.z - fs.nz * 1.75, fs.h + Math.PI, 42 / KMH);
        const p = E.player;
        let state = 'approach', apprMax = 0, sweep = 0, lastPhi = null, waitT = 0, exitBlinkStart = null;
        const ctx = {
          limit: 50,
          start() { E.instruct(`I rundkjøringen skal du ta <b>${ord} avkjøring</b>, mot ${NAMES[target]}.`); },
          offroadTitle: 'Du kjørte utenfor kjørebanen',
          offroadText: 'Du traff kantstein, trafikkøy eller midtøya. Senk farten og legg deg midt i rundkjøringsfeltet.',
          update(dt) {
            const r = Math.hypot(p.x, p.z), phi = Math.atan2(p.z, p.x), kmh = p.v * KMH;
            if (state === 'approach') {
              if (r < 70 && r > 24) apprMax = Math.max(apprMax, kmh);
              if (r < 60 && kmh > 35) E.coach('fart', 'Senk farten inn mot rundkjøringen.', 6);
              if (k === 1 && r < 45 && p.blink !== 'R') E.coach('b1', 'Første avkjøring: gi tegn til høyre (E) allerede nå.', 8);
              // venting ved vikelinjen
              if (r < 24 && p.v < 0.3) {
                const busy = E.vehicles.some((a) => { const ra = Math.hypot(a.x, a.z); if (ra < 8 || ra > 18.5) return false; const dl = SIM.wrapAng(Math.atan2(a.z, a.x) - phi); return dl > -0.3 && dl < 2.2; });
                if (!busy) waitT += dt; else waitT = 0;
                if (waitT > 4) E.prot.once('venting', 'Selvstendighet', 'minor', 'Unødvendig venting ved rundkjøringen', 'Det var en god luke. Nøling skaper usikkerhet hos dem bak deg.');
              }
              if (r < rOut + 0.2) {
                state = 'ring'; lastPhi = phi; pedReady = true;
                if (apprMax > 37) E.prot.add('Fart', 'minor', `For høy fart inn mot rundkjøringen (${Math.round(apprMax)} km/t)`, 'Senk farten i god tid, slik at du rekker å observere trafikk og gående.');
                else E.prot.add('Fart', 'good', 'God fart inn mot rundkjøringen');
                if (k === 1) { if (p.blink === 'R') E.prot.add('Kommunikasjon', 'good', 'Gav tegn til høyre før innkjøring (første avkjøring)'); else E.prot.add('Kommunikasjon', 'minor', 'Manglende tegn før innkjøring', 'Skal du ta første avkjøring, gir du tegn til høyre allerede før du kjører inn.'); }
                let worst = 99;
                for (const a of E.vehicles) {
                  const ra = Math.hypot(a.x, a.z);
                  if (ra < 8 || ra > 18.5) continue;
                  const dl = SIM.wrapAng(Math.atan2(a.z, a.x) - phi);
                  if (dl < -0.05 || dl > 1.9) continue;
                  if (a.data && a.data.oa === 'S' && dl < 0.9) continue;
                  worst = Math.min(worst, (Math.max(dl, 0) * Rc) / Math.max(a.v, 1));
                }
                if (worst < 1.6) E.prot.add('Vikeplikt', 'major', 'Brudd på vikeplikt i rundkjøringen', `En bil i rundkjøringen var bare ${worst.toFixed(1)} s unna. Du har vikeplikt for trafikk som allerede er i rundkjøringen.`);
                else if (worst < 2.6) E.prot.add('Vikeplikt', 'minor', 'Liten margin til trafikken i rundkjøringen', `${worst.toFixed(1)} s. Velg en tydeligere luke.`);
                else E.prot.add('Vikeplikt', 'good', 'Overholdt vikeplikten inn i rundkjøringen');
              }
            } else if (state === 'ring') {
              const dphi = SIM.wrapAng(lastPhi - phi); lastPhi = phi; sweep += dphi;
              if (kmh > 36) E.prot.once('ringfart', 'Fart', 'minor', 'For høy fart i rundkjøringen', 'Hold lav og jevn fart, rundt 25–30 km/t.');
              if (dphi < -0.02) E.prot.once('feilvei', 'Plassering', 'critical', 'Kjørte feil veg i rundkjøringen', 'I Norge kjører du mot klokka i rundkjøringen.');
              if (p.blink === 'R' && exitBlinkStart == null) exitBlinkStart = E.time;
              if (p.blink !== 'R' && !(p.lastBlinkDir === 'R' && E.time - p.lastBlinkOff < 0.8)) exitBlinkStart = null;
              const dist = (Math.PI / 2 + 0.25) * k;
              if (sweep > dist - Math.PI / 2 + 0.4 && p.blink !== 'R') E.coach('bx', 'Gi tegn til høyre (E) før du kjører ut.', 6);
              if (r > rOut + 1.2) {
                state = 'exit';
                const signed = exitBlinkStart != null && E.time - exitBlinkStart > 0.9;
                if (signed) E.prot.add('Kommunikasjon', 'good', 'Gav tegn til høyre før utkjøring');
                else if (exitBlinkStart != null || p.blink === 'R') E.prot.add('Kommunikasjon', 'minor', 'Sen tegngiving ved utkjøring', 'Blink når du har passert avkjøringen før din.');
                else E.prot.add('Kommunikasjon', 'minor', 'Ingen tegngiving ut av rundkjøringen', 'Det er påbudt å gi tegn til høyre før du kjører ut av rundkjøringen.');
                let best = null, bd = 9;
                Object.entries(ARMS).forEach(([kk, a]) => { const dd = Math.abs(SIM.wrapAng(phi - a)); if (dd < bd) { bd = dd; best = kk; } });
                ctx.exitArm = best;
                if (best !== target) E.prot.add('Plassering', 'minor', `Tok feil avkjøring (${NAMES[best]})`, 'Ikke farlig, men følg instruksen. Tell avkjøringene og les skiltene.');
                else E.prot.add('Plassering', 'good', `Riktig avkjøring mot ${NAMES[target]}`);
              }
            } else {
              if (p.blink === 'R' && r > 45) E.prot.once('blinkav', 'Kommunikasjon', 'minor', 'Glemte å slå av blinklyset', '');
              if (r > 75) E.finish();
            }
          },
        };
        return ctx;
      },
    };
  }

  // ---------------------------------------------------------------
  // HØYREREGEL i boligfelt
  // ---------------------------------------------------------------
  function rightRuleScenario() {
    return {
      id: 'hoyreregel', base: 'hoyreregel', group: 'Boligfelt', level: 'Lett', title: 'Høyreregelen i boligfelt', icon: 'vegkryss',
      desc: 'Smal veg i boligfelt med fartsgrense 30. Krysset har ingen skilt. Høye hekker skjuler sikten.',
      task: 'Kjør rett fram gjennom krysset. Tilpass farten til sikten, se til høyre, venstre og høyre igjen, og husk vikeplikten for trafikk fra høyre. Bruk forkjørsretten din når du har den.',
      tips: ['Høyreregelen: vik for trafikk fra høyre når ingenting annet er skiltet.', 'Dårlig sikt krever lav fart. Du må kunne stoppe hvis noen kommer.', 'Bilen fra venstre skal vente på deg. Kjør tydelig når det er din tur.'],
      build(E) {
        const V = new Path([[0, 260], [0, -260]], { name: 'V' });
        const H = new Path([[-260, 0], [260, 0]], { name: 'H' });
        const Hr = H.reversed('Hr');
        E.addRoad(V, -3, 3, 'asphalt2'); E.addRoad(H, -3, 3, 'asphalt2');
        // hekker og hus
        const hedgeM = SIM.lam(0x34572a);
        for (const [qx, qz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
          for (const [cx, cz, w, d] of [[22, 4.8, 36, 1.2], [4.8, 22, 1.2, 36]]) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(w, 1.8, d), hedgeM);
            m.position.set(qx * cx, 0.9, qz * cz); E.scene.add(m);
          }
          for (let i = 0; i < 2; i++) SIM.addHouse(E.scene, qx * rand(14, 30), qz * rand(14, 30), rand(0, 1.5), rand(8, 10), rand(7, 8), 5.5, [0xa83a2c, 0xece6d6, 0xe3c35a, 0x6d8aa3, 0x8e9a7a][(Math.random() * 5) | 0]);
          for (const off of [60, 110, 160, 210]) for (const sd of [1]) {
            SIM.addHouse(E.scene, qx * off, qz * 16 * sd, 0, rand(9, 11), 8, 5.5, [0xa83a2c, 0xece6d6, 0xe3c35a, 0x6d8aa3][(Math.random() * 4) | 0]);
            SIM.addHouse(E.scene, qx * 16, qz * off, Math.PI / 2, rand(9, 11), 8, 5.5, [0xa83a2c, 0xece6d6, 0xe3c35a, 0x6d8aa3][(Math.random() * 4) | 0]);
          }
        }
        E.signAt('fart-30', V, 15, 4.0, { size: 0.7 });
        const birches = []; for (let i = 0; i < 90; i++) { const x = rand(-240, 240), z = rand(-240, 240); if (Math.abs(x) > 9 && Math.abs(z) > 9) birches.push([x, z, rand(0.8, 1.2)]); }
        SIM.addBirches(E.scene, birches, false);
        E.setPlayer(1.5, 125, -Math.PI / 2, 30 / KMH);
        const p = E.player;
        let A = null, B = null, apprMax = 0, entered = false, waitT = 0;
        const sB = H.project(-5.5, 1.5).s;
        const ctx = {
          limit: 30,
          start() { E.instruct('Kjør rett fram i krysset.'); },
          update(dt) {
            const kmh = p.v * KMH;
            if (!A && p.z < 88) {
              const s0 = Hr.project(64, -1.5).s;
              A = E.spawn({ path: Hr, s: s0, off: 1.5, v0: 29 / KMH, v: 27 / KMH, type: 'car' });
            }
            if (!B && p.z < 100) {
              B = E.spawn({ path: H, s: H.project(-52, 1.5).s, off: 1.5, v0: 27 / KMH, v: 25 / KMH, type: 'car', color: 0x2b5aa0 });
              B.think = (b) => {
                const passed = p.z < -4;
                const near = p.z < 55;
                if (!passed && near && !(p.v < 0.2 && waitT > 4 && A && A.x < -6)) b.stopS = sB;
              };
            }
            if (p.z < 30 && p.z > 6) apprMax = Math.max(apprMax, kmh);
            if (p.z < 45 && p.z > 10 && kmh > 22) E.coach('fart', 'Hekkene skjuler sikten. Senk farten.', 6);
            if (!entered && p.z < 3.5 + p.len / 2) {
              entered = true;
              if (apprMax > 27) E.prot.add('Fart', 'minor', `For høy fart inn mot krysset (${Math.round(apprMax)} km/t)`, 'Når hekker skjuler sikten, må farten være så lav at du kan stoppe for trafikk fra høyre.');
              else E.prot.add('Fart', 'good', 'Tilpasset farten til sikten');
              if (A && A.x > -3.5) {
                const dist = A.x - 3.2, tta = dist / Math.max(A.v, 1);
                if (A.x < 3.5 || tta < 3.0) E.prot.add('Vikeplikt', 'major', 'Brudd på høyreregelen', `Bilen fra høyre var ${Math.max(0, tta).toFixed(1)} s fra krysset. Du har vikeplikt for trafikk fra høyre.`);
                else E.prot.add('Vikeplikt', 'good', 'Krysset før bilen fra høyre med god margin');
              } else if (A) E.prot.add('Vikeplikt', 'good', 'Slapp bilen fra høyre først');
            }
            if (!entered && p.z < 14 && p.v < 0.2) {
              if (A && A.x < -6) waitT += dt; else waitT = 0;
              if (waitT > 3.5) E.prot.once('venting', 'Selvstendighet', 'minor', 'Nølende kjøring: du hadde forkjørsrett', 'Bilen fra venstre har vikeplikt for deg. Når veien til høyre er fri, kjører du tydelig.');
            }
            if (p.z < -55) E.finish();
          },
        };
        return ctx;
      },
    };
  }

  // ---------------------------------------------------------------
  // GANGFELT i by
  // ---------------------------------------------------------------
  function crossingScenario() {
    return {
      id: 'gangfelt', base: 'gangfelt', group: 'By', level: 'Lett', title: 'Gangfelt og skjult sikt', icon: 'gangfelt',
      desc: 'Bygate med fartsgrense 40 og parkerte biler langs fortauet. Det kommer to gangfelt.',
      task: 'Kjør gjennom gata. Tilpass farten der parkerte biler skjuler gangfeltet, og vik for gående som er ute i eller på vei ut i gangfeltet. Stopp i god avstand.',
      tips: ['Vikeplikt for gående som er ute i eller på vei ut i gangfeltet.', 'Parkerte biler og busser skjuler barn. Senk farten.', 'Stopp tydelig og i god avstand, slik at gående føler seg trygge.'],
      build(E) {
        const X0 = -300;
        const S = new Path([[X0, 0], [800, 0]], { name: 'S' });
        const Sr = S.reversed('Sr');
        const sS = (x) => x - X0;
        E.addRoad(S, -3.2, 3.2, 'asphalt');
        E.addRoad(S, 3.2, 5.5, 'asphalt2', { drivable: false });
        E.gb.dashes('yellow', S, 0, S.length, 0, 0.12, 3, 3);
        E.gb.ribbon('sidewalk', S, 0, S.length, 5.6, 9, 0.13); E.gb.wall('curb', S, 0, S.length, 5.55, 0, 0.13);
        E.gb.ribbon('sidewalk', S, 0, S.length, -6.6, -3.3, 0.13); E.gb.wall('curb', S, 0, S.length, -3.25, 0, 0.13);
        // parkeringsfelt linjer
        for (let x = X0; x < 800; x += 6) E.gb.ribbon('white', S, sS(x), sS(x) + 0.1, 3.3, 5.4, 0.05);
        const cols = [0xd8cfc0, 0xb8b2a6, 0xc4a484, 0x9fa8a3, 0xe1d6c2, 0xa36a4f];
        for (let x = X0; x < 800; x += rand(22, 30)) {
          SIM.addBlock(E.scene, x, -13, 0, rand(16, 24), 12, rand(9, 16), cols[(Math.random() * cols.length) | 0]);
          SIM.addBlock(E.scene, x + 8, 15.5, 0, rand(16, 24), 12, rand(9, 16), cols[(Math.random() * cols.length) | 0]);
        }
        lampsAlong(E, S, 15, S.length, -4.2, 30, 1);
        // parkerte biler
        const parked = [];
        for (let x = -240; x < 520; x += rand(5.8, 7.5)) {
          if ((x > 159 && x < 192) || Math.abs(x - 420) < 11) continue;
          if (Math.random() < 0.15) continue;
          const car = SIM.makeCar({ type: Math.random() < 0.12 ? 'van' : 'car' });
          car.group.position.set(x, 0, 4.35);
          E.scene.add(car.group); parked.push(car);
        }
        { const van = SIM.makeCar({ type: 'van', color: 0xf2f2f2 }); van.group.position.set(167.5, 0, 4.4); E.scene.add(van.group); }
        // gangfelt
        const c1 = E.addCrossing(S, sS(180), { a: -3.2, b: 5.5, depth: 3 });
        const c2 = E.addCrossing(S, sS(420), { a: -3.2, b: 5.5, depth: 3 });
        for (const x of [180, 420]) { E.addSign('gangfelt', x - 2.2, 6.0, 0, { size: 0.75 }); E.addSign('gangfelt', x + 2.2, -3.8, Math.PI, { size: 0.75 }); }
        E.signAt('fart-40', S, sS(-290), 6.1, { size: 0.7 });
        E.signAt('barn', S, sS(90), 6.1, { size: 0.85 });
        const p = E.player;
        E.setPlayer(-180, 1.6, 0, 38 / KMH);
        E.addPed({ from: [180.3, 6.5], to: [180.3, -5.2], crossing: c1, trigger: (E2) => E2.player.x > 141, delay: 0, speed: 1.6, color: 0xf2c94c });
        E.addPed({ from: [419.7, -4.6], to: [419.7, 7.0], crossing: c2, trigger: (E2) => E2.player.x > 362, delay: 0.6, speed: 1.15 });
        E.addSpawner({ path: Sr, off: 1.6, rate: 420, v: [37, 43], minGap: 25 });
        let apprMax = 0, stopEval = false;
        return {
          limit: 40,
          start() { E.instruct('Kjør rett fram gjennom gata.'); },
          offroadTitle: 'Du traff fortauskanten eller en parkert bil',
          update() {
            const kmh = p.v * KMH;
            if (p.x > 130 && p.x < 172) apprMax = Math.max(apprMax, kmh);
            if (p.x > 110 && p.x < 160 && kmh > 32) E.coach('fart', 'Varebilen skjuler gangfeltet. Senk farten.', 6);
            if (p.x > 175 && !this._e1) {
              this._e1 = true;
              if (apprMax > 36) E.prot.add('Fart', 'minor', `For høy fart der sikten mot gangfeltet var skjult (${Math.round(apprMax)} km/t)`, 'Parkerte biler kan skjule gående, ofte barn. Senk farten slik at du kan stoppe.');
              else E.prot.add('Fart', 'good', 'Tilpasset farten mot gangfeltet med skjult sikt');
            }
            if (!stopEval && p.x > 360 && p.x < 417 && p.v < 0.3) {
              stopEval = true;
              const d = 420 - 1.5 - (p.x + p.len / 2);
              if (d < 1.0) E.prot.add('Plassering', 'minor', 'Stoppet for nær gangfeltet', 'Stopp noen meter før, slik at den gående føler seg trygg og ser at du har stoppet.');
              else if (d < 14) E.prot.add('Plassering', 'good', `Stoppet i god avstand (${d.toFixed(0)} m før gangfeltet)`);
            }
            if (p.x > 600) E.finish();
          },
        };
      },
    };
  }

  // ---------------------------------------------------------------
  // LANDEVEG: forbikjøring og mørkekjøring
  // ---------------------------------------------------------------
  function buildCountry(E, opts) {
    const C = new Path(SIM.curvy(0, 0, 0, [{ L: 300 }, { L: 250, k: 1 / 700 }, { L: 600 }, { L: 260, k: -1 / 600 }, { L: 300 }, { L: 250, k: 1 / 800 }, { L: 520 }]), { name: 'C' });
    const Cr = C.reversed('Cr');
    const solid = [[240, 610], [1090, 1470], [1650, 2020]];
    const varsel = [[140, 240], [610, 710], [990, 1090], [1470, 1570], [1550, 1650], [2020, 2120]];
    const zone = (s) => (solid.some(([a, b]) => s >= a && s <= b) ? 'solid' : varsel.some(([a, b]) => s >= a && s <= b) ? 'varsel' : 'skille');
    E.addRoad(C, -3.6, 3.6, 'asphalt');
    E.gb.ribbon('gravel', C, 0, C.length, 3.6, 4.4, 0.01); E.gb.ribbon('gravel', C, 0, C.length, -4.4, -3.6, 0.01);
    E.gb.solid('white', C, 0, C.length, 3.15, 0.12); E.gb.solid('white', C, 0, C.length, -3.15, 0.12);
    // midtlinje etter sone
    let s = 0;
    while (s < C.length) {
      const z = zone(s);
      let e = s; while (e < C.length && zone(e) === z) e += 1;
      if (z === 'solid') E.gb.solid('yellow', C, s, e, 0, 0.12);
      else if (z === 'varsel') E.gb.dashes('yellow', C, s, e, 0, 0.12, 9, 3);
      else E.gb.dashes('yellow', C, s, e, 0, 0.12, 3, 9);
      s = e;
    }
    forestAlong(E, C, 9, 40, 5.5, { gaps: 0.08, birch: 0.22 });
    // kantstolper med refleks
    const posts = [], refl = [];
    for (let q = 10; q < C.length; q += 50) for (const sd of [-1, 1]) { const [x, z] = C.at(q, sd * 4.7); posts.push([x, 0.5, z]); refl.push([x, 0.85, z]); }
    SIM.instanced(E.scene, new THREE.BoxGeometry(0.12, 1.0, 0.12), new THREE.MeshPhongMaterial({ color: 0xf2f2f2 }), posts);
    SIM.instanced(E.scene, new THREE.BoxGeometry(0.14, 0.12, 0.14), new THREE.MeshPhongMaterial({ color: 0xffdd55, emissive: E.night ? 0x221800 : 0 }), refl);
    E.signAt('fart-80', C, 12, 5.0, { size: 0.75 });
    return { C, Cr, zone, solid, varsel };
  }

  function overtakeScenario() {
    return {
      id: 'forbikjoring', base: 'forbikjoring', group: 'Landeveg', level: 'Krevende', title: 'Forbikjøring av traktor', icon: 'forbikjoring-forbudt',
      desc: 'Svingete landeveg med fartsgrense 80. Foran deg kjører en traktor i 28 km/t. Det er møtende trafikk og både sperrelinjer og varsellinjer.',
      task: 'Vurder om og når det er trygt å kjøre forbi. Kryss aldri sperrelinjen. Bruk speil, blinklys og skulderblikk, ikke kjør over fartsgrensen, og gå inn igjen med god avstand. Det er også riktig å la være.',
      tips: ['Er du i tvil, er du ikke i tvil: ikke kjør forbi.', 'Sperrelinjen kan ikke krysses.', 'Du må se at strekningen er fri lang nok, med god margin til møtende.', 'Gå inn igjen når du ser traktoren i innvendig speil.', 'Hold avstand bak traktoren, slik at du ser forbi den.'],
      build(E) {
        const W = buildCountry(E, {});
        const { C, Cr, zone } = W;
        const tractor = E.spawn({ path: C, s: 600, off: 1.65, v0: 28 / KMH, v: 28 / KMH, type: 'tractor' });
        E.addSpawner({ path: Cr, off: 1.65, rate: 300, v: [72, 84], minGap: 60, truckShare: 0.12, prefillFrom: C.length - 2400, prefillTo: C.length - 300 });
        const fs = C.frame(470);
        E.setPlayer(fs.x + fs.nx * 1.65, fs.z + fs.nz * 1.65, fs.h, 60 / KMH);
        const p = E.player;
        let hint = 470, over = false, minTTC = 99, overZoneBad = null, followT = 0, overtook = false;
        return {
          limit: 80, C, allowLongBlink: false,
          start() { E.instruct('Følg vegen. Kjør forbi traktoren bare hvis du kan gjøre det trygt.'); },
          offroadTitle: 'Du kjørte av vegen',
          laneOf() { const pr = C.projectNear(p.x, p.z, hint, 30); return laneHyst(pr.lat, p.lane, [0.35], 0.45); },
          onLane(a, b, dir) {
            if (dir === 'L') { E.checkManeuver('L', 'utkjøring til forbikjøring', { verb: 'kjører ut for å kjøre forbi', sevShoulder: 'minor' }); over = true; minTTC = 99; overZoneBad = null; }
            else {
              E.checkManeuver('R', 'innkjøring etter forbikjøring', { verb: 'går inn igjen', needShoulder: false });
              over = false;
              const ahead = hint - tractor.s - (p.len + tractor.len) / 2;
              if (ahead > 0) {
                overtook = true;
                if (ahead < 6) E.prot.add('Samhandling', 'major', `Gikk for tidlig inn foran traktoren (${ahead.toFixed(0)} m)`, 'Vent til du ser hele kjøretøyet i innvendig speil.');
                else if (ahead < 12) E.prot.add('Samhandling', 'minor', `Kort avstand da du gikk inn igjen (${ahead.toFixed(0)} m)`, 'Gå inn igjen når du ser kjøretøyet i innvendig speil.');
                else E.prot.add('Samhandling', 'good', 'Gikk inn igjen med god avstand');
              }
              if (minTTC < 2.0) E.prot.add('Risiko', 'critical', 'Livsfarlig forbikjøring', `Det var bare ${minTTC.toFixed(1)} s til møtende bil. Det kunne gitt en frontkollisjon.`);
              else if (minTTC < 4) E.prot.add('Risiko', 'major', 'Farlig liten margin til møtende', `${minTTC.toFixed(1)} s til møtende. Du må se at strekningen er fri lang nok.`);
              else if (minTTC < 6.5) E.prot.add('Risiko', 'minor', 'Knapp margin til møtende', `${minTTC.toFixed(1)} s. Velg lengre luker.`);
              else if (ahead > 0) E.prot.add('Risiko', 'good', 'Trygg margin til møtende trafikk');
              if (overZoneBad === 'varsel') E.prot.add('Risiko', 'minor', 'Forbikjøring ved varsellinje', 'Varsellinjen betyr at sperrelinje eller dårlig sikt kommer snart.');
            }
            return true;
          },
          update(dt) {
            const pr = C.projectNear(p.x, p.z, hint, 40); hint = pr.s;
            const kmh = p.v * KMH, z = zone(pr.s);
            if (pr.lat - p.wid / 2 < -0.15 && z === 'solid') E.prot.once('sperre', 'Plassering', 'major', 'Krysset sperrelinjen', 'Du kan ikke krysse eller kjøre til venstre for en sperrelinje.');
            if (over) {
              if (z === 'varsel' && !overZoneBad) overZoneBad = 'varsel';
              if (kmh > 85) E.prot.once('overfart', 'Fart', 'minor', 'Over fartsgrensen under forbikjøring', 'Du kan ikke overskride fartsgrensen for å kjøre forbi.');
              for (const a of E.vehicles) {
                if (a.path !== Cr) continue;
                const sOn = C.length - a.s;
                const ds = sOn - pr.s - (a.len + p.len) / 2;
                if (ds > 0 && ds < 600) minTTC = Math.min(minTTC, ds / Math.max(p.v + a.v, 1));
              }
            } else if (pr.lat < 0.9 && pr.lat > 0.2 && z === 'solid') E.prot.once('kapp', 'Plassering', 'minor', 'Kappet svingen over midtlinjen', 'Hold deg i ditt eget felt i svingene.');
            const gapT = hint - tractor.s - (p.len + tractor.len) / 2;
            if (!over && gapT > 0 && gapT < 9 && p.v > 3) { followT += dt; if (followT > 6) E.prot.once('naer', 'Plassering', 'minor', 'Lå for tett bak traktoren', 'Hold avstand, slik at du ser forbi kjøretøyet og kan vurdere forbikjøring.'); } else followT = 0;
            if (!over && z === 'skille' && gapT > 0 && gapT < 60) E.coach('vurder', 'Skillelinje: forbikjøring kan være lov. Er det langt nok fri sikt og ingen møtende?', 14);
            if ((overtook && hint > tractor.s + 160 && !over) || hint > C.length - 120) {
              if (!overtook) E.prot.add('Risiko', 'good', 'Lot være å kjøre forbi uten trygg luke');
              E.finish();
            }
          },
        };
      },
    };
  }

  function nightScenario() {
    return {
      id: 'morke', base: 'morke', group: 'Landeveg', level: 'Krevende', title: 'Mørkekjøring og elg', icon: 'elg', night: true,
      desc: 'Landeveg i mørket med fartsgrense 80. Det er skog tett inntil vegen og fare for elg. Du møter biler, og du tar igjen en bil foran deg.',
      task: 'Bruk fjernlys når vegen er fri, og blend av i god tid for møtende og når du kjører bak noen. Tilpass farten til det du ser. Vær klar for vilt.',
      tips: ['Med nærlys ser du bare 30–40 m. Det er kortere enn stopplengden i 80 km/t.', 'Blend av før du blender andre, både møtende og forankjørende.', 'Ved elg: brems kraftig og hold retningen.'],
      build(E) {
        const W = buildCountry(E, {});
        const { C, Cr } = W;
        E.signAt('elg', C, 1700, 5.0, { size: 0.9 });
        E.addSpawner({ path: Cr, off: 1.65, rate: 170, v: [74, 84], minGap: 120, prefillFrom: C.length - 2300, prefillTo: C.length - 400 });
        const lead = E.spawn({ path: C, s: 430, off: 1.65, v0: 62 / KMH, v: 62 / KMH, type: 'car' });
        const fs = C.frame(60);
        E.setPlayer(fs.x + fs.nx * 1.65, fs.z + fs.nz * 1.65, fs.h, 70 / KMH);
        const p = E.player; p.high = false;
        // elg
        const mf = C.frame(2085);
        const moose = { x: mf.x + mf.nx * 10, z: mf.z + mf.nz * 10, mesh: SIM.makeMoose(), state: 'wait', h: 0 };
        moose.to = [mf.x - mf.nx * 9, mf.z - mf.nz * 9];
        moose.h = Math.atan2(moose.to[1] - moose.z, moose.to[0] - moose.x);
        moose.mesh.position.set(moose.x, 0, moose.z); moose.mesh.rotation.y = -moose.h;
        E.scene.add(moose.mesh); E.moose.push(moose);
        let hint = 60, minNear = 99, evalM = false;
        return {
          limit: 80, C,
          start() { E.instruct('Følg vegen. Det er mørkt, så husk lysbruken.'); },
          offroadTitle: 'Du kjørte av vegen',
          update(dt) {
            const pr = C.projectNear(p.x, p.z, hint, 40); hint = pr.s;
            if (moose.state === 'wait' && hint > 1975) moose.state = 'walk';
            if (moose.state === 'walk') {
              const dx = moose.to[0] - moose.x, dz = moose.to[1] - moose.z, d = Math.hypot(dx, dz);
              const sp = d > 11 ? 1.6 : 1.0;
              if (d < 0.2) moose.state = 'done'; else { moose.x += (dx / d) * sp * dt; moose.z += (dz / d) * sp * dt; }
              moose.mesh.position.set(moose.x, 0, moose.z);
            }
            const dm = Math.hypot(moose.x - p.x, moose.z - p.z);
            if (hint > 1990 && hint < 2085) minNear = Math.min(minNear, p.v);
            if (!evalM && hint > 2090) { evalM = true; if (minNear < 50 / KMH) E.prot.add('Risiko', 'good', 'Reagerte riktig på elgen', 'Du senket farten og unngikk kollisjon.'); else E.prot.add('Risiko', 'minor', 'Høy fart forbi elgen', 'Du passerte elgen i høy fart. Vær klar til å stoppe, siden dyr er uforutsigbare.'); }
            if (dm < 70 && moose.state !== 'wait') E.coach('elg', 'Elg ved vegen! Brems og hold retningen.', 10);
            if (hint > 2330) {
              const ft = E._freeT || 0, ht = E._highFreeT || 0;
              if (ft > 15) { if (ht / ft >= 0.55) E.prot.add('Kommunikasjon', 'good', 'Brukte fjernlys når vegen var fri', `Fjernlys ${Math.round((ht / ft) * 100)} % av tiden vegen var fri.`); else E.prot.add('Kommunikasjon', 'minor', 'Brukte for lite fjernlys', `Fjernlys bare ${Math.round((ht / ft) * 100)} % av tiden vegen var fri. Med nærlys ser du for kort i 80 km/t.`); }
              if (!E.prot.keys['blend']) E.prot.add('Kommunikasjon', 'good', 'Blendet av i god tid');
              E.finish();
            }
            void lead;
          },
        };
      },
    };
  }

  KA.scenarios = [
    rightRuleScenario(),
    crossingScenario(),
    roundaboutScenario(),
    zipperScenario(),
    motorwayOnScenario('lett'),
    motorwayOnScenario('middels'),
    motorwayOnScenario('tett'),
    motorwayOffScenario(),
    overtakeScenario(),
    nightScenario(),
  ];
  KA.scenarioById = {};
  KA.scenarios.forEach((s) => (KA.scenarioById[s.id] = s));
})();
