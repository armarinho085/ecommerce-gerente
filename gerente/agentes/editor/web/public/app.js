// ─── State ─────────────────────────────────────────────────────────────────
const state = {
  catalog: { file: null },
  color: { file: null },
  batch: { file: null },
};

// ─── Tabs ───────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.remove('hidden');
  });
});

// ─── Drop zones ──────────────────────────────────────────────────────────────
function setupDropZone({ zoneId, fileInputId, previewId, previewImgId, removeBtnId, stateKey, btnId }) {
  const zone = document.getElementById(zoneId);
  const fileInput = document.getElementById(fileInputId);
  const preview = document.getElementById(previewId);
  const previewImg = document.getElementById(previewImgId);
  const removeBtn = document.getElementById(removeBtnId);
  const btn = document.getElementById(btnId);

  function setFile(file) {
    state[stateKey].file = file;
    previewImg.src = URL.createObjectURL(file);
    zone.classList.add('hidden');
    preview.classList.remove('hidden');
    btn.disabled = false;
  }

  function clearFile() {
    state[stateKey].file = null;
    fileInput.value = '';
    preview.classList.add('hidden');
    zone.classList.remove('hidden');
    btn.disabled = true;
  }

  zone.addEventListener('click', () => fileInput.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
  });
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) setFile(fileInput.files[0]);
  });
  removeBtn.addEventListener('click', clearFile);
}

setupDropZone({ zoneId: 'drop-catalog', fileInputId: 'file-catalog', previewId: 'preview-catalog', previewImgId: 'preview-catalog-img', removeBtnId: 'remove-catalog', stateKey: 'catalog', btnId: 'btn-catalog' });
setupDropZone({ zoneId: 'drop-color',   fileInputId: 'file-color',   previewId: 'preview-color',   previewImgId: 'preview-color-img',   removeBtnId: 'remove-color',   stateKey: 'color',   btnId: 'btn-color' });
setupDropZone({ zoneId: 'drop-batch',   fileInputId: 'file-batch',   previewId: 'preview-batch',   previewImgId: 'preview-batch-img',   removeBtnId: 'remove-batch',   stateKey: 'batch',   btnId: 'btn-batch' });

// ─── Color picker sync (change-color tab) ────────────────────────────────────
const colorPicker = document.getElementById('color-picker');
const colorHex = document.getElementById('color-hex');

colorPicker.addEventListener('input', () => { colorHex.value = colorPicker.value; });
colorHex.addEventListener('input', () => {
  if (/^#[0-9A-Fa-f]{6}$/.test(colorHex.value)) colorPicker.value = colorHex.value;
});

// ─── Batch color list ─────────────────────────────────────────────────────────
function addColorRow(hex = '#BD162C', name = '') {
  const list = document.getElementById('color-list');
  const row = document.createElement('div');
  row.className = 'color-row-item';
  row.innerHTML = `
    <input type="color" value="${hex}">
    <input type="text" class="hex-input" value="${hex}" maxlength="7" placeholder="#000000">
    <input type="text" placeholder="nome da cor" value="${name}">
    <button class="btn-row-remove" title="Remover">&#10005;</button>
  `;

  const picker = row.querySelector('input[type="color"]');
  const hexInput = row.querySelector('.hex-input');

  picker.addEventListener('input', () => { hexInput.value = picker.value; });
  hexInput.addEventListener('input', () => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexInput.value)) picker.value = hexInput.value;
  });
  row.querySelector('.btn-row-remove').addEventListener('click', () => row.remove());

  list.appendChild(row);
}

document.getElementById('btn-add-color').addEventListener('click', () => addColorRow());
addColorRow('#BD162C', '');

function getBatchColors() {
  return Array.from(document.querySelectorAll('#color-list .color-row-item')).map(row => {
    const texts = row.querySelectorAll('input[type="text"]');
    return { hex: texts[0].value.trim(), name: texts[1].value.trim() };
  });
}

// ─── Result helpers ───────────────────────────────────────────────────────────
function showLoading(resultId, message) {
  document.getElementById(resultId).innerHTML = `
    <div class="result-loading">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>`;
}

function showError(resultId, message) {
  document.getElementById(resultId).innerHTML = `
    <div class="result-error">
      <div class="error-icon">&#9888;</div>
      <p>${message}</p>
    </div>`;
}

function showResultImage(resultId, base64, filename) {
  const src = `data:image/png;base64,${base64}`;
  document.getElementById(resultId).innerHTML = `
    <div class="result-image">
      <img src="${src}" alt="Resultado">
      <a class="btn-download" href="${src}" download="${filename}">Baixar imagem</a>
    </div>`;
}

function fileBaseName(file) {
  return file.name.replace(/\.[^.]+$/, '');
}

function toSlug(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

// ─── Generate catalog ─────────────────────────────────────────────────────────
document.getElementById('btn-catalog').addEventListener('click', async () => {
  const file = state.catalog.file;
  if (!file) return;

  showLoading('result-catalog', 'Gerando foto de catálogo… (30–60s)');

  const form = new FormData();
  form.append('image', file);

  try {
    const res = await fetch('/api/generate-catalog', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showResultImage('result-catalog', data.image, `${fileBaseName(file)}-catalogo.png`);
  } catch (e) {
    showError('result-catalog', e.message);
  }
});

// ─── Change color ─────────────────────────────────────────────────────────────
document.getElementById('btn-color').addEventListener('click', async () => {
  const file = state.color.file;
  const hex = colorHex.value.trim();
  const name = document.getElementById('color-name').value.trim();

  if (!file) return;
  if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) { showError('result-color', `Cor hex inválida: "${hex}"`); return; }
  if (!name) { showError('result-color', 'Digite o nome da cor.'); return; }

  showLoading('result-color', `Mudando cor para ${hex}… (20–40s)`);

  const form = new FormData();
  form.append('image', file);
  form.append('hexColor', hex);
  form.append('colorName', name);

  try {
    const res = await fetch('/api/change-color', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    showResultImage('result-color', data.image, `${fileBaseName(file)}-${toSlug(name)}.png`);
  } catch (e) {
    showError('result-color', e.message);
  }
});

// ─── Change color batch ───────────────────────────────────────────────────────
document.getElementById('btn-batch').addEventListener('click', async () => {
  const file = state.batch.file;
  if (!file) return;

  const colors = getBatchColors();
  if (colors.length === 0) { showError('result-batch', 'Adicione ao menos uma cor.'); return; }

  const invalidHex = colors.filter(c => !/^#[0-9A-Fa-f]{6}$/.test(c.hex));
  if (invalidHex.length) { showError('result-batch', `Cor hex inválida: ${invalidHex.map(c => c.hex).join(', ')}`); return; }

  const missingName = colors.filter(c => !c.name);
  if (missingName.length) { showError('result-batch', 'Todas as cores precisam ter um nome.'); return; }

  showLoading('result-batch', `Processando ${colors.length} cor(es)… aguarde`);

  const form = new FormData();
  form.append('image', file);
  form.append('colors', JSON.stringify(colors));

  try {
    const res = await fetch('/api/change-color-batch', { method: 'POST', body: form });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    renderBatchResults('result-batch', data.results, fileBaseName(file));
  } catch (e) {
    showError('result-batch', e.message);
  }
});

function renderBatchResults(resultId, results, baseName) {
  const ok = results.filter(r => r.ok).length;
  let html = `<p class="batch-summary">${ok} de ${results.length} gerada(s) com sucesso</p><div class="batch-grid">`;

  for (const item of results) {
    const slug = toSlug(item.name);
    if (item.ok) {
      const src = `data:image/png;base64,${item.image}`;
      html += `
        <div class="batch-item">
          <img class="batch-item-img" src="${src}" alt="${item.name}">
          <div class="batch-item-info">
            <div class="batch-item-swatch" style="background:${item.hex}"></div>
            <span class="batch-item-name">${item.name}</span>
            <a class="batch-item-dl" href="${src}" download="${baseName}-${slug}.png">&#8595;</a>
          </div>
        </div>`;
    } else {
      html += `
        <div class="batch-item">
          <div class="batch-item-error"><strong>${item.name}</strong>: ${item.error}</div>
        </div>`;
    }
  }

  html += `</div>`;
  document.getElementById(resultId).innerHTML = html;
}
