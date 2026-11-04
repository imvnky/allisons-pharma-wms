import time
import json
import traceback
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from app.core.database import SessionLocal
from app.models.entities import ApiLog
from app.core.security import decode_access_token

class ApiLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Extract user if token present
        auth_header = request.headers.get("Authorization")
        user_id = None
        username = None
        warehouse_id = None

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            payload = decode_access_token(token)
            if payload:
                user_id = payload.get("user_id")
                username = payload.get("sub")
                warehouse_id = payload.get("warehouse_id")

        error_stack = None
        status_code = 500
        response = None

        try:
            response = await call_next(request)
            status_code = response.status_code
            return response
        except Exception as exc:
            error_stack = traceback.format_exc()
            raise exc
        finally:
            latency_ms = round((time.time() - start_time) * 1000, 2)
            level = "INFO"
            if status_code >= 400 and status_code < 500:
                level = "WARN"
            elif status_code >= 500 or error_stack is not None:
                level = "ERROR"

            # Filter out noisy or static requests
            path = request.url.path
            if path.startswith("/api/v1"):
                # Asynchronously commit log into database
                db = SessionLocal()
                try:
                    log_entry = ApiLog(
                        message=f"{request.method} {path} - Status {status_code}",
                        user_id=user_id,
                        username=username,
                        warehouse_id=warehouse_id,
                        level=level,
                        error_stack=error_stack,
                        payload={"path_params": dict(request.path_params), "query_params": dict(request.query_params)},
                        module_name="API-GATEWAY",
                        file_name=path.split("/")[3] if len(path.split("/")) > 3 else "main.py",
                        method_name=f"{request.method} {path}",
                        activity_title=f"ApiCall:{path}",
                        status_code=status_code,
                        latency_ms=latency_ms
                    )
                    db.add(log_entry)
                    db.commit()
                except Exception as log_err:
                    print(f"Failed to write API log: {log_err}")
                finally:
                    db.close()

