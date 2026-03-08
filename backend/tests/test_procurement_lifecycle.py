"""
Test Suite for GLID Procurement Lead Manager - Post-Deal Lifecycle APIs
Tests: Proforma Invoice, Payments, Shipments, Delivery, Complaints, Reviews
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://lead-manager-glid.preview.emergentagent.com')

# Test fixtures
@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def reset_database(api_client):
    """Reset database before tests"""
    response = api_client.post(f"{BASE_URL}/api/reset")
    assert response.status_code == 200
    return response.json()

@pytest.fixture(scope="module")
def deal_won_rfq_id(api_client, reset_database):
    """Get the DEAL_WON RFQ ID for buyer GLID 3 (Ready-Mix Concrete)"""
    response = api_client.get(f"{BASE_URL}/api/buyer/3/rfqs")
    assert response.status_code == 200
    rfqs = response.json()["rfqs"]
    deal_won_rfqs = [r for r in rfqs if r["stage"] == "DEAL_WON"]
    assert len(deal_won_rfqs) > 0, "No DEAL_WON RFQ found"
    return deal_won_rfqs[0]["rfq_id"]


class TestHealthCheck:
    """Basic health checks"""
    
    def test_api_root(self, api_client):
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        assert response.json()["message"] == "GLID Procurement Lead Manager API"

    def test_reset_endpoint(self, api_client):
        response = api_client.post(f"{BASE_URL}/api/reset")
        assert response.status_code == 200


class TestProformaInvoice:
    """Proforma Invoice workflow tests - Seller sends, Buyer accepts/rejects"""
    
    def test_get_proforma_empty(self, api_client, deal_won_rfq_id):
        """GET proforma returns None initially"""
        response = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/proforma")
        assert response.status_code == 200
        data = response.json()
        assert data["proforma"] is None or data.get("proforma") is None

    def test_send_proforma_invoice(self, api_client, deal_won_rfq_id):
        """POST /api/rfqs/{rfq_id}/proforma - seller sends proforma"""
        payload = {
            "amount": 300000,
            "tax_amount": 54000,
            "total_amount": 354000,
            "payment_terms": "50% advance, 50% on delivery",
            "line_items": [],
            "notes": "Test proforma invoice",
            "file_ids": []
        }
        response = api_client.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/proforma", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert data["revision"] == 1

    def test_verify_proforma_sent(self, api_client, deal_won_rfq_id):
        """Verify proforma was created and RFQ stage changed"""
        # Verify proforma
        proforma_resp = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/proforma")
        assert proforma_resp.status_code == 200
        proforma = proforma_resp.json()["proforma"]
        assert proforma is not None
        assert proforma["amount"] == 300000
        assert proforma["total_amount"] == 354000
        assert proforma["status"] == "sent"
        
        # Verify RFQ stage
        rfq_resp = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}")
        assert rfq_resp.status_code == 200
        rfq = rfq_resp.json()
        assert rfq["stage"] == "PROFORMA_SENT"

    def test_accept_proforma(self, api_client, deal_won_rfq_id):
        """POST /api/rfqs/{rfq_id}/proforma/accept - buyer accepts"""
        response = api_client.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/proforma/accept")
        assert response.status_code == 200
        
        # Verify stage changed
        rfq_resp = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}")
        assert rfq_resp.status_code == 200
        # Stage should be PROFORMA_ACCEPTED or auto-progressed to PAYMENT_PENDING
        assert rfq_resp.json()["stage"] in ["PROFORMA_ACCEPTED", "PAYMENT_PENDING"]


class TestPayments:
    """Payment recording and confirmation tests"""
    
    def test_record_payment(self, api_client, deal_won_rfq_id):
        """POST /api/rfqs/{rfq_id}/payments - buyer records payment"""
        payload = {
            "amount": 177000,
            "payment_method": "NEFT",
            "reference_number": "UTR123456789",
            "milestone": "advance",
            "file_ids": [],
            "payer_glid": "3",
            "payer_type": "buyer"
        }
        response = api_client.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/payments", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "payment_id" in data
        assert data["status"] == "pending"
        return data["payment_id"]

    def test_list_payments(self, api_client, deal_won_rfq_id):
        """GET /api/rfqs/{rfq_id}/payments - list all payments"""
        response = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/payments")
        assert response.status_code == 200
        data = response.json()
        assert "payments" in data
        assert len(data["payments"]) >= 1
        return data["payments"][0]["payment_id"]

    def test_confirm_payment(self, api_client, deal_won_rfq_id):
        """POST /api/rfqs/{rfq_id}/payments/{payment_id}/confirm - seller confirms"""
        # Get payment ID
        list_resp = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/payments")
        payments = list_resp.json()["payments"]
        pending_payments = [p for p in payments if p["status"] == "pending"]
        
        if pending_payments:
            payment_id = pending_payments[0]["payment_id"]
            response = api_client.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/payments/{payment_id}/confirm")
            assert response.status_code == 200
            
            # Verify payment status changed
            list_resp2 = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/payments")
            payment = [p for p in list_resp2.json()["payments"] if p["payment_id"] == payment_id][0]
            assert payment["status"] == "confirmed"

    def test_record_second_payment_and_confirm(self, api_client, deal_won_rfq_id):
        """Record second payment to complete full payment"""
        # Record second payment
        payload = {
            "amount": 177000,
            "payment_method": "RTGS",
            "reference_number": "UTR987654321",
            "milestone": "on_delivery",
            "file_ids": [],
            "payer_glid": "3",
            "payer_type": "buyer"
        }
        response = api_client.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/payments", json=payload)
        assert response.status_code == 200
        payment_id = response.json()["payment_id"]
        
        # Confirm it
        confirm_resp = api_client.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/payments/{payment_id}/confirm")
        assert confirm_resp.status_code == 200
        
        # Verify RFQ stage updated (should be PAYMENT_RECEIVED after full payment)
        rfq_resp = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}")
        # Stage should progress to PAYMENT_RECEIVED after all payments confirmed
        assert rfq_resp.json()["stage"] in ["PAYMENT_PARTIAL", "PAYMENT_RECEIVED", "PAYMENT_PENDING"]


class TestShipments:
    """Shipment creation and tracking tests"""
    
    def test_add_shipment(self, api_client, deal_won_rfq_id):
        """POST /api/rfqs/{rfq_id}/shipments - seller adds shipment"""
        payload = {
            "lr_number": "LR12345",
            "tracking_number": "TRK001",
            "carrier": "Delhivery",
            "quantity_shipped": 50,
            "eway_bill": "EWB123456",
            "notes": "First shipment"
        }
        response = api_client.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/shipments", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "shipment_id" in data
        
        # Verify RFQ stage updated
        rfq_resp = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}")
        # Could be DISPATCHED or IN_TRANSIT (if tracking number provided)
        assert rfq_resp.json()["stage"] in ["DISPATCHED", "IN_TRANSIT"]

    def test_list_shipments(self, api_client, deal_won_rfq_id):
        """GET /api/rfqs/{rfq_id}/shipments - list all shipments"""
        response = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/shipments")
        assert response.status_code == 200
        data = response.json()
        assert "shipments" in data
        assert len(data["shipments"]) >= 1
        shipment = data["shipments"][0]
        assert shipment["quantity_shipped"] == 50
        assert shipment["carrier"] == "Delhivery"


class TestDelivery:
    """Delivery confirmation tests"""
    
    def test_record_delivery(self, api_client, deal_won_rfq_id):
        """POST /api/rfqs/{rfq_id}/delivery - buyer confirms delivery"""
        payload = {
            "delivery_status": "full",
            "quality_status": "ok",
            "notes": "All items received in good condition",
            "photo_file_ids": [],
            "quantity_received": 100
        }
        response = api_client.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/delivery", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "delivery_id" in data
        
        # Verify RFQ stage updated
        rfq_resp = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}")
        assert rfq_resp.json()["stage"] == "DELIVERED"

    def test_list_deliveries(self, api_client, deal_won_rfq_id):
        """GET /api/rfqs/{rfq_id}/delivery - list delivery records"""
        response = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/delivery")
        assert response.status_code == 200
        data = response.json()
        assert "deliveries" in data
        assert len(data["deliveries"]) >= 1


class TestComplaints:
    """Complaint raising and resolution tests"""
    
    def test_raise_complaint(self, api_client, deal_won_rfq_id):
        """POST /api/rfqs/{rfq_id}/complaints - raise complaint"""
        payload = {
            "category": "Quality Issue",
            "description": "Found some minor quality issues",
            "complainant_glid": "3",
            "complainant_type": "buyer",
            "file_ids": []
        }
        response = api_client.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/complaints", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert "complaint_id" in data
        return data["complaint_id"]

    def test_list_complaints(self, api_client, deal_won_rfq_id):
        """GET /api/rfqs/{rfq_id}/complaints - list complaints"""
        response = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/complaints")
        assert response.status_code == 200
        data = response.json()
        assert "complaints" in data
        assert len(data["complaints"]) >= 1
        return data["complaints"][0]["complaint_id"]

    def test_resolve_complaint(self, api_client, deal_won_rfq_id):
        """POST /api/rfqs/{rfq_id}/complaints/{id}/resolve - resolve complaint"""
        # Get complaint ID
        list_resp = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/complaints")
        complaints = list_resp.json()["complaints"]
        open_complaints = [c for c in complaints if c["status"] == "open"]
        
        if open_complaints:
            complaint_id = open_complaints[0]["complaint_id"]
            response = api_client.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/complaints/{complaint_id}/resolve")
            assert response.status_code == 200
            
            # Verify complaint status changed
            list_resp2 = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/complaints")
            complaint = [c for c in list_resp2.json()["complaints"] if c["complaint_id"] == complaint_id][0]
            assert complaint["status"] == "resolved"


class TestReview:
    """Review and order closure tests"""
    
    def test_submit_review(self, api_client, deal_won_rfq_id):
        """POST /api/rfqs/{rfq_id}/review - buyer submits review, order closes"""
        payload = {
            "rating": 5,
            "comment": "Excellent service and quality!",
            "reviewer_glid": "3"
        }
        response = api_client.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/review", json=payload)
        assert response.status_code == 200
        
        # Verify RFQ stage is now CLOSED
        rfq_resp = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}")
        assert rfq_resp.json()["stage"] == "CLOSED"

    def test_get_review(self, api_client, deal_won_rfq_id):
        """GET /api/rfqs/{rfq_id}/review - get review"""
        response = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/review")
        assert response.status_code == 200
        data = response.json()
        assert data["review"] is not None
        assert data["review"]["rating"] == 5
        assert data["review"]["reviewer_glid"] == "3"

    def test_duplicate_review_fails(self, api_client, deal_won_rfq_id):
        """Submitting duplicate review should fail"""
        payload = {
            "rating": 4,
            "comment": "Another review",
            "reviewer_glid": "3"
        }
        response = api_client.post(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/review", json=payload)
        assert response.status_code == 400  # Should fail


class TestTrustScore:
    """Trust score calculation tests"""
    
    def test_get_trust_score(self, api_client, deal_won_rfq_id):
        """GET /api/sellers/{glid}/trust-score - trust score calculation"""
        response = api_client.get(f"{BASE_URL}/api/sellers/3.1/trust-score")
        assert response.status_code == 200
        data = response.json()
        assert "glid" in data
        assert "avg_rating" in data
        assert "trust_score" in data
        assert data["glid"] == "3.1"


class TestFileUpload:
    """File upload and list tests"""
    
    def test_list_files_empty(self, api_client, deal_won_rfq_id):
        """GET /api/rfqs/{rfq_id}/files - list files for RFQ"""
        response = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/files")
        assert response.status_code == 200
        data = response.json()
        assert "files" in data

    def test_upload_file(self, api_client, deal_won_rfq_id):
        """POST /api/upload - file upload"""
        # Create a small test file
        files = {
            "file": ("test.txt", b"Test file content", "text/plain")
        }
        data = {
            "rfq_id": deal_won_rfq_id,
            "uploaded_by_glid": "3",
            "uploaded_by_type": "buyer"
        }
        # Use form-data
        response = requests.post(
            f"{BASE_URL}/api/upload",
            files=files,
            data=data
        )
        assert response.status_code == 200
        result = response.json()
        assert "file_id" in result
        assert result["filename"] == "test.txt"

    def test_list_files_after_upload(self, api_client, deal_won_rfq_id):
        """Verify file appears in list after upload"""
        response = api_client.get(f"{BASE_URL}/api/rfqs/{deal_won_rfq_id}/files")
        assert response.status_code == 200
        data = response.json()
        assert "files" in data
        assert len(data["files"]) >= 1


class TestProformaRejectFlow:
    """Test proforma rejection flow - creates new RFQ for this test"""
    
    def test_reject_proforma_flow(self, api_client):
        """Test that rejecting proforma returns stage to NEGOTIATION"""
        # Reset database first
        api_client.post(f"{BASE_URL}/api/reset")
        
        # Get DEAL_WON RFQ
        rfqs_resp = api_client.get(f"{BASE_URL}/api/buyer/3/rfqs")
        deal_won_rfqs = [r for r in rfqs_resp.json()["rfqs"] if r["stage"] == "DEAL_WON"]
        rfq_id = deal_won_rfqs[0]["rfq_id"]
        
        # Send proforma
        proforma_payload = {
            "amount": 250000,
            "tax_amount": 45000,
            "total_amount": 295000,
            "payment_terms": "100% advance",
            "line_items": [],
            "notes": "",
            "file_ids": []
        }
        send_resp = api_client.post(f"{BASE_URL}/api/rfqs/{rfq_id}/proforma", json=proforma_payload)
        assert send_resp.status_code == 200
        
        # Reject proforma
        reject_resp = api_client.post(f"{BASE_URL}/api/rfqs/{rfq_id}/proforma/reject")
        assert reject_resp.status_code == 200
        
        # Verify stage went back to NEGOTIATION
        rfq_resp = api_client.get(f"{BASE_URL}/api/rfqs/{rfq_id}")
        assert rfq_resp.json()["stage"] == "NEGOTIATION"


class TestComplaintBlocksProgress:
    """Test that active complaints block stage progression"""
    
    def test_complaint_blocks_stage(self, api_client):
        """Test that active complaint blocks API calls that progress stage"""
        # Reset database first
        api_client.post(f"{BASE_URL}/api/reset")
        
        # Get DEAL_WON RFQ
        rfqs_resp = api_client.get(f"{BASE_URL}/api/buyer/3/rfqs")
        deal_won_rfqs = [r for r in rfqs_resp.json()["rfqs"] if r["stage"] == "DEAL_WON"]
        rfq_id = deal_won_rfqs[0]["rfq_id"]
        
        # Raise a complaint
        complaint_payload = {
            "category": "Payment Dispute",
            "description": "Payment issue",
            "complainant_glid": "3",
            "complainant_type": "buyer",
            "file_ids": []
        }
        api_client.post(f"{BASE_URL}/api/rfqs/{rfq_id}/complaints", json=complaint_payload)
        
        # Try to send proforma - should fail with 400
        proforma_payload = {
            "amount": 300000,
            "tax_amount": 54000,
            "total_amount": 354000,
            "payment_terms": "50% advance",
            "line_items": [],
            "notes": "",
            "file_ids": []
        }
        proforma_resp = api_client.post(f"{BASE_URL}/api/rfqs/{rfq_id}/proforma", json=proforma_payload)
        assert proforma_resp.status_code == 400
        assert "complaint" in proforma_resp.json()["detail"].lower()


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
