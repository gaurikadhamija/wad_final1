# QueueLess — XAMPP & Apache/MySQL Setup Guide

This web application has been converted to a **Database-Driven Application** utilizing **HTML5, CSS3, Vanilla JavaScript, Core PHP (PDO), and MySQL**.

---

## 1. Quick Requirements
- **Web Server**: Apache (included with XAMPP)
- **Database Engine**: MySQL 5.7+ or MariaDB 10.x+ (included with XAMPP)
- **PHP Version**: PHP 7.4, 8.0, 8.1, 8.2, or 8.3 with `pdo_mysql` enabled (standard in XAMPP)
- **Browser**: Chrome, Firefox, Safari, Edge

---

## 2. Step-by-Step Installation

### Step 1: Copy Application to XAMPP Web Root
1. Copy or extract this `QueueLess` directory into your XAMPP `htdocs` directory:
   - **Windows**: `C:\xampp\htdocs\QueueLess\`
   - **macOS**: `/Applications/XAMPP/xamppfiles/htdocs/QueueLess/`
   - **Linux**: `/opt/lampp/htdocs/QueueLess/`

### Step 2: Start Apache and MySQL
1. Launch the **XAMPP Control Panel**.
2. Click **Start** for **Apache**.
3. Click **Start** for **MySQL**.

### Step 3: Import MySQL Database (`queueless_db`)
1. Open your browser and navigate to: [http://localhost/phpmyadmin/](http://localhost/phpmyadmin/)
2. Click on the **Databases** tab.
3. In the "Create database" field, type: `queueless_db` and collation `utf8mb4_unicode_ci`, then click **Create**.
4. Select `queueless_db` from the left sidebar.
5. Click the **Import** tab at the top.
6. Click **Choose File** and select:
   `database/queueless_db.sql`
7. Click **Import** (or **Go**) at the bottom.
8. The 10 tables (`users`, `providers`, `services`, `operating_hours`, `queues`, `counters`, `tokens`, `queue_events`, `notifications`, `feedback`) and seed records will be created.

### Step 4: Verify Database Connection (`php/config/database.php`)
Open `php/config/database.php` and verify that the database credentials match your local MySQL configuration:
```php
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'queueless_db');
define('DB_USER', 'root');
define('DB_PASS', '');     // Default in XAMPP is empty ("")
define('DB_PORT', '3306');
```

### Step 5: Launch QueueLess
Open your browser and navigate to:
**[http://localhost/QueueLess/](http://localhost/QueueLess/)**

---

## 3. Seed Accounts & Login Credentials

All seed accounts come pre-configured with the default password: **`password123`**

| Role | Email | Password | Dedicated Dashboard |
|---|---|---|---|
| **Super Admin** | `admin@queueless.edu` | `password123` | `http://localhost/QueueLess/admin.html` |
| **Desk Admin / Provider** | `provider@campus.edu` | `password123` | `http://localhost/QueueLess/provider.html` |
| **Desk Operator (Officer)** | `sarah.vance@campus.edu` | `password123` | `http://localhost/QueueLess/operator.html` |
| **Student / Customer** | `student@igdtuw.ac.in` | `password123` | `http://localhost/QueueLess/student.html` |

---

## 4. Architectural Data Flow
```text
[Student / Operator UI]
        │
  (Fetch API JSON)
        ▼
[Vanilla JS (js/api.js)]
        │
    (HTTP POST/GET)
        ▼
[Core PHP Modules (php/*)]
        │
  (PDO Prepared Stmts & Transactions)
        ▼
[MySQL Database (queueless_db)]
```
- **Sequential Daily Tokens**: Generated inside transactions with row locks (`SELECT ... FOR UPDATE`) in `php/students/join_queue.php`.
- **Audit Event History**: Recorded in `queue_events` on every issue, call, completion, and cancellation.
- **Real-Time Polling**: Frontend polls `php/students/get_my_token.php` to calculate accurate queue position and remaining wait time.
- **Passwords**: Hashed with PHP `password_hash($password, PASSWORD_BCRYPT)` and verified using `password_verify()`.
