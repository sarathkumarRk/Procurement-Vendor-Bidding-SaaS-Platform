# Procurement & Vendor Bidding System

## 1. Project Overview

The Procurement & Vendor Bidding System is a web-based application developed to manage procurement activities, Request for Quotation (RFQ) creation, vendor verification, quotation submission, quotation evaluation, purchase-order approval, and audit tracking.

The system provides role-based access control to ensure that users can perform only the operations permitted for their roles.

## 2. Technologies Used

### Backend
- Python
- FastAPI
- SQLAlchemy
- MySQL
- Pydantic
- JWT Authentication
- Pytest

### Frontend
- React
- Vite
- JavaScript
- Tailwind CSS
- Axios
- React Router
- React Toastify

### Integrations
- Email notifications
- Webhooks
- File uploads

## 3. Main Features

- User registration and login
- JWT-based authentication
- Role-based authorization
- Vendor registration and verification
- RFQ creation and deadline validation
- Vendor quotation submission
- Duplicate and late quotation prevention
- Quotation price and tax calculations
- Quotation evaluation and comparison
- Purchase-order creation and approval
- Prevention of self-approval
- Purchase-order status management
- Audit-log tracking
- Webhook notifications and failure handling
- Dashboard and procurement monitoring

## 4. User Roles

The application supports role-based access for users such as:

- **Admin:** Manages users and vendor verification.
- **Procurement Manager:** Creates RFQs, evaluates quotations, and manages purchase orders.
- **Vendor:** Views eligible RFQs and submits quotations.
- **Approver:** Reviews and approves purchase orders according to the approval rules.

Available permissions depend on the configured backend authorization rules.

## 5. Project Structure

```text
procurement-vendor-bidding/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── dependencies.py
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── routers/
│   │   └── services/
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_vendors.py
│   │   ├── test_quotations.py
│   │   ├── test_purchase_orders.py
│   │   └── test_webhooks.py
│   ├── requirements.txt
│   ├── .env.example
│   └── pytest.ini
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   └── routes/
│   ├── package.json
│   └── vite.config.js
├── database/
│   └── migrations/
└── README.md
```

*Note: Adjust the folder structure to match the actual files in your project.*

## 6. Prerequisites

Install the following before running the project:

- Python 3.10 or a compatible version
- Node.js and npm
- MySQL Server
- Git (optional)

## 7. Backend Setup

### Step 1: Navigate to the backend

```bash
cd backend
```

### Step 2: Create a virtual environment

```bash
python -m venv venv
```

Activate it on Windows:

```powershell
.\venv\Scripts\Activate.ps1
```

### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

### Step 4: Configure environment variables

Create a `.env` file based on `.env.example`.

Configure the database connection, JWT secret, and any email, file-storage, or webhook settings required by your application.

### Step 5: Start the backend

```bash
uvicorn app.main:app --reload
```

The backend will normally run at:

`http://127.0.0.1:8000`

## 8. Database Setup

1. Start MySQL Server.
2. Create a database for the project.
3. Configure the database connection in `.env`.
4. Run the project's configured migration command, if migrations are available.

Example MySQL command:

```sql
CREATE DATABASE procurement_db;
```

If the project uses Alembic, run:

```bash
alembic upgrade head
```

Run this command only if Alembic is configured in the project.

## 9. Frontend Setup

Open a new terminal:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Configure the frontend API base URL to point to the FastAPI backend.

Start the development server:

```bash
npm run dev
```

The frontend URL is normally:

`http://localhost:5173`

## 10. API Documentation

FastAPI provides interactive API documentation through Swagger UI.

After starting the backend, open:

`http://127.0.0.1:8000/docs`

Alternative documentation:

`http://127.0.0.1:8000/redoc`

Use Swagger UI to inspect available endpoints, submit requests, and test authentication and authorization.

## 11. Testing

Install the testing dependencies:

```bash
pip install pytest httpx
```

Run the test suite from the backend directory:

```bash
pytest
```

Run tests with detailed output:

```bash
pytest -v
```

The test suite should cover:

- Successful and unsuccessful authentication
- Vendor verification permissions
- RFQ deadline validation
- Duplicate and late quotation rejection
- Unauthorized quotation access
- Quotation subtotal and tax calculations
- Purchase-order approval permissions
- Prevention of self-approval
- Audit-log creation
- Webhook failure handling

Test results should be recorded after executing the actual test suite. Do not report tests as passed unless they have been run successfully.

## 12. Environment Variables

The `.env.example` file should document the configuration required by the project, such as:

```env
DATABASE_URL=mysql+pymysql://username:password@localhost/procurement_db

SECRET_KEY=replace_with_a_secure_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

SMTP_HOST=
SMTP_PORT=587
SMTP_EMAIL=
SMTP_PASSWORD=

WEBHOOK_URL=
WEBHOOK_SECRET=
```

Add any additional variables required by your existing configuration and integrations.

**Security:** Never commit your real `.env` file, database password, JWT secret, or webhook secret to version control.

## 13. Postman Collection

A Postman collection can be used to test the API endpoints.

Include requests for:

- Authentication
- Vendor management and verification
- RFQ management
- Quotation submission and evaluation
- Purchase-order creation and approval
- Purchase-order status updates
- Webhook-related operations

Configure the backend base URL and authentication token in the Postman environment. Export the completed collection as a JSON file before submission.

## 14. Screenshots for Submission

Capture screenshots of the actual running application:

1. Dashboard
2. RFQ creation wizard
3. Quotation comparison page
4. Purchase-order approval workflow

Store the screenshots in a folder such as:

```text
screenshots/
├── dashboard.png
├── rfq-wizard.png
├── quotation-comparison.png
└── purchase-order-workflow.png
```

## 15. Submission Checklist

- [ ] FastAPI backend source code
- [ ] React Vite frontend source code
- [ ] Database schema or migration files
- [ ] `.env.example`
- [ ] `requirements.txt`
- [ ] `README.md`
- [ ] Swagger API documentation
- [ ] Postman collection JSON
- [ ] At least 12 meaningful Pytest cases
- [ ] Actual Pytest execution results
- [ ] Required application screenshots

## 16. Conclusion

The Procurement & Vendor Bidding System aims to improve procurement transparency, streamline vendor quotation management, enforce approval permissions, and maintain traceable purchase-order and audit records through a web-based application.
