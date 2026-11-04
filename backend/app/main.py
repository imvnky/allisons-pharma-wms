from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.middleware import ApiLoggingMiddleware
from app.api.v1.auth import router as auth_router
from app.api.v1.reconciliation import router as reconciliation_router
from app.api.v1.counts import router as counts_router
from app.api.v1.shipments import router as shipments_router
from app.api.v1.alerts import router as alerts_router
from app.api.v1.hq import router as hq_router
from app.api.v1.admin import router as admin_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Observability Logging Middleware
app.add_middleware(ApiLoggingMiddleware)

# Include Routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(reconciliation_router, prefix=settings.API_V1_STR)
app.include_router(counts_router, prefix=settings.API_V1_STR)
app.include_router(shipments_router, prefix=settings.API_V1_STR)
app.include_router(alerts_router, prefix=settings.API_V1_STR)
app.include_router(hq_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "status": "online",
        "system": "Allisons African Pharma - Warehouse Management System",
        "version": "1.0.0",
        "docs": f"{settings.API_V1_STR}/docs"
    }

