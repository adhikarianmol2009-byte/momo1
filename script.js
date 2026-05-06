const API_BASE = 'https://pukuli-api.adhikarianmol2009.workers.dev';
const POLL_INTERVAL = 2000;

const storageKeys = {
  photos: 'pukuli_photos',
  videos: 'pukuli_videos',
  future: 'pukuli_future',
  events: 'pukuli_events',
  bbgNote: 'pukuli_note_bbg',
  bbbNote: 'pukuli_note_bbb'
};

async function kvGet(key) {
  try {
    const res = await fetch(`${API_BASE}/api/get?key=${key}`);
    const json = await res.json();
    return json.value;
  } catch { return null; }
}

async function kvSet(key, value) {
  try {
    await fetch(`${API_BASE}/api/set`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
  } catch (err) { console.warn('KV set failed:', err); }
}

async function kvAll() {
  try {
    const res = await fetch(`${API_BASE}/api/all`);
    return await res.json();
  } catch { return null; }
}

function loadData(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

function saveData(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function loadText(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : '';
}

function saveText(key, text) {
  localStorage.setItem(key, JSON.stringify(text));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric'
  });
}

function renderList(containerId, items, renderItem) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (!items || !items.length) {
    container.innerHTML = '<p class="empty-state">Nothing saved yet.</p>';
    return;
  }
  items.forEach(item => container.insertAdjacentHTML('beforeend', renderItem(item)));
}

function normalizeLinkEntries(entry) {
  if (!entry) return [];
  if (Array.isArray(entry)) return entry;
  if (typeof entry === 'string') return [entry];
  return [];
}

function parseUrlLines(text) {
  return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean).slice(0, 100);
}

function renderUrlList(urls, label) {
  return urls.map((url, i) =>
    `<li><a href="${url}" target="_blank" rel="noreferrer">${label} ${i + 1}</a></li>`
  ).join('');
}

function createPhotoItem(photo) {
  const urls = normalizeLinkEntries(photo.urls || photo.url);
  return `<div class="list-item"><div><strong>${photo.title}</strong><ul class="file-links">${renderUrlList(urls, 'Photo')}</ul></div></div>`;
}

function createVideoItem(video) {
  const urls = normalizeLinkEntries(video.urls || video.url);
  return `<div class="list-item"><div><strong>${video.title}</strong><ul class="file-links">${renderUrlList(urls, 'Video')}</ul></div></div>`;
}

function createFutureItem(plan) {
  return `<div class="list-item"><div><strong>${plan.title}</strong><p>${plan.note}</p></div></div>`;
}

function createEventItem(event) {
  return `<div class="list-item"><div><strong>${event.title}</strong><p>${formatDate(event.date)}</p><p>${event.details || ''}</p></div></div>`;
}

function setActiveNav() {
  const locationFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === locationFile);
  });
}

function showSyncStatus(message, isError = false) {
  let el = document.getElementById('syncStatus');
  if (!el) {
    el = document.createElement('div');
    el.id = 'syncStatus';
    el.style.cssText = `
      position: fixed; bottom: 16px; right: 16px;
      background: ${isError ? '#e74c3c' : '#27ae60'};
      color: white; padding: 8px 14px; border-radius: 8px;
      font-size: 13px; z-index: 9999; opacity: 1;
      transition: opacity 0.5s ease;
    `;
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.style.background = isError ? '#e74c3c' : '#27ae60';
  el.style.opacity = '1';
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.style.opacity = '0'; }, 2000);
}

async function loadPhotoPage() {
  const serverPhotos = await kvGet('photos');
  const photos = serverPhotos || loadData(storageKeys.photos);
  if (serverPhotos) saveData(storageKeys.photos, serverPhotos);
  renderList('photoList', photos, createPhotoItem);

  const form = document.getElementById('photoForm');
  if (!form) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const title = document.getElementById('photoTitle').value.trim();
    const urls = parseUrlLines(document.getElementById('photoUrls').value);
    if (!title || !urls.length) return;
    const photos = loadData(storageKeys.photos);
    const entry = { title, urls };
    photos.unshift(entry);
    saveData(storageKeys.photos, photos);
    await kvSet('photos', photos);
    showSyncStatus('Photos synced ✓');
    form.reset();
    renderList('photoList', photos, createPhotoItem);
  });

  setInterval(async () => {
    const updated = await kvGet('photos');
    if (updated) { saveData(storageKeys.photos, updated); renderList('photoList', updated, createPhotoItem); }
  }, POLL_INTERVAL);
}

async function loadVideoPage() {
  const serverVideos = await kvGet('videos');
  const videos = serverVideos || loadData(storageKeys.videos);
  if (serverVideos) saveData(storageKeys.videos, serverVideos);
  renderList('videoList', videos, createVideoItem);

  const form = document.getElementById('videoForm');
  if (!form) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const title = document.getElementById('videoTitle').value.trim();
    const urls = parseUrlLines(document.getElementById('videoUrls').value);
    if (!title || !urls.length) return;
    const videos = loadData(storageKeys.videos);
    const entry = { title, urls };
    videos.unshift(entry);
    saveData(storageKeys.videos, videos);
    await kvSet('videos', videos);
    showSyncStatus('Videos synced ✓');
    form.reset();
    renderList('videoList', videos, createVideoItem);
  });

  setInterval(async () => {
    const updated = await kvGet('videos');
    if (updated) { saveData(storageKeys.videos, updated); renderList('videoList', updated, createVideoItem); }
  }, POLL_INTERVAL);
}

async function loadFuturePage() {
  const serverFuture = await kvGet('future');
  const plans = serverFuture || loadData(storageKeys.future);
  if (serverFuture) saveData(storageKeys.future, serverFuture);
  renderList('futureList', plans, createFutureItem);

  const form = document.getElementById('futureForm');
  if (!form) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const title = document.getElementById('futureTitle').value.trim();
    const note = document.getElementById('futureNote').value.trim();
    if (!title || !note) return;
    const plans = loadData(storageKeys.future);
    const entry = { title, note };
    plans.unshift(entry);
    saveData(storageKeys.future, plans);
    await kvSet('future', plans);
    showSyncStatus('Plans synced ✓');
    form.reset();
    renderList('futureList', plans, createFutureItem);
  });

  setInterval(async () => {
    const updated = await kvGet('future');
    if (updated) { saveData(storageKeys.future, updated); renderList('futureList', updated, createFutureItem); }
  }, POLL_INTERVAL);
}

async function loadEventsPage() {
  const serverEvents = await kvGet('events');
  const events = (serverEvents || loadData(storageKeys.events)).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (serverEvents) saveData(storageKeys.events, serverEvents);
  renderList('eventList', events, createEventItem);

  const form = document.getElementById('eventForm');
  if (!form) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const title = document.getElementById('eventTitle').value.trim();
    const date = document.getElementById('eventDate').value;
    const details = document.getElementById('eventDetails').value.trim();
    const attachment = document.getElementById('eventAttachment').value.trim();
    if (!title || !date || !details) return;
    const eventsData = loadData(storageKeys.events);
    const entry = { title, date, details, attachment };
    eventsData.unshift(entry);
    saveData(storageKeys.events, eventsData);
    await kvSet('events', eventsData);
    showSyncStatus('Event synced ✓');
    form.reset();
    renderList('eventList', eventsData.sort((a, b) => new Date(a.date) - new Date(b.date)), createEventItem);
  });

  setInterval(async () => {
    const updated = await kvGet('events');
    if (updated) { saveData(storageKeys.events, updated); renderList('eventList', updated.sort((a, b) => new Date(a.date) - new Date(b.date)), createEventItem); }
  }, POLL_INTERVAL);
}

async function loadIndexNotes() {
  const bbgTextarea = document.getElementById('noteBbg');
  const bbbTextarea = document.getElementById('noteBbb');
  const saveBbg = document.getElementById('saveNoteBbg');
  const saveBbb = document.getElementById('saveNoteBbb');

  const [bbgNote, bbbNote] = await Promise.all([kvGet('note_bbg'), kvGet('note_bbb')]);

  if (bbgTextarea) bbgTextarea.value = bbgNote ?? loadText(storageKeys.bbgNote);
  if (bbbTextarea) bbbTextarea.value = bbbNote ?? loadText(storageKeys.bbbNote);

  if (saveBbg && bbgTextarea) {
    saveBbg.addEventListener('click', async () => {
      const note = bbgTextarea.value.trim();
      saveText(storageKeys.bbgNote, note);
      await kvSet('note_bbg', note);
      showSyncStatus('BBG note sent ✓');
      saveBbg.textContent = 'Sent!';
      setTimeout(() => { saveBbg.textContent = 'Save BBG Note'; }, 1200);
    });
  }

  if (saveBbb && bbbTextarea) {
    saveBbb.addEventListener('click', async () => {
      const note = bbbTextarea.value.trim();
      saveText(storageKeys.bbbNote, note);
      await kvSet('note_bbb', note);
      showSyncStatus('BBB note sent ✓');
      saveBbb.textContent = 'Sent!';
      setTimeout(() => { saveBbb.textContent = 'Save BBB Note'; }, 1200);
    });
  }

  setInterval(async () => {
    const [latestBbg, latestBbb] = await Promise.all([kvGet('note_bbg'), kvGet('note_bbb')]);
    if (bbgTextarea && latestBbg !== null && document.activeElement !== bbgTextarea) bbgTextarea.value = latestBbg;
    if (bbbTextarea && latestBbb !== null && document.activeElement !== bbbTextarea) bbbTextarea.value = latestBbb;
  }, POLL_INTERVAL);
}

async function loadHomePage() {
  const serverEvents = await kvGet('events');
  const allEvents = serverEvents || loadData(storageKeys.events);
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const upcoming = allEvents
    .filter(item => new Date(item.date) >= now)
    .map(event => ({ ...event, timestamp: new Date(event.date).getTime() }))
    .filter(event => {
      const diffDays = Math.round((event.timestamp - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  const nextReminder = document.getElementById('nextReminder');
  const banner = document.getElementById('notificationBanner');

  if (upcoming.length) {
    const next = upcoming[0];
    const eventDate = new Date(next.date);
    eventDate.setHours(0, 0, 0, 0);
    const isTodayOrPast = eventDate <= now;
    let reminderText = `${next.title} is coming on ${formatDate(next.date)}.`;
    if (next.details) reminderText += ` Details: ${next.details}`;
    if (isTodayOrPast && next.attachment) reminderText += ` <a href="${next.attachment}" target="_blank" rel="noreferrer">Access Attachment</a>`;
    if (nextReminder) nextReminder.innerHTML = reminderText;
    if (banner) { banner.textContent = `Reminder: ${next.title} is within the next week!`; banner.style.display = 'block'; }
  } else {
    if (nextReminder) nextReminder.textContent = 'No reminders within a week. Add an event to receive notifications.';
    if (banner) { banner.textContent = 'No planned events are due within the next seven days.'; banner.style.display = 'block'; }
  }
}

function initPage() {
  setActiveNav();
  if (document.getElementById('photoForm')) loadPhotoPage();
  if (document.getElementById('videoForm')) loadVideoPage();
  if (document.getElementById('futureForm')) loadFuturePage();
  if (document.getElementById('eventForm')) loadEventsPage();
  if (document.getElementById('noteBbg') || document.getElementById('noteBbb')) loadIndexNotes();
  if (document.getElementById('nextReminder')) loadHomePage();
}

window.addEventListener('DOMContentLoaded', initPage);
