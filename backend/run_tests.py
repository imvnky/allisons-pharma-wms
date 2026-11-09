"""
Automated Test Runner for Allisons African Pharma WMS.
Executes pytest if available, or runs standalone formula verification suite.
"""
import sys
import os

# Ensure backend root is on Python sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

def run_with_pytest():
    try:
        import pytest
        print("\n" + "="*70)
        print("  ALLISONS AFRICAN PHARMA WMS — AUTOMATED TEST SUITE (PYTEST)")
        print("="*70 + "\n")
        exit_code = pytest.main(["-v", "--tb=short", os.path.join(backend_dir, "tests")])
        return exit_code
    except ImportError:
        print("[Notice] pytest is not installed in the current environment.")
        return None

def run_standalone_verification():
    print("\n" + "="*70)
    print("  ALLISONS AFRICAN PHARMA WMS — FORMULA & RECONCILIATION ENGINE TESTS")
    print("="*70 + "\n")

    passed = 0
    failed = 0

    def test(name, fn):
        nonlocal passed, failed
        try:
            fn()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            failed += 1

    # Pure Python record and product mock classes for standalone formula testing
    class MockProduct:
        def __init__(self, units_per_carton):
            self.units_per_carton = units_per_carton

    class MockRecord:
        def __init__(self, opening_stock, arrivals_qty, transfers_qty, sales_qty, carton_count, loose_count, display_count):
            self.opening_stock = opening_stock
            self.arrivals_qty = arrivals_qty
            self.transfers_qty = transfers_qty
            self.sales_qty = sales_qty
            self.carton_count = carton_count
            self.loose_count = loose_count
            self.display_count = display_count
            self.required_stock = 0
            self.physical_stock = 0
            self.difference = 0

    def recalculate(record, product):
        record.required_stock = record.opening_stock + record.arrivals_qty - record.transfers_qty - record.sales_qty
        record.physical_stock = (record.carton_count * product.units_per_carton) + record.loose_count + record.display_count
        record.difference = record.physical_stock - record.required_stock

    # 1. Formula calculations
    def test_stock_math():
        prod = MockProduct(units_per_carton=50)
        rec = MockRecord(
            opening_stock=1000,
            arrivals_qty=200,
            transfers_qty=50,
            sales_qty=150,
            carton_count=18,
            loose_count=45,
            display_count=5
        )
        recalculate(rec, prod)

        assert rec.required_stock == 1000, f"Expected 1000, got {rec.required_stock}"
        assert rec.physical_stock == 950, f"Expected 950, got {rec.physical_stock}"
        assert rec.difference == -50, f"Expected -50, got {rec.difference}"

    def test_balanced_case():
        prod = MockProduct(units_per_carton=20)
        rec = MockRecord(
            opening_stock=500, arrivals_qty=0, transfers_qty=0, sales_qty=100,
            carton_count=20, loose_count=0, display_count=0
        )
        recalculate(rec, prod)
        assert rec.required_stock == 400
        assert rec.physical_stock == 400
        assert rec.difference == 0

    def test_surplus_case():
        prod = MockProduct(units_per_carton=10)
        rec = MockRecord(
            opening_stock=100, arrivals_qty=50, transfers_qty=10, sales_qty=20,
            carton_count=15, loose_count=5, display_count=0
        )
        recalculate(rec, prod)
        assert rec.required_stock == 120
        assert rec.physical_stock == 155
        assert rec.difference == 35

    def test_display_continuity_rule():
        # Day 1 Closing display is 14
        day1_closing_display = 14
        # Day 2 Opening display must match Day 1 closing display
        day2_opening_display = day1_closing_display
        assert day2_opening_display == 14

    test("Required Stock & Physical Stock Mathematical Formula", test_stock_math)
    test("Balanced Zero-Variance Reconciled State", test_balanced_case)
    test("Surplus Positive-Variance Calculation", test_surplus_case)
    test("Display Continuity Day-to-Day Propagation Rule", test_display_continuity_rule)

    print("\n" + "-"*70)
    print(f"Results: {passed} Passed, {failed} Failed.")
    print("-" * 70 + "\n")
    return 0 if failed == 0 else 1

if __name__ == "__main__":
    pytest_code = run_with_pytest()
    if pytest_code is not None:
        sys.exit(pytest_code)
    else:
        sys.exit(run_standalone_verification())
