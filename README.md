# AirlineDB — Database Implementation Project

Web interface for the AirlineDB project (Deliverable 5). Provides CRUD operations on the database, executes the 5 required SQL queries, demonstrates the stored procedure and function, and showcases all 3 triggers firing.

---

## Tech Stack

- **MySQL 8** — database server
- **Node.js + Express** — backend API
- **JavaScript + Tailwind CSS** — frontend

---

## Prerequisites

Before running the project, make sure you have:

1. **MySQL 8** installed and running locally — install [MySQL Community Server](https://dev.mysql.com/downloads/mysql/).
2. **MySQL Workbench** — [download here](https://dev.mysql.com/downloads/workbench/). All database setup in this guide is done through Workbench.
3. **Node.js 18 or newer** — [download here](https://nodejs.org/).

Verify Node is installed (open any terminal):

```bash
node --version
npm --version
```

---

## Setup (run once)

### Step 1. Import the database (MySQL Workbench)

1. Open **MySQL Workbench** and connect to your local MySQL server (usually a connection called *Local instance MySQL80* or similar — enter your `root` password when prompted).
2. Go to **File → Open SQL Script…** and select `Airline_Database.sql` from the project folder.
3. With the script open in the query tab, click the **lightning bolt icon** (Execute, or press Ctrl+Shift+Enter / Cmd+Shift+Enter) to run the entire script.
4. In the **Output** panel at the bottom, confirm every statement shows a green checkmark with no errors.
5. In the **Schemas** panel on the left, click the refresh icon. You should now see `AirlineDB` listed. Expand it to verify the tables, views, stored procedures, functions, and triggers are all present.

This creates the `AirlineDB` database with all tables, data, triggers, views, the procedure, and the function.

### Step 2. Configure database credentials

Open the `.env` file in this folder in any text editor and set your MySQL password:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_actual_mysql_password
DB_NAME=AirlineDB
PORT=3000
```

### Step 3. Install dependencies

Open a terminal in the project folder and run:

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
- Confirm MySQL is running. In MySQL Workbench, your local connection should connect without errors. If it fails, start the MySQL service (Windows: Services panel → *MySQL80* → Start; macOS: System Settings → MySQL → Start MySQL Server).
- Confirm the password in `.env` matches the password you use to log into Workbench.
- Confirm `Airline_Database.sql` was imported. In Workbench's **Schemas** panel, you should see `AirlineDB`. If not, repeat Setup Step 1.

**"ER_ACCESS_DENIED_ERROR".**
- Wrong password in `.env`. Update it to match your Workbench `root` password and restart with `npm start`.

**"ECONNREFUSED 127.0.0.1:3306".**
- MySQL isn't running. Start the MySQL service as described above and try again.

**Port 3000 already in use.**
- Change `PORT=3000` in `.env` to a free port (e.g. `3001`) and restart.

**Triggers don't seem to fire.**
- Check that `Airline_Database.sql` ran without errors in Workbench's Output panel.
- In Workbench, open a new query tab and run `USE AirlineDB; SHOW TRIGGERS;` — you should see three triggers listed.

---

## Re-importing fresh data

If you've been clicking around CRUD and want to reset the database, do this in MySQL Workbench:

1. Open a new query tab.
2. Run: `DROP DATABASE AirlineDB;`
3. Open `Airline_Database.sql` via **File → Open SQL Script…** and execute it again with the lightning bolt.
4. Refresh the **Schemas** panel to confirm `AirlineDB` is back.
