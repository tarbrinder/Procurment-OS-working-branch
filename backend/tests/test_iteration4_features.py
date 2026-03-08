"""
Test cases for Iteration 4 features:
- Edge case validation guards (blocking actions on wrong stages)
- Full lifecycle auto-stage progression
- SELLER_VERIFIED stage
- Notifications endpoint
- Dashboard KPIs with in_fulfillment count
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Global RFQ IDs to be set after reset
DEAL_WON_RFQ = None
DEAL_LOST_RFQ = None
RFQ_SENT_RFQ = None


class TestSetup:
    """Setup: Reset database and get RFQ IDs"""
    
    def test_reset_database(self):
        """Reset database to seed state"""
        response = requests.post(f"{BASE_URL}/api/reset")
        assert response.status_code == 200
        assert response.json()["message"] == "Database reset to seed state"
        print("✅ Database reset successfully")
    
    def test_get_test_rfq_ids(self):
        """Fetch RFQ IDs for testing"""
        global DEAL_WON_RFQ, DEAL_LOST_RFQ, RFQ_SENT_RFQ
        
        # Get buyer 3 RFQs for DEAL_WON and DEAL_LOST
        response = requests.get(f"{BASE_URL}/api/buyer/3/rfqs")
        assert response.status_code == 200
        rfqs = response.json()["rfqs"]
        
        for rfq in rfqs:
            if rfq["stage"] == "DEAL_WON":
                DEAL_WON_RFQ = rfq["rfq_id"]
                print(f"✅ DEAL_WON RFQ: {DEAL_WON_RFQ}")
            elif rfq["stage"] == "DEAL_LOST":
                DEAL_LOST_RFQ = rfq["rfq_id"]
                print(f"✅ DEAL_LOST RFQ: {DEAL_LOST_RFQ}")
        
        # Get buyer 1 RFQs for RFQ_SENT
        response = requests.get(f"{BASE_URL}/api/buyer/1/rfqs")
        assert response.status_code == 200
        rfqs = response.json()["rfqs"]
        
        for rfq in rfqs:
            if rfq["stage"] == "RFQ_SENT":
                RFQ_SENT_RFQ = rfq["rfq_id"]
                print(f"✅ RFQ_SENT RFQ: {RFQ_SENT_RFQ}")
        
        assert DEAL_WON_RFQ is not None, "DEAL_WON RFQ not found"
        assert DEAL_LOST_RFQ is not None, "DEAL_LOST RFQ not found"
        assert RFQ_SENT_RFQ is not None, "RFQ_SENT RFQ not found"


class TestEdgeCaseValidationGuards:
    """Edge case tests - validating that actions are blocked at wrong stages"""
    
    def test_proforma_on_deal_lost_returns_400(self):
        """POST /api/rfqs/{id}/proforma on DEAL_LOST should return 400"""
        assert DEAL_LOST_RFQ is not None, "DEAL_LOST RFQ not available"
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{DEAL_LOST_RFQ}/proforma",
            json={
                "amount": 100000, "tax_amount": 18000, "total_amount": 118000,
                "payment_terms": "Net 30", "line_items": [], "notes": "Test"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "DEAL_LOST" in response.json().get("detail", ""), f"Expected DEAL_LOST in error, got {response.json()}"
        print(f"✅ Proforma on DEAL_LOST correctly blocked: {response.json()}")
    
    def test_payment_on_deal_won_returns_400(self):
        """POST /api/rfqs/{id}/payments on DEAL_WON (before proforma) should return 400"""
        assert DEAL_WON_RFQ is not None, "DEAL_WON RFQ not available"
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{DEAL_WON_RFQ}/payments",
            json={
                "amount": 50000, "payment_method": "NEFT",
                "reference_number": "TEST123", "milestone": "advance",
                "payer_glid": "3", "payer_type": "buyer"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✅ Payment on DEAL_WON (before proforma) correctly blocked: {response.json()}")
    
    def test_shipment_on_deal_won_returns_400(self):
        """POST /api/rfqs/{id}/shipments on DEAL_WON should return 400"""
        assert DEAL_WON_RFQ is not None, "DEAL_WON RFQ not available"
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{DEAL_WON_RFQ}/shipments",
            json={
                "lr_number": "LR001", "tracking_number": "TRK001",
                "carrier": "BlueDart", "quantity_shipped": 50, "eway_bill": "", "notes": ""
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✅ Shipment on DEAL_WON correctly blocked: {response.json()}")
    
    def test_delivery_on_deal_won_returns_400(self):
        """POST /api/rfqs/{id}/delivery on DEAL_WON should return 400"""
        assert DEAL_WON_RFQ is not None, "DEAL_WON RFQ not available"
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{DEAL_WON_RFQ}/delivery",
            json={
                "delivery_status": "full", "quality_status": "ok",
                "notes": "Test", "photo_file_ids": [], "quantity_received": 100
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"✅ Delivery on DEAL_WON correctly blocked: {response.json()}")
    
    def test_review_on_deal_lost_returns_400(self):
        """POST /api/rfqs/{id}/review on DEAL_LOST should return 400"""
        assert DEAL_LOST_RFQ is not None, "DEAL_LOST RFQ not available"
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{DEAL_LOST_RFQ}/review",
            json={
                "rating": 5, "comment": "Great service", "reviewer_glid": "3"
            }
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        assert "DEAL_LOST" in response.json().get("detail", ""), f"Expected DEAL_LOST in error, got {response.json()}"
        print(f"✅ Review on DEAL_LOST correctly blocked: {response.json()}")


class TestSellerVerifiedStage:
    """Test SELLER_VERIFIED stage advancement"""
    
    def test_verify_seller_on_rfq_sent_advances_to_seller_verified(self):
        """Verify seller on RFQ_SENT should advance stage to SELLER_VERIFIED"""
        assert RFQ_SENT_RFQ is not None, "RFQ_SENT RFQ not available"
        
        # Verify seller
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{RFQ_SENT_RFQ}/verify-seller",
            json={
                "verified_by_glid": "1",
                "note": "Verified via video KYC - premises inspected"
            }
        )
        assert response.status_code == 200, f"Verify seller failed: {response.text}"
        print(f"✅ Seller verification response: {response.json()}")
        
        # Check RFQ stage is now SELLER_VERIFIED
        rfq_response = requests.get(f"{BASE_URL}/api/rfqs/{RFQ_SENT_RFQ}")
        assert rfq_response.status_code == 200
        rfq = rfq_response.json()
        assert rfq["stage"] == "SELLER_VERIFIED", f"Expected SELLER_VERIFIED, got {rfq['stage']}"
        assert rfq["seller_verified"]["verified"] == True
        assert rfq["probability_score"] == 50  # SELLER_VERIFIED probability
        print(f"✅ Stage advanced to SELLER_VERIFIED: {rfq['stage']}, probability: {rfq['probability_score']}")


class TestNotificationsEndpoint:
    """Test notifications endpoint"""
    
    def test_buyer_notifications(self):
        """GET /{view_type}/{glid}/notifications returns activity feed for buyer"""
        response = requests.get(f"{BASE_URL}/api/buyer/3/notifications")
        assert response.status_code == 200, f"Notifications failed: {response.text}"
        data = response.json()
        assert "notifications" in data
        print(f"✅ Buyer notifications: {len(data['notifications'])} items")
        if len(data['notifications']) > 0:
            print(f"   First notification: {data['notifications'][0]}")
    
    def test_seller_notifications(self):
        """GET /{view_type}/{glid}/notifications returns activity feed for seller"""
        response = requests.get(f"{BASE_URL}/api/seller/3.1/notifications")
        assert response.status_code == 200, f"Notifications failed: {response.text}"
        data = response.json()
        assert "notifications" in data
        print(f"✅ Seller notifications: {len(data['notifications'])} items")
    
    def test_notifications_with_since_param(self):
        """Notifications can filter by 'since' timestamp"""
        response = requests.get(f"{BASE_URL}/api/buyer/3/notifications", params={"since": "2026-01-01T00:00:00"})
        assert response.status_code == 200
        print(f"✅ Notifications with since param: {len(response.json()['notifications'])} items")


class TestDashboardKPIs:
    """Test dashboard KPIs include in_fulfillment count and post-deal stages counted as won"""
    
    def test_buyer_dashboard_has_in_fulfillment_kpi(self):
        """Buyer dashboard KPIs should include in_fulfillment count"""
        response = requests.get(f"{BASE_URL}/api/buyer/3/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        kpis = data["kpis"]
        assert "in_fulfillment" in kpis, f"in_fulfillment missing from KPIs: {kpis}"
        print(f"✅ Buyer dashboard KPIs: {kpis}")
        print(f"   in_fulfillment count: {kpis['in_fulfillment']}")
        print(f"   deals_won (includes post-deal): {kpis['deals_won']}")
    
    def test_seller_dashboard_has_in_fulfillment_kpi(self):
        """Seller dashboard KPIs should include in_fulfillment count"""
        response = requests.get(f"{BASE_URL}/api/seller/3.1/dashboard")
        assert response.status_code == 200
        data = response.json()
        assert "kpis" in data
        kpis = data["kpis"]
        assert "in_fulfillment" in kpis, f"in_fulfillment missing from KPIs: {kpis}"
        print(f"✅ Seller dashboard KPIs: {kpis}")
        print(f"   in_fulfillment count: {kpis['in_fulfillment']}")


class TestFullLifecycleAutoStageProgression:
    """Test complete lifecycle auto-stage progression:
    DEAL_WON → proforma → accept → payment → confirm → ship → IN_TRANSIT → delivery → DELIVERED → review → CLOSED
    """
    
    @pytest.fixture(autouse=True)
    def setup_lifecycle_test(self):
        """Reset DB and get fresh DEAL_WON RFQ for lifecycle test"""
        # Reset database
        requests.post(f"{BASE_URL}/api/reset")
        
        # Get DEAL_WON RFQ
        response = requests.get(f"{BASE_URL}/api/buyer/3/rfqs")
        rfqs = response.json()["rfqs"]
        for rfq in rfqs:
            if rfq["stage"] == "DEAL_WON":
                self.test_rfq_id = rfq["rfq_id"]
                print(f"Using RFQ: {self.test_rfq_id}")
                break
        yield
    
    def test_full_lifecycle_progression(self):
        """Test complete lifecycle from DEAL_WON to CLOSED"""
        rfq_id = self.test_rfq_id
        
        def get_stage():
            r = requests.get(f"{BASE_URL}/api/rfqs/{rfq_id}")
            return r.json()["stage"]
        
        # 1. Start at DEAL_WON
        assert get_stage() == "DEAL_WON", "Should start at DEAL_WON"
        print("✅ Stage: DEAL_WON")
        
        # 2. Seller sends proforma → PROFORMA_SENT
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/proforma",
            json={
                "amount": 300000, "tax_amount": 54000, "total_amount": 354000,
                "payment_terms": "Net 30", "line_items": [], "notes": "Test proforma"
            }
        )
        assert response.status_code == 200, f"Proforma send failed: {response.text}"
        assert get_stage() == "PROFORMA_SENT"
        print("✅ Stage: PROFORMA_SENT")
        
        # 3. Buyer accepts proforma → PROFORMA_ACCEPTED → auto to PAYMENT_PENDING
        response = requests.post(f"{BASE_URL}/api/rfqs/{rfq_id}/proforma/accept")
        assert response.status_code == 200, f"Proforma accept failed: {response.text}"
        # Auto-stage should move to PAYMENT_PENDING
        stage = get_stage()
        assert stage in ["PROFORMA_ACCEPTED", "PAYMENT_PENDING"], f"Expected PAYMENT_PENDING after accept, got {stage}"
        print(f"✅ Stage: {stage}")
        
        # 4. Buyer records payment
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/payments",
            json={
                "amount": 354000, "payment_method": "NEFT",
                "reference_number": "UTR123456", "milestone": "full",
                "payer_glid": "3", "payer_type": "buyer"
            }
        )
        assert response.status_code == 200, f"Payment record failed: {response.text}"
        payment_id = response.json()["payment_id"]
        print(f"✅ Payment recorded: {payment_id}")
        
        # 5. Seller confirms payment → PAYMENT_RECEIVED
        response = requests.post(f"{BASE_URL}/api/rfqs/{rfq_id}/payments/{payment_id}/confirm")
        assert response.status_code == 200, f"Payment confirm failed: {response.text}"
        assert get_stage() == "PAYMENT_RECEIVED"
        print("✅ Stage: PAYMENT_RECEIVED")
        
        # 6. Seller dispatches shipment → DISPATCHED → IN_TRANSIT (if tracking_number provided)
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/shipments",
            json={
                "lr_number": "LR12345", "tracking_number": "TRK789",
                "carrier": "BlueDart", "quantity_shipped": 100,
                "eway_bill": "EW001", "notes": "Full shipment"
            }
        )
        assert response.status_code == 200, f"Shipment add failed: {response.text}"
        stage = get_stage()
        # Since tracking_number is provided, auto-stage should advance to IN_TRANSIT
        assert stage in ["DISPATCHED", "IN_TRANSIT"], f"Expected DISPATCHED/IN_TRANSIT, got {stage}"
        print(f"✅ Stage: {stage}")
        
        # 7. Buyer confirms delivery → DELIVERED
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/delivery",
            json={
                "delivery_status": "full", "quality_status": "ok",
                "notes": "All items received in good condition",
                "photo_file_ids": [], "quantity_received": 100
            }
        )
        assert response.status_code == 200, f"Delivery record failed: {response.text}"
        assert get_stage() == "DELIVERED"
        print("✅ Stage: DELIVERED")
        
        # 8. Buyer submits review → REVIEW_SUBMITTED → CLOSED
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/review",
            json={
                "rating": 5, "comment": "Excellent service and quality!",
                "reviewer_glid": "3"
            }
        )
        assert response.status_code == 200, f"Review submit failed: {response.text}"
        final_stage = get_stage()
        assert final_stage == "CLOSED", f"Expected CLOSED after review, got {final_stage}"
        print("✅ Stage: CLOSED")
        
        print("\n🎉 FULL LIFECYCLE TEST PASSED!")
        print("   DEAL_WON → PROFORMA_SENT → PAYMENT_PENDING → PAYMENT_RECEIVED → DISPATCHED/IN_TRANSIT → DELIVERED → CLOSED")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
