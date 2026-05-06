const storageKeys = {
  photos: 'pukuli_photos',
  videos: 'pukuli_videos',
  future: 'pukuli_future',
  events: 'pukuli_events',
  bbgNote: 'pukuli_note_bbg',
  bbbNote: 'pukuli_note_bbb'
};

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

async function sendToServer(payload) {
  try {
    await fetch('/api/store-input', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    console.warn('Backend save failed:', error);
  }
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function renderList(containerId, items, renderItem) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  if (!items.length) {
    container.innerHTML = '<p class="empty-state">Nothing saved yet.</p>';
    return;
  }

  items.forEach(item => {
    container.insertAdjacentHTML('beforeend', renderItem(item));
  });
}

function normalizeLinkEntries(entry) {
  if (!entry) return [];
  if (Array.isArray(entry)) return entry;
  if (typeof entry === 'string') return [entry];
  return [];
}

function parseUrlLines(text) {
  return text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line !== '')
    .slice(0, 100);
}

function renderUrlList(urls, label) {
  return urls.map((url, index) => `
      <li><a href="${url}" target="_blank" rel="noreferrer">${label} ${index + 1}</a></li>
    `).join('');
}

function createPhotoItem(photo) {
  const urls = normalizeLinkEntries(photo.urls || photo.url);
  return `
    <div class="list-item">
      <div>
        <strong>${photo.title}</strong>
        <ul class="file-links">
          ${renderUrlList(urls, 'Photo')}
        </ul>
      </div>
    </div>
  `;
}

function createVideoItem(video) {
  const urls = normalizeLinkEntries(video.urls || video.url);
  return `
    <div class="list-item">
      <div>
        <strong>${video.title}</strong>
        <ul class="file-links">
          ${renderUrlList(urls, 'Video')}
        </ul>
      </div>
    </div>
  `;
}

function createFutureItem(plan) {
  return `
    <div class="list-item">
      <div>
        <strong>${plan.title}</strong>
        <p>${plan.note}</p>
      </div>
    </div>
  `;
}

function createEventItem(event) {
  return `
    <div class="list-item">
      <div>
        <strong>${event.title}</strong>
        <p>${formatDate(event.date)}</p>
        <p>${event.details || ''}</p>
      </div>
    </div>
  `;
}

function setActiveNav() {
  const locationFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-nav a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === locationFile);
  });
}

function loadPhotoPage() {
  const photoList = loadData(storageKeys.photos);
  renderList('photoList', photoList, createPhotoItem);

  const form = document.getElementById('photoForm');
  if (!form) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    const title = document.getElementById('photoTitle').value.trim();
    const urls = parseUrlLines(document.getElementById('photoUrls').value);
    if (!title || !urls.length) return;

    const photos = loadData(storageKeys.photos);
    const entry = { title, urls };
    photos.unshift(entry);
    saveData(storageKeys.photos, photos);
    sendToServer({
      type: 'photo',
      page: 'photos',
      timestamp: new Date().toISOString(),
      data: entry
    });
    form.reset();
    renderList('photoList', photos, createPhotoItem);
  });
}

function loadVideoPage() {
  const videoList = loadData(storageKeys.videos);
  renderList('videoList', videoList, createVideoItem);

  const form = document.getElementById('videoForm');
  if (!form) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    const title = document.getElementById('videoTitle').value.trim();
    const urls = parseUrlLines(document.getElementById('videoUrls').value);
    if (!title || !urls.length) return;

    const videos = loadData(storageKeys.videos);
    const entry = { title, urls };
    videos.unshift(entry);
    saveData(storageKeys.videos, videos);
    sendToServer({
      type: 'video',
      page: 'videos',
      timestamp: new Date().toISOString(),
      data: entry
    });
    form.reset();
    renderList('videoList', videos, createVideoItem);
  });
}

function loadFuturePage() {
  const futureList = loadData(storageKeys.future);
  renderList('futureList', futureList, createFutureItem);

  const form = document.getElementById('futureForm');
  if (!form) return;

  form.addEventListener('submit', event => {
    event.preventDefault();
    const title = document.getElementById('futureTitle').value.trim();
    const note = document.getElementById('futureNote').value.trim();
    if (!title || !note) return;

    const plans = loadData(storageKeys.future);
    const entry = { title, note };
    plans.unshift(entry);
    saveData(storageKeys.future, plans);
    sendToServer({
      type: 'future',
      page: 'future',
      timestamp: new Date().toISOString(),
      data: entry
    });
    form.reset();
    renderList('futureList', plans, createFutureItem);
  });
}

function loadEventsPage() {
  const events = loadData(storageKeys.events).sort((a, b) => new Date(a.date) - new Date(b.date));
  renderList('eventList', events, createEventItem);

  const form = document.getElementById('eventForm');
  if (!form) return;

  form.addEventListener('submit', event => {
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
    sendToServer({
      type: 'event',
      page: 'events',
      timestamp: new Date().toISOString(),
      data: entry
    });
    form.reset();
    renderList('eventList', eventsData.sort((a, b) => new Date(a.date) - new Date(b.date)), createEventItem);
  });
}

function loadIndexNotes() {
  const bbgTextarea = document.getElementById('noteBbg');
  const bbbTextarea = document.getElementById('noteBbb');
  const saveBbg = document.getElementById('saveNoteBbg');
  const saveBbb = document.getElementById('saveNoteBbb');

  if (bbgTextarea) {
    bbgTextarea.value = loadText(storageKeys.bbgNote);
  }
  if (bbbTextarea) {
    bbbTextarea.value = loadText(storageKeys.bbbNote);
  }

  if (saveBbg && bbgTextarea) {
    saveBbg.addEventListener('click', () => {
      const note = bbgTextarea.value.trim();
      saveText(storageKeys.bbgNote, note);
      sendToServer({
        type: 'note',
        page: 'index',
        target: 'bbg',
        timestamp: new Date().toISOString(),
        data: note
      });
      saveBbg.textContent = 'Saved!';
      setTimeout(() => { saveBbg.textContent = 'Save BBG Note'; }, 1200);
    });
  }

  if (saveBbb && bbbTextarea) {
    saveBbb.addEventListener('click', () => {
      const note = bbbTextarea.value.trim();
      saveText(storageKeys.bbbNote, note);
      sendToServer({
        type: 'note',
        page: 'index',
        target: 'bbb',
        timestamp: new Date().toISOString(),
        data: note
      });
      saveBbb.textContent = 'Saved!';
      setTimeout(() => { saveBbb.textContent = 'Save BBB Note'; }, 1200);
    });
  }
}

function loadHomePage() {
  const events = loadData(storageKeys.events).filter(item => {
    const eventDate = new Date(item.date);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return eventDate >= now;
  });

  const upcoming = events
    .map(event => ({ ...event, timestamp: new Date(event.date).getTime() }))
    .filter(event => {
      const now = new Date();
      const diffDays = Math.round((event.timestamp - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 7;
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  const nextReminder = document.getElementById('nextReminder');
  const banner = document.getElementById('notificationBanner');

  if (upcoming.length) {
    const next = upcoming[0];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const eventDate = new Date(next.date);
    eventDate.setHours(0, 0, 0, 0);
    const isTodayOrPast = eventDate <= now;

    let reminderText = `${next.title} is coming on ${formatDate(next.date)}.`;
    if (next.details) reminderText += ` Details: ${next.details}`;
    if (isTodayOrPast && next.attachment) {
      reminderText += ` <a href="${next.attachment}" target="_blank" rel="noreferrer">Access Attachment</a>`;
    }

    nextReminder.innerHTML = reminderText;
    banner.textContent = `Reminder: ${next.title} is within the next week!`;
    banner.style.display = 'block';
  } else {
    nextReminder.textContent = 'No reminders within a week. Add an event to receive notifications.';
    banner.textContent = 'No planned events are due within the next seven days.';
    banner.style.display = 'block';
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
