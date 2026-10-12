from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine

# Import all models through models/__init__.py
from app import models


# Import routers
from app.routes import (
    auth,
    users,
    vendors,
    departments,
    rfqs,
    quotations,
    evaluations,
    purchase_orders,
    dashboard,
    audit_logs,
)


Base.metadata.create_all(bind=engine)



app = FastAPI(
    title="Procurement & Vendor Bidding SaaS Platform",
    description=(
        "API for procurement management, RFQs, vendor quotations, "
        "bid evaluation, purchase orders, and audit tracking."
    ),
   
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(vendors.router)
app.include_router(departments.router)
app.include_router(rfqs.router)
app.include_router(quotations.router)
app.include_router(evaluations.router)
app.include_router(purchase_orders.router)
app.include_router(dashboard.router)
app.include_router(audit_logs.router)


@app.get("/")
def root():
    return {
        "message": "Procurement & Vendor Bidding SaaS Platform API is running",
    }

