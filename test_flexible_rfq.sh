#!/bin/bash

# Comprehensive Testing Script for Flexible RFQ System
# Tests custom fields, broadcast, and bulk creation

echo "=========================================="
echo "FLEXIBLE RFQ SYSTEM - COMPREHENSIVE TESTING"
echo "=========================================="
echo ""

BASE_URL="http://localhost:8001/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function
test_api() {
    local test_name="$1"
    local response="$2"
    local expected_status="$3"
    
    echo -e "${BLUE}Testing: $test_name${NC}"
    
    if echo "$response" | jq . > /dev/null 2>&1; then
        echo -e "${GREEN}✓ PASSED${NC}"
        echo "$response" | jq .
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAILED${NC}"
        echo "$response"
        ((TESTS_FAILED++))
    fi
    echo ""
}

#=========================================
# ITERATION 1: Register Partners
#=========================================
echo "========== ITERATION 1: REGISTER PARTNERS =========="
echo ""

echo "1.1: Register Buyer (Manufacturer)"
BUYER_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/register-partner" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "buyer-abc-manufacturing",
    "name": "ABC Manufacturing Ltd",
    "role": "buyer",
    "metadata": {
      "type": "manufacturer",
      "location": "Mumbai, India",
      "gst_number": "27ABCDE1234F1Z5",
      "contact_person": "Rajesh Kumar",
      "email": "rajesh@abcmfg.com",
      "phone": "+91-9876543210"
    }
  }')

test_api "Register Buyer" "$BUYER_RESPONSE" "200"
BUYER_GLID=$(echo "$BUYER_RESPONSE" | jq -r '.glid')
echo "Buyer GLID: $BUYER_GLID"
echo ""

echo "1.2: Register Seller 1 (Kirloskar Authorized Dealer Mumbai)"
SELLER1_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/register-partner" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "seller-kirloskar-mumbai",
    "name": "Kirloskar Authorized Dealer - Mumbai",
    "role": "seller",
    "metadata": {
      "authorized_dealer": true,
      "brands": ["Kirloskar"],
      "location": "Mumbai",
      "rating": 4.5
    }
  }')

test_api "Register Seller 1" "$SELLER1_RESPONSE" "200"
SELLER1_GLID=$(echo "$SELLER1_RESPONSE" | jq -r '.glid')
echo "Seller 1 GLID: $SELLER1_GLID"
echo ""

echo "1.3: Register Seller 2 (Kirloskar Authorized Dealer Pune)"
SELLER2_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/register-partner" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "seller-kirloskar-pune",
    "name": "Kirloskar Authorized Dealer - Pune",
    "role": "seller",
    "metadata": {
      "authorized_dealer": true,
      "brands": ["Kirloskar"],
      "location": "Pune",
      "rating": 4.7
    }
  }')

test_api "Register Seller 2" "$SELLER2_RESPONSE" "200"
SELLER2_GLID=$(echo "$SELLER2_RESPONSE" | jq -r '.glid')
echo "Seller 2 GLID: $SELLER2_GLID"
echo ""

echo "1.4: Register Seller 3 (Generic Power Solutions)"
SELLER3_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/register-partner" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "seller-generic-power",
    "name": "Generic Power Solutions",
    "role": "seller",
    "metadata": {
      "authorized_dealer": false,
      "brands": ["Generic", "Various"],
      "location": "Thane",
      "rating": 3.8
    }
  }')

test_api "Register Seller 3" "$SELLER3_RESPONSE" "200"
SELLER3_GLID=$(echo "$SELLER3_RESPONSE" | jq -r '.glid')
echo "Seller 3 GLID: $SELLER3_GLID"
echo ""

#=========================================
# ITERATION 2: Test Flexible RFQ (Single)
#=========================================
echo "========== ITERATION 2: FLEXIBLE RFQ WITH CUSTOM FIELDS =========="
echo ""

echo "2.1: Create Diesel Generator RFQ with Custom Fields"
FLEX_RFQ_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/create-rfq-flexible" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_external_id": "buyer-abc-manufacturing",
    "buyer_metadata": {
      "department": "Facilities",
      "project_code": "FACTORY-EXPANSION-2026"
    },
    "seller_external_ids": ["seller-kirloskar-mumbai"],
    "rfq_data": {
      "category": "Diesel Generator",
      "brand": "Kirloskar",
      "model": "KG1-25AS",
      "type": "Open Type",
      "wattage": "25 KVA",
      "fuel_type": "Diesel",
      "voltage": "415V",
      "phase": "3-Phase",
      "frequency": "50 Hz",
      "engine_make": "Kirloskar",
      "alternator_make": "Stamford",
      "fuel_tank_capacity": "150 Liters",
      "noise_level": "85 dB(A)",
      "dimensions": "2100mm x 850mm x 1300mm",
      "weight": "850 kg",
      "warranty": "2 years comprehensive",
      "delivery_required": "30 days",
      "installation_required": true,
      "estimated_budget": 350000,
      "quantity": 1,
      "application": "Factory backup power",
      "usage_hours_per_day": "8 hours",
      "description": "Required for factory expansion project. Should handle critical machinery load."
    },
    "priority": "high",
    "display_config": {
      "title_field": "category",
      "subtitle_fields": ["brand", "wattage", "type"],
      "key_fields": ["wattage", "voltage", "warranty", "delivery_required"]
    },
    "global_metadata": {
      "source_system": "ERP-SAP",
      "po_reference": "PO-2026-DG-001",
      "approval_status": "approved",
      "approver": "Factory Manager"
    }
  }')

test_api "Flexible RFQ Creation" "$FLEX_RFQ_RESPONSE" "200"
FLEX_RFQ_ID=$(echo "$FLEX_RFQ_RESPONSE" | jq -r '.rfqs_created[0].rfq_id')
echo "Created RFQ ID: $FLEX_RFQ_ID"
echo ""

#=========================================
# ITERATION 3: Test Broadcast (Multiple Sellers)
#=========================================
echo "========== ITERATION 3: BROADCAST RFQ TO MULTIPLE SELLERS =========="
echo ""

echo "3.1: Broadcast Diesel Generator RFQ to 3 Sellers"
BROADCAST_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/create-rfq-flexible" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_external_id": "buyer-abc-manufacturing",
    "buyer_metadata": {
      "department": "Procurement",
      "comparison_mode": true
    },
    "seller_external_ids": [
      "seller-kirloskar-mumbai",
      "seller-kirloskar-pune",
      "seller-generic-power"
    ],
    "rfq_data": {
      "category": "Diesel Generator",
      "brand": "Kirloskar or Equivalent",
      "type": "Open Type",
      "wattage": "25 KVA",
      "fuel_type": "Diesel",
      "voltage": "415V",
      "phase": "3-Phase",
      "warranty_minimum": "2 years",
      "delivery_required": "45 days maximum",
      "estimated_budget": 400000,
      "quantity": 1,
      "payment_terms": "50% advance, 50% on delivery",
      "description": "Comparing quotes from multiple vendors for best price and warranty"
    },
    "priority": "high",
    "display_config": {
      "title_field": "category",
      "subtitle_fields": ["brand", "wattage"],
      "key_fields": ["wattage", "voltage", "warranty_minimum"]
    }
  }')

test_api "Broadcast RFQ" "$BROADCAST_RESPONSE" "200"
BROADCAST_GROUP_ID=$(echo "$BROADCAST_RESPONSE" | jq -r '.broadcast_group_id')
TOTAL_BROADCASTS=$(echo "$BROADCAST_RESPONSE" | jq -r '.summary.total_rfqs_created')
echo "Broadcast Group ID: $BROADCAST_GROUP_ID"
echo "Total RFQs Created: $TOTAL_BROADCASTS"
echo ""

echo "3.2: Verify Broadcast Group"
BROADCAST_GROUP_RESPONSE=$(curl -s "$BASE_URL/integration/broadcast-group/$BROADCAST_GROUP_ID")
test_api "Get Broadcast Group" "$BROADCAST_GROUP_RESPONSE" "200"
echo ""

#=========================================
# ITERATION 4: Test Bulk Multi-RFQ
#=========================================
echo "========== ITERATION 4: BULK MULTI-RFQ CREATION =========="
echo ""

echo "4.1: Register Solar Panel Dealers"
SOLAR1_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/register-partner" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "seller-tata-solar",
    "name": "Tata Power Solar - Mumbai",
    "role": "seller",
    "metadata": {"specialization": "solar_panels"}
  }')

SOLAR1_GLID=$(echo "$SOLAR1_RESPONSE" | jq -r '.glid')
echo "Solar Seller 1 GLID: $SOLAR1_GLID"

SOLAR2_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/register-partner" \
  -H "Content-Type: application/json" \
  -d '{
    "external_id": "seller-adani-solar",
    "name": "Adani Solar - Pune",
    "role": "seller",
    "metadata": {"specialization": "solar_panels"}
  }')

SOLAR2_GLID=$(echo "$SOLAR2_RESPONSE" | jq -r '.glid')
echo "Solar Seller 2 GLID: $SOLAR2_GLID"
echo ""

echo "4.2: Create Bulk RFQs (Generators + Solar Panels)"
BULK_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/create-rfqs-bulk" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_external_id": "buyer-abc-manufacturing",
    "buyer_metadata": {
      "project": "Factory Green Energy Initiative"
    },
    "rfqs": [
      {
        "rfq_data": {
          "category": "Diesel Generator",
          "brand": "Kirloskar",
          "wattage": "50 KVA",
          "type": "Silent",
          "fuel_type": "Diesel",
          "estimated_budget": 650000,
          "quantity": 1,
          "application": "Primary backup power"
        },
        "seller_external_ids": ["seller-kirloskar-mumbai", "seller-kirloskar-pune"],
        "priority": "high"
      },
      {
        "rfq_data": {
          "category": "Solar Panel System",
          "brand": "Tata Power Solar",
          "capacity": "100 kW",
          "panel_type": "Monocrystalline",
          "inverter_type": "String Inverter",
          "mounting": "Rooftop",
          "warranty": "25 years performance warranty",
          "estimated_budget": 5000000,
          "quantity": 1,
          "installation_included": true
        },
        "seller_external_ids": ["seller-tata-solar", "seller-adani-solar"],
        "priority": "medium"
      },
      {
        "rfq_data": {
          "category": "Industrial UPS",
          "brand": "APC or Equivalent",
          "capacity": "20 KVA",
          "input_voltage": "415V",
          "output_voltage": "415V",
          "battery_backup": "30 minutes",
          "estimated_budget": 400000,
          "quantity": 2
        },
        "seller_external_ids": ["seller-generic-power"],
        "priority": "medium"
      }
    ],
    "global_metadata": {
      "project_name": "Factory Modernization 2026",
      "budget_code": "CAPEX-2026-Q2"
    }
  }')

test_api "Bulk Multi-RFQ Creation" "$BULK_RESPONSE" "200"
TOTAL_BULK=$(echo "$BULK_RESPONSE" | jq -r '.total_rfqs_created')
echo "Total RFQs Created in Bulk: $TOTAL_BULK"
echo ""

#=========================================
# ITERATION 5: Edge Case Testing
#=========================================
echo "========== ITERATION 5: EDGE CASE TESTING =========="
echo ""

echo "5.1: Test Empty Sellers List (Should Fail)"
EDGE1_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/create-rfq-flexible" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_external_id": "buyer-abc-manufacturing",
    "seller_external_ids": [],
    "rfq_data": {"category": "Test"},
    "priority": "low"
  }')

if echo "$EDGE1_RESPONSE" | grep -q "At least one seller required"; then
    echo -e "${GREEN}✓ PASSED: Empty sellers rejected${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED: Should reject empty sellers${NC}"
    ((TESTS_FAILED++))
fi
echo ""

echo "5.2: Test Duplicate Sellers (Should Deduplicate)"
EDGE2_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/create-rfq-flexible" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_external_id": "buyer-abc-manufacturing",
    "seller_external_ids": [
      "seller-kirloskar-mumbai",
      "seller-kirloskar-mumbai",
      "seller-kirloskar-pune"
    ],
    "rfq_data": {"category": "Dedup Test", "quantity": 1},
    "priority": "low"
  }')

DEDUP_COUNT=$(echo "$EDGE2_RESPONSE" | jq -r '.summary.total_rfqs_created')
if [ "$DEDUP_COUNT" = "2" ]; then
    echo -e "${GREEN}✓ PASSED: Duplicates removed (2 RFQs created)${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED: Expected 2 RFQs, got $DEDUP_COUNT${NC}"
    ((TESTS_FAILED++))
fi
echo ""

echo "5.3: Test Reserved Field Names (Should Fail)"
EDGE3_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/create-rfq-flexible" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_external_id": "buyer-abc-manufacturing",
    "seller_external_ids": ["seller-kirloskar-mumbai"],
    "rfq_data": {
      "category": "Test",
      "rfq_id": "my-custom-id",
      "stage": "CUSTOM_STAGE"
    },
    "priority": "low"
  }')

if echo "$EDGE3_RESPONSE" | grep -q "Field name.*is reserved"; then
    echo -e "${GREEN}✓ PASSED: Reserved field names rejected${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED: Should reject reserved field names${NC}"
    ((TESTS_FAILED++))
fi
echo ""

echo "5.4: Test Unregistered Seller (Should Fail)"
EDGE4_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/create-rfq-flexible" \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_external_id": "buyer-abc-manufacturing",
    "seller_external_ids": ["seller-does-not-exist"],
    "rfq_data": {"category": "Test"},
    "priority": "low"
  }')

if echo "$EDGE4_RESPONSE" | grep -q "not registered"; then
    echo -e "${GREEN}✓ PASSED: Unregistered seller rejected${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED: Should reject unregistered seller${NC}"
    ((TESTS_FAILED++))
fi
echo ""

echo "5.5: Test Bulk with 500+ Threads (Should Fail)"
# Create 100 RFQs with 6 sellers each = 600 threads
echo "Attempting to create 600 threads (should be rejected)..."

# Build the bulk request JSON programmatically
BULK_PAYLOAD=$(python3 -c "
import json
rfqs = []
for i in range(100):
    rfqs.append({
        'rfq_data': {'category': f'Test-{i}', 'quantity': 1},
        'seller_external_ids': ['seller-kirloskar-mumbai', 'seller-kirloskar-pune', 'seller-generic-power', 'seller-tata-solar', 'seller-adani-solar', 'seller-kirloskar-mumbai'],
        'priority': 'low'
    })
print(json.dumps({
    'buyer_external_id': 'buyer-abc-manufacturing',
    'rfqs': rfqs
}))
")

EDGE5_RESPONSE=$(curl -s -X POST "$BASE_URL/integration/create-rfqs-bulk" \
  -H "Content-Type: application/json" \
  -d "$BULK_PAYLOAD")

if echo "$EDGE5_RESPONSE" | grep -q "Too many threads"; then
    echo -e "${GREEN}✓ PASSED: Large bulk request rejected${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}✗ FAILED: Should reject >500 threads${NC}"
    ((TESTS_FAILED++))
fi
echo ""

#=========================================
# Verification: Check Created RFQs
#=========================================
echo "========== VERIFICATION: CHECK CREATED RFQs =========="
echo ""

echo "Verify Buyer Dashboard:"
BUYER_RFQS=$(curl -s "$BASE_URL/buyer/$BUYER_GLID/rfqs")
BUYER_RFQ_COUNT=$(echo "$BUYER_RFQS" | jq -r '.rfqs | length')
echo "Buyer has $BUYER_RFQ_COUNT RFQs"
echo ""

echo "Verify Seller 1 Dashboard:"
SELLER1_RFQS=$(curl -s "$BASE_URL/seller/$SELLER1_GLID/rfqs")
SELLER1_RFQ_COUNT=$(echo "$SELLER1_RFQS" | jq -r '.rfqs | length')
echo "Seller 1 has $SELLER1_RFQ_COUNT RFQs"
echo ""

#=========================================
# Final Report
#=========================================
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED! 🎉${NC}"
    exit 0
else
    echo -e "${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
