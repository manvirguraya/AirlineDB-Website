/**
 * Airline Database Web Server
 * --------------------------------
 * Express server that connects to MySQL (AirlineDB) and exposes
 *   - CRUD endpoints for the main tables
 *   - Endpoints that run the 5 required queries
 *   - Endpoints that call the stored procedure and function
 *   - A trigger demo endpoint
 *
 * Run with:  npm start
 */

require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- DB connection pool ---------- */
const pool = mysql.createPool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'AirlineDB',
    socketPath: process.env.DB_SOCKET || undefined,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: false
});

/* Helper: wrap an async route and forward errors */
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

/* =========================================================
   CRUD: CUSTOMER
   ========================================================= */
app.get('/api/customers', wrap(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM Customer ORDER BY customer_id');
    res.json(rows);
}));

app.post('/api/customers', wrap(async (req, res) => {
    const { customer_id, name, email, phone } = req.body;
    await pool.query(
        'INSERT INTO Customer (customer_id, name, email, phone) VALUES (?, ?, ?, ?)',
        [customer_id, name, email, phone || null]
    );
    res.status(201).json({ message: 'Customer created', customer_id });
}));

app.put('/api/customers/:id', wrap(async (req, res) => {
    const { name, email, phone } = req.body;
    const [result] = await pool.query(
        'UPDATE Customer SET name=?, email=?, phone=? WHERE customer_id=?',
        [name, email, phone || null, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Customer updated' });
}));

app.delete('/api/customers/:id', wrap(async (req, res) => {
    const [result] = await pool.query('DELETE FROM Customer WHERE customer_id=?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Customer deleted' });
}));

/* =========================================================
   CRUD: LOYALTY ACCOUNT
   ========================================================= */
app.get('/api/loyalty', wrap(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT l.*, c.name AS customer_name, c.email
        FROM Loyalty_Account l
        JOIN Customer c ON l.customer_id = c.customer_id
        ORDER BY l.member_id
    `);
    res.json(rows);
}));

app.post('/api/loyalty', wrap(async (req, res) => {
    const { member_id, customer_id, points_balance } = req.body;
    /* tier is auto-assigned by the set_loyalty_tier_insert trigger */
    await pool.query(
        'INSERT INTO Loyalty_Account (member_id, customer_id, points_balance, tier) VALUES (?, ?, ?, ?)',
        [member_id, customer_id, points_balance || 0, 'Bronze']
    );
    res.status(201).json({ message: 'Loyalty account created (tier auto-assigned by trigger)' });
}));

app.put('/api/loyalty/:id', wrap(async (req, res) => {
    const { points_balance, tier } = req.body;
    const [result] = await pool.query(
        'UPDATE Loyalty_Account SET points_balance=?, tier=? WHERE member_id=?',
        [points_balance, tier, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Loyalty account updated' });
}));

app.delete('/api/loyalty/:id', wrap(async (req, res) => {
    const [result] = await pool.query('DELETE FROM Loyalty_Account WHERE member_id=?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Loyalty account deleted' });
}));

/* =========================================================
   CRUD: AIRCRAFT
   ========================================================= */
app.get('/api/aircraft', wrap(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM Aircraft ORDER BY tail_number');
    res.json(rows);
}));

app.post('/api/aircraft', wrap(async (req, res) => {
    const { tail_number, model, capacity } = req.body;
    await pool.query(
        'INSERT INTO Aircraft (tail_number, model, capacity) VALUES (?, ?, ?)',
        [tail_number, model, capacity]
    );
    res.status(201).json({ message: 'Aircraft created' });
}));

app.put('/api/aircraft/:id', wrap(async (req, res) => {
    const { model, capacity } = req.body;
    const [result] = await pool.query(
        'UPDATE Aircraft SET model=?, capacity=? WHERE tail_number=?',
        [model, capacity, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Aircraft updated' });
}));

app.delete('/api/aircraft/:id', wrap(async (req, res) => {
    const [result] = await pool.query('DELETE FROM Aircraft WHERE tail_number=?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Aircraft deleted' });
}));

/* =========================================================
   CRUD: AIRPORT
   ========================================================= */
app.get('/api/airports', wrap(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM Airport ORDER BY airport_code');
    res.json(rows);
}));

app.post('/api/airports', wrap(async (req, res) => {
    const { airport_code, city, country, name } = req.body;
    await pool.query(
        'INSERT INTO Airport (airport_code, city, country, name) VALUES (?, ?, ?, ?)',
        [airport_code, city, country, name]
    );
    res.status(201).json({ message: 'Airport created' });
}));

app.put('/api/airports/:id', wrap(async (req, res) => {
    const { city, country, name } = req.body;
    const [result] = await pool.query(
        'UPDATE Airport SET city=?, country=?, name=? WHERE airport_code=?',
        [city, country, name, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Airport updated' });
}));

app.delete('/api/airports/:id', wrap(async (req, res) => {
    const [result] = await pool.query('DELETE FROM Airport WHERE airport_code=?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Airport deleted' });
}));

/* =========================================================
   CRUD: FLIGHT INSTANCE
   ========================================================= */
app.get('/api/flight-instances', wrap(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT fi.*, sf.scheduled_departure_time, sf.scheduled_arrival_time
        FROM Flight_Instance fi
        JOIN Scheduled_Flight sf ON fi.flight_number = sf.flight_number
        ORDER BY fi.flight_date, fi.flight_instance_id
    `);
    res.json(rows);
}));

app.post('/api/flight-instances', wrap(async (req, res) => {
    const { flight_instance_id, flight_number, tail_number, flight_date,
            actual_departure_time, actual_arrival_time, status } = req.body;
    await pool.query(
        `INSERT INTO Flight_Instance
            (flight_instance_id, flight_number, tail_number, flight_date,
             actual_departure_time, actual_arrival_time, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [flight_instance_id, flight_number, tail_number, flight_date,
         actual_departure_time || null, actual_arrival_time || null, status || 'Scheduled']
    );
    res.status(201).json({ message: 'Flight instance created' });
}));

app.put('/api/flight-instances/:id', wrap(async (req, res) => {
    const { tail_number, flight_date, actual_departure_time, actual_arrival_time, status } = req.body;
    /* The update_flight_status trigger will adjust status if actual_departure_time changes */
    const [result] = await pool.query(
        `UPDATE Flight_Instance
         SET tail_number=?, flight_date=?, actual_departure_time=?, actual_arrival_time=?, status=?
         WHERE flight_instance_id=?`,
        [tail_number, flight_date, actual_departure_time || null, actual_arrival_time || null,
         status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Flight instance updated (trigger may have adjusted status)' });
}));

app.delete('/api/flight-instances/:id', wrap(async (req, res) => {
    const [result] = await pool.query('DELETE FROM Flight_Instance WHERE flight_instance_id=?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Flight instance deleted' });
}));

/* =========================================================
   CRUD: PAYMENT
   ========================================================= */
app.get('/api/payments', wrap(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM Payment ORDER BY payment_date DESC');
    res.json(rows);
}));

app.post('/api/payments', wrap(async (req, res) => {
    const { payment_id, booking_reference, amount, payment_date, payment_status } = req.body;
    /* check_payment_amount trigger may flip status to 'Invalid' if amount <= 0 */
    await pool.query(
        `INSERT INTO Payment (payment_id, booking_reference, amount, payment_date, payment_status)
         VALUES (?, ?, ?, ?, ?)`,
        [payment_id, booking_reference, amount, payment_date, payment_status || 'Pending']
    );
    res.status(201).json({ message: 'Payment created (trigger validates amount)' });
}));

app.put('/api/payments/:id', wrap(async (req, res) => {
    const { amount, payment_status } = req.body;
    const [result] = await pool.query(
        'UPDATE Payment SET amount=?, payment_status=? WHERE payment_id=?',
        [amount, payment_status, req.params.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Payment updated' });
}));

app.delete('/api/payments/:id', wrap(async (req, res) => {
    const [result] = await pool.query('DELETE FROM Payment WHERE payment_id=?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Payment deleted' });
}));

/* =========================================================
   READ-ONLY helpers (for dropdowns in forms)
   ========================================================= */
app.get('/api/scheduled-flights', wrap(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM Scheduled_Flight ORDER BY flight_number');
    res.json(rows);
}));

app.get('/api/reservations', wrap(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM Reservation ORDER BY booking_reference');
    res.json(rows);
}));

/* =========================================================
   THE 5 REQUIRED QUERIES
   ========================================================= */

/* Q1: View usage — flight_summary */
app.get('/api/queries/q1', wrap(async (req, res) => {
    const [rows] = await pool.query('SELECT * FROM flight_summary');
    res.json({
        description: 'Q1 — Lists every scheduled flight with origin city, destination city, times, and distance using the flight_summary VIEW.',
        rows
    });
}));

/* Q2: JOIN — flight instances + aircraft */
app.get('/api/queries/q2', wrap(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT fi.flight_instance_id, fi.flight_number, fi.flight_date, fi.status,
               a.tail_number, a.model, a.capacity
        FROM Flight_Instance fi
        JOIN Aircraft a ON fi.tail_number = a.tail_number
        ORDER BY fi.flight_date
    `);
    res.json({
        description: 'Q2 — Shows each flight instance with its aircraft details (model, capacity) by JOINing Flight_Instance with Aircraft on tail_number.',
        rows
    });
}));

/* Q3: JOIN + AGGREGATION — customer payment totals */
app.get('/api/queries/q3', wrap(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT c.customer_id, c.name,
               COUNT(p.payment_id)        AS num_payments,
               COALESCE(SUM(p.amount), 0) AS total_spent
        FROM Customer c
        LEFT JOIN Reservation r ON c.customer_id = r.customer_id
        LEFT JOIN Payment p ON r.booking_reference = p.booking_reference
        GROUP BY c.customer_id, c.name
        ORDER BY total_spent DESC
    `);
    res.json({
        description: 'Q3 — For each customer, totals how much they have paid across all their reservations. Joins Customer → Reservation → Payment with COUNT and SUM aggregations.',
        rows
    });
}));

/* Q4: JOIN + AGGREGATION — tickets by route and fare class */
app.get('/api/queries/q4', wrap(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT r.route_id,
               r.origin_airport_code,
               r.destination_airport_code,
               t.fare_class,
               COUNT(*)                          AS tickets_sold,
               SUM(t.base_price + t.taxes_fees)  AS revenue
        FROM Ticket t
        JOIN Itinerary_Segment iseg ON t.ticket_id = iseg.ticket_id
        JOIN Flight_Instance   fi   ON iseg.flight_instance_id = fi.flight_instance_id
        JOIN Scheduled_Flight  sf   ON fi.flight_number = sf.flight_number
        JOIN Route             r    ON sf.route_id = r.route_id
        GROUP BY r.route_id, r.origin_airport_code, r.destination_airport_code, t.fare_class
        ORDER BY r.route_id, revenue DESC
    `);
    res.json({
        description: 'Q4 — Counts tickets sold and total revenue per route per fare class. Joins five tables (Ticket → Itinerary_Segment → Flight_Instance → Scheduled_Flight → Route) and aggregates with COUNT and SUM.',
        rows
    });
}));

/* Q5: SUBQUERY — customers spending above average */
app.get('/api/queries/q5', wrap(async (req, res) => {
    const [rows] = await pool.query(`
        SELECT c.customer_id, c.name, c.email
        FROM Customer c
        WHERE c.customer_id IN (
            SELECT r.customer_id
            FROM Reservation r
            JOIN Payment p ON r.booking_reference = p.booking_reference
            WHERE p.payment_status = 'Completed'
              AND p.amount > (
                  SELECT AVG(amount) FROM Payment WHERE payment_status = 'Completed'
              )
        )
    `);
    res.json({
        description: 'Q5 — Lists customers who have completed payments larger than the average completed payment. Uses a SUBQUERY (and a nested subquery for the average).',
        rows
    });
}));

/* =========================================================
   PROCEDURE & FUNCTION ENDPOINTS
   ========================================================= */
app.get('/api/procedure/payments-by-status/:status', wrap(async (req, res) => {
    const [rows] = await pool.query('CALL get_payments_by_status(?)', [req.params.status]);
    /* CALL returns an array of result sets; first one is our SELECT */
    res.json({
        description: `Stored procedure get_payments_by_status('${req.params.status}')`,
        rows: rows[0]
    });
}));

app.get('/api/function/ticket-total/:id', wrap(async (req, res) => {
    const [rows] = await pool.query(
        'SELECT calculate_ticket_total(?) AS ticket_total',
        [req.params.id]
    );
    res.json({
        description: `Function calculate_ticket_total(${req.params.id})`,
        ticket_total: rows[0].ticket_total
    });
}));

/* =========================================================
   TRIGGER DEMO ENDPOINTS
   The website needs to "showcase some operation that activates
   at least one trigger." These three endpoints demonstrate all
   three triggers visibly.
   ========================================================= */

/* Trigger 1 demo: insert a payment with amount = 0
   The check_payment_amount trigger flips status to 'Invalid'. */
app.post('/api/triggers/demo-payment', wrap(async (req, res) => {
    /* find a free payment_id */
    const [[{ next_id }]] = await pool.query(
        'SELECT COALESCE(MAX(payment_id), 5000) + 1 AS next_id FROM Payment'
    );
    await pool.query(
        `INSERT INTO Payment (payment_id, booking_reference, amount, payment_date, payment_status)
         VALUES (?, 'R001', 0.00, NOW(), 'Completed')`,
        [next_id]
    );
    const [rows] = await pool.query('SELECT * FROM Payment WHERE payment_id = ?', [next_id]);
    res.json({
        description: 'Trigger 1 (check_payment_amount) — inserted a payment with amount=0 and intended status="Completed". The trigger flipped status to "Invalid".',
        inserted_row: rows[0]
    });
}));

/* Trigger 2 demo: insert a customer + loyalty account with 25,000 points and tier='Bronze'.
   The set_loyalty_tier_insert trigger upgrades it to 'Platinum'. */
app.post('/api/triggers/demo-loyalty', wrap(async (req, res) => {
    const [[{ next_cid  }]] = await pool.query('SELECT COALESCE(MAX(customer_id), 1000) + 1 AS next_cid  FROM Customer');
    const [[{ next_mid  }]] = await pool.query('SELECT COALESCE(MAX(member_id),   1000) + 1 AS next_mid  FROM Loyalty_Account');

    await pool.query(
        `INSERT INTO Customer (customer_id, name, email, phone)
         VALUES (?, 'Trigger Demo', ?, '000-000-0000')`,
        [next_cid, `demo_${next_cid}@example.com`]
    );
    await pool.query(
        `INSERT INTO Loyalty_Account (member_id, customer_id, points_balance, tier)
         VALUES (?, ?, 25000, 'Bronze')`,
        [next_mid, next_cid]
    );
    const [rows] = await pool.query('SELECT * FROM Loyalty_Account WHERE member_id = ?', [next_mid]);
    res.json({
        description: 'Trigger 2 (set_loyalty_tier_insert) — inserted a loyalty account with 25,000 points and tier="Bronze". The trigger upgraded it to "Platinum" based on the points threshold.',
        inserted_row: rows[0]
    });
}));

/* Trigger 3 demo: take an existing flight_instance, set its actual_departure_time
   1 hour after the scheduled time. The update_flight_status trigger marks it 'Delayed'. */
app.post('/api/triggers/demo-flight', wrap(async (req, res) => {
    const flight_id = 3003; /* AA303 LAX→DFW, scheduled 13:00 */
    /* Reset to a clean state first so the demo is repeatable */
    await pool.query(
        `UPDATE Flight_Instance
         SET actual_departure_time = NULL, actual_arrival_time = NULL, status = 'Scheduled'
         WHERE flight_instance_id = ?`,
        [flight_id]
    );

    /* Now set actual departure later than scheduled — trigger should fire */
    const lateDeparture = '2026-04-12 14:30:00'; /* 90 min late */
    await pool.query(
        `UPDATE Flight_Instance
         SET actual_departure_time = ?, actual_arrival_time = '2026-04-12 17:30:00'
         WHERE flight_instance_id = ?`,
        [lateDeparture, flight_id]
    );

    const [rows] = await pool.query('SELECT * FROM Flight_Instance WHERE flight_instance_id = ?', [flight_id]);
    res.json({
        description: 'Trigger 3 (update_flight_status) — updated flight_instance 3003 with an actual_departure_time 90 min after its scheduled time. The trigger automatically set status to "Delayed".',
        updated_row: rows[0]
    });
}));

/* =========================================================
   ERROR HANDLER
   ========================================================= */
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({
        error: err.sqlMessage || err.message || 'Server error',
        code:  err.code
    });
});

/* =========================================================
   START
   ========================================================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Airline DB server running at http://localhost:${PORT}`);
});
