CREATE DATABASE IF NOT EXISTS AirlineDB;
USE AirlineDB;

/* =========================================================
   CREATE RELATIONS
   - Data types chosen to match the domain (DECIMAL for money,
     DATE/DATETIME for time values, VARCHAR with reasonable lengths).
   - NOT NULL on required attributes, UNIQUE on natural keys,
     DEFAULT where a sensible default exists.
   - Foreign keys use explicit ON DELETE / ON UPDATE actions:
       * CASCADE     when child rows have no meaning without parent
                     (e.g. Loyalty_Account without its Customer).
       * RESTRICT    when deletion of the parent should be blocked
                     (e.g. an Airport that still has Routes).
       * SET NULL    when the relationship is optional and the child
                     row should survive (e.g. Ticket without a flight
                     instance still exists as a refund record).
   ========================================================= */

/* ---------- Customer & Loyalty ---------- */

CREATE TABLE Customer (
    customer_id INT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20)
);

CREATE TABLE Loyalty_Account (
    member_id INT PRIMARY KEY,
    customer_id INT NOT NULL UNIQUE,
    points_balance INT NOT NULL DEFAULT 0,
    tier VARCHAR(20) NOT NULL DEFAULT 'Bronze',
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CHECK (points_balance >= 0),
    CHECK (tier IN ('Bronze','Silver','Gold','Platinum'))
);

/* ---------- Aircraft & Seats ---------- */

CREATE TABLE Aircraft (
    tail_number VARCHAR(20) PRIMARY KEY,
    model VARCHAR(100) NOT NULL,
    capacity INT NOT NULL,
    CHECK (capacity > 0)
);

CREATE TABLE Seat (
    seat_id INT PRIMARY KEY,
    tail_number VARCHAR(20) NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    cabin_class VARCHAR(20) NOT NULL,
    seat_type VARCHAR(20) NOT NULL,
    UNIQUE (tail_number, seat_number),
    FOREIGN KEY (tail_number) REFERENCES Aircraft(tail_number)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CHECK (cabin_class IN ('Economy','Business','First')),
    CHECK (seat_type IN ('Window','Aisle','Middle'))
);

/* ---------- Airports, Routes, Flights ---------- */

CREATE TABLE Airport (
    airport_code VARCHAR(10) PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    name VARCHAR(150) NOT NULL
);

CREATE TABLE Route (
    route_id INT PRIMARY KEY,
    origin_airport_code VARCHAR(10) NOT NULL,
    destination_airport_code VARCHAR(10) NOT NULL,
    distance DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (origin_airport_code) REFERENCES Airport(airport_code)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (destination_airport_code) REFERENCES Airport(airport_code)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_route_diff_airports CHECK (origin_airport_code <> destination_airport_code),
    CONSTRAINT chk_route_distance CHECK (distance > 0)
);

CREATE TABLE Scheduled_Flight (
    flight_number VARCHAR(10) PRIMARY KEY,
    route_id INT NOT NULL,
    scheduled_departure_time TIME NOT NULL,
    scheduled_arrival_time TIME NOT NULL,
    FOREIGN KEY (route_id) REFERENCES Route(route_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE Flight_Instance (
    flight_instance_id INT PRIMARY KEY,
    flight_number VARCHAR(10) NOT NULL,
    tail_number VARCHAR(20) NOT NULL,
    flight_date DATE NOT NULL,
    actual_departure_time DATETIME,
    actual_arrival_time DATETIME,
    status VARCHAR(20) NOT NULL DEFAULT 'Scheduled',
    FOREIGN KEY (flight_number) REFERENCES Scheduled_Flight(flight_number)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (tail_number) REFERENCES Aircraft(tail_number)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK (status IN ('Scheduled','On Time','Delayed','Canceled','Departed','Arrived'))
);

/* ---------- Reservations & Payments ---------- */

CREATE TABLE Reservation (
    booking_reference VARCHAR(20) PRIMARY KEY,
    customer_id INT NOT NULL,
    booking_date DATE NOT NULL,
    channel VARCHAR(30) NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK (channel IN ('Online','Mobile App','Travel Agent','Call Center','Airport Counter'))
);

CREATE TABLE Payment (
    payment_id INT PRIMARY KEY,
    booking_reference VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATETIME NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
    FOREIGN KEY (booking_reference) REFERENCES Reservation(booking_reference)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CHECK (payment_status IN ('Pending','Completed','Refunded','Invalid','Failed'))
);

/* ---------- Passengers, Tickets, Segments, Seat Assignments ---------- */

CREATE TABLE Passenger (
    passenger_id INT PRIMARY KEY,
    customer_id INT,
    name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id)
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE Ticket (
    ticket_id INT PRIMARY KEY,
    booking_reference VARCHAR(20) NOT NULL,
    passenger_id INT NOT NULL,
    flight_instance_id INT,
    base_price DECIMAL(10,2) NOT NULL,
    fare_class VARCHAR(20) NOT NULL,
    taxes_fees DECIMAL(10,2) NOT NULL DEFAULT 0,
    ticket_status VARCHAR(20) NOT NULL DEFAULT 'Confirmed',
    FOREIGN KEY (booking_reference) REFERENCES Reservation(booking_reference)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (passenger_id) REFERENCES Passenger(passenger_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (flight_instance_id) REFERENCES Flight_Instance(flight_instance_id)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CHECK (base_price >= 0),
    CHECK (taxes_fees >= 0),
    CHECK (fare_class IN ('Economy','Business','First')),
    CHECK (ticket_status IN ('Confirmed','Canceled','Refunded','Used'))
);

CREATE TABLE Itinerary_Segment (
    segment_id INT PRIMARY KEY,
    ticket_id INT NOT NULL,
    flight_instance_id INT NOT NULL,
    segment_number INT NOT NULL,
    UNIQUE (ticket_id, segment_number),
    FOREIGN KEY (ticket_id) REFERENCES Ticket(ticket_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (flight_instance_id) REFERENCES Flight_Instance(flight_instance_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CHECK (segment_number > 0)
);

CREATE TABLE Seat_Assignment (
    assignment_id INT PRIMARY KEY,
    ticket_id INT NOT NULL,
    seat_id INT NOT NULL,
    flight_instance_id INT NOT NULL,
    assignment_time DATETIME NOT NULL,
    UNIQUE (seat_id, flight_instance_id),
    FOREIGN KEY (ticket_id) REFERENCES Ticket(ticket_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (seat_id) REFERENCES Seat(seat_id)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (flight_instance_id) REFERENCES Flight_Instance(flight_instance_id)
        ON DELETE CASCADE ON UPDATE CASCADE
);

/* =========================================================
   INSERT DATA (5 rows per table, ordered to satisfy FKs)
   ========================================================= */

/* ---------- Customer & Loyalty ---------- */

INSERT INTO Customer (customer_id, name, email, phone) VALUES
(1, 'John Smith', 'john.smith@email.com', '515-111-1111'),
(2, 'Emma Davis', 'emma.davis@email.com', '515-222-2222'),
(3, 'Michael Brown', 'michael.brown@email.com', '515-333-3333'),
(4, 'Sophia Wilson', 'sophia.wilson@email.com', '515-444-4444'),
(5, 'Liam Johnson', 'liam.johnson@email.com', '515-555-5555');

INSERT INTO Loyalty_Account (member_id, customer_id, points_balance, tier) VALUES
(101, 1, 12000, 'Gold'),
(102, 2, 4500, 'Silver'),
(103, 3, 22000, 'Platinum'),
(104, 4, 1500, 'Bronze'),
(105, 5, 8000, 'Silver');

/* ---------- Aircraft & Seats ---------- */

INSERT INTO Aircraft (tail_number, model, capacity) VALUES
('N100AA', 'Boeing 737-800', 160),
('N200BB', 'Airbus A320', 150),
('N300CC', 'Boeing 777-300', 300),
('N400DD', 'Airbus A321', 185),
('N500EE', 'Boeing 787-8', 242);

INSERT INTO Seat (seat_id, tail_number, seat_number, cabin_class, seat_type) VALUES
(1001, 'N100AA', '12A', 'Economy', 'Window'),
(1002, 'N200BB', '14C', 'Economy', 'Aisle'),
(1003, 'N300CC', '2D', 'Business', 'Aisle'),
(1004, 'N400DD', '1A', 'First', 'Window'),
(1005, 'N500EE', '22B', 'Economy', 'Middle');

/* ---------- Airports, Routes, Flights ---------- */

INSERT INTO Airport (airport_code, city, country, name) VALUES
('ORD', 'Chicago', 'USA', 'O''Hare International Airport'),
('JFK', 'New York', 'USA', 'John F. Kennedy International Airport'),
('LAX', 'Los Angeles', 'USA', 'Los Angeles International Airport'),
('DFW', 'Dallas', 'USA', 'Dallas/Fort Worth International Airport'),
('ATL', 'Atlanta', 'USA', 'Hartsfield-Jackson Atlanta International Airport');

INSERT INTO Route (route_id, origin_airport_code, destination_airport_code, distance) VALUES
(201, 'ORD', 'JFK', 740.00),
(202, 'JFK', 'LAX', 2475.00),
(203, 'LAX', 'DFW', 1235.00),
(204, 'DFW', 'ATL', 731.00),
(205, 'ATL', 'ORD', 606.00);

INSERT INTO Scheduled_Flight (flight_number, route_id, scheduled_departure_time, scheduled_arrival_time) VALUES
('AA101', 201, '08:00:00', '11:15:00'),
('AA202', 202, '09:30:00', '12:45:00'),
('AA303', 203, '13:00:00', '16:00:00'),
('AA404', 204, '17:00:00', '19:30:00'),
('AA505', 205, '20:00:00', '21:45:00');

/* NOTE: For Flight_Instance, we set status here to a value that
   matches the actual_departure_time. The update_flight_status
   trigger only fires on UPDATE, so these initial inserts are fine. */
INSERT INTO Flight_Instance (flight_instance_id, flight_number, tail_number, flight_date, actual_departure_time, actual_arrival_time, status) VALUES
(3001, 'AA101', 'N100AA', '2026-04-10', '2026-04-10 08:05:00', '2026-04-10 11:20:00', 'Delayed'),
(3002, 'AA202', 'N200BB', '2026-04-11', '2026-04-11 09:45:00', '2026-04-11 13:05:00', 'Delayed'),
(3003, 'AA303', 'N300CC', '2026-04-12', '2026-04-12 13:00:00', '2026-04-12 16:00:00', 'On Time'),
(3004, 'AA404', 'N400DD', '2026-04-13', NULL, NULL, 'Canceled'),
(3005, 'AA505', 'N500EE', '2026-04-14', '2026-04-14 20:10:00', '2026-04-14 22:00:00', 'Delayed');

/* ---------- Reservations & Payments ---------- */

INSERT INTO Reservation (booking_reference, customer_id, booking_date, channel) VALUES
('R001', 1, '2026-04-01', 'Online'),
('R002', 2, '2026-04-02', 'Mobile App'),
('R003', 3, '2026-04-03', 'Travel Agent'),
('R004', 4, '2026-04-04', 'Online'),
('R005', 5, '2026-04-05', 'Call Center');

INSERT INTO Payment (payment_id, booking_reference, amount, payment_date, payment_status) VALUES
(5001, 'R001', 325.50, '2026-04-01 10:15:00', 'Completed'),
(5002, 'R002', 410.00, '2026-04-02 12:30:00', 'Completed'),
(5003, 'R003', 289.99, '2026-04-03 09:45:00', 'Pending'),
(5004, 'R004', 599.25, '2026-04-04 14:10:00', 'Completed'),
(5005, 'R005', 150.75, '2026-04-05 16:20:00', 'Refunded');

/* ---------- Passengers, Tickets, Segments, Seat Assignments ---------- */

INSERT INTO Passenger (passenger_id, customer_id, name, date_of_birth) VALUES
(2001, 1,    'John Smith',    '1971-02-19'),
(2002, NULL, 'Kelly Stoa',    '1986-04-05'),
(2003, 2,    'Emma Davis',    '1990-12-12'),
(2004, NULL, 'Anna Larson',   '2004-08-15'),
(2005, 3,    'Michael Brown', '1969-06-02');

INSERT INTO Ticket (ticket_id, booking_reference, passenger_id, flight_instance_id, base_price, fare_class, taxes_fees, ticket_status) VALUES
(4001, 'R001', 2001, 3001, 500.00,  'Business', 40.00,  'Confirmed'),
(4002, 'R002', 2003, 3002, 340.00,  'Economy',  25.00,  'Confirmed'),
(4003, 'R003', 2005, 3003, 780.00,  'First',    120.00, 'Refunded'),
(4004, 'R004', 2002, 3004, 120.00,  'Economy',  18.00,  'Canceled'),
(4005, 'R005', 2004, 3005, 1250.00, 'Business', 200.00, 'Confirmed');

INSERT INTO Itinerary_Segment (segment_id, ticket_id, flight_instance_id, segment_number) VALUES
(7001, 4001, 3001, 1),
(7002, 4002, 3002, 1),
(7003, 4003, 3003, 1),
(7004, 4004, 3004, 1),
(7005, 4005, 3005, 1);

INSERT INTO Seat_Assignment (assignment_id, ticket_id, seat_id, flight_instance_id, assignment_time) VALUES
(6001, 4001, 1001, 3001, '2026-03-28 11:16:00'),
(6002, 4002, 1002, 3002, '2026-03-28 11:17:00'),
(6003, 4003, 1003, 3003, '2026-03-28 11:18:00'),
(6004, 4004, 1004, 3004, '2026-03-28 11:19:00'),
(6005, 4005, 1005, 3005, '2026-03-28 11:20:00');


/* =========================================================
   3 TRIGGERS
   ========================================================= */
DELIMITER //

/* =========================================================
   TRIGGER 1: check_payment_amount
   Runs BEFORE INSERT on Payment.
   If amount <= 0, mark payment_status as 'Invalid' so bad
   payments are flagged automatically.
   Website action: triggered when a user submits a payment
   form with a non-positive amount.
========================================================= */
CREATE TRIGGER check_payment_amount
BEFORE INSERT ON Payment
FOR EACH ROW
BEGIN
    IF NEW.amount <= 0 THEN
        SET NEW.payment_status = 'Invalid';
    END IF;
END//

/* =========================================================
   TRIGGER 2: set_loyalty_tier_insert
   Runs BEFORE INSERT on Loyalty_Account.
   Auto-assigns tier from points_balance so tiers are always
   consistent and don't depend on whoever fills out the form.
   Tiers:  20000+ Platinum, 10000+ Gold, 4000+ Silver, else Bronze.
   Website action: triggered when a new loyalty account is
   created via the signup page.
========================================================= */
CREATE TRIGGER set_loyalty_tier_insert
BEFORE INSERT ON Loyalty_Account
FOR EACH ROW
BEGIN
    IF NEW.points_balance >= 20000 THEN
        SET NEW.tier = 'Platinum';
    ELSEIF NEW.points_balance >= 10000 THEN
        SET NEW.tier = 'Gold';
    ELSEIF NEW.points_balance >= 4000 THEN
        SET NEW.tier = 'Silver';
    ELSE
        SET NEW.tier = 'Bronze';
    END IF;
END//

/* =========================================================
   TRIGGER 3: update_flight_status
   Runs BEFORE UPDATE on Flight_Instance, but ONLY when the
   actual_departure_time is being changed and the new status
   has not been explicitly set to 'Canceled'. This avoids
   stomping on manual cancellations or unrelated edits
   (e.g. swapping the tail_number).

   Logic:
     - If flight is being canceled, leave status alone.
     - If actual_departure_time is being set/updated:
         * later than scheduled  => 'Delayed'
         * otherwise             => 'On Time'

   Website action: triggered when an admin records the
   actual departure time of a flight.
========================================================= */
CREATE TRIGGER update_flight_status
BEFORE UPDATE ON Flight_Instance
FOR EACH ROW
BEGIN
    DECLARE sched_time TIME;

    IF NEW.status <> 'Canceled'
       AND NEW.actual_departure_time IS NOT NULL
       AND (OLD.actual_departure_time IS NULL
            OR OLD.actual_departure_time <> NEW.actual_departure_time)
    THEN
        SELECT scheduled_departure_time INTO sched_time
        FROM Scheduled_Flight
        WHERE flight_number = NEW.flight_number;

        IF TIME(NEW.actual_departure_time) > sched_time THEN
            SET NEW.status = 'Delayed';
        ELSE
            SET NEW.status = 'On Time';
        END IF;
    END IF;
END//

DELIMITER ;


/* =========================================================
   2 VIEWS
   ========================================================= */

/* =========================================================
   VIEW 1: flight_summary
   Joins Scheduled_Flight, Route, and Airport to give a
   readable view of every scheduled flight's origin,
   destination, times, and distance.
========================================================= */
CREATE VIEW flight_summary AS
SELECT
    sf.flight_number,
    a1.airport_code  AS origin_code,
    a1.city          AS origin_city,
    a2.airport_code  AS destination_code,
    a2.city          AS destination_city,
    sf.scheduled_departure_time,
    sf.scheduled_arrival_time,
    r.distance
FROM Scheduled_Flight sf
JOIN Route   r  ON sf.route_id = r.route_id
JOIN Airport a1 ON r.origin_airport_code      = a1.airport_code
JOIN Airport a2 ON r.destination_airport_code = a2.airport_code;

/* =========================================================
   VIEW 2: customer_loyalty_overview
   Joins Customer with Loyalty_Account so admins can see
   a customer's contact info next to their loyalty tier
   and points balance in one place.
========================================================= */
CREATE VIEW customer_loyalty_overview AS
SELECT
    c.customer_id,
    c.name,
    c.email,
    l.points_balance,
    l.tier
FROM Customer c
JOIN Loyalty_Account l ON c.customer_id = l.customer_id;


/* =========================================================
   5 SQL QUERIES
   Coverage:
     - Joins:       Q2, Q3, Q4   (3 queries)
     - Aggregation: Q3, Q4       (2 queries)
     - Subquery:    Q5
     - View:        Q1
   ========================================================= */

/* ---------- QUERY 1: View usage ----------
   Lists every scheduled flight with origin/destination and
   distance using the flight_summary view. */
SELECT *
FROM flight_summary;


/* ---------- QUERY 2: Join ----------
   Shows each flight instance with its aircraft details, by
   joining Flight_Instance with Aircraft on tail_number. */
SELECT
    fi.flight_instance_id,
    fi.flight_number,
    fi.flight_date,
    fi.status,
    a.tail_number,
    a.model,
    a.capacity
FROM Flight_Instance fi
JOIN Aircraft a ON fi.tail_number = a.tail_number;


/* ---------- QUERY 3: Join + Aggregation ----------
   For each customer, totals how much they've paid across all
   their reservations. Joins Customer -> Reservation -> Payment. */
SELECT
    c.customer_id,
    c.name,
    COUNT(p.payment_id)         AS num_payments,
    COALESCE(SUM(p.amount), 0)  AS total_spent
FROM Customer c
LEFT JOIN Reservation r ON c.customer_id      = r.customer_id
LEFT JOIN Payment     p ON r.booking_reference = p.booking_reference
GROUP BY c.customer_id, c.name
ORDER BY total_spent DESC;


/* ---------- QUERY 4: Join + Aggregation ----------
   Counts how many tickets each fare class has sold per route,
   joining Ticket -> Itinerary_Segment -> Flight_Instance ->
   Scheduled_Flight -> Route. */
SELECT
    r.route_id,
    r.origin_airport_code,
    r.destination_airport_code,
    t.fare_class,
    COUNT(*)         AS tickets_sold,
    SUM(t.base_price + t.taxes_fees) AS revenue
FROM Ticket t
JOIN Itinerary_Segment iseg ON t.ticket_id          = iseg.ticket_id
JOIN Flight_Instance   fi   ON iseg.flight_instance_id = fi.flight_instance_id
JOIN Scheduled_Flight  sf   ON fi.flight_number     = sf.flight_number
JOIN Route             r    ON sf.route_id          = r.route_id
GROUP BY r.route_id, r.origin_airport_code, r.destination_airport_code, t.fare_class
ORDER BY r.route_id, revenue DESC;


/* ---------- QUERY 5: Subquery ----------
   Lists customers who have spent more than the average payment
   amount across all completed payments. */
SELECT
    c.customer_id,
    c.name,
    c.email
FROM Customer c
WHERE c.customer_id IN (
    SELECT r.customer_id
    FROM Reservation r
    JOIN Payment p ON r.booking_reference = p.booking_reference
    WHERE p.payment_status = 'Completed'
      AND p.amount > (
          SELECT AVG(amount)
          FROM Payment
          WHERE payment_status = 'Completed'
      )
);


/* =========================================================
   1 PROCEDURE + 1 FUNCTION
   ========================================================= */

DELIMITER //

/* =========================================================
   PROCEDURE: get_payments_by_status (input parameter)
   Returns every payment matching the given status.
   Used by the admin dashboard to filter payments.
========================================================= */
CREATE PROCEDURE get_payments_by_status(IN input_status VARCHAR(20))
BEGIN
    SELECT
        payment_id,
        booking_reference,
        amount,
        payment_date,
        payment_status
    FROM Payment
    WHERE payment_status = input_status;
END//

/* =========================================================
   FUNCTION: calculate_ticket_total (input parameter)
   Given a ticket_id, returns base_price + taxes_fees.
   Used at checkout to display the final price.
========================================================= */
CREATE FUNCTION calculate_ticket_total(input_ticket_id INT)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE ticket_total DECIMAL(10,2);

    SELECT base_price + taxes_fees
    INTO ticket_total
    FROM Ticket
    WHERE ticket_id = input_ticket_id;

    RETURN ticket_total;
END//

DELIMITER ;


/* =========================================================
   QUICK TESTS (optional — handy when grading the file)
   ========================================================= */
CALL get_payments_by_status('Completed');
SELECT calculate_ticket_total(4001) AS ticket_total;
