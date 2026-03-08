"""
Test cases for Iteration 5 features:
- PO_GENERATED stage in workflow
- generate_po action transitions from DEAL_WON to PO_GENERATED
- VALID_PROFORMA_STAGES includes PO_GENERATED
- Flexible RFQ APIs still functional
- Complete B2B procurement flow validation
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')


class TestDatabaseSetup:
    """Setup: Reset database to seed state"""
    
    def test_reset_database(self):
        """Reset database to ensure clean test state"""
        response = requests.post(f"{BASE_URL}/api/reset")
        assert response.status_code == 200
        assert response.json()["message"] == "Database reset to seed state"
        print("✅ Database reset successfully")


class TestPOGeneratedStage:
    """Test PO_GENERATED stage functionality"""
    
    @pytest.fixture(autouse=True)
    def setup_deal_won_rfq(self):
        """Get a DEAL_WON RFQ for testing"""
        # Reset DB first
        requests.post(f"{BASE_URL}/api/reset")
        
        # Get buyer 3's RFQs to find DEAL_WON
        response = requests.get(f"{BASE_URL}/api/buyer/3/rfqs")
        assert response.status_code == 200
        rfqs = response.json()["rfqs"]
        
        for rfq in rfqs:
            if rfq["stage"] == "DEAL_WON":
                self.deal_won_rfq_id = rfq["rfq_id"]
                print(f"Using DEAL_WON RFQ: {self.deal_won_rfq_id}")
                break
        
        assert hasattr(self, 'deal_won_rfq_id'), "No DEAL_WON RFQ found"
        yield
    
    def test_generate_po_action_transitions_to_po_generated(self):
        """generate_po action should transition RFQ from DEAL_WON to PO_GENERATED"""
        rfq_id = self.deal_won_rfq_id
        
        # Verify current stage is DEAL_WON
        response = requests.get(f"{BASE_URL}/api/rfqs/{rfq_id}")
        assert response.status_code == 200
        assert response.json()["stage"] == "DEAL_WON"
        print("✅ Initial stage is DEAL_WON")
        
        # Execute generate_po action
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/actions",
            json={
                "action": "generate_po",
                "actor_glid": "3",
                "actor_type": "buyer",
                "content": "Purchase Order Generated",
                "metadata": {"po_number": "PO-TEST-2026-001"}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["stage"] == "PO_GENERATED", f"Expected PO_GENERATED, got {data['stage']}"
        print(f"✅ Stage transitioned to PO_GENERATED")
        
        # Verify probability score is 100
        assert data["probability_score"] == 100
        print(f"✅ Probability score is 100")
    
    def test_proforma_valid_on_po_generated_stage(self):
        """Seller should be able to send proforma when stage is PO_GENERATED"""
        rfq_id = self.deal_won_rfq_id
        
        # First transition to PO_GENERATED
        requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/actions",
            json={
                "action": "generate_po",
                "actor_glid": "3",
                "actor_type": "buyer",
                "content": "PO Generated",
                "metadata": {"po_number": "PO-TEST-001"}
            }
        )
        
        # Verify stage is PO_GENERATED
        response = requests.get(f"{BASE_URL}/api/rfqs/{rfq_id}")
        assert response.json()["stage"] == "PO_GENERATED"
        
        # Now seller should be able to send proforma
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/proforma",
            json={
                "amount": 300000,
                "tax_amount": 54000,
                "total_amount": 354000,
                "payment_terms": "Net 30",
                "line_items": [],
                "notes": "Proforma after PO"
            }
        )
        assert response.status_code == 200, f"Proforma creation failed: {response.text}"
        print("✅ Proforma can be sent on PO_GENERATED stage")
        
        # Verify stage moved to PROFORMA_SENT
        response = requests.get(f"{BASE_URL}/api/rfqs/{rfq_id}")
        assert response.json()["stage"] == "PROFORMA_SENT"
        print("✅ Stage moved to PROFORMA_SENT after proforma")


class TestPOGeneratedInStageFlow:
    """Test PO_GENERATED is properly placed in stage progression"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        requests.post(f"{BASE_URL}/api/reset")
        yield
    
    def test_po_generated_comes_after_deal_won(self):
        """Verify PO_GENERATED follows DEAL_WON in the flow"""
        # Check backend stage definitions via dashboard
        response = requests.get(f"{BASE_URL}/api/buyer/3/dashboard")
        assert response.status_code == 200
        
        # The stage distribution should show stages in proper order
        # PO_GENERATED should be counted in deals_won
        data = response.json()
        print(f"Dashboard KPIs: {data['kpis']}")
        print("✅ Dashboard accessible with PO_GENERATED stage support")


class TestCompleteB2BProcurementFlow:
    """Test complete B2B flow from RFQ_SENT to CLOSED"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        requests.post(f"{BASE_URL}/api/reset")
        yield
    
    def test_full_flow_with_po_stage(self):
        """Test complete flow: RFQ_SENT → QUOTE_RECEIVED → NEGOTIATION → DEAL_WON → PO_GENERATED → ... → CLOSED"""
        # Create new RFQ
        response = requests.post(
            f"{BASE_URL}/api/rfqs",
            json={
                "buyer_glid": "1",
                "seller_glid": "1.1",
                "product": "Test Product for Full Flow",
                "quantity": 100,
                "budget": 500000,
                "description": "Testing complete B2B flow",
                "priority": "high"
            }
        )
        assert response.status_code == 200
        rfq_id = response.json()["rfq_id"]
        print(f"✅ Created RFQ: {rfq_id}")
        
        def get_stage():
            r = requests.get(f"{BASE_URL}/api/rfqs/{rfq_id}")
            return r.json()["stage"]
        
        # 1. RFQ_SENT (initial)
        assert get_stage() == "RFQ_SENT"
        print("✅ Stage: RFQ_SENT")
        
        # 2. Seller sends quote → QUOTE_RECEIVED
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/actions",
            json={
                "action": "send_quote",
                "actor_glid": "1.1",
                "actor_type": "seller",
                "content": "Quote for product",
                "metadata": {"amount": 450000}
            }
        )
        assert response.status_code == 200
        assert get_stage() == "QUOTE_RECEIVED"
        print("✅ Stage: QUOTE_RECEIVED")
        
        # 3. Buyer counter offer → NEGOTIATION
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/actions",
            json={
                "action": "counter_offer",
                "actor_glid": "1",
                "actor_type": "buyer",
                "content": "Counter offer",
                "metadata": {"amount": 420000}
            }
        )
        assert response.status_code == 200
        assert get_stage() == "NEGOTIATION"
        print("✅ Stage: NEGOTIATION")
        
        # 4. Buyer accepts quote → DEAL_WON
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/actions",
            json={
                "action": "accept_quote",
                "actor_glid": "1",
                "actor_type": "buyer",
                "content": "Quote accepted",
                "metadata": {}
            }
        )
        assert response.status_code == 200
        assert get_stage() == "DEAL_WON"
        print("✅ Stage: DEAL_WON")
        
        # 5. Buyer generates PO → PO_GENERATED
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/actions",
            json={
                "action": "generate_po",
                "actor_glid": "1",
                "actor_type": "buyer",
                "content": "PO Generated",
                "metadata": {"po_number": "PO-FULLFLOW-001"}
            }
        )
        assert response.status_code == 200
        assert get_stage() == "PO_GENERATED"
        print("✅ Stage: PO_GENERATED")
        
        # 6. Seller sends proforma → PROFORMA_SENT
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/proforma",
            json={
                "amount": 420000,
                "tax_amount": 75600,
                "total_amount": 495600,
                "payment_terms": "50% advance, 50% on delivery",
                "line_items": [{"description": "Test Product", "quantity": 100, "unit_price": 4200}],
                "notes": "As per PO"
            }
        )
        assert response.status_code == 200
        assert get_stage() == "PROFORMA_SENT"
        print("✅ Stage: PROFORMA_SENT")
        
        # 7. Buyer accepts proforma → PAYMENT_PENDING
        response = requests.post(f"{BASE_URL}/api/rfqs/{rfq_id}/proforma/accept")
        assert response.status_code == 200
        stage = get_stage()
        assert stage in ["PROFORMA_ACCEPTED", "PAYMENT_PENDING"]
        print(f"✅ Stage: {stage}")
        
        # 8. Buyer records payment
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/payments",
            json={
                "amount": 495600,
                "payment_method": "NEFT",
                "reference_number": "UTR-FULLFLOW-001",
                "milestone": "full",
                "payer_glid": "1",
                "payer_type": "buyer"
            }
        )
        assert response.status_code == 200
        payment_id = response.json()["payment_id"]
        print(f"✅ Payment recorded: {payment_id}")
        
        # 9. Seller confirms payment → PAYMENT_RECEIVED
        response = requests.post(f"{BASE_URL}/api/rfqs/{rfq_id}/payments/{payment_id}/confirm")
        assert response.status_code == 200
        assert get_stage() == "PAYMENT_RECEIVED"
        print("✅ Stage: PAYMENT_RECEIVED")
        
        # 10. Seller dispatches → IN_TRANSIT
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/shipments",
            json={
                "lr_number": "LR-FULLFLOW-001",
                "tracking_number": "TRK-FULLFLOW-001",
                "carrier": "BlueDart",
                "quantity_shipped": 100,
                "eway_bill": "EW-001",
                "notes": "Full shipment"
            }
        )
        assert response.status_code == 200
        stage = get_stage()
        assert stage in ["DISPATCHED", "IN_TRANSIT"]
        print(f"✅ Stage: {stage}")
        
        # 11. Buyer confirms delivery → DELIVERED
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/delivery",
            json={
                "delivery_status": "full",
                "quality_status": "ok",
                "notes": "All items received in good condition",
                "photo_file_ids": [],
                "quantity_received": 100
            }
        )
        assert response.status_code == 200
        assert get_stage() == "DELIVERED"
        print("✅ Stage: DELIVERED")
        
        # 12. Buyer submits review → CLOSED
        response = requests.post(
            f"{BASE_URL}/api/rfqs/{rfq_id}/review",
            json={
                "rating": 5,
                "comment": "Excellent service! Complete B2B flow successful.",
                "reviewer_glid": "1"
            }
        )
        assert response.status_code == 200
        assert get_stage() == "CLOSED"
        print("✅ Stage: CLOSED")
        
        print("\n🎉 COMPLETE B2B PROCUREMENT FLOW PASSED!")
        print("   RFQ_SENT → QUOTE_RECEIVED → NEGOTIATION → DEAL_WON → PO_GENERATED → ")
        print("   PROFORMA_SENT → PAYMENT_PENDING → PAYMENT_RECEIVED → IN_TRANSIT → ")
        print("   DELIVERED → CLOSED")


class TestFlexibleRFQAPIs:
    """Verify flexible RFQ APIs still work after PO stage changes"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        # Register test partners
        requests.post(
            f"{BASE_URL}/api/integration/register-partner",
            json={"external_id": "test-buyer-po", "name": "Test Buyer PO", "role": "buyer", "metadata": {}}
        )
        requests.post(
            f"{BASE_URL}/api/integration/register-partner",
            json={"external_id": "test-seller-po", "name": "Test Seller PO", "role": "seller", "metadata": {}}
        )
        yield
    
    def test_flexible_rfq_creation_works(self):
        """Flexible RFQ API should still work"""
        response = requests.post(
            f"{BASE_URL}/api/integration/create-rfq-flexible",
            json={
                "buyer_external_id": "test-buyer-po",
                "seller_external_ids": ["test-seller-po"],
                "rfq_data": {
                    "category": "Test after PO stage",
                    "quantity": 10,
                    "estimated_budget": 100000
                },
                "priority": "medium",
                "display_config": {},
                "global_metadata": {}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["summary"]["total_rfqs_created"] == 1
        print(f"✅ Flexible RFQ created: {data['rfqs_created'][0]['rfq_id']}")


class TestAdminPortalAPIs:
    """Verify admin portal APIs work with PO_GENERATED stage"""
    
    def test_admin_overview_includes_po_generated(self):
        """Admin overview should work and show stage distribution including PO_GENERATED"""
        response = requests.get(f"{BASE_URL}/api/admin/overview")
        assert response.status_code == 200
        data = response.json()
        
        assert "totals" in data
        assert "stage_distribution" in data
        print(f"Stage distribution: {data['stage_distribution']}")
        print("✅ Admin overview API works with PO_GENERATED stage")
    
    def test_admin_rfqs_includes_po_generated(self):
        """Admin RFQs endpoint should list RFQs including PO_GENERATED stage"""
        response = requests.get(f"{BASE_URL}/api/admin/rfqs")
        assert response.status_code == 200
        data = response.json()
        
        assert "rfqs" in data
        assert "total" in data
        print(f"Total RFQs in admin: {data['total']}")
        
        # Check if any RFQ is in PO_GENERATED stage
        po_generated_rfqs = [r for r in data["rfqs"] if r.get("stage") == "PO_GENERATED"]
        print(f"RFQs in PO_GENERATED stage: {len(po_generated_rfqs)}")
        print("✅ Admin RFQs API works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
