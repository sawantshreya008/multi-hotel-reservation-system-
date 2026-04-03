require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hotel_reservation',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true // Fix timezone date bug
});

const promisePool = pool.promise();

// Get hotels
app.get('/api/hotels', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT * FROM hotels');
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching hotels' });
    }
});

// Get single hotel
app.get('/api/hotels/:id', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT * FROM hotels WHERE id = ?', [req.params.id]);
        if(rows.length === 0) return res.status(404).json({ message: 'Not found' });
        res.json(rows[0]);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching hotel' });
    }
});

// Get seats for a hotel with availability status
app.get('/api/seats', async (req, res) => {
    try {
        const { hotel_id, date, time_slot } = req.query;
        if (!hotel_id || !date || !time_slot) {
            return res.status(400).json({ message: 'Missing parameters' });
        }

        const [seats] = await promisePool.query('SELECT * FROM seats WHERE hotel_id = ?', [hotel_id]);
        const [reservations] = await promisePool.query(
            'SELECT seat_id FROM reservations WHERE date = ? AND time_slot = ?',
            [date, time_slot]
        );

        const reservedSeatIds = new Set(reservations.map(r => r.seat_id));
        const seatsWithStatus = seats.map(s => ({
            ...s,
            isAvailable: !reservedSeatIds.has(s.id)
        }));

        res.json(seatsWithStatus);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching seats' });
    }
});

// Book a seat
app.post('/api/book', async (req, res) => {
    let connection;
    try {
        const { seat_id, seat_ids, customer_name, phone_number, special_request, date, time_slot } = req.body;
        const normalizedSeatIds = Array.isArray(seat_ids)
            ? [...new Set(seat_ids.map(Number).filter(Boolean))]
            : [Number(seat_id)].filter(Boolean);

        if (normalizedSeatIds.length === 0 || !customer_name || !date || !time_slot) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        connection = await promisePool.getConnection();
        await connection.beginTransaction();

        const placeholders = normalizedSeatIds.map(() => '?').join(',');
        const [existing] = await connection.query(
            `SELECT seat_id FROM reservations WHERE seat_id IN (${placeholders}) AND date = ? AND time_slot = ?`,
            [...normalizedSeatIds, date, time_slot]
        );

        if (existing.length > 0) {
            await connection.rollback();
            return res.status(409).json({ message: 'Seat already booked' });
        }

        for (const currentSeatId of normalizedSeatIds) {
            await connection.query(
                'INSERT INTO reservations (seat_id, customer_name, phone_number, special_request, date, time_slot) VALUES (?, ?, ?, ?, ?, ?)',
                [currentSeatId, customer_name, phone_number || '', special_request || '', date, time_slot]
            );
        }

        await connection.commit();

        res.status(201).json({
            message: 'Booked successfully',
            booked_seat_count: normalizedSeatIds.length
        });
    } catch (e) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(rollbackError);
            }
        }
        if (e.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Seat already booked' });
        console.error(e);
        res.status(500).json({ message: 'Error booking seat' });
    } finally {
        if (connection) connection.release();
    }
});

// Get booking history
app.get('/api/history', async (req, res) => {
    try {
        const { phone_number, customer_name } = req.query;
        if (!phone_number && !customer_name) {
            return res.status(400).json({ message: 'Provide phone_number or customer_name' });
        }

        // We use OR if both are provided, or just one
        let query = `
            SELECT r.*, s.table_number, s.seat_number, h.name as hotel_name, h.location
            FROM reservations r
            JOIN seats s ON r.seat_id = s.id
            JOIN hotels h ON s.hotel_id = h.id
            WHERE r.customer_name LIKE ? OR r.phone_number = ?
            ORDER BY r.date DESC, r.id DESC
        `;
        
        const nameParam = customer_name ? `%${customer_name}%` : ``;
        const phoneParam = phone_number || ``;

        const [rows] = await promisePool.query(query, [nameParam, phoneParam]);
        res.json(rows);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error fetching history' });
    }
});

// Cancel reservation(s)
app.post('/api/cancel', async (req, res) => {
    let connection;
    try {
        const { reservation_ids } = req.body;
        const ids = Array.isArray(reservation_ids)
            ? [...new Set(reservation_ids.map(Number).filter(Boolean))]
            : [];

        if (ids.length === 0) {
            return res.status(400).json({ message: 'reservation_ids is required' });
        }

        connection = await promisePool.getConnection();
        await connection.beginTransaction();

        const placeholders = ids.map(() => '?').join(',');
        const [result] = await connection.query(
            `DELETE FROM reservations WHERE id IN (${placeholders})`,
            ids
        );

        await connection.commit();

        res.json({
            message: 'Reservation cancelled successfully',
            deleted_count: result.affectedRows || 0
        });
    } catch (e) {
        if (connection) {
            try {
                await connection.rollback();
            } catch (rollbackError) {
                console.error(rollbackError);
            }
        }
        console.error(e);
        res.status(500).json({ message: 'Error cancelling reservation' });
    } finally {
        if (connection) connection.release();
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
