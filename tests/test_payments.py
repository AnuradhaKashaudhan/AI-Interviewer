import unittest
import json
import hmac
import hashlib
import sys
import os

# Add project root and backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../backend')))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models import User, PaymentOrder, Subscription, WebhookEvent
from services.plan_service import get_all_plans, resolve_plan, PLANS_CATALOG
from services.payment_service import (
    create_order,
    verify_payment_signature,
    process_webhook_payload,
    get_user_payment_history,
    RAZORPAY_KEY_SECRET,
    RAZORPAY_WEBHOOK_SECRET
)
from services.entitlement_service import get_user_entitlements, grant_user_subscription


class TestRazorpayPayments(unittest.TestCase):
    def setUp(self):
        # Create an in-memory SQLite database for testing
        self.engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
        Base.metadata.create_all(bind=self.engine)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=self.engine)
        self.db = SessionLocal()

        # Create a test candidate user
        self.test_user = User(
            id="test_user_123",
            email="candidate_test@example.com",
            fullName="Candidate Test User",
            hashed_password="hashed_pwd_dummy"
        )
        self.db.add(self.test_user)
        self.db.commit()

    def tearDown(self):
        self.db.close()

    def test_plan_catalog_resolution(self):
        plans = get_all_plans()
        self.assertTrue(len(plans) >= 3)
        
        pro_plan = resolve_plan("pro")
        self.assertIsNotNone(pro_plan)
        self.assertEqual(pro_plan["id"], "pro")
        self.assertEqual(pro_plan["amount_paise"], 1900)
        self.assertEqual(pro_plan["price_inr"], 19)

        adv_plan = resolve_plan("advanced")
        self.assertIsNotNone(adv_plan)
        self.assertEqual(adv_plan["amount_paise"], 9900)

    def test_create_order_server_side_pricing(self):
        order_info = create_order(user_id=self.test_user.id, plan_id="pro", db=self.db)
        self.assertIn("order_id", order_info)
        self.assertEqual(order_info["amount"], 1900)
        self.assertEqual(order_info["currency"], "INR")
        
        # Verify db entry created with status CREATED
        db_order = self.db.query(PaymentOrder).filter(PaymentOrder.user_id == self.test_user.id).first()
        self.assertIsNotNone(db_order)
        self.assertEqual(db_order.status, "CREATED")
        self.assertEqual(db_order.amount, 1900)

    def test_verify_signature_success_and_entitlement(self):
        order_info = create_order(user_id=self.test_user.id, plan_id="pro", db=self.db)
        rzp_order_id = order_info["order_id"]
        rzp_payment_id = "pay_test_998877"

        # Generate HMAC SHA256 signature
        generated_sig = hmac.new(
            RAZORPAY_KEY_SECRET.encode("utf-8"),
            f"{rzp_order_id}|{rzp_payment_id}".encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        result = verify_payment_signature(
            user_id=self.test_user.id,
            razorpay_order_id=rzp_order_id,
            razorpay_payment_id=rzp_payment_id,
            razorpay_signature=generated_sig,
            db=self.db
        )

        self.assertTrue(result["verified"])
        self.assertEqual(result["plan_id"], "pro")

        # Verify entitlement updated in DB
        ent = get_user_entitlements(self.db, self.test_user.id)
        self.assertEqual(ent["plan_id"], "pro")
        self.assertTrue(ent["unlimited_interviews"])
        self.assertTrue(ent["advanced_ats"])

    def test_idempotent_duplicate_verification(self):
        order_info = create_order(user_id=self.test_user.id, plan_id="pro", db=self.db)
        rzp_order_id = order_info["order_id"]
        rzp_payment_id = "pay_test_repeat"

        sig = hmac.new(
            RAZORPAY_KEY_SECRET.encode("utf-8"),
            f"{rzp_order_id}|{rzp_payment_id}".encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

        # First verification
        res1 = verify_payment_signature(self.test_user.id, rzp_order_id, rzp_payment_id, sig, self.db)
        self.assertTrue(res1["verified"])

        # Second verification with same params
        res2 = verify_payment_signature(self.test_user.id, rzp_order_id, rzp_payment_id, sig, self.db)
        self.assertTrue(res2["verified"])
        self.assertIn("previously", res2["message"].lower())

    def test_webhook_processing_and_deduplication(self):
        order_info = create_order(user_id=self.test_user.id, plan_id="pro", db=self.db)
        rzp_order_id = order_info["order_id"]

        webhook_payload = {
            "event": "payment.captured",
            "event_id": "evt_test_unique_001",
            "payload": {
                "payment": {
                    "entity": {
                        "id": "pay_wh_001",
                        "order_id": rzp_order_id,
                        "amount": 1900,
                        "status": "captured"
                    }
                }
            }
        }
        raw_body = json.dumps(webhook_payload).encode("utf-8")
        sig_header = hmac.new(
            RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            raw_body,
            hashlib.sha256
        ).hexdigest()

        res1 = process_webhook_payload(raw_body, sig_header, self.db)
        self.assertEqual(res1["status"], "success")

        # Second webhook attempt with same event_id
        res2 = process_webhook_payload(raw_body, sig_header, self.db)
        self.assertEqual(res2["status"], "ignored")


if __name__ == "__main__":
    unittest.main()
