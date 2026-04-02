// Utility to parse URL params
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
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
    }
}

// Page 2: hotel.html
async function initHotel() {
    const { id } = getQueryParams();
    if(!id) return location.href="index.html";
    
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
        document.getElementById('hotel-desc').textContent = h.description;
        
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

    let guests = 2;
    const guestSpan = document.getElementById('guest-count');
    document.getElementById('btn-minus').onclick = () => { if(guests > 1) { guests--; guestSpan.textContent = guests; } };
    document.getElementById('btn-plus').onclick = () => { if(guests < 20) { guests++; guestSpan.textContent = guests; } };
    
    document.getElementById('confirm-btn').onclick = () => {
        const date = dateInput.value;
        const time = document.getElementById('res-time').value;
        if(!date || !time) return alert('Select date and time');
        
        saveBookingState({ date, time_slot: time, guests });
        location.href = `seats.html`;
    };
}

// Page 4: seats.html
async function initSeats() {
    const state = getBookingState();
    if(!state.hotel_id) return location.href="index.html";
    
    document.getElementById('header-title').textContent = `${state.hotel_name} • ${state.date} • ${state.time_slot}`;
    document.getElementById('seats-loading').classList.remove('d-none');
    
    try {
        const res = await fetch(`${API_BASE_URL}/seats?hotel_id=${state.hotel_id}&date=${state.date}&time_slot=${state.time_slot}`);
        const seats = await res.json();
        
        document.getElementById('seats-loading').classList.add('d-none');
        
        // Render Tables
        const tablesMap = {};
        seats.forEach(s => {
            if(!tablesMap[s.table_number]) tablesMap[s.table_number] = { shape: s.shape, capacity: s.capacity, seats: [] };
            tablesMap[s.table_number].seats.push(s);
        });

        const floor = document.getElementById('floor-plan');
        floor.innerHTML = '';

        Object.keys(tablesMap).forEach(tNum => {
            const t = tablesMap[tNum];
            const tableDiv = document.createElement('div');
            tableDiv.className = `restaurant-table table-${t.shape}`;
            
            // Add chairs
            t.seats.forEach((seat, idx) => {
                const chair = document.createElement('div');
                chair.className = `chair ${seat.isAvailable ? 'available' : 'booked'}`;
                // Position magic
                positionChair(chair, t.shape, idx, t.capacity);
                
                if(seat.isAvailable) {
                    chair.onclick = () => selectSeat(chair, seat);
                }
                tableDiv.appendChild(chair);
            });

            floor.appendChild(tableDiv);
        });
    } catch(e) { console.error(e); }
}

let selectedSeatObj = null;
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

function selectSeat(el, seat) {
    document.querySelectorAll('.chair').forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
    selectedSeatObj = seat;
    document.getElementById('reserve-btn').disabled = false;
}

function showReserveModal() {
    const modal = new bootstrap.Modal(document.getElementById('reserveModal'));
    modal.show();
}

async function confirmReservation() {
    const state = getBookingState();
    const name = document.getElementById('c-name').value;
    const phone = document.getElementById('c-phone').value;
    const req = document.getElementById('c-req').value;
    
    if(!name || !phone) return alert("Name and Phone are required");

    const payload = {
        seat_id: selectedSeatObj.id,
        customer_name: name,
        phone_number: phone,
        special_request: req,
        date: state.date,
        time_slot: state.time_slot
    };

    const res = await fetch(`${API_BASE_URL}/book`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
    });

    if(res.ok) {
        alert("Reservation Confirmed!");
        location.href = 'history.html';
    } else {
        const e = await res.json();
        alert(e.message);
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
    
    data.forEach(r => {
        div.innerHTML += `
            <div class="card mb-3">
                <div class="card-body">
                    <h5 class="fw-bold" style="color:var(--primary-color)">${r.hotel_name}</h5>
                    <p class="mb-2 text-muted small">${r.location}</p>
                    <div class="d-flex justify-content-between bg-light p-2 rounded">
                        <div>
                            <div class="small text-muted">Date</div>
                            <strong>${r.date}</strong>
                        </div>
                        <div>
                            <div class="small text-muted">Time Slot</div>
                            <strong class="text-capitalize">${r.time_slot}</strong>
                        </div>
                        <div class="text-end">
                            <div class="small text-muted">Table / Seat</div>
                            <strong>T${r.table_number} / S${r.seat_number}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

function initBackNav() {
    const path = window.location.pathname.toLowerCase();
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
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.location.href = 'index.html';
        }
    });
    document.body.appendChild(backBtn);
}

document.addEventListener('DOMContentLoaded', initBackNav);
