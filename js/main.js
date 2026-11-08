import { CITIES, getCity } from './cities/registry.js';
import { getTaxiStyle } from './taxi-styles.js';
import { EXPORT_BUILDINGS } from './exports/building-catalog.js';

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
    card.addEventListener('click', () => selectCity(city.id));
    list.appendChild(card);
  }
}

async function selectCity(cityId) {
  const city = getCity(cityId);
  if (!city || launching) return;
  launching = true;
  setPickerStatus(`Loading ${city.name}…`);
  try {
    appPromise ??= import('./app.runtime.js');
    const app = await appPromise;
    await app.startCity(cityId);
  } catch (error) {
    console.error('[boot]', error);
    appPromise = null;
    setPickerStatus(`Could not load ${city.name}. Reload and try again; check the browser console if the problem continues.`, true);
  } finally {
    launching = false;
  }
}

renderCityCards();

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
