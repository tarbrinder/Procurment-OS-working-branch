import requests
import sys
from datetime import datetime
import json

class GLIDProcurementTester:
    def __init__(self, base_url="https://lead-manager-glid.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_rfq_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, params=None):
        """Run a single API test"""
        url = f"{self.api_base}/{endpoint}" if not endpoint.startswith('http') else endpoint
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 200:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_glid_endpoints(self):
        """Test GLID-related endpoints"""
        print("\n" + "="*50)
        print("TESTING GLID ENDPOINTS")
        print("="*50)
        
        # Test GET /api/glids
        success, response = self.run_test(
            "Get All GLIDs",
            "GET",
            "glids",
            200
        )
        
        if success and 'glids' in response:
            glids = response['glids']
            print(f"   Found {len(glids)} GLIDs")
            
            # Test individual GLID info
            if len(glids) > 0:
                test_glid = glids[0]['glid']
                self.run_test(
                    f"Get GLID Info for {test_glid}",
                    "GET",
                    f"glids/{test_glid}",
                    200
                )
                
            # Verify we have buyer and seller GLIDs
            buyers = [g for g in glids if g['type'] == 'buyer']
            sellers = [g for g in glids if g['type'] == 'seller']
            print(f"   Buyers: {len(buyers)}, Sellers: {len(sellers)}")
            
            return buyers, sellers
        else:
            return [], []

    def test_buyer_dashboard(self, buyers):
        """Test buyer dashboard endpoints"""
        print("\n" + "="*50)
        print("TESTING BUYER DASHBOARD ENDPOINTS")
        print("="*50)
        
        if not buyers:
            print("❌ No buyer GLIDs available for testing")
            return
            
        buyer_glid = buyers[0]['glid']
        
        # Test buyer dashboard
        self.run_test(
            f"Get Buyer Dashboard for GLID {buyer_glid}",
            "GET",
            f"buyer/{buyer_glid}/dashboard",
            200
        )
        
        # Test buyer RFQs
        success, response = self.run_test(
            f"Get Buyer RFQs for GLID {buyer_glid}",
            "GET",
            f"buyer/{buyer_glid}/rfqs",
            200
        )
        
        # Test buyer RFQs with filters
        self.run_test(
            f"Get Buyer RFQs with stage filter",
            "GET",
            f"buyer/{buyer_glid}/rfqs",
            200,
            params={"stage": "RFQ_SENT"}
        )
        
        # Test buyer RFQs with search
        self.run_test(
            f"Get Buyer RFQs with search",
            "GET",
            f"buyer/{buyer_glid}/rfqs",
            200,
            params={"search": "Steel"}
        )
        
        # Test CSV export
        self.run_test(
            f"Export Buyer CSV for GLID {buyer_glid}",
            "GET",
            f"buyer/{buyer_glid}/export",
            200
        )

    def test_seller_dashboard(self, sellers):
        """Test seller dashboard endpoints"""
        print("\n" + "="*50)
        print("TESTING SELLER DASHBOARD ENDPOINTS") 
        print("="*50)
        
        if not sellers:
            print("❌ No seller GLIDs available for testing")
            return
            
        seller_glid = sellers[0]['glid']
        
        # Test seller dashboard
        self.run_test(
            f"Get Seller Dashboard for GLID {seller_glid}",
            "GET",
            f"seller/{seller_glid}/dashboard",
            200
        )
        
        # Test seller RFQs
        success, response = self.run_test(
            f"Get Seller RFQs for GLID {seller_glid}",
            "GET",
            f"seller/{seller_glid}/rfqs",
            200
        )
        
        # Test CSV export
        self.run_test(
            f"Export Seller CSV for GLID {seller_glid}",
            "GET",
            f"seller/{seller_glid}/export",
            200
        )

    def test_rfq_crud(self, buyers, sellers):
        """Test RFQ creation and management"""
        print("\n" + "="*50)
        print("TESTING RFQ CRUD OPERATIONS")
        print("="*50)
        
        if not buyers or not sellers:
            print("❌ Need both buyers and sellers for RFQ testing")
            return
            
        buyer_glid = buyers[0]['glid']
        seller_glid = sellers[0]['glid']
        
        # Test create RFQ
        rfq_data = {
            "buyer_glid": buyer_glid,
            "seller_glid": seller_glid,
            "product": "Test Product API",
            "quantity": 100,
            "budget": 50000,
            "description": "Test RFQ from API test",
            "priority": "high"
        }
        
        success, response = self.run_test(
            "Create New RFQ",
            "POST",
            "rfqs",
            200,
            data=rfq_data
        )
        
        if success and 'rfq_id' in response:
            self.test_rfq_id = response['rfq_id']
            print(f"   Created RFQ ID: {self.test_rfq_id}")
            
            # Test get RFQ by ID
            self.run_test(
                f"Get RFQ by ID",
                "GET",
                f"rfqs/{self.test_rfq_id}",
                200
            )
            
            return True
        else:
            print("❌ Failed to create RFQ for further testing")
            return False

    def test_rfq_actions(self):
        """Test RFQ actions and workflow"""
        print("\n" + "="*50)
        print("TESTING RFQ ACTIONS & WORKFLOW")
        print("="*50)
        
        if not self.test_rfq_id:
            print("❌ No test RFQ available for actions testing")
            return
            
        # Test send quote action
        quote_action = {
            "action": "send_quote",
            "actor_glid": "1.1",
            "actor_type": "seller",
            "content": "Sending quote for test product",
            "metadata": {"amount": 45000}
        }
        
        self.run_test(
            "Send Quote Action",
            "POST",
            f"rfqs/{self.test_rfq_id}/actions",
            200,
            data=quote_action
        )
        
        # Test counter offer action
        counter_action = {
            "action": "counter_offer",
            "actor_glid": "1",
            "actor_type": "buyer",
            "content": "Counter offer for test product",
            "metadata": {"amount": 42000}
        }
        
        self.run_test(
            "Counter Offer Action",
            "POST",
            f"rfqs/{self.test_rfq_id}/actions",
            200,
            data=counter_action
        )

    def test_messages(self):
        """Test messaging functionality"""
        print("\n" + "="*50)
        print("TESTING MESSAGING FUNCTIONALITY")
        print("="*50)
        
        if not self.test_rfq_id:
            print("❌ No test RFQ available for messaging testing")
            return
            
        # Test get messages
        self.run_test(
            "Get RFQ Messages",
            "GET",
            f"rfqs/{self.test_rfq_id}/messages",
            200
        )
        
        # Test send message
        message_data = {
            "sender_glid": "1",
            "sender_type": "buyer", 
            "content": "Test message from API test",
            "message_type": "text",
            "metadata": {}
        }
        
        self.run_test(
            "Send Message",
            "POST",
            f"rfqs/{self.test_rfq_id}/messages",
            200,
            data=message_data
        )

    def test_activity_log(self):
        """Test activity log functionality"""
        print("\n" + "="*50)
        print("TESTING ACTIVITY LOG")
        print("="*50)
        
        if not self.test_rfq_id:
            print("❌ No test RFQ available for activity log testing")
            return
            
        # Test get activity log
        self.run_test(
            "Get Activity Log",
            "GET",
            f"rfqs/{self.test_rfq_id}/activity",
            200
        )

    def test_root_endpoint(self):
        """Test root API endpoint"""
        print("\n" + "="*50)
        print("TESTING ROOT ENDPOINT")
        print("="*50)
        
        self.run_test(
            "API Root",
            "GET",
            "",
            200
        )

def main():
    print("🚀 Starting GLID Procurement Lead Manager API Tests")
    print(f"⏰ Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Initialize tester
    tester = GLIDProcurementTester()
    
    # Test root endpoint
    tester.test_root_endpoint()
    
    # Test GLID endpoints
    buyers, sellers = tester.test_glid_endpoints()
    
    # Test dashboard endpoints
    tester.test_buyer_dashboard(buyers)
    tester.test_seller_dashboard(sellers)
    
    # Test RFQ CRUD
    rfq_created = tester.test_rfq_crud(buyers, sellers)
    
    if rfq_created:
        # Test RFQ actions
        tester.test_rfq_actions()
        
        # Test messaging
        tester.test_messages()
        
        # Test activity log
        tester.test_activity_log()
    
    # Print final results
    print("\n" + "="*60)
    print("🏁 TEST RESULTS SUMMARY")
    print("="*60)
    print(f"📊 Tests passed: {tester.tests_passed}/{tester.tests_run}")
    print(f"✅ Success rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests PASSED!")
        return 0
    else:
        failed = tester.tests_run - tester.tests_passed
        print(f"⚠️  {failed} tests FAILED")
        return 1

if __name__ == "__main__":
    sys.exit(main())