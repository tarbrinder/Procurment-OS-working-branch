"""
Test file for NEW features in Iteration 3:
- Auto-stage progression for post-deal stages
- SELLER_VERIFIED stage in pre-deal flow
- Notifications endpoint
- Dashboard KPIs (in_fulfillment count)
- InlineActionBar functionality (via API)
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestSetup:
    """Reset database and get RFQs for testing"""
    
    @pytest.fixture(scope="class", autouse=True)
    def reset_db(self):
        """Reset database before running tests"""
        response = requests.post(f"{BASE_URL}/api/reset")
        assert response.status_code == 200
        yield
    
    def test_api_health(self):
        """Test API is running"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        assert "GLID Procurement Lead Manager API" in response.json().get("message", "")
        print("✅ API Health Check Passed")


class TestSellerVerifiedStage:
    """Test SELLER_VERIFIED stage in pre-deal flow"""
    
    def test_verify_seller_advances_to_seller_verified_stage(self):
        """Seller verify at RFQ_SENT stage should auto-advance to SELLER_VERIFIED"""
        # First, find an RFQ_SENT stage RFQ
        response = requests.get(f"{BASE_URL}/api/buyer/1/rfqs")
        assert response.status_code == 200
        rfqs = response.json().get("rfqs", [])
        
        # Filter for RFQ_SENT
        rfq_sent = [r for r in rfqs if r.get("stage") == "RFQ_SENT"]
        assert len(rfq_sent) > 0, "No RFQ_SENT stage RFQ found for testing"
        
        rfq_id = rfq_sent[0]["rfq_id"]
        print(f"Testing with RFQ: {rfq_id}, Stage: RFQ_SENT")
        
        # Verify seller
        response = requests.post(f"{BASE_URL}/api/rfqs/{rfq_id}/verify-seller", json={
            "verified_by_glid": "1",
            "note": "Verified via video KYC - safe to deal"
        })
        assert response.status_code == 200
        assert "verification" in response.json()
        print("✅ Seller verification request accepted")
        
        # Check stage advanced to SELLER_VERIFIED
        response = requests.get(f"{BASE_URL}/api/rfqs/{rfq_id}")
        assert response.status_code == 200
        rfq = response.json()
        assert rfq.get("stage") == "SELLER_VERIFIED", f"Expected SELLER_VERIFIED, got {rfq.get('stage')}"
        assert rfq.get("seller_verified", {}).get("verified") == True
        print(f"✅ Stage auto-advanced to SELLER_VERIFIED")


class TestNotificationsEndpoint:
    """Test the notifications endpoint for buyer and seller"""
    
    def test_buyer_notifications(self):
        """GET /{view_type}/{glid}/notifications returns recent activity"""
        response = requests.get(f"{BASE_URL}/api/buyer/1/notifications")
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        print(f"✅ Buyer notifications endpoint works, got {len(data['notifications'])} notifications")
        
    def test_seller_notifications(self):
        """GET /{view_type}/{glid}/notifications for seller"""
        response = requests.get(f"{BASE_URL}/api/seller/1.1/notifications")
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        print(f"✅ Seller notifications endpoint works, got {len(data['notifications'])} notifications")
    
    def test_notifications_with_since_param(self):
        """Test notifications filtering with since parameter"""
        response = requests.get(f"{BASE_URL}/api/buyer/3/notifications", params={"since": "2024-01-01T00:00:00"})
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        print("✅ Notifications endpoint accepts 'since' parameter")


class TestDashboardKPIs:
    """Test Dashboard KPIs including in_fulfillment count"""
    
    def test_buyer_dashboard_has_in_fulfillment(self):
        """Buyer dashboard KPIs should include in_fulfillment count"""
        response = requests.get(f"{BASE_URL}/api/buyer/3/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        kpis = data["kpis"]
        assert "in_fulfillment" in kpis, "in_fulfillment should be in buyer KPIs"
        print(f"✅ Buyer dashboard has in_fulfillment KPI: {kpis.get('in_fulfillment')}")
        
    def test_seller_dashboard_has_in_fulfillment(self):
        """Seller dashboard KPIs should include in_fulfillment count"""
        response = requests.get(f"{BASE_URL}/api/seller/3.1/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        kpis = data["kpis"]
        assert "in_fulfillment" in kpis, "in_fulfillment should be in seller KPIs"
        print(f"✅ Seller dashboard has in_fulfillment KPI: {kpis.get('in_fulfillment')}")


class TestAutoStageProgression:
    """Test full auto-stage progression: DEAL_WON → PROFORMA_SENT → PAYMENT_PENDING → PAYMENT_RECEIVED → IN_TRANSIT → DELIVERED → CLOSED"""
    
    @pytest.fixture(scope="class")
    def deal_won_rfq_id(self):
        """Find or prepare a DEAL_WON RFQ for testing"""
        response = requests.get(f"{BASE_URL}/api/buyer/3/rfqs")
        rfqs = response.json().get("rfqs", [])
        deal_won = [r for r in rfqs if r.get("stage") == "DEAL_WON"]
        if deal_won:
            return deal_won[0]["rfq_id"]
        else:
            # Use the first RFQ and progress it to DEAL_WON
            if rfqs:
                rfq_id = rfqs[0]["rfq_id"]
                requests.post(f"{BASE_URL}/api/rfqs/{rfq_id}/actions", json={
                    "action": "close_deal_won",
                    "actor_glid": "3.1",
                    "actor_type": "seller",
                    "content": "Deal won",
                    "metadata": {}
                })
                return rfq_id
        return None
    
    def test_01_proforma_sent_stage(self, deal_won_rfq_id):
        """Seller sends proforma → Stage should be PROFORMA_SENT"""
        assert deal_won_rfq_id, "No RFQ available for testing"
        
        response = requests.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/proforma", json={
            "amount": 300000,
            "tax_amount": 54000,
            "total_amount": 354000,
            "payment_terms": "50% advance, 50% on delivery",
            "line_items": [{"item": "Ready-Mix Concrete M30", "qty": 100, "rate": 3000}],
            "notes": "Delivery within 7 days",
            "file_ids": []
        })
        assert response.status_code == 200
        print(f"✅ Proforma sent successfully")
        
        # Verify stage
        response = requests.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}")
        assert response.json().get("stage") == "PROFORMA_SENT"
        print(f"✅ Stage is PROFORMA_SENT")
    
    def test_02_proforma_accepted_auto_payment_pending(self, deal_won_rfq_id):
        """Accept proforma → Should auto-advance to PAYMENT_PENDING"""
        response = requests.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/proforma/accept")
        assert response.status_code == 200
        print("✅ Proforma accepted")
        
        time.sleep(0.5)  # Wait for auto-stage to process
        
        response = requests.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}")
        stage = response.json().get("stage")
        assert stage == "PAYMENT_PENDING", f"Expected PAYMENT_PENDING, got {stage}"
        print(f"✅ Auto-advanced to PAYMENT_PENDING")
    
    def test_03_record_and_confirm_payment_to_payment_received(self, deal_won_rfq_id):
        """Record full payment and confirm → Should auto-advance to PAYMENT_RECEIVED"""
        # Record full payment (354000 to match proforma total)
        response = requests.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/payments", json={
            "amount": 354000,
            "payment_method": "NEFT",
            "reference_number": "UTR123456789",
            "milestone": "full_payment",
            "file_ids": [],
            "payer_glid": "3",
            "payer_type": "buyer"
        })
        assert response.status_code == 200
        payment_id = response.json().get("payment_id")
        print(f"✅ Payment recorded: {payment_id}")
        
        # Confirm payment
        response = requests.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/payments/{payment_id}/confirm")
        assert response.status_code == 200
        print("✅ Payment confirmed by seller")
        
        time.sleep(0.5)
        
        # Check stage
        response = requests.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}")
        stage = response.json().get("stage")
        assert stage == "PAYMENT_RECEIVED", f"Expected PAYMENT_RECEIVED, got {stage}"
        print(f"✅ Auto-advanced to PAYMENT_RECEIVED")
    
    def test_04_shipment_dispatched_to_dispatched_and_in_transit(self, deal_won_rfq_id):
        """Add shipment with tracking → Should advance through DISPATCHED to IN_TRANSIT"""
        response = requests.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/shipments", json={
            "lr_number": "LR12345",
            "tracking_number": "TRK789012345",
            "carrier": "Blue Dart",
            "quantity_shipped": 100,
            "eway_bill": "EWAY123",
            "notes": "Handle with care"
        })
        assert response.status_code == 200
        print("✅ Shipment added")
        
        time.sleep(0.5)
        
        # With tracking number, should auto-advance to IN_TRANSIT
        response = requests.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}")
        stage = response.json().get("stage")
        # Could be DISPATCHED or IN_TRANSIT depending on auto-progression
        assert stage in ["DISPATCHED", "IN_TRANSIT"], f"Expected DISPATCHED or IN_TRANSIT, got {stage}"
        print(f"✅ Stage is {stage}")
    
    def test_05_delivery_confirmed_to_delivered(self, deal_won_rfq_id):
        """Confirm delivery → Should advance to DELIVERED"""
        response = requests.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/delivery", json={
            "delivery_status": "full",
            "quality_status": "ok",
            "notes": "Received in good condition",
            "photo_file_ids": [],
            "quantity_received": 100
        })
        assert response.status_code == 200
        print("✅ Delivery confirmed")
        
        time.sleep(0.5)
        
        response = requests.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}")
        stage = response.json().get("stage")
        assert stage == "DELIVERED", f"Expected DELIVERED, got {stage}"
        print(f"✅ Stage is DELIVERED")
    
    def test_06_review_submitted_auto_closes(self, deal_won_rfq_id):
        """Submit review → Should auto-advance to CLOSED"""
        response = requests.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/review", json={
            "rating": 5,
            "comment": "Excellent service, on-time delivery, great quality!",
            "reviewer_glid": "3"
        })
        assert response.status_code == 200
        print("✅ Review submitted")
        
        time.sleep(0.5)
        
        response = requests.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}")
        stage = response.json().get("stage")
        assert stage == "CLOSED", f"Expected CLOSED after review, got {stage}"
        print(f"✅ Order auto-closed to CLOSED after review")


class TestInlineActionBarAPIs:
    """Test the APIs that InlineActionBar uses for quick actions"""
    
    @pytest.fixture(scope="class")
    def setup_proforma_sent_rfq(self):
        """Create an RFQ in PROFORMA_SENT stage for inline action testing"""
        # Reset DB first
        requests.post(f"{BASE_URL}/api/reset")
        
        # Get DEAL_WON RFQ
        response = requests.get(f"{BASE_URL}/api/buyer/3/rfqs")
        rfqs = response.json().get("rfqs", [])
        deal_won = [r for r in rfqs if r.get("stage") == "DEAL_WON"]
        
        if not deal_won:
            pytest.skip("No DEAL_WON RFQ available")
            
        rfq_id = deal_won[0]["rfq_id"]
        
        # Send proforma to get to PROFORMA_SENT
        requests.post(f"{BASE_URL}/api/rfqs/{rfq_id}/proforma", json={
            "amount": 350000, "tax_amount": 63000, "total_amount": 413000,
            "payment_terms": "100% advance", "line_items": [], "notes": "", "file_ids": []
        })
        return rfq_id
    
    def test_accept_proforma_inline_action(self, setup_proforma_sent_rfq):
        """Test Accept Proforma action (used by InlineActionBar)"""
        rfq_id = setup_proforma_sent_rfq
        
        # Verify it's in PROFORMA_SENT
        response = requests.get(f"{BASE_URL}/api/rfqs/{rfq_id}")
        assert response.json().get("stage") == "PROFORMA_SENT"
        
        # Accept proforma (inline action)
        response = requests.post(f"{BASE_URL}/api/rfqs/{rfq_id}/proforma/accept")
        assert response.status_code == 200
        print("✅ Accept Proforma inline action works")
        
        # Verify auto-advance
        response = requests.get(f"{BASE_URL}/api/rfqs/{rfq_id}")
        assert response.json().get("stage") == "PAYMENT_PENDING"
        print("✅ Stage auto-advanced to PAYMENT_PENDING")
    
    def test_record_payment_inline_action(self, setup_proforma_sent_rfq):
        """Test Record Payment action (used by InlineActionBar at PAYMENT_PENDING)"""
        rfq_id = setup_proforma_sent_rfq
        
        # Record payment
        response = requests.post(f"{BASE_URL}/api/rfqs/{rfq_id}/payments", json={
            "amount": 413000, "payment_method": "NEFT", "reference_number": "UTR999888777",
            "milestone": "payment", "file_ids": [], "payer_glid": "3", "payer_type": "buyer"
        })
        assert response.status_code == 200
        payment_id = response.json().get("payment_id")
        print(f"✅ Record Payment inline action works, payment_id: {payment_id}")
        
        # Confirm to advance stage
        response = requests.post(f"{BASE_URL}/api/rfqs/{rfq_id}/payments/{payment_id}/confirm")
        assert response.status_code == 200
        print("✅ Payment confirmed")
    
    def test_dispatch_shipment_inline_action(self, setup_proforma_sent_rfq):
        """Test Dispatch Shipment action (used by InlineActionBar at PAYMENT_RECEIVED)"""
        rfq_id = setup_proforma_sent_rfq
        
        # Check current stage
        response = requests.get(f"{BASE_URL}/api/rfqs/{rfq_id}")
        current_stage = response.json().get("stage")
        print(f"Current stage: {current_stage}")
        
        # Add shipment
        response = requests.post(f"{BASE_URL}/api/rfqs/{rfq_id}/shipments", json={
            "lr_number": "INLR001", "tracking_number": "INTRACK001",
            "carrier": "DTDC", "quantity_shipped": 100,
            "eway_bill": "", "notes": ""
        })
        assert response.status_code == 200
        print("✅ Dispatch Shipment inline action works")
    
    def test_confirm_delivery_inline_action(self, setup_proforma_sent_rfq):
        """Test Confirm Delivery action (used by InlineActionBar at IN_TRANSIT)"""
        rfq_id = setup_proforma_sent_rfq
        
        response = requests.post(f"{BASE_URL}/api/rfqs/{rfq_id}/delivery", json={
            "delivery_status": "full", "quality_status": "ok",
            "notes": "Confirmed via inline action", "photo_file_ids": [], "quantity_received": 100
        })
        assert response.status_code == 200
        print("✅ Confirm Delivery inline action works")
        
        # Check stage is DELIVERED
        response = requests.get(f"{BASE_URL}/api/rfqs/{rfq_id}")
        assert response.json().get("stage") == "DELIVERED"
        print("✅ Stage is DELIVERED")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
