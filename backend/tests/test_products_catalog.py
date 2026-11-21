import pytest
from app.models.entities import Product, User
from tests.conftest import make_auth_headers

def test_list_and_create_product(client, db_session):
    user_sa = db_session.query(User).filter_by(username="superadmin").first()
    headers = make_auth_headers(user_sa.username, user_sa.role.code, user_sa.id, None)

    # 1. List products
    resp = client.get("/api/v1/products", headers=headers)
    assert resp.status_code == 200
    initial_count = len(resp.json())

    # 2. Create single product
    create_resp = client.post("/api/v1/products", json={
        "sku": "SKU-ART-80",
        "name": "Artemether + Lumefantrine 80/480mg",
        "category": "Antimalarials",
        "units_per_carton": 30,
        "unit_of_measure": "Box 6 Tabs",
        "unit_price": 3200.0
    }, headers=headers)
    assert create_resp.status_code == 201
    data = create_resp.json()
    assert data["sku"] == "SKU-ART-80"

    # 3. Duplicate SKU attempt (should fail with 400)
    dup_resp = client.post("/api/v1/products", json={
        "sku": "SKU-ART-80",
        "name": "Another Artemether",
        "category": "Antimalarials",
        "units_per_carton": 30
    }, headers=headers)
    assert dup_resp.status_code == 400
    assert "already exists" in dup_resp.json()["detail"].lower()

def test_bulk_product_upload(client, db_session):
    user_sa = db_session.query(User).filter_by(username="superadmin").first()
    headers = make_auth_headers(user_sa.username, user_sa.role.code, user_sa.id, None)

    bulk_payload = {
        "products": [
            {
                "sku": "SKU-CEF-1G",
                "name": "Ceftriaxone 1g Injectable",
                "category": "Antibiotics",
                "units_per_carton": 100,
                "unit_of_measure": "Vial",
                "unit_price": 4500.0
            },
            {
                "sku": "SKU-DIC-50",
                "name": "Diclofenac Sodium 50mg Tablets",
                "category": "Anti-inflammatory",
                "units_per_carton": 50,
                "unit_of_measure": "Box 10x10",
                "unit_price": 1100.0
            }
        ]
    }

    resp = client.post("/api/v1/products/bulk", json=bulk_payload, headers=headers)
    assert resp.status_code == 200
    assert resp.json()["created"] == 2

    # Verify in DB
    prod = db_session.query(Product).filter_by(sku="SKU-CEF-1G").first()
    assert prod is not None
    assert prod.units_per_carton == 100
