const API_BASE_URL = 'http://localhost:3000/api';

// Utility to parse URL params
function getQueryParams() {
    const params = new URLSearchParams(globalThis.location.search);
    let obj = {};
    for (const [key, value] of params.entries()) {
        obj[key] = decodeURIComponent(value);
    }
    return obj;
}

// Store basic state in LocalStorage to move easily betwen pages
function saveBookingState(data) {
    const current = JSON.parse(localStorage.getItem('bookingState') || '{}');
    localStorage.setItem('bookingState', JSON.stringify({ ...current, ...data }));
}
function getBookingState() {
    return JSON.parse(localStorage.getItem('bookingState') || '{}');
}

const SERVICE_WINDOWS = [
    { start: '11:00', end: '16:00' },
    { start: '18:00', end: '23:00' }
];

function timeToMinutes(timeStr) {
    if (!timeStr?.includes(':')) return Number.NaN;
    const [h, m] = timeStr.split(':').map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return Number.NaN;
    return (h * 60) + m;
}

function isTimeWithinServiceHours(timeStr) {
    const minutes = timeToMinutes(timeStr);
    if (Number.isNaN(minutes)) return false;

    return SERVICE_WINDOWS.some(window => {
        const start = timeToMinutes(window.start);
        const end = timeToMinutes(window.end);
        return minutes >= start && minutes <= end;
    });
}

function getDefaultBookingTime() {
    const now = new Date();
    const nowMinutes = (now.getHours() * 60) + now.getMinutes();
    const roundedMinutes = Math.ceil(nowMinutes / 15) * 15;

    for (const window of SERVICE_WINDOWS) {
        const start = timeToMinutes(window.start);
        const end = timeToMinutes(window.end);
        if (roundedMinutes <= start) return window.start;
        if (roundedMinutes >= start && roundedMinutes <= end) {
            const clamped = Math.min(roundedMinutes, end);
            const h = String(Math.floor(clamped / 60)).padStart(2, '0');
            const m = String(clamped % 60).padStart(2, '0');
            return `${h}:${m}`;
        }
    }

    return SERVICE_WINDOWS[0].start;
}

function formatBookingTimeForDisplay(timeValue) {
    if (!timeValue) return 'N/A';

    const labelMap = {
        morning: 'Morning',
        afternoon: 'Afternoon',
        evening: 'Evening'
    };
    if (labelMap[timeValue]) return labelMap[timeValue];

    if (!timeValue.includes(':')) return timeValue;

    const [hhRaw, mmRaw] = timeValue.split(':');
    const hh = Number(hhRaw);
    const mm = Number(mmRaw);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return timeValue;

    const suffix = hh >= 12 ? 'PM' : 'AM';
    const hour12 = (hh % 12) || 12;
    return `${hour12}:${String(mm).padStart(2, '0')} ${suffix}`;
}

// Page 1: index.html
async function initIndex() {
    try {
        const res = await fetch(`${API_BASE_URL}/hotels`);
        const hotels = await res.json();
        const container = document.getElementById('hotels-list');
        container.innerHTML = '';
        hotels.forEach(h => {
            const rating = h.rating || '4.8';
            const price = h.price_per_night ? `$${h.price_per_night}/night` : '';
            const fallbackImg = 'https://images.unsplash.com/photo-1551882547-ff40c0d5b9af?w=800';
            container.innerHTML += `
                <div class="hotel-card" onclick="location.href='hotel.html?id=${h.id}'">
                    <div class="hotel-img-wrap">
                        <img src="${h.image_url || fallbackImg}" class="hotel-img" alt="${h.name}" onerror="this.src='${fallbackImg}'">
                        <span class="wishlist-badge" aria-hidden="true">&hearts;</span>
                        <span class="rating-pill">${rating} / 5</span>
                    </div>
                    <div class="hotel-card-body">
                        <h5 class="fw-bold mb-1">${h.name}</h5>
                        <p class="text-muted small mb-2">${h.location}</p>
                        <div class="hotel-card-actions">
                            <span class="text-muted small">${price}</span>
                            <button class="btn-outline-inline" type="button">View Details</button>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch(e) {
        console.error("DB Not connected", e);
        const container = document.getElementById('hotels-list');
        if (container) {
            container.innerHTML = '<div class="text-center mt-5 text-danger fw-bold">Unable to load hotels. Make sure backend is running on http://localhost:3000.</div>';
        }
    }
}

// Page 2: hotel.html
async function initHotel() {
    const { id } = getQueryParams();
    if(!id) {
        globalThis.location.href = 'index.html';
        return;
    }
    
    // Always make the button clickable
    document.getElementById('book-btn').onclick = () => {
        location.href = `book.html?hotel_id=${id}`;
    };

    try {
        const res = await fetch(`${API_BASE_URL}/hotels/${id}`);
        const h = await res.json();
        
        if (!res.ok || h.message) {
            alert("Database Error! The backend returned an error. Did you remember to paste the new schema.sql into phpMyAdmin and restart your node server terminal?");
            return;
        }

        document.getElementById('hotel-img').src = h.image_url;
        document.getElementById('hotel-name').textContent = h.name;
        document.getElementById('hotel-location').textContent = h.location;
        document.getElementById('hotel-rating').textContent = h.rating;
        document.getElementById('hotel-desc').innerHTML = h.description.replace(/\\n/g, '<br />');
        
        saveBookingState({ hotel_id: h.id, hotel_name: h.name });

    } catch(e) {
        console.error(e);
        alert("Server Error! Make sure your node server.js is running.");
    }
}

// Page 3: book.html
function initBook() {
    const state = getBookingState();
    document.getElementById('hotel-name').textContent = state.hotel_name || 'Book a table';
    
    // Default dates
    const dateInput = document.getElementById('res-date');
    dateInput.min = new Date().toISOString().split('T')[0];
    dateInput.value = dateInput.min;

    const timeInput = document.getElementById('res-time');
    timeInput.value = getDefaultBookingTime();

    const openNativePicker = (inputEl) => {
        if (!inputEl) return;
        if (typeof inputEl.showPicker === 'function') {
            inputEl.showPicker();
        } else {
            inputEl.focus();
            inputEl.click();
        }
    };

    const openDateBtn = document.getElementById('open-date-picker');
    const openTimeBtn = document.getElementById('open-time-picker');
    if (openDateBtn) openDateBtn.onclick = () => openNativePicker(dateInput);
    if (openTimeBtn) openTimeBtn.onclick = () => openNativePicker(timeInput);

    let guests = 2;
    const guestSpan = document.getElementById('guest-count');
    document.getElementById('btn-minus').onclick = () => { if(guests > 1) { guests--; guestSpan.textContent = guests; } };
    document.getElementById('btn-plus').onclick = () => { if(guests < 20) { guests++; guestSpan.textContent = guests; } };
    
    document.getElementById('confirm-btn').onclick = () => {
        const date = dateInput.value;
        const time = timeInput.value;
        if(!date || !time) return alert('Select date and time');
        if(!isTimeWithinServiceHours(time)) {
            return alert('Please choose a time between 11:00 AM - 4:00 PM or 6:00 PM - 11:00 PM.');
        }
        
        saveBookingState({ date, time_slot: time, guests });
        location.href = `seats.html`;
    };
}

// Page 4: seats.html
let seatSelectionState = {
    guestCount: 1,
    selectedSeatIds: [],
    seatById: {},
    chairBySeatId: {},
    tableByNumber: {},
    tableElsByNumber: {}
};

async function initSeats() {
    const state = getBookingState();
    if(!state.hotel_id) {
        globalThis.location.href = 'index.html';
        return;
    }
    
    seatSelectionState.guestCount = Number(state.guests) || 1;
    const timeText = formatBookingTimeForDisplay(state.time_slot);
    document.getElementById('header-title').textContent = `${state.hotel_name} • ${state.date} • ${timeText}`;
    document.getElementById('seats-loading').classList.remove('d-none');
    updateSelectionSummary();
    
    try {
        const res = await fetch(`${API_BASE_URL}/seats?hotel_id=${state.hotel_id}&date=${state.date}&time_slot=${state.time_slot}`);
        const seats = await res.json();
        
        document.getElementById('seats-loading').classList.add('d-none');
        
        const tablesMap = {};
        seatSelectionState.seatById = {};
        seatSelectionState.chairBySeatId = {};
        seatSelectionState.tableByNumber = {};
        seatSelectionState.tableElsByNumber = {};
        seatSelectionState.selectedSeatIds = [];

        seats.forEach(s => {
            seatSelectionState.seatById[s.id] = s;
            if(!tablesMap[s.table_number]) {
                tablesMap[s.table_number] = {
                    tableNumber: s.table_number,
                    shape: s.shape,
                    capacity: s.capacity,
                    seats: []
                };
            }
            tablesMap[s.table_number].seats.push(s);
        });

        Object.keys(tablesMap).forEach(tNum => {
            const table = tablesMap[tNum];
            table.availableSeats = table.seats.filter(s => s.isAvailable);
            seatSelectionState.tableByNumber[tNum] = table;
        });

        renderRecommendationPanel();
        renderFloorPlan();
        updateSelectionSummary();
    } catch(e) {
        console.error(e);
    }
}

function renderFloorPlan() {
    const floor = document.getElementById('floor-plan');
    floor.innerHTML = '';

    const orderedTableNumbers = Object.keys(seatSelectionState.tableByNumber)
        .map(Number)
        .sort((a, b) => a - b);

    orderedTableNumbers.forEach(tNum => {
        const t = seatSelectionState.tableByNumber[tNum];

        const tableWrap = document.createElement('div');
        tableWrap.className = 'table-wrap';
        tableWrap.dataset.tableNumber = String(tNum);

        const tableMeta = document.createElement('div');
        tableMeta.className = 'table-meta';
        tableMeta.innerHTML = `<strong>Table ${tNum}</strong> • ${t.availableSeats.length}/${t.capacity} available`;
        tableWrap.appendChild(tableMeta);

        const autoBtn = document.createElement('button');
        autoBtn.type = 'button';
        autoBtn.className = 'table-auto-btn';
        autoBtn.textContent = 'Pick from this table';
        autoBtn.onclick = () => autoSelectFromTable(tNum);
        tableWrap.appendChild(autoBtn);

        const tableDiv = document.createElement('div');
        tableDiv.className = `restaurant-table table-${t.shape}`;
        seatSelectionState.tableElsByNumber[tNum] = tableDiv;

        const sortedSeats = [...t.seats].sort((a, b) => a.seat_number - b.seat_number);
        sortedSeats.forEach((seat, idx) => {
            const chair = document.createElement('div');
            chair.className = `chair ${seat.isAvailable ? 'available' : 'booked'}`;
            chair.setAttribute('title', `Table ${seat.table_number}, Seat ${seat.seat_number}`);
            positionChair(chair, t.shape, idx, t.capacity);

            if(seat.isAvailable) {
                chair.onclick = () => toggleSeat(seat.id);
            }

            seatSelectionState.chairBySeatId[seat.id] = chair;
            tableDiv.appendChild(chair);
        });

        tableWrap.appendChild(tableDiv);
        floor.appendChild(tableWrap);
    });
}
function positionChair(chair, shape, idx, capacity) {
    if(shape === 'circular') {
        const angle = (idx / capacity) * 2 * Math.PI;
        const radius = 45; 
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        chair.style.transform = `translate(${x}px, ${y}px)`;
    } else {
        const half = capacity/2;
        if(idx < half) {
            chair.style.top = `-20px`;
            chair.style.left = `${10 + idx*30}px`;
        } else {
            chair.style.bottom = `-20px`;
            chair.style.left = `${10 + (idx-half)*30}px`;
        }
    }
}

function toggleSeat(seatId) {
    const idx = seatSelectionState.selectedSeatIds.indexOf(seatId);
    if (idx >= 0) {
        seatSelectionState.selectedSeatIds.splice(idx, 1);
        refreshSeatVisuals();
        return;
    }

    if (seatSelectionState.selectedSeatIds.length >= seatSelectionState.guestCount) {
        alert(`You can select only ${seatSelectionState.guestCount} seats for ${seatSelectionState.guestCount} guests.`);
        return;
    }

    seatSelectionState.selectedSeatIds.push(seatId);
    refreshSeatVisuals();
}

function autoSelectFromTable(tableNumber) {
    const table = seatSelectionState.tableByNumber[tableNumber];
    if (!table) return;

    const remaining = seatSelectionState.guestCount - seatSelectionState.selectedSeatIds.length;
    if (remaining <= 0) return;

    const freeInTable = table.availableSeats
        .filter(s => !seatSelectionState.selectedSeatIds.includes(s.id))
        .sort((a, b) => a.seat_number - b.seat_number);

    if (freeInTable.length === 0) {
        alert(`No more available seats in Table ${tableNumber}.`);
        return;
    }

    const pickCount = Math.min(remaining, freeInTable.length);
    for (let i = 0; i < pickCount; i++) {
        seatSelectionState.selectedSeatIds.push(freeInTable[i].id);
    }

    refreshSeatVisuals();
}

function refreshSeatVisuals() {
    Object.keys(seatSelectionState.chairBySeatId).forEach(seatIdStr => {
        const seatId = Number(seatIdStr);
        const chair = seatSelectionState.chairBySeatId[seatId];
        chair.classList.remove('selected');
        delete chair.dataset.order;
    });

    seatSelectionState.selectedSeatIds.forEach((seatId, index) => {
        const chair = seatSelectionState.chairBySeatId[seatId];
        if (!chair) return;
        chair.classList.add('selected');
        chair.dataset.order = String(index + 1);
    });

    highlightActiveTables();
    updateSelectionSummary();
}

function highlightActiveTables() {
    Object.keys(seatSelectionState.tableElsByNumber).forEach(tNum => {
        const el = seatSelectionState.tableElsByNumber[tNum];
        el.classList.remove('table-has-selection');
    });

    const tablesWithSelection = new Set();
    seatSelectionState.selectedSeatIds.forEach(seatId => {
        const seat = seatSelectionState.seatById[seatId];
        if (seat) tablesWithSelection.add(String(seat.table_number));
    });

    tablesWithSelection.forEach(tableNumber => {
        const el = seatSelectionState.tableElsByNumber[tableNumber];
        if (el) el.classList.add('table-has-selection');
    });
}

function updateSelectionSummary() {
    const targetEl = document.getElementById('summary-target');
    const pickedEl = document.getElementById('summary-picked');
    const hintEl = document.getElementById('selection-hint');
    const tagsEl = document.getElementById('selected-seat-tags');
    const reserveBtn = document.getElementById('reserve-btn');
    if (!targetEl || !pickedEl || !hintEl || !tagsEl || !reserveBtn) return;

    const selectedCount = seatSelectionState.selectedSeatIds.length;
    targetEl.textContent = `Guests: ${seatSelectionState.guestCount}`;
    pickedEl.textContent = `Selected: ${selectedCount}`;

    if (selectedCount === 0) {
        hintEl.textContent = 'Select seats manually, or use “Pick from this table”.';
    } else if (selectedCount < seatSelectionState.guestCount) {
        hintEl.textContent = `Pick ${seatSelectionState.guestCount - selectedCount} more seat(s).`;
    } else {
        hintEl.textContent = 'Perfect. Your selection matches your guest count.';
    }

    tagsEl.innerHTML = '';
    seatSelectionState.selectedSeatIds.forEach((seatId, idx) => {
        const seat = seatSelectionState.seatById[seatId];
        if (!seat) return;
        const tag = document.createElement('span');
        tag.className = 'seat-tag';
        tag.textContent = `${idx + 1}. T${seat.table_number}-S${seat.seat_number}`;
        tagsEl.appendChild(tag);
    });

    reserveBtn.disabled = selectedCount !== seatSelectionState.guestCount;
}

function getBestTableOptions() {
    const need = seatSelectionState.guestCount;
    const allTables = Object.values(seatSelectionState.tableByNumber);
    const singleTableOptions = allTables
        .filter(t => t.availableSeats.length >= need)
        .sort((a, b) => {
            const diffA = a.availableSeats.length - need;
            const diffB = b.availableSeats.length - need;
            if (diffA !== diffB) return diffA - diffB;
            return a.tableNumber - b.tableNumber;
        })
        .slice(0, 2);

    let comboOption = null;
    if (singleTableOptions.length === 0) {
        const pairs = [];
        for (let i = 0; i < allTables.length; i++) {
            for (let j = i + 1; j < allTables.length; j++) {
                const left = allTables[i];
                const right = allTables[j];
                const total = left.availableSeats.length + right.availableSeats.length;
                if (total >= need) {
                    pairs.push({
                        left,
                        right,
                        total,
                        waste: total - need
                    });
                }
            }
        }

        pairs.sort((a, b) => {
            if (a.waste !== b.waste) return a.waste - b.waste;
            return (a.left.tableNumber + a.right.tableNumber) - (b.left.tableNumber + b.right.tableNumber);
        });

        comboOption = pairs[0] || null;
    }

    return {
        singleTableOptions,
        comboOption
    };
}

function renderRecommendationPanel() {
    const panel = document.getElementById('recommendation-panel');
    if (!panel) return;

    const options = getBestTableOptions();
    const need = seatSelectionState.guestCount;
    panel.innerHTML = '';

    if (options.singleTableOptions.length > 0) {
        const head = document.createElement('div');
        head.className = 'recommendation-head';
        head.textContent = `Best table options for ${need} guest(s):`;
        panel.appendChild(head);

        options.singleTableOptions.forEach(table => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'table-suggestion-card';
            card.textContent = `Table ${table.tableNumber} (${table.availableSeats.length} seats available)`;
            card.onclick = () => autoSelectFromTable(table.tableNumber);
            panel.appendChild(card);
        });
        return;
    }

    if (options.comboOption) {
        const combo = options.comboOption;
        const head = document.createElement('div');
        head.className = 'recommendation-head';
        head.textContent = `No single table fits ${need} guests. Combine these two tables:`;
        panel.appendChild(head);

        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'table-suggestion-card combo';
        card.textContent = `Table ${combo.left.tableNumber} + Table ${combo.right.tableNumber} (${combo.total} seats available)`;
        card.onclick = () => {
            autoSelectFromTable(combo.left.tableNumber);
            autoSelectFromTable(combo.right.tableNumber);
        };
        panel.appendChild(card);
        return;
    }

    panel.innerHTML = `<div class="recommendation-head">Only ${Object.values(seatSelectionState.seatById).filter(s => s.isAvailable).length} seats are available. Please reduce guests or choose another time slot.</div>`;
}

function showReserveModal() {
    const modal = new bootstrap.Modal(document.getElementById('reserveModal'));
    modal.show();
}

async function postBookingRequest(payload) {
    return fetch(`${API_BASE_URL}/book`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });
}

async function parseJsonSafe(response) {
    try {
        return await response.json();
    } catch (error) {
        console.error('Failed to parse JSON response', error);
        return {};
    }
}

function validateReservationInputs(state, name, phone) {
    if(!name || !phone) {
        alert('Name and Phone are required');
        return false;
    }
    if(!state.date || !state.time_slot || !state.hotel_id) {
        alert('Booking details are missing. Please choose date/time again from the booking page.');
        return false;
    }
    if(seatSelectionState.selectedSeatIds.length !== seatSelectionState.guestCount) {
        alert(`Please select exactly ${seatSelectionState.guestCount} seats.`);
        return false;
    }
    return true;
}

async function bookSeatsIndividually(basePayload, seatIds) {
    let bookedCount = 0;
    for (const seatId of seatIds) {
        const singlePayload = {
            ...basePayload,
            seat_id: seatId,
            seat_ids: [seatId]
        };
        const response = await postBookingRequest(singlePayload);
        if (!response.ok) {
            const errorBody = await parseJsonSafe(response);
            return {
                ok: false,
                message: errorBody.message || 'Error booking seat'
            };
        }
        bookedCount++;
    }

    return { ok: true, bookedCount };
}

async function handlePrimaryBooking(payload, selectedSeatIds) {
    const initialRes = await postBookingRequest(payload);
    const initialBody = await parseJsonSafe(initialRes);

    if (initialRes.ok) {
        const initialCount = Number(initialBody.booked_seat_count) || 0;

        if (selectedSeatIds.length > 1 && initialCount === 0) {
            const remainingSeatIds = selectedSeatIds.slice(1);
            const fallbackResult = await bookSeatsIndividually(payload, remainingSeatIds);
            if (!fallbackResult.ok) return fallbackResult;
            return { ok: true, bookedCount: 1 + fallbackResult.bookedCount };
        }

        return { ok: true, bookedCount: initialCount || 1 };
    }

    const fallbackMessages = ['Missing required fields', 'Seat already booked'];
    if (!fallbackMessages.includes(initialBody.message)) {
        return { ok: false, message: initialBody.message || 'Error booking seat' };
    }

    return bookSeatsIndividually(payload, selectedSeatIds);
}

async function confirmReservation() {
    const state = getBookingState();
    const name = document.getElementById('c-name').value;
    const phone = document.getElementById('c-phone').value;
    const req = document.getElementById('c-req').value;

    if (!validateReservationInputs(state, name, phone)) return;

    const payload = {
        seat_id: seatSelectionState.selectedSeatIds[0],
        seat_ids: seatSelectionState.selectedSeatIds,
        customer_name: name,
        phone_number: phone,
        special_request: req,
        date: state.date,
        time_slot: state.time_slot
    };

    const bookingResult = await handlePrimaryBooking(payload, seatSelectionState.selectedSeatIds);
    if (!bookingResult.ok) {
        alert(bookingResult.message || 'Error booking seat');
        return;
    }

    const bookedCount = bookingResult.bookedCount || 0;

    if (bookedCount === seatSelectionState.selectedSeatIds.length || seatSelectionState.selectedSeatIds.length === 1) {
        alert("Reservation Confirmed!");
        location.href = 'history.html';
    } else {
        alert('Reservation partially completed. Please check bookings history.');
        location.href = 'history.html';
    }
}

// Page 5: history.html
async function fetchHistory(e) {
    e.preventDefault();
    const name = document.getElementById('h-name').value;
    const phone = document.getElementById('h-phone').value;
    
    if(!name && !phone) return alert("Please enter name or phone");

    const res = await fetch(`${API_BASE_URL}/history?customer_name=${name}&phone_number=${phone}`);
    const data = await res.json();
    
    const div = document.getElementById('history-results');
    div.innerHTML = '';
    
    if(data.length === 0) {
        div.innerHTML = '<p class="text-center mt-4">No reservations found.</p>';
        return;
    }

    const grouped = {};
    data.forEach(r => {
        const key = [r.hotel_name, r.location, r.date, r.time_slot, r.customer_name, r.phone_number].join('|');
        if (!grouped[key]) {
            grouped[key] = {
                ...r,
                seatRows: [],
                reservationIds: []
            };
        }
        grouped[key].seatRows.push(r);
        grouped[key].reservationIds.push(r.id);
    });

    Object.values(grouped).forEach(group => {
        const seatsByTable = {};
        group.seatRows.forEach(row => {
            if (!seatsByTable[row.table_number]) seatsByTable[row.table_number] = [];
            seatsByTable[row.table_number].push(row.seat_number);
        });

        const tableSeatText = Object.keys(seatsByTable)
            .sort((a, b) => Number(a) - Number(b))
            .map(tableNum => {
                const seats = seatsByTable[tableNum]
                    .sort((a, b) => a - b)
                    .map(seatNum => `S${seatNum}`)
                    .join(', ');
                return `T${tableNum}/${seats}`;
            })
            .join(' | ');

        const guestCount = group.seatRows.length;
        const reservationIds = [...new Set(group.reservationIds)].filter(Boolean);
        const reservationIdsArg = reservationIds.join(',');

        div.innerHTML += `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="fw-bold" style="color:var(--primary-color)">${group.hotel_name}</h5>
                    <p class="mb-2 text-muted small">${group.location}</p>
                    <div class="d-flex justify-content-between bg-light p-2 rounded">
                        <div>
                            <div class="small text-muted">Date</div>
                            <strong>${group.date}</strong>
                        </div>
                        <div>
                            <div class="small text-muted">Time Slot</div>
                            <strong>${formatBookingTimeForDisplay(group.time_slot)}</strong>
                        </div>
                        <div>
                            <div class="small text-muted">Guests</div>
                            <strong>${guestCount}</strong>
                        </div>
                        <div class="text-end">
                            <div class="small text-muted">Table / Seats</div>
                            <strong>${tableSeatText}</strong>
                        </div>
                    </div>
                    <div class="mt-3 text-end">
                        <button type="button" class="btn-outline-inline" onclick="cancelReservation([${reservationIdsArg}])">Cancel Reservation</button>
                    </div>
                </div>
            </div>
        `;
    });
}

async function cancelReservation(reservationIds) {
    if (!Array.isArray(reservationIds) || reservationIds.length === 0) {
        return alert('Unable to cancel this reservation.');
    }

    const confirmed = confirm('Are you sure you want to cancel this reservation?');
    if (!confirmed) return;

    const res = await fetch(`${API_BASE_URL}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservation_ids: reservationIds })
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        const apiMessage = body.message || '';
        const extra = res.status === 404
            ? ' Cancel API not found. Please restart backend server to load latest routes.'
            : '';
        return alert(`${apiMessage || 'Failed to cancel reservation'} (HTTP ${res.status}).${extra}`);
    }

    alert('Reservation cancelled successfully.');
    await fetchHistory({ preventDefault: () => {} });
}

function initBackNav() {
    const path = globalThis.location.pathname.toLowerCase();
    if (path.endsWith('index.html') || path.endsWith('/')) {
        return;
    }

    const backBtn = document.createElement('a');
    backBtn.className = 'back-fab';
    backBtn.href = 'index.html';
    backBtn.setAttribute('aria-label', 'Back');
    backBtn.textContent = '←';
    backBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (globalThis.history.length > 1) {
            globalThis.history.back();
        } else {
            globalThis.location.href = 'index.html';
        }
    });
    document.body.appendChild(backBtn);
}

document.addEventListener('DOMContentLoaded', initBackNav);
