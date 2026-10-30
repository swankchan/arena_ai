import { CITIES, getCity } from './cities/registry.js';
import { getTaxiStyle } from './taxi-styles.js';

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

    const badge = document.createElement('span');
    badge.className = 'city-card-badge';
    badge.textContent = city.badge;

    const name = document.createElement('span');
    name.className = 'city-card-name';
    name.textContent = city.name;

    const tagline = document.createElement('span');
    tagline.className = 'city-card-tagline';
    tagline.textContent = city.tagline;

    const description = document.createElement('span');
    description.className = 'city-card-description';
    description.textContent = city.description;

    const cta = document.createElement('span');
    cta.className = 'city-card-cta';
    cta.textContent = 'Enter city →';

    const taxiStyle = getTaxiStyle(city.taxiStyle);
    if (taxiStyle) {
      const taxi = document.createElement('span');
      taxi.className = 'city-card-taxi';
      const dot = document.createElement('span');
      dot.className = 'city-card-taxi-dot';
      dot.style.background = `#${taxiStyle.paint.toString(16).padStart(6, '0')}`;
      taxi.append(dot, document.createTextNode(taxiStyle.label));
      card.append(badge, name, tagline, description, taxi, cta);
    } else {
      card.append(badge, name, tagline, description, cta);
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

// Direct links start through the same lightweight loader as the cards.
const requestedCity = new URLSearchParams(window.location.search).get('city');
if (requestedCity) {
  if (getCity(requestedCity)) selectCity(requestedCity);
  else setPickerStatus(`Unknown city “${requestedCity}”. Choose a city below.`, true);
}
