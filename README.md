# AirlineDB — Database Implementation Project

Web interface for the AirlineDB project (Deliverable 5). Provides CRUD operations on the database, executes the 5 required SQL queries, demonstrates the stored procedure and function, and showcases all 3 triggers firing.

---

## Tech Stack

- **MySQL 8** — database server
- **Node.js + Express** — backend API
- **Vanilla JavaScript + Tailwind CSS** — frontend (no build step required)

---

## Prerequisites

Before running the project, make sure you have:

1. **MySQL 8** installed and running locally
   - Easiest: install [MySQL Community Server](https://dev.mysql.com/downloads/mysql/) and [MySQL Workbench](https://dev.mysql.com/downloads/workbench/).
2. **Node.js 18 or newer** — [download here](https://nodejs.org/).

Verify both are installed:

```bash
mysql --version
node --version
npm --version
```

---

## Setup (run once)

### Step 1. Import the database

Open a terminal in the project folder and run:

```bash
mysql -u root -p < Airline_Database.sql
```

Enter your MySQL `root` password when prompted. This creates the `AirlineDB` database with all tables, data, triggers, views, the procedure, and the function.

> Alternative using MySQL Workbench: open `Airline_Database.sql`, then **File → Open SQL Script…** and click the **lightning bolt** to execute.

### Step 2. Configure database credentials

Open the `.env` file in this folder and set your MySQL password:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=AirlineDB
PORT=3000
```

### Step 3. Install dependencies

In the same terminal:

```bash
npm install
```

This installs `express`, `mysql2`, `cors`, and `dotenv` into a `node_modules/` folder.

---

## Running the website

```bash
npm start
```

You should see:

```
Airline DB server running at http://localhost:3000
```

Open **http://localhost:3000** in any browser.

---

## What's on the website

The site has four tabs:

### 1. CRUD Operations
Create, read, update, and delete records on six core tables: Customers, Loyalty Accounts, Aircraft, Airports, Flight Instances, and Payments. Foreign key constraints and triggers run automatically — for example, deleting a Customer cascades to their Loyalty Account, and inserting a Loyalty Account auto-assigns the tier from the points balance.

### 2. The 5 SQL Queries
Each query is shown with a description of what it does and which features it uses (joins, aggregations, subqueries, view).

| # | Query | Features |
|---|---|---|
| 1 | Flight summary (origins, destinations, distances) | VIEW |
| 2 | Flight instances with aircraft details | JOIN |
| 3 | Customer payment totals | JOIN + AGGREGATION |
| 4 | Tickets sold and revenue per route per fare class | JOIN + AGGREGATION |
| 5 | Customers with above-average payment amounts | SUBQUERY |

### 3. Procedure & Function
- **Procedure** `get_payments_by_status(status)` — accepts a status value and returns matching payments.
- **Function** `calculate_ticket_total(ticket_id)` — accepts a ticket id and returns `base_price + taxes_fees`.

### 4. Trigger Demos
Three buttons each fire one of the triggers and show the resulting row, demonstrating the trigger modified the data:

- **Trigger 1** — `check_payment_amount`: Inserts a payment with `amount = 0`. The trigger flips status to `Invalid`.
- **Trigger 2** — `set_loyalty_tier_insert`: Inserts a loyalty account with 25,000 points and tier `Bronze`. The trigger upgrades it to `Platinum`.
- **Trigger 3** — `update_flight_status`: Updates flight instance 3003 with a late departure time. The trigger sets status to `Delayed`.

---

## File structure

```
airline-website/
├── Airline_Database.sql          ← Full SQL implementation (DDL, data, triggers, views, queries, procedure, function)
├── server.js                     ← Express backend
├── package.json                  ← Node dependencies
├── .env                          ← MySQL credentials (edit this!)
├── README.md                     ← This file
└── public/
    ├── index.html                ← Single-page UI
    ├── styles.css                ← Custom styles on top of Tailwind
    └── app.js                    ← Frontend logic
```

---

## Troubleshooting

**"Database offline" pill at top right.**
- Confirm MySQL is running (`mysqladmin -u root -p ping` should reply `mysqld is alive`).
- Confirm the password in `.env` matches your MySQL `root` password.
- Confirm `Airline_Database.sql` was imported (`SHOW DATABASES;` should list `AirlineDB`).

**"ER_ACCESS_DENIED_ERROR".**
- Wrong password in `.env`. Update and restart with `npm start`.

**"ECONNREFUSED 127.0.0.1:3306".**
- MySQL isn't running. Start it from your system services panel or with the MySQL command line tool.

**Port 3000 already in use.**
- Change `PORT=3000` in `.env` to a free port (e.g. `3001`) and restart.

**Triggers don't seem to fire.**
- Check that `Airline_Database.sql` ran without errors. The triggers are defined at the bottom of that file.
- Try `SHOW TRIGGERS;` inside the `AirlineDB` database — you should see three triggers.

---

## Re-importing fresh data

If you've been clicking around CRUD and want to reset the database:

```bash
mysql -u root -p -e "DROP DATABASE AirlineDB;"
mysql -u root -p < Airline_Database.sql
```
