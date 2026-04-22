const CATEGORY_KEYWORDS = {
  food: [
    'food', 'pizza', 'snack', 'lunch', 'dinner', 'breakfast',
    'refreshment', 'eat', 'drink', 'coffee', 'treat', 'meal',
    'taco', 'burger', 'sandwich', 'cookie', 'dessert', 'beverage',
  ],
  merch: [
    't-shirt', 'tshirt', 'shirt', 'merch', 'merchandise', 'swag',
    'hoodie', 'apparel', 'clothing', 'sticker', 'tote', 'bag',
  ],
  giveaway: [
    'giveaway', 'raffle', 'prize', 'win', 'gift card', 'free gift',
    'drawing', 'chance to win',
  ],
};

function categorize(event) {
  const text = `${event.title || ''} ${event.description || ''}`.toLowerCase();
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some((w) => text.includes(w))) return cat;
  }
  return 'other';
}

const CATEGORY_COLORS = {
  food: '#f6ad55',
  merch: '#48bb78',
  giveaway: '#38bdf8',
  other: '#4b9cd3',
};

const CATEGORY_LABELS = {
  food: 'Food',
  merch: 'Merch',
  giveaway: 'Giveaway',
  other: 'Event',
};

function escapeHtml(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

function formatDate(iso, allDay = false) {
  if (!iso) return 'Date TBD';
  try {
    const opts = allDay
      ? {
          weekday: 'short', month: 'long', day: 'numeric',
          year: 'numeric', timeZone: 'America/New_York',
        }
      : {
          weekday: 'short', month: 'long', day: 'numeric',
          year: 'numeric', hour: 'numeric', minute: '2-digit',
          timeZone: 'America/New_York',
        };
    return new Date(iso).toLocaleString('en-US', opts);
  } catch {
    return iso;
  }
}

function getDateGroupKey(iso) {
  if (!iso) return 'Date TBD';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      timeZone: 'America/New_York',
    });
  } catch {
    return 'Date TBD';
  }
}

let allEvents = [];
let calendar = null;
let activeFilter = 'all';

function filteredEvents() {
  if (activeFilter === 'all') return allEvents;
  return allEvents.filter((e) => categorize(e) === activeFilter);
}

function openModal(event) {
  document.getElementById('modal-title').textContent =
    event.title || 'Untitled Event';
  document.getElementById('modal-datetime').textContent =
    `Date: ${formatDate(event.start, event.allDay)}`;
  document.getElementById('modal-location').textContent =
    event.location ? `Location: ${event.location}` : '';
  document.getElementById('modal-description').textContent =
    event.description || 'No description available.';

  const link = document.getElementById('modal-link');
  if (event.url) {
    link.href = event.url;
    link.classList.remove('hidden');
  } else {
    link.classList.add('hidden');
  }

  const photo = document.getElementById('modal-photo');
  if (event.photo) {
    photo.src = event.photo;
    photo.alt = event.title || '';
    photo.classList.remove('hidden');
  } else {
    photo.classList.add('hidden');
  }

  document.getElementById('modal').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('modal').focus();
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
}

function renderCalendar(events) {
  const fcEvents = events
    .filter((e) => e.start)
    .map((e) => ({
      id: String(e.id),
      title: e.title,
      start: e.start,
      end: e.end || undefined,
      allDay: e.allDay || false,
      backgroundColor: CATEGORY_COLORS[categorize(e)],
      borderColor: CATEGORY_COLORS[categorize(e)],
      textColor: '#1a202c',
      extendedProps: e,
    }));

  if (calendar) {
    calendar.getEventSources().forEach((source) => source.remove());
    calendar.addEventSource(fcEvents);
    return;
  }

  calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listWeek',
    },
    events: fcEvents,
    height: 'auto',
    noEventsText: 'No free stuff events found for this period.',
    eventClick(info) {
      openModal(info.event.extendedProps);
    },
    eventDidMount(info) {
      if (info.event.extendedProps.location) {
        info.el.setAttribute('title', info.event.extendedProps.location);
      }
    },
  });

  calendar.render();
}

function renderList(events) {
  const container = document.getElementById('events-list');
  container.innerHTML = '';

  if (!events.length) {
    container.innerHTML =
      '<p class="empty-msg">No events found right now. Check back soon.</p>';
    return;
  }

  const grouped = {};
  const dateOrder = [];

  events.forEach((e) => {
    const key = getDateGroupKey(e.start);
    if (!grouped[key]) {
      grouped[key] = [];
      dateOrder.push(key);
    }
    grouped[key].push(e);
  });

  const sortedKeys = dateOrder.filter((k) => k !== 'Date TBD');
  if (grouped['Date TBD']) sortedKeys.push('Date TBD');

  for (const dateStr of sortedKeys) {
    const section = document.createElement('div');
    section.className = 'date-group';

    const header = document.createElement('h3');
    header.textContent = dateStr;
    section.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'cards-grid';

    grouped[dateStr].forEach((event) => {
      const cat = categorize(event);
      const card = document.createElement('div');
      card.className = `event-card ${cat}`;
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `View details for ${event.title}`);

      card.innerHTML = `
        <h3>${escapeHtml(event.title)}</h3>
        <p class="event-meta">Date: ${formatDate(event.start, event.allDay)}</p>
        ${event.location
          ? `<p class="event-meta">Location: ${escapeHtml(event.location)}</p>`
          : ''}
        ${event.description
          ? `<p class="event-snippet">${escapeHtml(event.description)}</p>`
          : ''}
        <span class="event-tag tag-${cat}">${CATEGORY_LABELS[cat]}</span>
      `;

      card.addEventListener('click', () => openModal(event));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(event);
        }
      });

      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  }
}

async function loadEvents() {
  document.getElementById('last-updated').textContent = 'Loading events...';

  try {
    const res = await fetch(`./events.json?t=${Date.now()}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    allEvents = data.events || [];

    const updated = data.updated
      ? new Date(data.updated).toLocaleString('en-US', {
          timeZone: 'America/New_York',
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : 'unknown';

    document.getElementById('last-updated').textContent =
      `Last updated: ${updated} ET | ` +
      `${allEvents.length} event${allEvents.length !== 1 ? 's' : ''} found`;

    renderCalendar(filteredEvents());
    renderList(filteredEvents());
  } catch (err) {
    console.error('Failed to load events:', err);
    document.getElementById('last-updated').textContent =
      'Could not load events. Try refreshing the page.';
    document.getElementById('events-list').innerHTML =
      '<p class="empty-msg">Failed to load events. Please try again later.</p>';
  }
}

document.getElementById('btn-calendar').addEventListener('click', () => {
  document.getElementById('calendar-container').classList.remove('hidden');
  document.getElementById('list-container').classList.add('hidden');
  document.getElementById('btn-calendar').classList.add('active');
  document.getElementById('btn-list').classList.remove('active');
  if (calendar) calendar.updateSize();
});

document.getElementById('btn-list').addEventListener('click', () => {
  document.getElementById('list-container').classList.remove('hidden');
  document.getElementById('calendar-container').classList.add('hidden');
  document.getElementById('btn-list').classList.add('active');
  document.getElementById('btn-calendar').classList.remove('active');
});

document.querySelectorAll('.filter-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter;
    renderCalendar(filteredEvents());
    renderList(filteredEvents());
  });
});

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', closeModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

loadEvents();
