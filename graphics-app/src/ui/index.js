/**
 * UI module — Polished glassmorphic overlay with working controls.
 *
 * Controls:
 *   - Seed input + Regenerate (dispatches ui:regenerateSeed → main.js listens)
 *   - Time-of-day presets (Dawn / Day / Sunset / Night)
 *   - Sun elevation & azimuth sliders
 *   - Fog density slider
 *   - Bloom strength slider
 *   - FPS stats toggle
 *   - Collapsible keyboard-controls help
 */

export default function createUI(env, scene, options = {}) {
  const { postprocessing, stats } = options;

  // ── Root panel ─────────────────────────────────────────────────────
  const root = document.createElement('div');
  root.id = 'control-panel';

  // ── Title bar ──────────────────────────────────────────────────────
  const titleBar = document.createElement('div');
  titleBar.className = 'cp-title-bar';

  const titleText = document.createElement('span');
  titleText.className = 'cp-title';
  titleText.textContent = 'Terrain Explorer';
  titleBar.appendChild(titleText);

  const collapseBtn = document.createElement('button');
  collapseBtn.className = 'cp-collapse-btn';
  collapseBtn.textContent = '—';
  collapseBtn.title = 'Collapse panel';
  titleBar.appendChild(collapseBtn);
  root.appendChild(titleBar);

  // ── Collapsible body ───────────────────────────────────────────────
  const body = document.createElement('div');
  body.className = 'cp-body';

  let collapsed = false;
  collapseBtn.onclick = () => {
    collapsed = !collapsed;
    body.style.display = collapsed ? 'none' : '';
    collapseBtn.textContent = collapsed ? '+' : '—';
  };

  // ──────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────

  function section(title) {
    const el = document.createElement('div');
    el.className = 'cp-section-title';
    el.textContent = title;
    body.appendChild(el);
  }

  function row(label, control, valueDisplay) {
    const wrap = document.createElement('div');
    wrap.className = 'cp-row';

    const lbl = document.createElement('label');
    lbl.className = 'cp-label';
    lbl.textContent = label;
    wrap.appendChild(lbl);

    if (valueDisplay) {
      lbl.appendChild(valueDisplay);
    }

    wrap.appendChild(control);
    body.appendChild(wrap);
    return wrap;
  }

  function valueSpan(initial) {
    const sp = document.createElement('span');
    sp.className = 'cp-value';
    sp.textContent = initial;
    return sp;
  }

  function slider(min, max, step, value) {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    return input;
  }

  // ──────────────────────────────────────────────────────────────────
  // 1. Seed
  // ──────────────────────────────────────────────────────────────────
  section('World Seed');

  const seedRow = document.createElement('div');
  seedRow.className = 'cp-seed-row';

  const seedInput = document.createElement('input');
  seedInput.type = 'text';
  seedInput.id = 'seed-input';
  seedInput.className = 'cp-seed-input';
  seedInput.value = 'demo-seed';
  seedInput.placeholder = 'Enter seed…';
  seedRow.appendChild(seedInput);

  const regenBtn = document.createElement('button');
  regenBtn.id = 'btn-regenerate';
  regenBtn.className = 'cp-btn cp-btn-primary';
  regenBtn.textContent = 'Generate';
  regenBtn.onclick = () => {
    const seed = seedInput.value.trim() || 'demo-seed';
    window.dispatchEvent(new CustomEvent('ui:regenerateSeed', { detail: { seed } }));
  };
  seedRow.appendChild(regenBtn);

  const randomBtn = document.createElement('button');
  randomBtn.id = 'btn-random-seed';
  randomBtn.className = 'cp-btn cp-btn-secondary';
  randomBtn.textContent = '🎲';
  randomBtn.title = 'Random seed';
  randomBtn.onclick = () => {
    const randSeed = Math.random().toString(36).substring(2, 10);
    seedInput.value = randSeed;
    window.dispatchEvent(new CustomEvent('ui:regenerateSeed', { detail: { seed: randSeed } }));
  };
  seedRow.appendChild(randomBtn);

  body.appendChild(seedRow);

  // ──────────────────────────────────────────────────────────────────
  // 2. Time-of-day presets
  // ──────────────────────────────────────────────────────────────────
  section('Time of Day');

  const presetRow = document.createElement('div');
  presetRow.className = 'cp-preset-row';

  const presets = [
    { label: '🌅 Dawn', elev: 8, azim: 80 },
    { label: '☀️ Day', elev: 50, azim: 200 },
    { label: '🌇 Sunset', elev: 5, azim: 290 },
    { label: '🌙 Night', elev: -5, azim: 180 },
  ];

  presets.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'cp-btn cp-btn-preset';
    btn.textContent = p.label;
    btn.onclick = () => {
      elevSlider.value = String(p.elev);
      azimSlider.value = String(p.azim);
      elevVal.textContent = p.elev;
      azimVal.textContent = p.azim;
      env.update(p.elev, p.azim);
    };
    presetRow.appendChild(btn);
  });
  body.appendChild(presetRow);

  // ──────────────────────────────────────────────────────────────────
  // 3. Sun controls
  // ──────────────────────────────────────────────────────────────────
  section('Sun Position');

  const elevVal = valueSpan('45');
  const elevSlider = slider(-10, 90, 1, 45);
  elevSlider.id = 'slider-elevation';
  elevSlider.oninput = () => {
    elevVal.textContent = elevSlider.value;
    env.update(Number(elevSlider.value), Number(azimSlider.value));
  };
  row('Elevation', elevSlider, elevVal);

  const azimVal = valueSpan('200');
  const azimSlider = slider(0, 360, 1, 200);
  azimSlider.id = 'slider-azimuth';
  azimSlider.oninput = () => {
    azimVal.textContent = azimSlider.value;
    env.update(Number(elevSlider.value), Number(azimSlider.value));
  };
  row('Azimuth', azimSlider, azimVal);

  // ──────────────────────────────────────────────────────────────────
  // 4. Atmosphere
  // ──────────────────────────────────────────────────────────────────
  section('Atmosphere');

  const fogVal = valueSpan('0.0004');
  const fogSlider = slider(0, 0.003, 0.0001, env.getFogDensity());
  fogSlider.id = 'slider-fog';
  fogSlider.oninput = () => {
    const v = Number(fogSlider.value);
    fogVal.textContent = v.toFixed(4);
    env.setFogDensity(v);
  };
  row('Fog Density', fogSlider, fogVal);

  if (postprocessing) {
    const bloomVal = valueSpan(postprocessing.getBloomStrength().toFixed(2));
    const bloomSlider = slider(0, 1.5, 0.01, postprocessing.getBloomStrength());
    bloomSlider.id = 'slider-bloom';
    bloomSlider.oninput = () => {
      const v = Number(bloomSlider.value);
      bloomVal.textContent = v.toFixed(2);
      postprocessing.setBloomStrength(v);
    };
    row('Bloom', bloomSlider, bloomVal);
  }

  // ──────────────────────────────────────────────────────────────────
  // 5. Toggles
  // ──────────────────────────────────────────────────────────────────
  section('Display');

  if (stats) {
    const statsToggle = document.createElement('div');
    statsToggle.className = 'cp-row cp-toggle-row';

    const statsLabel = document.createElement('label');
    statsLabel.className = 'cp-label';
    statsLabel.textContent = 'FPS Counter';

    const statsCheck = document.createElement('input');
    statsCheck.type = 'checkbox';
    statsCheck.id = 'toggle-fps';
    statsCheck.checked = true;
    statsCheck.className = 'cp-checkbox';
    statsCheck.onchange = () => {
      stats.dom.style.display = statsCheck.checked ? '' : 'none';
    };

    statsToggle.appendChild(statsLabel);
    statsToggle.appendChild(statsCheck);
    body.appendChild(statsToggle);
  }

  // ── Coordinate HUD toggle ───────────────────────────────────────
  {
    const hudToggle = document.createElement('div');
    hudToggle.className = 'cp-row cp-toggle-row';

    const hudLabel = document.createElement('label');
    hudLabel.className = 'cp-label';
    hudLabel.textContent = 'Coordinates';

    const hudCheck = document.createElement('input');
    hudCheck.type = 'checkbox';
    hudCheck.id = 'toggle-coords';
    hudCheck.checked = true;
    hudCheck.className = 'cp-checkbox';
    hudCheck.onchange = () => {
      const hud = window.__coordHud || document.getElementById('coord-hud');
      if (hud) {
        hud.classList.toggle('hidden', !hudCheck.checked);
      }
    };

    hudToggle.appendChild(hudLabel);
    hudToggle.appendChild(hudCheck);
    body.appendChild(hudToggle);
  }
  // ── Rain Toggle ───────────────────────────────────────
{
  const rainToggle = document.createElement('div');
  rainToggle.className = 'cp-row cp-toggle-row';

  const rainLabel = document.createElement('label');
  rainLabel.className = 'cp-label';
  rainLabel.textContent = 'Rain Effects';

  const rainCheck = document.createElement('input');
  rainCheck.type = 'checkbox';
  rainCheck.id = 'toggle-rain';
  rainCheck.checked = false;
  rainCheck.className = 'cp-checkbox';

  rainCheck.onchange = () => {
    window.dispatchEvent(
      new CustomEvent('ui:toggleRain', {
        detail: { enabled: rainCheck.checked }
      })
    );
  };

  rainToggle.appendChild(rainLabel);
  rainToggle.appendChild(rainCheck);

  body.appendChild(rainToggle);
}

  // ──────────────────────────────────────────────────────────────────
  // 6. Controls help
  // ──────────────────────────────────────────────────────────────────
  section('Keyboard Controls');

  const controlsList = document.createElement('div');
  controlsList.className = 'cp-controls-list';
  controlsList.innerHTML = `
    <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Move</div>
    <div><kbd>Space</kbd> Ascend · <kbd>C</kbd> Descend</div>
    <div><kbd>Shift</kbd> Sprint · <kbd>Esc</kbd> Release cursor</div>
  `;
  body.appendChild(controlsList);

  // ── Exit Button ──────────────────────────────────────────────────
  const exitBtn = document.createElement('button');
  exitBtn.className = 'cp-btn cp-btn-danger';
  exitBtn.textContent = 'Exit to Title Screen';
  exitBtn.style.marginTop = '16px';
  exitBtn.onclick = () => {
    window.dispatchEvent(new CustomEvent('ui:exitToMenu'));
  };
  body.appendChild(exitBtn);

  // ── Credits ────────────────────────────────────────────────────────
  const credits = document.createElement('div');
  credits.className = 'cp-credits';
  credits.textContent = 'CS 428 — Terrain Explorer';
  body.appendChild(credits);

  // ── Mount ──────────────────────────────────────────────────────────
  root.appendChild(body);
  document.body.appendChild(root);

  // ── Public API ─────────────────────────────────────────────────────
  return {
    root,
    setSeed(v) { seedInput.value = String(v); },
    setFog(v) {
      fogSlider.value = String(v);
      fogVal.textContent = Number(v).toFixed(4);
      env.setFogDensity(Number(v));
    },
    setSun(e, a) {
      elevSlider.value = String(e);
      azimSlider.value = String(a);
      elevVal.textContent = e;
      azimVal.textContent = a;
      env.update(e, a);
    },
  };
}