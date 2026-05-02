/* ================================================================
   Skyline customer-facing app
   Login → dashboard with: Search Flights, My Trips, Loyalty, Profile
   ================================================================ */

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

let currentCustomer = null;  // { customer_id, name, email, phone }

/* ---------- API helper ---------- */
async function api(method, path, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

/* ---------- Toast ---------- */
function toast(msg, kind = 'success') {
    const el = $('#toast');
    el.classList.remove('hidden');
    el.classList.add('fade-in');
    el.innerHTML = `<div class="${kind === 'success' ? 'toast-success' : 'toast-error'}">${msg}</div>`;
    setTimeout(() => el.classList.add('hidden'), 3500);
}

/* ================================================================
   LOGIN
   ================================================================ */

$('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#login-email').value.trim();
    const password = $('#login-password').value;
    const errBox = $('#login-error');

    try {
        const data = await api('POST', '/api/login', { email, password });
        currentCustomer = data.customer;
        sessionStorage.setItem('customer', JSON.stringify(currentCustomer));
        showDashboard();
    } catch (err) {
        errBox.textContent = err.message;
        errBox.classList.remove('hidden');
    }
});

$('#logout-btn').addEventListener('click', () => {
    currentCustomer = null;
    sessionStorage.removeItem('customer');
    $('#dashboard-view').classList.add('hidden');
    $('#login-view').classList.remove('hidden');
});

/* ================================================================
   DASHBOARD SHOW + NAV
   ================================================================ */

function showDashboard() {
    $('#login-view').classList.add('hidden');
    $('#dashboard-view').classList.remove('hidden');
    $('#user-greeting').textContent = currentCustomer.name;

    /* default to search view */
    activateSection('search');
    loadAirportsIntoDropdowns();
}

$$('.nav-link').forEach(btn => {
    btn.addEventListener('click', () => activateSection(btn.dataset.section));
});

function activateSection(name) {
    $$('.nav-link').forEach(b => b.classList.remove('nav-active'));
    $$(`.nav-link[data-section="${name}"]`).forEach(b => b.classList.add('nav-active'));
    $$('.customer-section').forEach(s => s.classList.add('hidden'));
    $(`#section-${name}`).classList.remove('hidden');

    if      (name === 'trips')   loadTrips();
    else if (name === 'loyalty') loadLoyalty();
    else if (name === 'profile') loadProfile();
    else if (name === 'search')  searchFlights();
}

/* ================================================================
   SEARCH FLIGHTS
   ================================================================ */

async function loadAirportsIntoDropdowns() {
    try {
        const airports = await api('GET', '/api/airports');
        const originSel = $('#search-origin');
        const destSel   = $('#search-destination');

        const baseOpts = '<option value="">Any</option>';
        const opts = airports.map(a =>
            `<option value="${a.airport_code}">${a.airport_code} — ${a.city}</option>`
        ).join('');

        originSel.innerHTML = '<option value="">Any origin</option>' + opts;
        destSel.innerHTML   = '<option value="">Any destination</option>' + opts;
    } catch (err) {
        console.error('Failed to load airports', err);
    }
}

$('#search-btn').addEventListener('click', searchFlights);

async function searchFlights() {
    const origin = $('#search-origin').value;
    const dest   = $('#search-destination').value;
    const params = new URLSearchParams();
    if (origin) params.set('origin', origin);
    if (dest)   params.set('destination', dest);

    const resultsBox = $('#search-results');
    resultsBox.innerHTML = '<p class="text-muted text-center py-4">Searching…</p>';

    try {
        const flights = await api('GET', '/api/flights/search?' + params.toString());
        if (!flights.length) {
            resultsBox.innerHTML = `
                <div class="card p-8 text-center text-muted">
                    No flights match your search. Try clearing the filters.
                </div>`;
            return;
        }
        resultsBox.innerHTML = flights.map(f => renderFlightCard(f)).join('');
        resultsBox.querySelectorAll('.book-btn').forEach(btn => {
            btn.addEventListener('click', () => openBuyModal(JSON.parse(btn.dataset.flight)));
        });
    } catch (err) {
        resultsBox.innerHTML = `<div class="card p-6 text-red-600">Error: ${err.message}</div>`;
    }
}

function renderFlightCard(f) {
    const date = new Date(f.flight_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `
        <div class="card p-6 fade-in">
            <div class="flex items-start justify-between gap-6 flex-wrap">
                <div class="flex-1 min-w-[300px]">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="text-xs font-mono font-semibold text-sky2 bg-sky3/10 px-2 py-1 rounded">${f.flight_number}</span>
                        <span class="text-xs text-muted">${date}</span>
                        <span class="text-xs text-muted">·</span>
                        <span class="text-xs text-muted">${f.aircraft_model}</span>
                    </div>
                    <div class="flex items-center gap-4">
                        <div class="text-center">
                            <div class="font-display text-3xl font-semibold">${f.origin_code}</div>
                            <div class="text-xs text-muted mt-0.5">${f.origin_city}</div>
                            <div class="text-sm font-medium mt-1">${formatTime(f.scheduled_departure_time)}</div>
                        </div>
                        <div class="flex-1 px-4">
                            <div class="route-line"></div>
                            <div class="text-center text-xs text-muted mt-1">${f.distance} mi</div>
                        </div>
                        <div class="text-center">
                            <div class="font-display text-3xl font-semibold">${f.destination_code}</div>
                            <div class="text-xs text-muted mt-0.5">${f.destination_city}</div>
                            <div class="text-sm font-medium mt-1">${formatTime(f.scheduled_arrival_time)}</div>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-muted uppercase tracking-wide">From</div>
                    <div class="font-display text-3xl font-semibold text-sky1">$250</div>
                    <button class="btn-sun mt-3 book-btn" data-flight='${JSON.stringify(f).replace(/'/g, "&#39;")}'>Book</button>
                </div>
            </div>
        </div>`;
}

function formatTime(t) {
    if (!t) return '';
    /* MySQL TIME comes as "HH:MM:SS" */
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

/* ================================================================
   BUY MODAL
   ================================================================ */

let pendingFlight = null;

function openBuyModal(flight) {
    pendingFlight = flight;
    $('#buy-flight-info').innerHTML =
        `<strong>${flight.flight_number}</strong>: ${flight.origin_code} → ${flight.destination_code} on ${new Date(flight.flight_date).toLocaleDateString()}`;
    $('#buy-passenger').value = currentCustomer.name;
    updateBuyPrice();
    $('#buy-modal').classList.remove('hidden');
}

$('#buy-cancel').addEventListener('click', () => $('#buy-modal').classList.add('hidden'));
$('#buy-class').addEventListener('change', updateBuyPrice);

function updateBuyPrice() {
    const sel = $('#buy-class');
    const basePrice = parseFloat(sel.options[sel.selectedIndex].dataset.price);
    const total = basePrice * 1.10;
    $('#buy-price-display').value = `$${total.toFixed(2)}`;
}

$('#buy-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const sel = $('#buy-class');
    const basePrice = parseFloat(sel.options[sel.selectedIndex].dataset.price);
    const fareClass = sel.value;
    const passengerName = $('#buy-passenger').value.trim();

    try {
        const data = await api('POST', `/api/me/${currentCustomer.customer_id}/buy`, {
            flight_instance_id: pendingFlight.flight_instance_id,
            passenger_name: passengerName,
            fare_class: fareClass,
            base_price: basePrice
        });
        $('#buy-modal').classList.add('hidden');
        toast(`Booked! Confirmation: ${data.booking_reference} · Total: $${Number(data.total).toFixed(2)}`);
    } catch (err) {
        toast(err.message, 'error');
    }
});

/* ================================================================
   MY TRIPS
   ================================================================ */

async function loadTrips() {
    const list = $('#trips-list');
    list.innerHTML = '<p class="text-muted text-center py-4">Loading your trips…</p>';
    try {
        const trips = await api('GET', `/api/me/${currentCustomer.customer_id}/tickets`);
        if (!trips.length) {
            list.innerHTML = `
                <div class="card p-8 text-center text-muted">
                    You have no bookings yet. Search and book your first flight!
                </div>`;
            return;
        }
        list.innerHTML = trips.map(t => renderTripCard(t)).join('');
        list.querySelectorAll('.cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => cancelTicket(parseInt(btn.dataset.ticket)));
        });
    } catch (err) {
        list.innerHTML = `<div class="card p-6 text-red-600">Error: ${err.message}</div>`;
    }
}

function renderTripCard(t) {
    const statusClass = `status-${t.ticket_status.toLowerCase()}`;
    const date = t.flight_date ? new Date(t.flight_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    const canCancel = t.ticket_status === 'Confirmed';
    return `
        <div class="card p-6 fade-in">
            <div class="flex items-start justify-between gap-4 flex-wrap">
                <div class="flex-1 min-w-[280px]">
                    <div class="flex items-center gap-2 mb-3 flex-wrap">
                        <span class="text-xs font-mono font-semibold text-sky2 bg-sky3/10 px-2 py-1 rounded">${t.flight_number || '—'}</span>
                        <span class="status-pill ${statusClass}">${t.ticket_status}</span>
                        <span class="text-xs text-muted">Confirmation: <span class="font-mono">${t.booking_reference}</span></span>
                    </div>
                    <div class="flex items-center gap-4">
                        <div>
                            <div class="font-display text-2xl font-semibold">${t.origin_code || '—'}</div>
                            <div class="text-xs text-muted">${t.origin_city || ''}</div>
                        </div>
                        <div class="text-muted">→</div>
                        <div>
                            <div class="font-display text-2xl font-semibold">${t.destination_code || '—'}</div>
                            <div class="text-xs text-muted">${t.destination_city || ''}</div>
                        </div>
                        <div class="ml-4 text-sm">
                            <div class="text-muted text-xs">Date</div>
                            <div class="font-medium">${date}</div>
                        </div>
                        <div class="text-sm">
                            <div class="text-muted text-xs">Passenger</div>
                            <div class="font-medium">${t.passenger_name}</div>
                        </div>
                        <div class="text-sm">
                            <div class="text-muted text-xs">Class</div>
                            <div class="font-medium">${t.fare_class}</div>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="text-xs text-muted uppercase tracking-wide">Total Paid</div>
                    <div class="font-display text-2xl font-semibold text-sky1">$${Number(t.total_price).toFixed(2)}</div>
                    ${canCancel ? `<button class="btn-danger mt-3 cancel-btn" data-ticket="${t.ticket_id}">Cancel Ticket</button>` : ''}
                </div>
            </div>
        </div>`;
}

async function cancelTicket(ticketId) {
    if (!confirm('Are you sure you want to cancel this ticket?')) return;
    try {
        await api('POST', `/api/me/${currentCustomer.customer_id}/tickets/${ticketId}/cancel`);
        toast('Ticket canceled successfully');
        loadTrips();
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ================================================================
   LOYALTY
   ================================================================ */

async function loadLoyalty() {
    const box = $('#loyalty-card');
    box.innerHTML = '<p class="text-muted text-center py-4">Loading…</p>';
    try {
        const l = await api('GET', `/api/me/${currentCustomer.customer_id}/loyalty`);
        if (!l) {
            box.innerHTML = `
                <div class="card p-8 text-center text-muted">
                    You don't have a loyalty account yet.
                </div>`;
            return;
        }
        const tierClass = `tier-${l.tier.toLowerCase()}`;
        const nextTier = nextTierInfo(l.points_balance);
        box.innerHTML = `
            <div class="card overflow-hidden fade-in">
                <div class="${tierClass} p-8">
                    <div class="text-xs uppercase tracking-widest opacity-80">Membership Tier</div>
                    <div class="font-display text-5xl font-semibold mt-2">${l.tier}</div>
                    <div class="mt-6 flex items-end justify-between">
                        <div>
                            <div class="text-xs uppercase tracking-widest opacity-80">Points Balance</div>
                            <div class="font-display text-4xl font-semibold mt-1">${l.points_balance.toLocaleString()}</div>
                        </div>
                        <div class="text-xs opacity-70 font-mono">Member #${l.member_id}</div>
                    </div>
                </div>
                ${nextTier ? `
                    <div class="p-6 bg-slate-50">
                        <div class="text-sm text-muted">
                            <strong class="text-ink">${nextTier.needed.toLocaleString()} points</strong> until <strong class="text-ink">${nextTier.tier}</strong>
                        </div>
                        <div class="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div class="h-full ${tierClass}" style="width: ${nextTier.progress}%"></div>
                        </div>
                    </div>` : `
                    <div class="p-6 bg-slate-50 text-sm text-muted">
                        🎉 You've reached our highest tier!
                    </div>`}
            </div>`;
    } catch (err) {
        box.innerHTML = `<div class="card p-6 text-red-600">Error: ${err.message}</div>`;
    }
}

function nextTierInfo(points) {
    const tiers = [
        { tier: 'Silver',   threshold: 4000  },
        { tier: 'Gold',     threshold: 10000 },
        { tier: 'Platinum', threshold: 20000 }
    ];
    const next = tiers.find(t => points < t.threshold);
    if (!next) return null;
    const prevThreshold = tiers[tiers.indexOf(next) - 1]?.threshold || 0;
    const progress = ((points - prevThreshold) / (next.threshold - prevThreshold)) * 100;
    return { tier: next.tier, needed: next.threshold - points, progress: Math.max(2, Math.min(100, progress)) };
}

/* ================================================================
   PROFILE
   ================================================================ */

async function loadProfile() {
    try {
        const p = await api('GET', `/api/me/${currentCustomer.customer_id}`);
        $('#profile-name').value  = p.name;
        $('#profile-email').value = p.email;
        $('#profile-phone').value = p.phone || '';
    } catch (err) {
        toast(err.message, 'error');
    }
}

$('#profile-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        name:  $('#profile-name').value.trim(),
        email: $('#profile-email').value.trim(),
        phone: $('#profile-phone').value.trim()
    };
    try {
        await api('PUT', `/api/me/${currentCustomer.customer_id}`, data);
        currentCustomer = { ...currentCustomer, ...data };
        sessionStorage.setItem('customer', JSON.stringify(currentCustomer));
        $('#user-greeting').textContent = data.name;
        toast('Profile updated successfully');
    } catch (err) {
        toast(err.message, 'error');
    }
});

/* ================================================================
   AUTO-LOGIN if session exists
   ================================================================ */
const saved = sessionStorage.getItem('customer');
if (saved) {
    try {
        currentCustomer = JSON.parse(saved);
        showDashboard();
    } catch {
        sessionStorage.removeItem('customer');
    }
}
