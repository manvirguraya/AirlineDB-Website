# AirlineDB — Database Implementation Project

A two-sided web interface for the AirlineDB project (Deliverable 5):

- A **customer-facing site** (Skyline) where travelers log in to search flights, book tickets, view their loyalty status, and manage their profile.
- An **airline-employee admin portal** for full CRUD on the database, plus dashboards for the 5 required SQL queries, the procedure, the function, and the trigger demos.

---

## Tech Stack

- **MySQL 8** — database server
- **Node.js + Express** — backend API
- **JavaScript + Tailwind CSS** — frontend

---

## Prerequisites

1. **MySQL 8** installed and running locally — install [MySQL Community Server](https://dev.mysql.com/downloads/mysql/).
2. **MySQL Workbench** — [download here](https://dev.mysql.com/downloads/workbench/). All database setup in this guide is done through Workbench.
3. **Node.js 18 or newer** — [download here](https://nodejs.org/).

Verify Node is installed (open any terminal):

```bash
node --version
npm --version
```

---

## Setup

### Step 1. Import the database (MySQL Workbench)

1. Open **MySQL Workbench** and connect to your local MySQL server (usually a connection called *Local instance MySQL80* or similar — enter your `root` password when prompted).
2. Go to **File → Open SQL Script…** and select `Airline_Database.sql` from the project folder.
3. With the script open in the query tab, click the **lightning bolt icon** (Execute, or press Ctrl+Shift+Enter / Cmd+Shift+Enter) to run the entire script.
4. In the **Output** panel at the bottom, confirm every statement shows a green checkmark with no errors.
5. In the **Schemas** panel on the left, click the refresh icon. You should now see `AirlineDB` listed. Expand it to verify the tables, views, stored procedures, functions, and triggers are all present.

### Step 2. (Recommended) Create a dedicated MySQL user for the app

In MySQL Workbench, open a new query tab and run once:

```sql
CREATE USER 'airlineapp'@'localhost' IDENTIFIED BY 'airline123';
GRANT ALL PRIVILEGES ON AirlineDB.* TO 'airlineapp'@'localhost';
FLUSH PRIVILEGES;
```

Then in `.env`:

```
DB_USER=airlineapp
DB_PASSWORD=airline123
```

(Alternatively, you can use your own MySQL `root` credentials — just put them in `.env`.)

### Step 3. Install dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

### Step 4. Run

```bash
npm start
```

Open **http://localhost:3000** in any browser.

---

## The two interfaces

### Customer-facing site → http://localhost:3000

Customers log in with their email and password.

**Demo accounts** (all use password `pass123`):
- `john.smith@email.com` (Gold tier)
- `emma.davis@email.com` (Silver tier)
- `michael.brown@email.com` (Platinum tier)
- `sophia.wilson@email.com` (Bronze tier)
- `liam.johnson@email.com` (Silver tier)

After signing in, the customer can:
- **Search Flights** — filter by origin/destination, browse with prices, click "Book"
- **My Trips** — view their tickets, cancel a confirmed ticket
- **Loyalty Status** — see their tier, points balance, and progress to the next tier
- **Profile** — update name, email, phone

### Airline admin portal → http://localhost:3000/admin

Direct URL access (no login). Provides:
- **CRUD Operations** on Customers, Loyalty Accounts, Aircraft, Airports, Flight Instances, Payments
- **5 SQL Queries** with descriptions and result tables
- **Procedure & Function** — call with input parameters
- **Trigger Demos** — visibly fire each of the 3 triggers

---

## Mapping to deliverable requirements

| Requirement | Where to see it |
|---|---|
| 1. DDL with constraints / FKs / referential actions | `Airline_Database.sql` |
| 2. Sample data (5 tuples per table) | Loaded by the SQL file |
| 3. ≥3 triggers, with showcase | `check_payment_amount`, `set_loyalty_tier_insert`, `update_flight_status` — fire visibly in admin's "Trigger Demos" tab; also fire during customer actions (e.g., booking a ticket triggers `check_payment_amount` on the payment row) |
| 4. ≥2 views | `flight_summary`, `customer_loyalty_overview` |
| 5. 5 queries (joins, aggregations, subquery, view) | Admin "5 SQL Queries" tab |
| 6. 1 procedure + 1 function with input parameters | Admin "Procedure & Function" tab |
| 7. Website with CRUD + showcased queries | Both interfaces (admin = full CRUD; customer = booking/cancellation/profile-edit are real CRUD operations) |
| 8. Complete SQL script | `Airline_Database.sql` |

---

## File structure

```
airline-website/
├── Airline_Database.sql      Full SQL implementation
├── server.js                 Express backend
├── package.json              Node dependencies
├── .env                      MySQL credentials (edit this!)
├── .env.example              Template for sharing
├── .gitignore                Excludes secrets and node_modules
├── README.md                 This file
└── public/
    ├── customer.html         Customer-facing site (default landing page)
    ├── customer.js
    ├── admin.html            Airline admin portal
    ├── app.js                Admin's frontend logic
    └── styles.css            Admin styles (customer styles are inline)
```

---

## Troubleshooting

**"● database offline" pill in admin** — Wrong credentials in `.env`, or MySQL isn't running. Confirm your local connection works in MySQL Workbench. If it fails there too, start the MySQL service (Windows: Services panel → *MySQL80* → Start; macOS: System Settings → MySQL → Start MySQL Server). Then edit `.env` and restart the server (`Ctrl+C` then `npm start`).

**"ER_ACCESS_DENIED_ERROR"** — Wrong username or password in `.env`. If using `airlineapp`, make sure you ran the `CREATE USER` SQL in Workbench.

**"Unknown database 'AirlineDB'"** — The SQL file wasn't imported. Repeat Setup Step 1 in MySQL Workbench.

**Port 3000 already in use** — Change `PORT=3000` in `.env` to a free port (e.g., `3001`).

**Login fails on customer site** — Make sure you re-imported the SQL file in Workbench. Older versions didn't have the `password` column.

---

## Re-importing fresh data

Useful right before the demo to reset to a known clean state. In MySQL Workbench:

1. Open a new query tab.
2. Run: `DROP DATABASE AirlineDB;`
3. Open `Airline_Database.sql` via **File → Open SQL Script…** and execute it again with the lightning bolt.
4. Refresh the **Schemas** panel to confirm `AirlineDB` is back.
