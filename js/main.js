import { CITIES, getCity } from './cities/registry.js';
import { getTaxiStyle } from './taxi-styles.js';
import { EXPORT_BUILDINGS } from './exports/building-catalog.js';
import {
  DISTRICTS,
  DISTRICT_REGIONS,
  getStoredSelectedDistricts,
  saveSelectedDistricts
} from './cities/hongkong/districts.js';

// Lightweight application entry. Keep the home screen independent of Three.js and city-pack
// imports so the picker still renders when a runtime module or graphics dependency is unavailable.

let appPromise = null;
let launching = false;

function setPickerStatus(message = '', isError = false) {
  const status = document.getElementById('city-picker-status');
  if (!status) return;
  status.textContent = message;
  status.hidden = !message;
  status.dataset.error = String(isError);
}

function renderCityCards() {
  const list = document.getElementById('city-cards');
  if (!list) return;
  list.replaceChildren();
  for (const city of CITIES) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'city-card';
    card.dataset.city = city.id;

    const cta = document.createElement('span');
    cta.className = 'city-card-cta';
    cta.textContent = '進入香港';
    const english = document.createElement('span');
    english.className = 'city-card-english';
    english.textContent = 'ENTER THE CITY';
    const arrow = document.createElement('span');
    arrow.className = 'city-card-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '↗';
    card.setAttribute('aria-label', `進入 ${city.name}`);
    // Keep the taxi style lookup local to the selected city, without adding another choice to the cover.
    const taxiStyle = getTaxiStyle(city.taxiStyle);
    if (taxiStyle) card.dataset.taxiStyle = city.taxiStyle;
    card.append(cta, english, arrow);
    if (taxiStyle) {
      const taxi = document.createElement('span');
      taxi.className = 'city-card-taxi';
      const dot = document.createElement('span');
      dot.className = 'city-card-taxi-dot';
      dot.style.background = `#${taxiStyle.paint.toString(16).padStart(6, '0')}`;
      dot.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = taxiStyle.label;
      taxi.append(dot, label);
      card.appendChild(taxi);
    }
    card.addEventListener('click', () => selectCity(city.id));
    list.appendChild(card);
  }
}

async function selectCity(cityId) {
  const city = getCity(cityId);
  if (!city || launching) return;
  launching = true;
  setPickerStatus(`Loading ${city.name}…`);
  const overlay = document.getElementById('loading-overlay');
  const start = document.getElementById('start-overlay');
  const status = document.getElementById('loading-status');
  if (status) status.textContent = '載入程式中（無法取得下載百分比）…';
  overlay?.querySelector('.loader-track')?.classList.add('is-indeterminate');
  overlay?.classList.remove('hidden');
  start?.classList.add('hidden');
  try {
    // Allow the loading screen to paint before fetching/parsing the large runtime.
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    appPromise ??= import('./app.runtime.js');
    const app = await appPromise;
    const selectedDistricts = getStoredSelectedDistricts();
    await app.startCity(cityId, { selectedDistricts });
  } catch (error) {
    console.error('[boot]', error);
    appPromise = null;
    overlay?.classList.add('hidden');
    start?.classList.remove('hidden');
    setPickerStatus(`Could not load ${city.name}. Reload and try again; check the browser console if the problem continues.`, true);
  } finally {
    launching = false;
  }
}

renderCityCards();

function renderDistrictPicker() {
  const grid = document.getElementById('district-grid');
  const summary = document.getElementById('district-summary');
  if (!grid) return;

  let currentSelected = new Set(getStoredSelectedDistricts());

  function updateSummary() {
    const total = DISTRICTS.length;
    const selectedCount = DISTRICTS.filter((d) => currentSelected.has(d.id)).length;
    if (summary) {
      summary.textContent = `已選擇 ${selectedCount} / ${total} 區`;
    }
    document.querySelectorAll('.district-presets .preset-btn').forEach((btn) => {
      const preset = btn.dataset.preset;
      if (preset === 'all') {
        btn.classList.toggle('active', selectedCount === total);
      } else if (preset === 'clear') {
        btn.classList.toggle('active', selectedCount === 0);
      } else if (DISTRICT_REGIONS[preset]) {
        const pSet = DISTRICT_REGIONS[preset];
        const allInPreset = pSet.every((id) => currentSelected.has(id));
        const onlyPreset = allInPreset && selectedCount === pSet.length;
        btn.classList.toggle('active', onlyPreset);
      }
    });
  }

  grid.replaceChildren();
  for (const d of DISTRICTS) {
    const item = document.createElement('label');
    item.className = 'district-card';
    const isChecked = currentSelected.has(d.id);
    if (isChecked) item.classList.add('is-checked');

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = d.id;
    input.checked = isChecked;
    input.className = 'district-checkbox';

    const content = document.createElement('div');
    content.className = 'district-info';

    const headerRow = document.createElement('div');
    headerRow.className = 'district-name-row';

    const name = document.createElement('span');
    name.className = 'district-name';
    name.textContent = d.name;

    const count = document.createElement('span');
    count.className = 'district-count';
    count.textContent = `${d.landmarkCount} 地標`;

    headerRow.append(name, count);

    const sub = document.createElement('span');
    sub.className = 'district-english';
    sub.textContent = d.englishName;

    content.append(headerRow, sub);
    item.append(input, content);

    input.addEventListener('change', () => {
      if (input.checked) {
        currentSelected.add(d.id);
        item.classList.add('is-checked');
      } else {
        currentSelected.delete(d.id);
        item.classList.remove('is-checked');
      }
      saveSelectedDistricts(Array.from(currentSelected));
      updateSummary();
    });

    grid.appendChild(item);
  }

  document.querySelectorAll('.district-presets .preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = btn.dataset.preset;
      if (preset === 'all') {
        currentSelected = new Set(DISTRICTS.map((d) => d.id));
      } else if (preset === 'clear') {
        currentSelected.clear();
      } else if (DISTRICT_REGIONS[preset]) {
        currentSelected = new Set(DISTRICT_REGIONS[preset]);
      }
      grid.querySelectorAll('input.district-checkbox').forEach((input) => {
        input.checked = currentSelected.has(input.value);
        input.closest('.district-card')?.classList.toggle('is-checked', input.checked);
      });
      saveSelectedDistricts(Array.from(currentSelected));
      updateSummary();
    });
  });

  updateSummary();
}

renderDistrictPicker();

const modelSelect = document.getElementById('model-select');
const modelSearch = document.getElementById('model-search');
const modelStatus = document.getElementById('model-export-status');
const exportButtons = [
  { id: 'export-building', tsl: false },
  { id: 'export-building-tsl', tsl: true }
];
function updateModelOptions() {
  const previous = modelSelect.value;
  const query = modelSearch.value.trim().toLocaleLowerCase();
  const matches = EXPORT_BUILDINGS.filter(item => `${item.name} ${item.id}`.toLocaleLowerCase().includes(query));
  modelSelect.replaceChildren();
  for (const item of matches) {
    const option = document.createElement('option');
    option.value = item.id; option.textContent = item.name;
    modelSelect.appendChild(option);
  }
  if (matches.some(item => item.id === previous)) modelSelect.value = previous;
  modelStatus.textContent = matches.length ? `${matches.length} 個可匯出項目` : '找不到符合的建物。';
  for (const { id } of exportButtons) document.getElementById(id).disabled = !matches.length;
}
if (modelSelect && modelSearch && modelStatus) {
  modelSearch.addEventListener('input', updateModelOptions);
  updateModelOptions();
}
for (const { id, tsl } of exportButtons) {
  const button = document.getElementById(id);
  button?.addEventListener('click', async () => {
    const selected = EXPORT_BUILDINGS.find(item => item.id === modelSelect.value);
    if (!selected) return;
    const buttons = exportButtons.map(item => document.getElementById(item.id)).filter(Boolean);
    buttons.forEach(item => { item.disabled = true; });
    modelSelect.disabled = modelSearch.disabled = true;
    modelStatus.textContent = `正在載入及建立 ${selected.name}…大型模型可能需要較長時間。`;
    try {
      await new Promise(resolve => setTimeout(resolve, 0));
      const { createBuildingExport } = await import('./exports/building-export.js');
      const json = await createBuildingExport(selected.id, { tsl });
      const url = URL.createObjectURL(new Blob([JSON.stringify(json)], { type: 'application/json' }));
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `${selected.id}${tsl ? '-tsl-experimental' : '-threejs'}.json`;
        document.body.appendChild(link); link.click(); link.remove();
      } finally { setTimeout(() => URL.revokeObjectURL(url), 60000); }
      modelStatus.textContent = tsl
        ? `${selected.name} TSL 檔案已準備；Editor 普通匯入器不支援節點材質。`
        : `${selected.name} 已準備下載。可在 Three.js Editor 選 File → Import。材質及燈光可能有簡化。`;
    } catch (error) {
      console.error('[model export]', error);
      modelStatus.textContent = `匯出 ${selected.name} 失敗：${error.message || '請重試並查看瀏覽器 console'}`;
    } finally {
      modelSelect.disabled = modelSearch.disabled = false;
      buttons.forEach(item => { item.disabled = false; });
    }
  });
}

// Direct links start through the same lightweight loader as the cards.
const requestedCity = new URLSearchParams(window.location.search).get('city');
if (requestedCity) {
  if (getCity(requestedCity)) selectCity(requestedCity);
  else setPickerStatus(`Unknown city “${requestedCity}”. Enter Hong Kong below.`, true);
}
