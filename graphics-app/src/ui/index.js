/**
 * UI module -- React overlay for user controls.
 *
 * Planned exports:
 *   initUI(root)  - mount the React UI into the given DOM element
 *
 * Planned controls:
 *   - Seed input
 *   - Time-of-day slider
 *   - Fog / visibility controls
 *   - Weather intensity
 *   - Debug toggles
 */

export default function createUI(env, scene) {
  // container
  const root = document.createElement('div');
  root.id = 'overlay-controls';
  root.style.cssText = [
    'position:fixed',
    'right:12px',
    'top:12px',
    'padding:10px',
    'background:rgba(20,20,20,0.65)',
    'color:#fff',
    'font-family:system-ui, sans-serif',
    'font-size:13px',
    'border-radius:8px',
    'z-index:9999',
    'min-width:180px'
  ].join(';');

  // helper to create labeled control
  function labeled(labelText, control) {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '8px';
    const label = document.createElement('div');
    label.textContent = labelText;
    label.style.marginBottom = '4px';
    wrap.appendChild(label);
    wrap.appendChild(control);
    return wrap;
  }

  // Seed input + button (dispatches event for terrain regeneration)
  const seedInput = document.createElement('input');
  seedInput.type = 'number';
  seedInput.value = 123;
  seedInput.style.width = '100%';
  const regenBtn = document.createElement('button');
  regenBtn.textContent = 'Regenerate';
  regenBtn.style.marginTop = '6px';
  regenBtn.style.width = '100%';
  regenBtn.onclick = () => {
    const seed = Number(seedInput.value) || 0;
    window.dispatchEvent(new CustomEvent('ui:regenerateSeed', { detail: { seed } }));
  };
  const seedWrap = labeled('Seed', seedInput);
  seedWrap.appendChild(regenBtn);
  root.appendChild(seedWrap);

  // Fog slider
  const fogInput = document.createElement('input');
  fogInput.type = 'range';
  fogInput.min = '0';
  fogInput.max = '0.01';
  fogInput.step = '0.0001';
  fogInput.value = (scene.fog && scene.fog.density) ? scene.fog.density : 0.0015;
  fogInput.style.width = '100%';
  fogInput.oninput = () => {
    if (scene.fog && typeof scene.fog.density === 'number') {
      scene.fog.density = Number(fogInput.value);
    }
  };
  root.appendChild(labeled('Fog density', fogInput));

  // Sun elevation + azimuth
  const elevInput = document.createElement('input');
  elevInput.type = 'range';
  elevInput.min = '0';
  elevInput.max = '90';
  elevInput.step = '1';
  elevInput.value = '30';
  elevInput.style.width = '100%';
  const azimInput = document.createElement('input');
  azimInput.type = 'range';
  azimInput.min = '0';
  azimInput.max = '360';
  azimInput.step = '1';
  azimInput.value = '180';
  azimInput.style.width = '100%';

  function updateSun() {
    const e = Number(elevInput.value);
    const a = Number(azimInput.value);
    if (env && typeof env.update === 'function') env.update(e, a);
  }
  elevInput.oninput = updateSun;
  azimInput.oninput = updateSun;

  root.appendChild(labeled('Sun elevation', elevInput));
  root.appendChild(labeled('Sun azimuth', azimInput));

  // small credits / instructions
  const hint = document.createElement('div');
  hint.style.opacity = '0.8';
  hint.style.fontSize = '11px';
  hint.style.marginTop = '6px';
  hint.textContent = 'Seed: dispatches "ui:regenerateSeed" event';
  root.appendChild(hint);

  document.body.appendChild(root);

  // expose a simple API (optional)
  return {
    root,
    setSeed(v) { seedInput.value = String(v); },
    setFog(v) { fogInput.value = String(v); scene.fog && (scene.fog.density = Number(v)); },
    setSun(e, a) { elevInput.value = String(e); azimInput.value = String(a); updateSun(); }
  };
}