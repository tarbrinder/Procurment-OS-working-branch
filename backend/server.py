from fastapi import FastAPI, APIRouter, HTTPException, File, UploadFile, Form
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import csv
import io
import base64
import httpx
import jwt
import hashlib
import secrets
from fastapi.responses import StreamingResponse, Response

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

# Integration secret — used to sign/verify tokens
INTEGRATION_SECRET = os.environ.get("INTEGRATION_SECRET", secrets.token_hex(32))
logger = logging.getLogger("uvicorn")

PROBABILITY_MAP = {
    "RFQ_SENT": 40, "SELLER_VERIFIED": 50, "QUOTE_RECEIVED": 60, "NEGOTIATION": 75, "MEETING_SCHEDULED": 85,
    "DEAL_WON": 100, "PO_GENERATED": 100, "PROFORMA_SENT": 100, "PROFORMA_ACCEPTED": 100,
    "PAYMENT_PENDING": 100, "PAYMENT_PARTIAL": 100, "PAYMENT_RECEIVED": 100,
    "DISPATCHED": 100, "IN_TRANSIT": 100, "DELIVERED": 100,
    "REVIEW_SUBMITTED": 100, "CLOSED": 100, "DEAL_LOST": 0,
}

FULFILLMENT_PROGRESS = {
    "DEAL_WON": 5, "PO_GENERATED": 10, "PROFORMA_SENT": 20, "PROFORMA_ACCEPTED": 30,
    "PAYMENT_PENDING": 40, "PAYMENT_PARTIAL": 50, "PAYMENT_RECEIVED": 60,
    "DISPATCHED": 70, "IN_TRANSIT": 80, "DELIVERED": 90,
    "REVIEW_SUBMITTED": 95, "CLOSED": 100,
}

POST_DEAL_STAGES = [
    "DEAL_WON", "PO_GENERATED", "PROFORMA_SENT", "PROFORMA_ACCEPTED", "PAYMENT_PENDING",
    "PAYMENT_PARTIAL", "PAYMENT_RECEIVED", "DISPATCHED", "IN_TRANSIT",
    "DELIVERED", "REVIEW_SUBMITTED", "CLOSED",
]

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


# ============= MODELS =============
class CreateRFQRequest(BaseModel):
    buyer_glid: str
    seller_glid: str
    product: str
    quantity: int
    budget: float
    description: str = ""
    priority: str = "medium"


class RFQActionRequest(BaseModel):
    action: str
    actor_glid: str
    actor_type: str
    content: str = ""
    metadata: Dict[str, Any] = {}


class SendMessageRequest(BaseModel):
    sender_glid: str
    sender_type: str
    content: str
    message_type: str = "text"
    metadata: Dict[str, Any] = {}


class InitiateCallRequest(BaseModel):
    caller_glid: str
    caller_type: str


class VerifySellerRequest(BaseModel):
    verified_by_glid: str
    note: str = "Seller verified via video KYC"


class ProformaRequest(BaseModel):
    amount: float
    tax_amount: float = 0
    total_amount: float
    payment_terms: str = ""
    line_items: List[Dict[str, Any]] = []
    notes: str = ""
    file_ids: List[str] = []


class PaymentRecordRequest(BaseModel):
    amount: float
    payment_method: str = ""
    reference_number: str = ""
    milestone: str = "advance"
    file_ids: List[str] = []
    payer_glid: str
    payer_type: str


class ShipmentCreateRequest(BaseModel):
    lr_number: str = ""
    tracking_number: str = ""
    carrier: str = ""
    quantity_shipped: int = 0
    eway_bill: str = ""
    notes: str = ""


class DeliveryRecordRequest(BaseModel):
    delivery_status: str
    quality_status: str
    notes: str = ""
    photo_file_ids: List[str] = []
    quantity_received: int = 0


class ComplaintCreateRequest(BaseModel):
    category: str
    description: str
    complainant_glid: str
    complainant_type: str
    file_ids: List[str] = []


class ReviewCreateRequest(BaseModel):
    rating: int
    comment: str
    reviewer_glid: str


# ============= INTEGRATION MODELS =============
class RegisterPartnerRequest(BaseModel):
    external_id: str
    name: str
    role: str  # "buyer" or "seller"
    metadata: Dict[str, Any] = {}


class IntegrationCreateRFQRequest(BaseModel):
    buyer_external_id: str
    seller_external_id: str
    product: str
    quantity: int
    budget: float
    description: str = ""
    priority: str = "medium"
    metadata: Dict[str, Any] = {}


# ============= NEW: FLEXIBLE RFQ MODELS =============
class FlexibleRFQRequest(BaseModel):
    buyer_external_id: str
    buyer_metadata: Dict[str, Any] = {}
    seller_external_ids: List[str]  # Multiple sellers for broadcast
    rfq_data: Dict[str, Any]  # Flexible key-value pairs
    priority: str = "medium"
    display_config: Dict[str, Any] = {}  # UI hints
    global_metadata: Dict[str, Any] = {}


class BulkRFQItem(BaseModel):
    rfq_data: Dict[str, Any]
    seller_external_ids: List[str]
    priority: str = "medium"
    metadata: Dict[str, Any] = {}


class BulkRFQRequest(BaseModel):
    buyer_external_id: str
    buyer_metadata: Dict[str, Any] = {}
    rfqs: List[BulkRFQItem]
    global_metadata: Dict[str, Any] = {}


class GenerateTokenRequest(BaseModel):
    external_id: str
    expires_minutes: int = 60


class RegisterWebhookRequest(BaseModel):
    url: str
    events: List[str] = ["stage_change", "message", "payment", "delivery"]
    secret: str = ""


# ============= SEED DATA =============
SEED_GLIDS = [
    {"glid": "1", "type": "buyer", "name": "Tata Industries", "connections": ["1.1", "1.2", "1.3", "1.4"]},
    {"glid": "2", "type": "buyer", "name": "Reliance Procurement", "connections": ["2.1", "2.2"]},
    {"glid": "3", "type": "buyer", "name": "Adani Infra", "connections": ["3.1", "3.2", "3.3"]},
    {"glid": "1.1", "type": "seller", "name": "Steel Solutions Ltd", "connections": ["1", "2", "3"]},
    {"glid": "1.2", "type": "seller", "name": "MetalWorks Corp", "connections": ["1"]},
    {"glid": "1.3", "type": "seller", "name": "PipeMax Industries", "connections": ["1"]},
    {"glid": "1.4", "type": "seller", "name": "AlloyTech Global", "connections": ["1"]},
    {"glid": "2.1", "type": "seller", "name": "ChemSupply Partners", "connections": ["2"]},
    {"glid": "2.2", "type": "seller", "name": "RawMat Traders", "connections": ["2"]},
    {"glid": "3.1", "type": "seller", "name": "ConcretePro Builders", "connections": ["3"]},
    {"glid": "3.2", "type": "seller", "name": "WoodCraft Supplies", "connections": ["3"]},
    {"glid": "3.3", "type": "seller", "name": "GlassTech Solutions", "connections": ["3"]},
]


def generate_seed_rfqs():
    return [
        {
            "rfq_id": str(uuid.uuid4()),
            "buyer_glid": "1",
            "seller_glid": "1.1",
            "product": "Stainless Steel Pipes",
            "quantity": 5000,
            "budget": 250000,
            "description": "High-grade SS 304 pipes for industrial use",
            "stage": "NEGOTIATION",
            "probability_score": 75,
            "priority": "high",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
            "last_updated": (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat(),
        },
        {
            "rfq_id": str(uuid.uuid4()),
            "buyer_glid": "1",
            "seller_glid": "1.2",
            "product": "Copper Sheets",
            "quantity": 2000,
            "budget": 180000,
            "description": "Electrolytic copper sheets, 2mm thickness",
            "stage": "RFQ_SENT",
            "probability_score": 40,
            "priority": "medium",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "last_updated": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
        },
        {
            "rfq_id": str(uuid.uuid4()),
            "buyer_glid": "1",
            "seller_glid": "1.3",
            "product": "PVC Fittings",
            "quantity": 10000,
            "budget": 75000,
            "description": "Standard PVC fittings for plumbing",
            "stage": "QUOTE_RECEIVED",
            "probability_score": 60,
            "priority": "low",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=8)).isoformat(),
            "last_updated": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        },
        {
            "rfq_id": str(uuid.uuid4()),
            "buyer_glid": "2",
            "seller_glid": "2.1",
            "product": "Chemical Solvents",
            "quantity": 500,
            "budget": 120000,
            "description": "Industrial grade chemical solvents",
            "stage": "MEETING_SCHEDULED",
            "probability_score": 85,
            "priority": "high",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
            "last_updated": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(),
        },
        {
            "rfq_id": str(uuid.uuid4()),
            "buyer_glid": "2",
            "seller_glid": "1.1",
            "product": "Carbon Steel Rods",
            "quantity": 3000,
            "budget": 200000,
            "description": "EN8 carbon steel rods for construction",
            "stage": "RFQ_SENT",
            "probability_score": 40,
            "priority": "medium",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "last_updated": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
        },
        {
            "rfq_id": str(uuid.uuid4()),
            "buyer_glid": "3",
            "seller_glid": "3.1",
            "product": "Ready-Mix Concrete",
            "quantity": 100,
            "budget": 350000,
            "description": "M30 grade ready-mix concrete",
            "stage": "DEAL_WON",
            "probability_score": 100,
            "priority": "high",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=15)).isoformat(),
            "last_updated": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
        },
        {
            "rfq_id": str(uuid.uuid4()),
            "buyer_glid": "3",
            "seller_glid": "3.2",
            "product": "Teak Wood Panels",
            "quantity": 800,
            "budget": 90000,
            "description": "Premium teak wood panels for interior",
            "stage": "DEAL_LOST",
            "probability_score": 0,
            "priority": "low",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(),
            "last_updated": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat(),
        },
        {
            "rfq_id": str(uuid.uuid4()),
            "buyer_glid": "1",
            "seller_glid": "1.4",
            "product": "Aluminum Alloy Ingots",
            "quantity": 1500,
            "budget": 300000,
            "description": "6061-T6 aluminum alloy ingots",
            "stage": "NEGOTIATION",
            "probability_score": 75,
            "priority": "high",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat(),
            "last_updated": (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat(),
        },
        {
            "rfq_id": str(uuid.uuid4()),
            "buyer_glid": "3",
            "seller_glid": "3.3",
            "product": "Tempered Glass Panels",
            "quantity": 600,
            "budget": 210000,
            "description": "12mm tempered glass panels for facade",
            "stage": "QUOTE_RECEIVED",
            "probability_score": 60,
            "priority": "medium",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=4)).isoformat(),
            "last_updated": (datetime.now(timezone.utc) - timedelta(hours=18)).isoformat(),
        },
    ]


# ============= STARTUP =============
@app.on_event("startup")
async def seed_database():
    count = await db.glid_network.count_documents({})
    if count == 0:
        logger.info("Seeding database with mock data...")
        await db.glid_network.insert_many(SEED_GLIDS)

        seed_rfqs = generate_seed_rfqs()
        await db.rfqs.insert_many(seed_rfqs)

        sample_messages = []
        activity_logs = []
        for rfq in seed_rfqs:
            activity_logs.append({
                "log_id": str(uuid.uuid4()),
                "rfq_id": rfq["rfq_id"],
                "action": "RFQ_CREATED",
                "actor_glid": rfq["buyer_glid"],
                "actor_type": "buyer",
                "details": f"Created RFQ for {rfq['product']}",
                "created_at": rfq["created_at"],
            })
            sample_messages.append({
                "message_id": str(uuid.uuid4()),
                "rfq_id": rfq["rfq_id"],
                "sender_glid": rfq["buyer_glid"],
                "sender_type": "buyer",
                "content": f"New RFQ: {rfq['product']} | Qty: {rfq['quantity']}",
                "message_type": "system",
                "metadata": {},
                "created_at": rfq["created_at"],
            })
            if rfq["stage"] in ["QUOTE_RECEIVED", "NEGOTIATION", "MEETING_SCHEDULED", "DEAL_WON", "DEAL_LOST"]:
                sample_messages.append({
                    "message_id": str(uuid.uuid4()),
                    "rfq_id": rfq["rfq_id"],
                    "sender_glid": rfq["seller_glid"],
                    "sender_type": "seller",
                    "content": f"Quote for {rfq['product']}: INR {int(rfq['budget'] * 0.95):,}",
                    "message_type": "quote",
                    "metadata": {"quoted_amount": rfq["budget"] * 0.95},
                    "created_at": (datetime.fromisoformat(rfq["created_at"]) + timedelta(hours=12)).isoformat(),
                })
                activity_logs.append({
                    "log_id": str(uuid.uuid4()),
                    "rfq_id": rfq["rfq_id"],
                    "action": "QUOTE_SENT",
                    "actor_glid": rfq["seller_glid"],
                    "actor_type": "seller",
                    "details": f"Sent quote for {rfq['product']}",
                    "created_at": (datetime.fromisoformat(rfq["created_at"]) + timedelta(hours=12)).isoformat(),
                })
            if rfq["stage"] in ["NEGOTIATION", "MEETING_SCHEDULED"]:
                sample_messages.append({
                    "message_id": str(uuid.uuid4()),
                    "rfq_id": rfq["rfq_id"],
                    "sender_glid": rfq["buyer_glid"],
                    "sender_type": "buyer",
                    "content": f"Can we discuss pricing further for {rfq['product']}?",
                    "message_type": "text",
                    "metadata": {},
                    "created_at": (datetime.fromisoformat(rfq["created_at"]) + timedelta(days=1)).isoformat(),
                })

        await db.messages.insert_many(sample_messages)
        await db.activity_logs.insert_many(activity_logs)
        logger.info("Database seeded successfully.")


# ============= GLID ENDPOINTS =============
@api_router.get("/glids")
async def get_all_glids():
    glids = await db.glid_network.find({}, {"_id": 0}).to_list(100)
    return {"glids": glids}


@api_router.get("/glids/{glid}")
async def get_glid_info(glid: str):
    node = await db.glid_network.find_one({"glid": glid}, {"_id": 0})
    if not node:
        raise HTTPException(status_code=404, detail="GLID not found")
    return node


# ============= RFQ ENDPOINTS =============
@api_router.post("/rfqs")
async def create_rfq(req: CreateRFQRequest):
    rfq_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    rfq = {
        "rfq_id": rfq_id,
        "buyer_glid": req.buyer_glid,
        "seller_glid": req.seller_glid,
        "product": req.product,
        "quantity": req.quantity,
        "budget": req.budget,
        "description": req.description,
        "stage": "RFQ_SENT",
        "probability_score": PROBABILITY_MAP["RFQ_SENT"],
        "priority": req.priority,
        "created_at": now,
        "last_updated": now,
    }
    await db.rfqs.insert_one(rfq)
    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()),
        "rfq_id": rfq_id,
        "action": "RFQ_CREATED",
        "actor_glid": req.buyer_glid,
        "actor_type": "buyer",
        "details": f"Created RFQ for {req.product}",
        "created_at": now,
    })
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()),
        "rfq_id": rfq_id,
        "sender_glid": req.buyer_glid,
        "sender_type": "buyer",
        "content": f"New RFQ: {req.product} | Qty: {req.quantity} | Budget: INR {req.budget:,.0f}",
        "message_type": "system",
        "metadata": {},
        "created_at": now,
    })
    rfq.pop("_id", None)
    return rfq


@api_router.get("/rfqs/{rfq_id}")
async def get_rfq(rfq_id: str):
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return rfq


@api_router.get("/buyer/{glid}/rfqs")
async def get_buyer_rfqs(glid: str, stage: Optional[str] = None, search: Optional[str] = None):
    query = {"buyer_glid": glid}
    if stage:
        query["stage"] = stage
    if search:
        query["product"] = {"$regex": search, "$options": "i"}
    rfqs = await db.rfqs.find(query, {"_id": 0}).sort("last_updated", -1).to_list(100)
    return {"rfqs": rfqs}


@api_router.get("/seller/{glid}/rfqs")
async def get_seller_rfqs(glid: str, stage: Optional[str] = None, search: Optional[str] = None):
    query = {"seller_glid": glid}
    if stage:
        query["stage"] = stage
    if search:
        query["product"] = {"$regex": search, "$options": "i"}
    rfqs = await db.rfqs.find(query, {"_id": 0}).sort("last_updated", -1).to_list(100)
    return {"rfqs": rfqs}


# ============= RFQ ACTIONS =============
@api_router.post("/rfqs/{rfq_id}/actions")
async def perform_rfq_action(rfq_id: str, req: RFQActionRequest):
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    now = datetime.now(timezone.utc).isoformat()
    new_stage = rfq["stage"]
    message_type = "text"
    action_detail = req.content

    if req.action == "send_quote":
        new_stage = "QUOTE_RECEIVED"
        message_type = "quote"
        action_detail = f"Sent quote: INR {req.metadata.get('amount', 0):,.0f}"
    elif req.action == "counter_offer":
        new_stage = "NEGOTIATION"
        message_type = "counter_offer"
        action_detail = f"Counter offer: INR {req.metadata.get('amount', 0):,.0f}"
    elif req.action == "accept_quote":
        new_stage = "DEAL_WON"
        message_type = "system"
        action_detail = "Quote accepted. Deal Won!"
    elif req.action == "reject_quote":
        new_stage = "DEAL_LOST"
        message_type = "system"
        action_detail = "Quote rejected. Deal Lost."
    elif req.action == "schedule_meeting":
        new_stage = "MEETING_SCHEDULED"
        message_type = "system"
        action_detail = f"Meeting scheduled: {req.metadata.get('date', 'TBD')}"
    elif req.action == "generate_po":
        new_stage = "PO_GENERATED"
        message_type = "system"
        action_detail = f"Purchase Order generated. PO Number: {req.metadata.get('po_number', 'PO-' + rfq_id[:8].upper())}"
    elif req.action == "close_deal_won":
        new_stage = "DEAL_WON"
        message_type = "system"
        action_detail = "Deal marked as Won."
    elif req.action == "close_deal_lost":
        new_stage = "DEAL_LOST"
        message_type = "system"
        action_detail = "Deal marked as Lost."
    elif req.action == "upload_quote":
        new_stage = "QUOTE_RECEIVED"
        message_type = "system"
        action_detail = f"Quote document uploaded: {req.metadata.get('filename', 'quote.pdf')}"
    elif req.action == "ask_question":
        message_type = "text"
        action_detail = req.content
    elif req.action == "send_message":
        message_type = "text"
        action_detail = req.content

    new_probability = PROBABILITY_MAP.get(new_stage, rfq["probability_score"])

    await db.rfqs.update_one(
        {"rfq_id": rfq_id},
        {"$set": {
            "stage": new_stage,
            "probability_score": new_probability,
            "last_updated": now,
        }}
    )

    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()),
        "rfq_id": rfq_id,
        "sender_glid": req.actor_glid,
        "sender_type": req.actor_type,
        "content": req.content or action_detail,
        "message_type": message_type,
        "metadata": req.metadata,
        "created_at": now,
    })

    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()),
        "rfq_id": rfq_id,
        "action": req.action.upper(),
        "actor_glid": req.actor_glid,
        "actor_type": req.actor_type,
        "details": action_detail,
        "created_at": now,
    })

    updated = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    return updated


# ============= MESSAGES =============
@api_router.get("/rfqs/{rfq_id}/messages")
async def get_messages(rfq_id: str):
    messages = await db.messages.find({"rfq_id": rfq_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return {"messages": messages}


@api_router.post("/rfqs/{rfq_id}/messages")
async def send_message(rfq_id: str, req: SendMessageRequest):
    now = datetime.now(timezone.utc).isoformat()
    msg = {
        "message_id": str(uuid.uuid4()),
        "rfq_id": rfq_id,
        "sender_glid": req.sender_glid,
        "sender_type": req.sender_type,
        "content": req.content,
        "message_type": req.message_type,
        "metadata": req.metadata,
        "created_at": now,
    }
    await db.messages.insert_one(msg)
    await db.rfqs.update_one({"rfq_id": rfq_id}, {"$set": {"last_updated": now}})
    msg.pop("_id", None)
    return msg


# ============= ACTIVITY LOG =============
@api_router.get("/rfqs/{rfq_id}/activity")
async def get_activity_log(rfq_id: str):
    logs = await db.activity_logs.find({"rfq_id": rfq_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"logs": logs}


# ============= DASHBOARD KPIs =============
@api_router.get("/buyer/{glid}/dashboard")
async def get_buyer_dashboard(glid: str):
    rfqs = await db.rfqs.find({"buyer_glid": glid}, {"_id": 0}).to_list(100)
    total = len(rfqs)
    post_deal = POST_DEAL_STAGES + ["CLOSED"]
    active = sum(1 for r in rfqs if r["stage"] not in post_deal and r["stage"] != "DEAL_LOST")
    quotes = sum(1 for r in rfqs if r["stage"] == "QUOTE_RECEIVED")
    negotiation = sum(1 for r in rfqs if r["stage"] == "NEGOTIATION")
    won = sum(1 for r in rfqs if r["stage"] in post_deal)
    lost = sum(1 for r in rfqs if r["stage"] == "DEAL_LOST")
    fulfillment = sum(1 for r in rfqs if r["stage"] in post_deal and r["stage"] not in ["DEAL_WON", "CLOSED"])
    stage_dist = {}
    for r in rfqs:
        stage_dist[r["stage"]] = stage_dist.get(r["stage"], 0) + 1
    return {
        "kpis": {
            "total_leads": total,
            "active_rfqs": active,
            "quotes_received": quotes,
            "negotiation_ongoing": negotiation,
            "deals_won": won,
            "deals_lost": lost,
            "in_fulfillment": fulfillment,
        },
        "stage_distribution": [{"stage": k, "count": v} for k, v in stage_dist.items()],
    }


@api_router.get("/seller/{glid}/dashboard")
async def get_seller_dashboard(glid: str):
    rfqs = await db.rfqs.find({"seller_glid": glid}, {"_id": 0}).to_list(100)
    total = len(rfqs)
    pending = sum(1 for r in rfqs if r["stage"] == "RFQ_SENT")
    negotiation = sum(1 for r in rfqs if r["stage"] in ["NEGOTIATION", "QUOTE_RECEIVED", "MEETING_SCHEDULED", "SELLER_VERIFIED"])
    post_deal = POST_DEAL_STAGES + ["CLOSED"]
    closed = sum(1 for r in rfqs if r["stage"] in post_deal or r["stage"] == "DEAL_LOST")
    fulfillment = sum(1 for r in rfqs if r["stage"] in post_deal and r["stage"] not in ["DEAL_WON", "CLOSED"])
    stage_dist = {}
    for r in rfqs:
        stage_dist[r["stage"]] = stage_dist.get(r["stage"], 0) + 1
    return {
        "kpis": {
            "total_incoming": total,
            "pending_response": pending,
            "negotiation_ongoing": negotiation,
            "deals_closed": closed,
            "in_fulfillment": fulfillment,
        },
        "stage_distribution": [{"stage": k, "count": v} for k, v in stage_dist.items()],
    }


# ============= CSV EXPORT =============
@api_router.get("/buyer/{glid}/export")
async def export_buyer_rfqs(glid: str):
    rfqs = await db.rfqs.find({"buyer_glid": glid}, {"_id": 0}).to_list(100)
    output = io.StringIO()
    fieldnames = ["rfq_id", "buyer_glid", "seller_glid", "product", "quantity", "budget", "stage", "probability_score", "priority", "created_at", "last_updated"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for rfq in rfqs:
        writer.writerow({k: rfq.get(k, "") for k in fieldnames})
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=rfqs_buyer_{glid}.csv"}
    )


@api_router.get("/seller/{glid}/export")
async def export_seller_rfqs(glid: str):
    rfqs = await db.rfqs.find({"seller_glid": glid}, {"_id": 0}).to_list(100)
    output = io.StringIO()
    fieldnames = ["rfq_id", "buyer_glid", "seller_glid", "product", "quantity", "budget", "stage", "probability_score", "priority", "created_at", "last_updated"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for rfq in rfqs:
        writer.writerow({k: rfq.get(k, "") for k in fieldnames})
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=rfqs_seller_{glid}.csv"}
    )


# ============= NOTIFICATIONS =============
@api_router.get("/{view_type}/{glid}/notifications")
async def get_notifications(view_type: str, glid: str, since: str = ""):
    """Get recent activity for all RFQs belonging to this GLID since a timestamp."""
    field = "buyer_glid" if view_type == "buyer" else "seller_glid"
    rfqs = await db.rfqs.find({field: glid}, {"_id": 0, "rfq_id": 1, "product": 1}).to_list(100)
    rfq_ids = [r["rfq_id"] for r in rfqs]
    product_map = {r["rfq_id"]: r["product"] for r in rfqs}
    query = {"rfq_id": {"$in": rfq_ids}, "actor_glid": {"$ne": glid}}
    if since:
        query["created_at"] = {"$gt": since}
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("created_at", -1).to_list(20)
    for log in logs:
        log["product"] = product_map.get(log["rfq_id"], "")
    return {"notifications": logs}


# ============= INTEGRATION API =============

def generate_token(external_id: str, role: str, name: str, partner_id: str, expires_minutes: int = 60):
    payload = {
        "external_id": external_id,
        "role": role,
        "name": name,
        "partner_id": partner_id,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=expires_minutes),
    }
    return jwt.encode(payload, INTEGRATION_SECRET, algorithm="HS256")


def verify_token(token: str):
    try:
        return jwt.decode(token, INTEGRATION_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


@api_router.post("/integration/register-partner")
async def register_partner(req: RegisterPartnerRequest):
    if req.role not in ("buyer", "seller"):
        raise HTTPException(status_code=400, detail="Role must be 'buyer' or 'seller'")
    existing = await db.partners.find_one({"external_id": req.external_id}, {"_id": 0})
    if existing:
        await db.partners.update_one({"external_id": req.external_id}, {"$set": {
            "name": req.name, "role": req.role, "metadata": req.metadata,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }})
        return {"message": "Partner updated", "partner_id": existing["partner_id"], "glid": existing["glid"]}
    partner_id = str(uuid.uuid4())
    count = await db.partners.count_documents({"role": req.role})
    glid = str(count + 100) if req.role == "buyer" else f"{count + 100}.1"
    partner = {
        "partner_id": partner_id, "external_id": req.external_id,
        "name": req.name, "role": req.role, "glid": glid,
        "metadata": req.metadata, "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.partners.insert_one(partner)
    await db.glid_network.insert_one({
        "glid": glid, "type": req.role, "name": req.name, "connections": [],
    })
    return {"message": "Partner registered", "partner_id": partner_id, "glid": glid}


@api_router.get("/integration/partners")
async def list_partners():
    partners = await db.partners.find({}, {"_id": 0}).to_list(200)
    return {"partners": partners}


@api_router.post("/integration/generate-token")
async def api_generate_token(req: GenerateTokenRequest):
    partner = await db.partners.find_one({"external_id": req.external_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found. Register first.")
    token = generate_token(
        partner["external_id"], partner["role"], partner["name"],
        partner["partner_id"], req.expires_minutes,
    )
    embed_base = os.environ.get("REACT_APP_BACKEND_URL", "")
    return {
        "token": token,
        "partner": {"external_id": partner["external_id"], "role": partner["role"], "name": partner["name"], "glid": partner["glid"]},
        "embed_url_template": f"{embed_base}/embed?token={token}",
        "expires_minutes": req.expires_minutes,
    }


@api_router.post("/integration/validate-token")
async def validate_token(token: str = ""):
    payload = verify_token(token)
    return {"valid": True, "payload": payload}


@api_router.post("/integration/create-rfq")
async def integration_create_rfq(req: IntegrationCreateRFQRequest):
    buyer = await db.partners.find_one({"external_id": req.buyer_external_id}, {"_id": 0})
    seller = await db.partners.find_one({"external_id": req.seller_external_id}, {"_id": 0})
    if not buyer:
        raise HTTPException(status_code=404, detail=f"Buyer '{req.buyer_external_id}' not registered")
    if not seller:
        raise HTTPException(status_code=404, detail=f"Seller '{req.seller_external_id}' not registered")
    if buyer["role"] != "buyer":
        raise HTTPException(status_code=400, detail=f"'{req.buyer_external_id}' is not a buyer")
    if seller["role"] != "seller":
        raise HTTPException(status_code=400, detail=f"'{req.seller_external_id}' is not a seller")
    # Ensure connections exist
    await db.glid_network.update_one({"glid": buyer["glid"]}, {"$addToSet": {"connections": seller["glid"]}})
    await db.glid_network.update_one({"glid": seller["glid"]}, {"$addToSet": {"connections": buyer["glid"]}})
    now = datetime.now(timezone.utc).isoformat()
    rfq = {
        "rfq_id": str(uuid.uuid4()), "buyer_glid": buyer["glid"], "seller_glid": seller["glid"],
        "product": req.product, "quantity": req.quantity, "budget": req.budget,
        "description": req.description, "stage": "RFQ_SENT", "probability_score": 40,
        "priority": req.priority, "created_at": now, "last_updated": now,
        "buyer_external_id": req.buyer_external_id, "seller_external_id": req.seller_external_id,
        "integration_metadata": req.metadata,
    }
    await db.rfqs.insert_one(rfq)
    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()), "rfq_id": rfq["rfq_id"], "action": "RFQ_CREATED",
        "actor_glid": buyer["glid"], "actor_type": "buyer",
        "details": f"RFQ created for {req.product} via integration API", "created_at": now,
    })
    # Generate tokens for both sides
    buyer_token = generate_token(buyer["external_id"], "buyer", buyer["name"], buyer["partner_id"])
    seller_token = generate_token(seller["external_id"], "seller", seller["name"], seller["partner_id"])
    embed_base = os.environ.get("REACT_APP_BACKEND_URL", "")
    return {
        "rfq_id": rfq["rfq_id"], "stage": "RFQ_SENT",
        "buyer_embed_url": f"{embed_base}/embed/rfq/{rfq['rfq_id']}?token={buyer_token}",
        "seller_embed_url": f"{embed_base}/embed/rfq/{rfq['rfq_id']}?token={seller_token}",
        "buyer_dashboard_url": f"{embed_base}/embed?token={buyer_token}",
        "seller_dashboard_url": f"{embed_base}/embed?token={seller_token}",
    }


@api_router.get("/integration/rfq-status/{rfq_id}")
async def integration_rfq_status(rfq_id: str):
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return {
        "rfq_id": rfq["rfq_id"], "stage": rfq["stage"],
        "product": rfq["product"], "quantity": rfq["quantity"],
        "budget": rfq["budget"], "probability_score": rfq.get("probability_score"),
        "fulfillment_progress": rfq.get("fulfillment_progress", 0),
        "last_updated": rfq.get("last_updated"),
        "buyer_external_id": rfq.get("buyer_external_id"),
        "seller_external_id": rfq.get("seller_external_id"),
    }



# ============= NEW: FLEXIBLE RFQ BROADCAST API =============
@api_router.post("/integration/create-rfq-flexible")
async def create_rfq_flexible(req: FlexibleRFQRequest):
    """
    Create RFQ with flexible schema broadcast to multiple sellers.
    Supports custom key-value pairs in rfq_data.
    """
    # Validate buyer
    buyer = await db.partners.find_one({"external_id": req.buyer_external_id}, {"_id": 0})
    if not buyer:
        raise HTTPException(status_code=404, detail=f"Buyer '{req.buyer_external_id}' not registered")
    if buyer["role"] != "buyer":
        raise HTTPException(status_code=400, detail=f"'{req.buyer_external_id}' is not a buyer")
    
    # Validate all sellers exist
    if not req.seller_external_ids or len(req.seller_external_ids) == 0:
        raise HTTPException(status_code=400, detail="At least one seller required")
    
    # Deduplicate sellers
    seller_ids_unique = list(set(req.seller_external_ids))
    
    sellers = []
    for seller_id in seller_ids_unique:
        seller = await db.partners.find_one({"external_id": seller_id}, {"_id": 0})
        if not seller:
            raise HTTPException(status_code=404, detail=f"Seller '{seller_id}' not registered")
        if seller["role"] != "seller":
            raise HTTPException(status_code=400, detail=f"'{seller_id}' is not a seller")
        sellers.append(seller)
    
    # Check for reserved field names in rfq_data
    reserved_fields = ["rfq_id", "buyer_glid", "seller_glid", "stage", "created_at", "last_updated", 
                       "probability_score", "fulfillment_progress"]
    for field in reserved_fields:
        if field in req.rfq_data:
            raise HTTPException(status_code=400, detail=f"Field name '{field}' is reserved")
    
    # Generate broadcast group ID
    broadcast_group_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Extract display title for backward compatibility
    display_config = req.display_config or {}
    title_field = display_config.get("title_field", "category")
    product_title = req.rfq_data.get(title_field, req.rfq_data.get("product", "Custom RFQ"))
    
    # Extract quantity and budget for backward compatibility
    quantity = req.rfq_data.get("quantity", 1)
    budget = req.rfq_data.get("budget", req.rfq_data.get("estimated_budget", 0))
    
    rfqs_created = []
    rfq_documents = []
    
    # Create RFQ for each seller
    for seller in sellers:
        # Update connections
        await db.glid_network.update_one({"glid": buyer["glid"]}, {"$addToSet": {"connections": seller["glid"]}})
        await db.glid_network.update_one({"glid": seller["glid"]}, {"$addToSet": {"connections": buyer["glid"]}})
        
        rfq_id = str(uuid.uuid4())
        rfq = {
            "rfq_id": rfq_id,
            "buyer_glid": buyer["glid"],
            "seller_glid": seller["glid"],
            
            # Flexible RFQ data (primary)
            "rfq_data": req.rfq_data,
            "display_config": display_config,
            
            # Backward compatibility fields
            "product": product_title,
            "quantity": quantity,
            "budget": budget,
            "description": req.rfq_data.get("description", ""),
            
            # System fields
            "stage": "RFQ_SENT",
            "probability_score": 40,
            "priority": req.priority,
            "created_at": now,
            "last_updated": now,
            
            # Broadcast info
            "broadcast_group_id": broadcast_group_id,
            "is_broadcast": True,
            
            # External IDs
            "buyer_external_id": req.buyer_external_id,
            "seller_external_id": seller["external_id"],
            
            # Metadata
            "buyer_metadata": req.buyer_metadata,
            "integration_metadata": req.global_metadata,
        }
        
        rfq_documents.append(rfq)
        
        # Generate tokens
        buyer_token = generate_token(buyer["external_id"], "buyer", buyer["name"], buyer["partner_id"], 1440)
        seller_token = generate_token(seller["external_id"], "seller", seller["name"], seller["partner_id"], 1440)
        embed_base = os.environ.get("REACT_APP_BACKEND_URL", "")
        
        rfqs_created.append({
            "rfq_id": rfq_id,
            "seller_glid": seller["glid"],
            "seller_external_id": seller["external_id"],
            "seller_name": seller["name"],
            "seller_dashboard_url": f"{embed_base}/embed?token={seller_token}",
            "rfq_workspace_url": f"{embed_base}/embed/rfq/{rfq_id}?token={seller_token}",
        })
    
    # Batch insert RFQs
    if rfq_documents:
        await db.rfqs.insert_many(rfq_documents)
    
    # Create activity logs
    activity_logs = []
    for rfq_doc in rfq_documents:
        activity_logs.append({
            "log_id": str(uuid.uuid4()),
            "rfq_id": rfq_doc["rfq_id"],
            "action": "RFQ_CREATED",
            "actor_glid": buyer["glid"],
            "actor_type": "buyer",
            "details": f"Broadcast RFQ created for {product_title} via flexible API",
            "created_at": now,
        })
    
    if activity_logs:
        await db.activity_logs.insert_many(activity_logs)
    
    # Generate buyer token
    buyer_token = generate_token(buyer["external_id"], "buyer", buyer["name"], buyer["partner_id"], 1440)
    embed_base = os.environ.get("REACT_APP_BACKEND_URL", "")
    
    return {
        "buyer_glid": buyer["glid"],
        "broadcast_group_id": broadcast_group_id,
        "rfqs_created": rfqs_created,
        "buyer_dashboard_url": f"{embed_base}/embed?token={buyer_token}",
        "summary": {
            "total_rfqs_created": len(rfqs_created),
            "broadcast_mode": True,
            "same_rfq_to_all": True,
            "sellers_count": len(sellers),
        }
    }


# ============= NEW: BULK MULTI-RFQ API =============
@api_router.post("/integration/create-rfqs-bulk")
async def create_rfqs_bulk(req: BulkRFQRequest):
    """
    Create multiple RFQs with different specifications to different sellers.
    Each RFQ can go to multiple sellers (broadcast per RFQ).
    """
    # Validate buyer
    buyer = await db.partners.find_one({"external_id": req.buyer_external_id}, {"_id": 0})
    if not buyer:
        raise HTTPException(status_code=404, detail=f"Buyer '{req.buyer_external_id}' not registered")
    if buyer["role"] != "buyer":
        raise HTTPException(status_code=400, detail=f"'{req.buyer_external_id}' is not a buyer")
    
    if not req.rfqs or len(req.rfqs) == 0:
        raise HTTPException(status_code=400, detail="At least one RFQ required")
    
    # Limit to prevent abuse
    total_threads = sum(len(rfq.seller_external_ids) for rfq in req.rfqs)
    if total_threads > 500:
        raise HTTPException(status_code=400, detail=f"Too many threads ({total_threads}). Maximum 500 per request.")
    
    now = datetime.now(timezone.utc).isoformat()
    all_rfqs_created = []
    rfq_documents = []
    activity_logs = []
    
    for rfq_item in req.rfqs:
        if not rfq_item.seller_external_ids or len(rfq_item.seller_external_ids) == 0:
            continue
        
        # Deduplicate sellers
        seller_ids_unique = list(set(rfq_item.seller_external_ids))
        
        # Validate sellers
        sellers = []
        for seller_id in seller_ids_unique:
            seller = await db.partners.find_one({"external_id": seller_id}, {"_id": 0})
            if not seller:
                raise HTTPException(status_code=404, detail=f"Seller '{seller_id}' not registered")
            if seller["role"] != "seller":
                raise HTTPException(status_code=400, detail=f"'{seller_id}' is not a seller")
            sellers.append(seller)
        
        # Generate broadcast group for this RFQ
        broadcast_group_id = str(uuid.uuid4())
        
        # Extract display info
        product_title = rfq_item.rfq_data.get("category", rfq_item.rfq_data.get("product", "Custom RFQ"))
        quantity = rfq_item.rfq_data.get("quantity", 1)
        budget = rfq_item.rfq_data.get("budget", rfq_item.rfq_data.get("estimated_budget", 0))
        
        rfq_category_data = {
            "category": product_title,
            "rfqs": []
        }
        
        # Create RFQ for each seller
        for seller in sellers:
            # Update connections
            await db.glid_network.update_one({"glid": buyer["glid"]}, {"$addToSet": {"connections": seller["glid"]}})
            await db.glid_network.update_one({"glid": seller["glid"]}, {"$addToSet": {"connections": buyer["glid"]}})
            
            rfq_id = str(uuid.uuid4())
            rfq_doc = {
                "rfq_id": rfq_id,
                "buyer_glid": buyer["glid"],
                "seller_glid": seller["glid"],
                
                # Flexible RFQ data
                "rfq_data": rfq_item.rfq_data,
                
                # Backward compatibility
                "product": product_title,
                "quantity": quantity,
                "budget": budget,
                "description": rfq_item.rfq_data.get("description", ""),
                
                # System fields
                "stage": "RFQ_SENT",
                "probability_score": 40,
                "priority": rfq_item.priority,
                "created_at": now,
                "last_updated": now,
                
                # Broadcast info
                "broadcast_group_id": broadcast_group_id,
                "is_broadcast": len(sellers) > 1,
                
                # External IDs
                "buyer_external_id": req.buyer_external_id,
                "seller_external_id": seller["external_id"],
                
                # Metadata
                "buyer_metadata": req.buyer_metadata,
                "integration_metadata": {**req.global_metadata, **rfq_item.metadata},
            }
            
            rfq_documents.append(rfq_doc)
            
            # Generate tokens
            seller_token = generate_token(seller["external_id"], "seller", seller["name"], seller["partner_id"], 1440)
            embed_base = os.environ.get("REACT_APP_BACKEND_URL", "")
            
            rfq_category_data["rfqs"].append({
                "rfq_id": rfq_id,
                "seller_glid": seller["glid"],
                "seller_external_id": seller["external_id"],
                "seller_name": seller["name"],
                "seller_dashboard_url": f"{embed_base}/embed?token={seller_token}",
                "rfq_workspace_url": f"{embed_base}/embed/rfq/{rfq_id}?token={seller_token}",
            })
            
            # Activity log
            activity_logs.append({
                "log_id": str(uuid.uuid4()),
                "rfq_id": rfq_id,
                "action": "RFQ_CREATED",
                "actor_glid": buyer["glid"],
                "actor_type": "buyer",
                "details": f"Bulk RFQ created for {product_title} via flexible API",
                "created_at": now,
            })
        
        all_rfqs_created.append(rfq_category_data)
    
    # Batch insert RFQs
    if rfq_documents:
        await db.rfqs.insert_many(rfq_documents)
    
    # Batch insert activity logs
    if activity_logs:
        await db.activity_logs.insert_many(activity_logs)
    
    # Generate buyer token
    buyer_token = generate_token(buyer["external_id"], "buyer", buyer["name"], buyer["partner_id"], 1440)
    embed_base = os.environ.get("REACT_APP_BACKEND_URL", "")
    
    return {
        "buyer_glid": buyer["glid"],
        "total_rfqs_created": len(rfq_documents),
        "buyer_dashboard_url": f"{embed_base}/embed?token={buyer_token}",
        "rfqs_by_category": all_rfqs_created,
    }


# ============= GET BROADCAST GROUP RFQs =============
@api_router.get("/integration/broadcast-group/{broadcast_group_id}")
async def get_broadcast_group(broadcast_group_id: str):
    """Get all RFQs in a broadcast group (buyer only)."""
    rfqs = await db.rfqs.find({"broadcast_group_id": broadcast_group_id}, {"_id": 0}).to_list(100)
    if not rfqs:
        raise HTTPException(status_code=404, detail="Broadcast group not found")
    
    return {
        "broadcast_group_id": broadcast_group_id,
        "total_rfqs": len(rfqs),
        "rfqs": rfqs
    }


@api_router.post("/integration/webhooks/register")
async def register_webhook(req: RegisterWebhookRequest):
    webhook_id = str(uuid.uuid4())
    await db.webhooks.insert_one({
        "webhook_id": webhook_id, "url": req.url, "events": req.events,
        "secret": req.secret, "active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"webhook_id": webhook_id, "message": "Webhook registered"}


@api_router.get("/integration/webhooks")
async def list_webhooks():
    hooks = await db.webhooks.find({}, {"_id": 0}).to_list(50)
    return {"webhooks": hooks}


@api_router.delete("/integration/webhooks/{webhook_id}")
async def delete_webhook(webhook_id: str):
    """Delete a webhook."""
    result = await db.webhooks.delete_one({"webhook_id": webhook_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Webhook not found")
    return {"message": "Webhook deleted"}


# ============= ADMIN PORTAL ENDPOINTS =============

# Simple admin credentials (for demo - in production use proper auth)
ADMIN_CREDENTIALS = {
    "tarbrinder.singh@indiamart.com": "Tarbrinder22/"
}

@api_router.post("/admin/login")
async def admin_login(email: str, password: str):
    """Admin login endpoint"""
    if email in ADMIN_CREDENTIALS and ADMIN_CREDENTIALS[email] == password:
        # Generate admin token (24 hours)
        admin_token = jwt.encode(
            {
                "email": email,
                "role": "admin",
                "iat": datetime.now(timezone.utc),
                "exp": datetime.now(timezone.utc) + timedelta(hours=24)
            },
            INTEGRATION_SECRET,
            algorithm="HS256"
        )
        return {
            "success": True,
            "token": admin_token,
            "email": email
        }
    else:
        raise HTTPException(status_code=401, detail="Invalid credentials")


@api_router.get("/admin/overview")
async def admin_overview():
    """Get admin dashboard overview statistics"""
    # Total counts
    total_buyers = await db.glid_network.count_documents({"type": "buyer"})
    total_sellers = await db.glid_network.count_documents({"type": "seller"})
    total_rfqs = await db.rfqs.count_documents({})
    total_messages = await db.messages.count_documents({})
    
    # Stage distribution
    pipeline = [
        {"$group": {"_id": "$stage", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    stage_dist = await db.rfqs.aggregate(pipeline).to_list(100)
    stage_distribution = {item["_id"]: item["count"] for item in stage_dist}
    
    # Priority distribution
    priority_pipeline = [
        {"$group": {"_id": "$priority", "count": {"$sum": 1}}}
    ]
    priority_dist = await db.rfqs.aggregate(priority_pipeline).to_list(100)
    priority_distribution = {item["_id"]: item["count"] for item in priority_dist}
    
    # Recent activity (last 24 hours)
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    recent_rfqs = await db.rfqs.count_documents({"created_at": {"$gte": yesterday}})
    recent_messages = await db.messages.count_documents({"created_at": {"$gte": yesterday}})
    
    # Broadcast stats
    broadcast_rfqs = await db.rfqs.count_documents({"is_broadcast": True})
    unique_broadcasts = len(await db.rfqs.distinct("broadcast_group_id", {"is_broadcast": True}))
    
    # Deal conversion
    deal_won = await db.rfqs.count_documents({"stage": "DEAL_WON"})
    deal_lost = await db.rfqs.count_documents({"stage": "DEAL_LOST"})
    in_negotiation = await db.rfqs.count_documents({"stage": "NEGOTIATION"})
    
    # Top buyers by RFQ count
    buyer_pipeline = [
        {"$group": {"_id": "$buyer_glid", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_buyers_data = await db.rfqs.aggregate(buyer_pipeline).to_list(100)
    top_buyers = []
    for item in top_buyers_data:
        glid_info = await db.glid_network.find_one({"glid": item["_id"]}, {"_id": 0})
        top_buyers.append({
            "glid": item["_id"],
            "name": glid_info.get("name", "Unknown") if glid_info else "Unknown",
            "rfq_count": item["count"]
        })
    
    # Top sellers by RFQ count
    seller_pipeline = [
        {"$group": {"_id": "$seller_glid", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5}
    ]
    top_sellers_data = await db.rfqs.aggregate(seller_pipeline).to_list(100)
    top_sellers = []
    for item in top_sellers_data:
        glid_info = await db.glid_network.find_one({"glid": item["_id"]}, {"_id": 0})
        top_sellers.append({
            "glid": item["_id"],
            "name": glid_info.get("name", "Unknown") if glid_info else "Unknown",
            "rfq_count": item["count"]
        })
    
    return {
        "totals": {
            "buyers": total_buyers,
            "sellers": total_sellers,
            "rfqs": total_rfqs,
            "messages": total_messages
        },
        "stage_distribution": stage_distribution,
        "priority_distribution": priority_distribution,
        "recent_activity": {
            "rfqs_24h": recent_rfqs,
            "messages_24h": recent_messages
        },
        "broadcast_stats": {
            "broadcast_rfqs": broadcast_rfqs,
            "unique_broadcast_groups": unique_broadcasts
        },
        "conversion": {
            "deal_won": deal_won,
            "deal_lost": deal_lost,
            "in_negotiation": in_negotiation,
            "win_rate": round((deal_won / (deal_won + deal_lost) * 100), 2) if (deal_won + deal_lost) > 0 else 0
        },
        "top_buyers": top_buyers,
        "top_sellers": top_sellers
    }


@api_router.get("/admin/rfqs")
async def admin_get_all_rfqs(
    stage: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
):
    """Get all RFQs for admin view with filters"""
    query = {}
    
    if stage:
        query["stage"] = stage
    if priority:
        query["priority"] = priority
    if search:
        query["$or"] = [
            {"product": {"$regex": search, "$options": "i"}},
            {"buyer_glid": {"$regex": search, "$options": "i"}},
            {"seller_glid": {"$regex": search, "$options": "i"}},
        ]
    
    rfqs = await db.rfqs.find(query, {"_id": 0}).sort("last_updated", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.rfqs.count_documents(query)
    
    # Enrich with GLID names
    for rfq in rfqs:
        buyer_info = await db.glid_network.find_one({"glid": rfq["buyer_glid"]}, {"_id": 0, "name": 1})
        seller_info = await db.glid_network.find_one({"glid": rfq["seller_glid"]}, {"_id": 0, "name": 1})
        rfq["buyer_name"] = buyer_info.get("name", "Unknown") if buyer_info else "Unknown"
        rfq["seller_name"] = seller_info.get("name", "Unknown") if seller_info else "Unknown"
    
    return {
        "rfqs": rfqs,
        "total": total,
        "page": skip // limit + 1,
        "pages": (total + limit - 1) // limit
    }


@api_router.get("/admin/rfqs/{rfq_id}")
async def admin_get_rfq_detail(rfq_id: str):
    """Get detailed RFQ information for admin including full conversation"""
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    
    # Get messages
    messages = await db.messages.find({"rfq_id": rfq_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    # Get activity logs
    activity_logs = await db.activity_logs.find({"rfq_id": rfq_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    # Get buyer and seller info
    buyer_info = await db.glid_network.find_one({"glid": rfq["buyer_glid"]}, {"_id": 0})
    seller_info = await db.glid_network.find_one({"glid": rfq["seller_glid"]}, {"_id": 0})
    
    # Get files
    files = await db.files.find({"rfq_id": rfq_id}, {"_id": 0, "file_data": 0}).to_list(100)
    
    # Get post-deal info if applicable
    post_deal_info = {}
    if rfq["stage"] in ["DEAL_WON", "PROFORMA_SENT", "PROFORMA_ACCEPTED", "PAYMENT_PENDING", 
                        "PAYMENT_PARTIAL", "PAYMENT_RECEIVED", "DISPATCHED", "IN_TRANSIT", 
                        "DELIVERED", "REVIEW_SUBMITTED", "CLOSED"]:
        proforma = await db.proforma_invoices.find_one({"rfq_id": rfq_id}, {"_id": 0})
        payments = await db.payments.find({"rfq_id": rfq_id}, {"_id": 0}).to_list(100)
        shipments = await db.shipments.find({"rfq_id": rfq_id}, {"_id": 0}).to_list(100)
        delivery = await db.delivery_records.find({"rfq_id": rfq_id}, {"_id": 0}).to_list(100)
        complaints = await db.complaints.find({"rfq_id": rfq_id}, {"_id": 0}).to_list(100)
        review = await db.reviews.find_one({"rfq_id": rfq_id}, {"_id": 0})
        
        post_deal_info = {
            "proforma": proforma,
            "payments": payments,
            "shipments": shipments,
            "delivery": delivery,
            "complaints": complaints,
            "review": review
        }
    
    return {
        "rfq": rfq,
        "buyer_info": buyer_info,
        "seller_info": seller_info,
        "messages": messages,
        "activity_logs": activity_logs,
        "files": files,
        "post_deal_info": post_deal_info,
        "message_count": len(messages),
        "activity_count": len(activity_logs)
    }


@api_router.get("/admin/analytics/timeline")
async def admin_analytics_timeline(days: int = 7):
    """Get timeline analytics for the last N days"""
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    
    # RFQs created per day
    rfq_pipeline = [
        {"$match": {"created_at": {"$gte": cutoff_date}}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 10]},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    rfqs_per_day = await db.rfqs.aggregate(rfq_pipeline).to_list(100)
    
    # Messages per day
    msg_pipeline = [
        {"$match": {"created_at": {"$gte": cutoff_date}}},
        {"$group": {
            "_id": {"$substr": ["$created_at", 0, 10]},
            "count": {"$sum": 1}
        }},
        {"$sort": {"_id": 1}}
    ]
    messages_per_day = await db.messages.aggregate(msg_pipeline).to_list(100)
    
    return {
        "period_days": days,
        "rfqs_per_day": [{"date": item["_id"], "count": item["count"]} for item in rfqs_per_day],
        "messages_per_day": [{"date": item["_id"], "count": item["count"]} for item in messages_per_day]
    }


@api_router.get("/admin/adoption")
async def admin_adoption_metrics():
    """Get adoption and engagement metrics"""
    # Active users (buyers/sellers with recent activity)
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    active_buyers = len(await db.rfqs.distinct("buyer_glid", {"last_updated": {"$gte": week_ago}}))
    active_sellers = len(await db.rfqs.distinct("seller_glid", {"last_updated": {"$gte": week_ago}}))
    
    # Average messages per RFQ
    avg_messages_pipeline = [
        {"$group": {"_id": "$rfq_id", "count": {"$sum": 1}}},
        {"$group": {"_id": None, "avg": {"$avg": "$count"}}}
    ]
    avg_messages_result = await db.messages.aggregate(avg_messages_pipeline).to_list(1)
    avg_messages = round(avg_messages_result[0]["avg"], 2) if avg_messages_result else 0
    
    # Average time to first response (in hours)
    # Simplified: time between RFQ creation and first seller message
    
    # Stages reached distribution
    stages_pipeline = [
        {"$group": {"_id": "$stage", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    stages_reached = await db.rfqs.aggregate(stages_pipeline).to_list(100)
    
    # Video call usage
    total_video_calls = await db.video_calls.count_documents({})
    completed_calls = await db.video_calls.count_documents({"status": "ended"})
    
    return {
        "active_users": {
            "active_buyers_7d": active_buyers,
            "active_sellers_7d": active_sellers,
            "total_active_7d": active_buyers + active_sellers
        },
        "engagement": {
            "avg_messages_per_rfq": avg_messages,
            "total_video_calls": total_video_calls,
            "completed_video_calls": completed_calls,
            "video_call_completion_rate": round((completed_calls / total_video_calls * 100), 2) if total_video_calls > 0 else 0
        },
        "stages_reached": [{"stage": item["_id"], "count": item["count"]} for item in stages_reached]
    }

async def delete_webhook(webhook_id: str):
    await db.webhooks.delete_one({"webhook_id": webhook_id})
    return {"message": "Webhook deleted"}


@api_router.get("/integration/embed-config")
async def embed_config(token: str = ""):
    if not token:
        raise HTTPException(status_code=401, detail="Token required")
    payload = verify_token(token)
    partner = await db.partners.find_one({"external_id": payload["external_id"]}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    return {
        "role": partner["role"], "glid": partner["glid"], "name": partner["name"],
        "external_id": partner["external_id"],
    }


# ============= VIDEO ROOMS =============
@api_router.post("/rfqs/{rfq_id}/video-room")
async def create_or_get_video_room(rfq_id: str):
    """Create or retrieve an existing Daily.co video room for an RFQ."""
    existing = await db.video_rooms.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if existing:
        return existing

    daily_api_key = os.environ.get("DAILY_API_KEY")
    if not daily_api_key:
        raise HTTPException(status_code=500, detail="Daily.co API key not configured")

    room_name = f"rfq-{rfq_id[:8].replace('-', '')}"
    exp_time = int((datetime.now(timezone.utc) + timedelta(hours=24)).timestamp())

    async with httpx.AsyncClient() as http_client:
        response = await http_client.post(
            "https://api.daily.co/v1/rooms",
            json={
                "name": room_name,
                "privacy": "public",
                "properties": {
                    "exp": exp_time,
                    "enable_chat": True,
                    "enable_screenshare": True,
                    "max_participants": 10,
                }
            },
            headers={
                "Authorization": f"Bearer {daily_api_key}",
                "Content-Type": "application/json"
            }
        )

    if response.status_code == 200:
        room_data = response.json()
        video_room = {
            "rfq_id": rfq_id,
            "room_name": room_data.get("name"),
            "room_url": room_data.get("url"),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.video_rooms.insert_one(video_room)
        video_room.pop("_id", None)

        now = datetime.now(timezone.utc).isoformat()
        await db.activity_logs.insert_one({
            "log_id": str(uuid.uuid4()),
            "rfq_id": rfq_id,
            "action": "VIDEO_ROOM_CREATED",
            "actor_glid": "system",
            "actor_type": "system",
            "details": "Video call room created for this RFQ",
            "created_at": now,
        })
        await db.messages.insert_one({
            "message_id": str(uuid.uuid4()),
            "rfq_id": rfq_id,
            "sender_glid": "system",
            "sender_type": "system",
            "content": "Video call room is now available. Both parties can join.",
            "message_type": "system",
            "metadata": {"room_url": room_data.get("url")},
            "created_at": now,
        })

        return video_room
    else:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create video room: {response.text}"
        )


# ============= VIDEO CALL FLOW =============
@api_router.post("/rfqs/{rfq_id}/video-call/initiate")
async def initiate_video_call(rfq_id: str, req: InitiateCallRequest):
    """Buyer initiates a video call — creates room + sets ringing status."""
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    # Cancel any existing ringing calls for this RFQ
    await db.video_calls.update_many(
        {"rfq_id": rfq_id, "status": "ringing"},
        {"$set": {"status": "cancelled"}}
    )

    # Get or create video room
    room_url = None
    existing_room = await db.video_rooms.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if existing_room:
        room_url = existing_room["room_url"]
    else:
        daily_api_key = os.environ.get("DAILY_API_KEY")
        if not daily_api_key:
            raise HTTPException(status_code=500, detail="Daily.co API key not configured")

        room_name = f"rfq-{rfq_id[:8].replace('-', '')}-{str(uuid.uuid4())[:4]}"
        exp_time = int((datetime.now(timezone.utc) + timedelta(hours=24)).timestamp())

        async with httpx.AsyncClient() as http_client:
            response = await http_client.post(
                "https://api.daily.co/v1/rooms",
                json={
                    "name": room_name,
                    "privacy": "public",
                    "properties": {"exp": exp_time, "enable_chat": True, "enable_screenshare": True, "max_participants": 10}
                },
                headers={"Authorization": f"Bearer {daily_api_key}", "Content-Type": "application/json"}
            )
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail=f"Failed to create video room: {response.text}")
        room_data = response.json()
        room_url = room_data.get("url")
        await db.video_rooms.insert_one({
            "rfq_id": rfq_id, "room_name": room_data.get("name"),
            "room_url": room_url, "created_at": datetime.now(timezone.utc).isoformat(),
        })

    receiver_glid = rfq["seller_glid"] if req.caller_type == "buyer" else rfq["buyer_glid"]
    receiver_type = "seller" if req.caller_type == "buyer" else "buyer"
    now = datetime.now(timezone.utc).isoformat()

    call_doc = {
        "call_id": str(uuid.uuid4()),
        "rfq_id": rfq_id,
        "room_url": room_url,
        "caller_glid": req.caller_glid,
        "caller_type": req.caller_type,
        "receiver_glid": receiver_glid,
        "receiver_type": receiver_type,
        "product": rfq.get("product", ""),
        "status": "ringing",
        "created_at": now,
        "ended_at": None,
    }
    await db.video_calls.insert_one(call_doc)
    call_doc.pop("_id", None)

    # Add system message
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": req.caller_glid, "sender_type": req.caller_type,
        "content": f"Video call initiated by GLID {req.caller_glid}",
        "message_type": "system", "metadata": {}, "created_at": now,
    })
    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "action": "VIDEO_CALL_INITIATED", "actor_glid": req.caller_glid,
        "actor_type": req.caller_type,
        "details": f"Video call initiated for {rfq.get('product', '')}",
        "created_at": now,
    })
    return call_doc


@api_router.post("/rfqs/{rfq_id}/video-call/accept")
async def accept_video_call(rfq_id: str):
    """Receiver accepts the call."""
    call = await db.video_calls.find_one({"rfq_id": rfq_id, "status": "ringing"}, {"_id": 0})
    if not call:
        raise HTTPException(status_code=404, detail="No ringing call found")

    now = datetime.now(timezone.utc).isoformat()
    await db.video_calls.update_one(
        {"call_id": call["call_id"]}, {"$set": {"status": "active"}}
    )
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": "system", "sender_type": "system",
        "content": "Video call connected. Both parties joined.",
        "message_type": "system", "metadata": {}, "created_at": now,
    })
    call["status"] = "active"
    return call


@api_router.post("/rfqs/{rfq_id}/video-call/decline")
async def decline_video_call(rfq_id: str):
    """Receiver declines the call."""
    call = await db.video_calls.find_one({"rfq_id": rfq_id, "status": "ringing"}, {"_id": 0})
    if not call:
        raise HTTPException(status_code=404, detail="No ringing call found")

    now = datetime.now(timezone.utc).isoformat()
    await db.video_calls.update_one(
        {"call_id": call["call_id"]}, {"$set": {"status": "declined", "ended_at": now}}
    )
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": call["receiver_glid"], "sender_type": call["receiver_type"],
        "content": "Video call declined.", "message_type": "system", "metadata": {}, "created_at": now,
    })
    call["status"] = "declined"
    return call


@api_router.post("/rfqs/{rfq_id}/video-call/end")
async def end_video_call(rfq_id: str):
    """End an active or ringing call."""
    now = datetime.now(timezone.utc).isoformat()
    result = await db.video_calls.update_many(
        {"rfq_id": rfq_id, "status": {"$in": ["ringing", "active"]}},
        {"$set": {"status": "ended", "ended_at": now}}
    )
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": "system", "sender_type": "system",
        "content": "Video call ended.", "message_type": "system", "metadata": {}, "created_at": now,
    })
    return {"message": "Call ended", "modified": result.modified_count}


@api_router.get("/calls/incoming/{glid}")
async def get_incoming_calls(glid: str):
    """Get all ringing calls for a specific GLID (receiver side)."""
    calls = await db.video_calls.find(
        {"receiver_glid": glid, "status": "ringing"}, {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return {"calls": calls}


@api_router.get("/calls/active/{glid}")
async def get_active_calls(glid: str):
    """Get all active/ringing calls for a GLID (both caller and receiver)."""
    calls = await db.video_calls.find(
        {"$or": [{"caller_glid": glid}, {"receiver_glid": glid}], "status": {"$in": ["ringing", "active"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(20)
    return {"calls": calls}


# ============= SELLER VERIFICATION =============
@api_router.post("/rfqs/{rfq_id}/verify-seller")
async def verify_seller(rfq_id: str, req: VerifySellerRequest):
    """Buyer verifies seller after video KYC."""
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    now = datetime.now(timezone.utc).isoformat()
    verification = {
        "verified": True,
        "verified_by": req.verified_by_glid,
        "verified_at": now,
        "note": req.note,
    }
    # Advance stage to SELLER_VERIFIED if still early in flow
    stage_update = {"seller_verified": verification, "last_updated": now}
    if rfq.get("stage") == "RFQ_SENT":
        stage_update["stage"] = "SELLER_VERIFIED"
        stage_update["probability_score"] = PROBABILITY_MAP["SELLER_VERIFIED"]
    await db.rfqs.update_one(
        {"rfq_id": rfq_id}, {"$set": stage_update}
    )
    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "action": "SELLER_VERIFIED", "actor_glid": req.verified_by_glid,
        "actor_type": "buyer",
        "details": f"Seller verified: {req.note}",
        "created_at": now,
    })
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": req.verified_by_glid, "sender_type": "buyer",
        "content": f"Seller verified: {req.note}",
        "message_type": "system", "metadata": {"verification": verification}, "created_at": now,
    })
    return {"message": "Seller verified", "verification": verification}


# ============= HELPER: AUTO STAGE PROGRESSION =============
async def check_auto_stage(rfq_id: str):
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        return
    active_complaints = await db.complaints.count_documents(
        {"rfq_id": rfq_id, "status": {"$in": ["open", "escalated"]}}
    )
    if active_complaints > 0:
        return
    stage = rfq["stage"]
    new_stage = stage
    now = datetime.now(timezone.utc).isoformat()

    if stage == "PROFORMA_ACCEPTED":
        new_stage = "PAYMENT_PENDING"
    elif stage in ("PAYMENT_PENDING", "PAYMENT_PARTIAL"):
        proforma = await db.proforma_invoices.find_one({"rfq_id": rfq_id, "status": "accepted"}, {"_id": 0})
        if proforma:
            payments = await db.payments.find({"rfq_id": rfq_id, "status": "confirmed"}, {"_id": 0}).to_list(100)
            total_paid = sum(p.get("amount", 0) for p in payments)
            if total_paid >= proforma.get("total_amount", 0):
                new_stage = "PAYMENT_RECEIVED"
            elif total_paid > 0 and stage == "PAYMENT_PENDING":
                new_stage = "PAYMENT_PARTIAL"
    elif stage == "PAYMENT_RECEIVED":
        shipments = await db.shipments.find({"rfq_id": rfq_id}, {"_id": 0}).to_list(100)
        if any(s.get("status") == "dispatched" for s in shipments):
            new_stage = "DISPATCHED"
    elif stage == "DISPATCHED":
        shipments = await db.shipments.find({"rfq_id": rfq_id}, {"_id": 0}).to_list(100)
        if any(s.get("tracking_number") for s in shipments):
            new_stage = "IN_TRANSIT"
    elif stage == "IN_TRANSIT":
        deliveries = await db.delivery_records.find({"rfq_id": rfq_id}, {"_id": 0}).to_list(100)
        if deliveries:
            new_stage = "DELIVERED"
    elif stage == "DELIVERED":
        review = await db.reviews.find_one({"rfq_id": rfq_id}, {"_id": 0})
        if review:
            new_stage = "CLOSED"

    if new_stage != stage:
        progress = FULFILLMENT_PROGRESS.get(new_stage, rfq.get("probability_score", 100))
        await db.rfqs.update_one(
            {"rfq_id": rfq_id},
            {"$set": {"stage": new_stage, "fulfillment_progress": progress, "last_updated": now}}
        )
        await db.activity_logs.insert_one({
            "log_id": str(uuid.uuid4()), "rfq_id": rfq_id,
            "action": f"AUTO_STAGE_{new_stage}", "actor_glid": "system", "actor_type": "system",
            "details": f"Stage auto-progressed to {new_stage}", "created_at": now,
        })


async def check_complaint_block(rfq_id: str):
    count = await db.complaints.count_documents(
        {"rfq_id": rfq_id, "status": {"$in": ["open", "escalated"]}}
    )
    if count > 0:
        raise HTTPException(status_code=400, detail="Active complaint exists. Resolve before progressing.")


# ============= FILE UPLOAD/DOWNLOAD =============
@api_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    rfq_id: str = Form(""),
    uploaded_by_glid: str = Form(""),
    uploaded_by_type: str = Form(""),
):
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit")

    file_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "file_id": file_id,
        "rfq_id": rfq_id,
        "filename": file.filename,
        "content_type": file.content_type or "application/octet-stream",
        "size_bytes": len(content),
        "data": base64.b64encode(content).decode("utf-8"),
        "uploaded_by_glid": uploaded_by_glid,
        "uploaded_by_type": uploaded_by_type,
        "created_at": now,
    }
    await db.files.insert_one(doc)
    return {
        "file_id": file_id, "filename": file.filename,
        "content_type": doc["content_type"], "size_bytes": len(content),
        "download_url": f"/api/files/{file_id}", "created_at": now,
    }


@api_router.get("/files/{file_id}")
async def download_file(file_id: str):
    doc = await db.files.find_one({"file_id": file_id})
    if not doc:
        raise HTTPException(status_code=404, detail="File not found")
    content = base64.b64decode(doc["data"])
    return Response(
        content=content, media_type=doc["content_type"],
        headers={"Content-Disposition": f'inline; filename="{doc["filename"]}"'},
    )


@api_router.get("/rfqs/{rfq_id}/files")
async def list_rfq_files(rfq_id: str):
    files = await db.files.find({"rfq_id": rfq_id}, {"_id": 0, "data": 0}).sort("created_at", -1).to_list(100)
    for f in files:
        f["download_url"] = f"/api/files/{f['file_id']}"
    return {"files": files}


VALID_PROFORMA_STAGES = {"DEAL_WON", "PO_GENERATED", "PROFORMA_SENT", "PROFORMA_ACCEPTED", "NEGOTIATION"}
VALID_PAYMENT_STAGES = {"PAYMENT_PENDING", "PAYMENT_PARTIAL", "PROFORMA_ACCEPTED"}
VALID_SHIPMENT_STAGES = {"PAYMENT_RECEIVED", "DISPATCHED", "PAYMENT_PARTIAL"}
VALID_DELIVERY_STAGES = {"IN_TRANSIT", "DISPATCHED", "DELIVERED"}
VALID_REVIEW_STAGES = {"DELIVERED", "REVIEW_SUBMITTED"}
BLOCKED_STAGES = {"DEAL_LOST", "CLOSED"}


def validate_stage(rfq, valid_stages, action_name):
    if rfq["stage"] in BLOCKED_STAGES:
        raise HTTPException(status_code=400, detail=f"Cannot {action_name} — RFQ is {rfq['stage']}")
    if valid_stages and rfq["stage"] not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Cannot {action_name} at stage {rfq['stage']}")


# ============= PROFORMA INVOICE =============
@api_router.post("/rfqs/{rfq_id}/proforma")
async def send_proforma(rfq_id: str, req: ProformaRequest):
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    validate_stage(rfq, VALID_PROFORMA_STAGES, "send proforma")
    await check_complaint_block(rfq_id)

    now = datetime.now(timezone.utc).isoformat()
    existing = await db.proforma_invoices.find_one({"rfq_id": rfq_id}, {"_id": 0})
    revision = (existing.get("revision", 0) + 1) if existing else 1

    if existing:
        await db.proforma_invoices.update_one(
            {"rfq_id": rfq_id},
            {"$push": {"revision_history": {
                "revision": existing.get("revision", 1), "amount": existing.get("amount"),
                "total_amount": existing.get("total_amount"), "revised_at": now,
            }}}
        )
        await db.proforma_invoices.update_one(
            {"rfq_id": rfq_id},
            {"$set": {
                "amount": req.amount, "tax_amount": req.tax_amount,
                "total_amount": req.total_amount, "payment_terms": req.payment_terms,
                "line_items": req.line_items, "notes": req.notes,
                "file_ids": req.file_ids, "status": "sent", "revision": revision,
                "updated_at": now,
            }}
        )
    else:
        await db.proforma_invoices.insert_one({
            "invoice_id": str(uuid.uuid4()), "rfq_id": rfq_id,
            "amount": req.amount, "tax_amount": req.tax_amount,
            "total_amount": req.total_amount, "payment_terms": req.payment_terms,
            "line_items": req.line_items, "notes": req.notes,
            "file_ids": req.file_ids, "status": "sent", "revision": revision,
            "revision_history": [], "created_at": now, "updated_at": now,
        })

    await db.rfqs.update_one({"rfq_id": rfq_id}, {"$set": {
        "stage": "PROFORMA_SENT", "fulfillment_progress": FULFILLMENT_PROGRESS["PROFORMA_SENT"],
        "last_updated": now,
    }})
    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()), "rfq_id": rfq_id, "action": "PROFORMA_SENT",
        "actor_glid": rfq["seller_glid"], "actor_type": "seller",
        "details": f"Proforma invoice sent (Rev {revision}): INR {req.total_amount:,.0f}",
        "created_at": now,
    })
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": rfq["seller_glid"], "sender_type": "seller",
        "content": f"Proforma Invoice (Rev {revision}): INR {req.total_amount:,.0f}",
        "message_type": "system", "metadata": {"type": "proforma", "total": req.total_amount},
        "created_at": now,
    })
    return {"message": "Proforma sent", "revision": revision}


@api_router.get("/rfqs/{rfq_id}/proforma")
async def get_proforma(rfq_id: str):
    doc = await db.proforma_invoices.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not doc:
        return {"proforma": None}
    for fid in doc.get("file_ids", []):
        pass
    return {"proforma": doc}


@api_router.post("/rfqs/{rfq_id}/proforma/accept")
async def accept_proforma(rfq_id: str):
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    validate_stage(rfq, {"PROFORMA_SENT"}, "accept proforma")
    now = datetime.now(timezone.utc).isoformat()
    result = await db.proforma_invoices.update_one(
        {"rfq_id": rfq_id, "status": "sent"}, {"$set": {"status": "accepted", "updated_at": now}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="No pending proforma found")
    await db.rfqs.update_one({"rfq_id": rfq_id}, {"$set": {
        "stage": "PROFORMA_ACCEPTED", "fulfillment_progress": FULFILLMENT_PROGRESS["PROFORMA_ACCEPTED"],
        "last_updated": now,
    }})
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": "system", "sender_type": "system",
        "content": "Proforma invoice accepted by buyer.", "message_type": "system",
        "metadata": {}, "created_at": now,
    })
    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()), "rfq_id": rfq_id, "action": "PROFORMA_ACCEPTED",
        "actor_glid": "buyer", "actor_type": "buyer",
        "details": "Proforma invoice accepted", "created_at": now,
    })
    await check_auto_stage(rfq_id)
    return {"message": "Proforma accepted"}


@api_router.post("/rfqs/{rfq_id}/proforma/reject")
async def reject_proforma(rfq_id: str):
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    validate_stage(rfq, {"PROFORMA_SENT"}, "reject proforma")
    now = datetime.now(timezone.utc).isoformat()
    result = await db.proforma_invoices.update_one(
        {"rfq_id": rfq_id, "status": "sent"}, {"$set": {"status": "rejected", "updated_at": now}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="No pending proforma found")
    await db.rfqs.update_one({"rfq_id": rfq_id}, {"$set": {
        "stage": "NEGOTIATION", "probability_score": PROBABILITY_MAP["NEGOTIATION"],
        "last_updated": now,
    }})
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": "system", "sender_type": "system",
        "content": "Proforma rejected. Back to negotiation.",
        "message_type": "system", "metadata": {}, "created_at": now,
    })
    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()), "rfq_id": rfq_id, "action": "PROFORMA_REJECTED",
        "actor_glid": "buyer", "actor_type": "buyer",
        "details": "Proforma rejected, back to negotiation", "created_at": now,
    })
    return {"message": "Proforma rejected, back to negotiation"}


# ============= PAYMENTS =============
@api_router.post("/rfqs/{rfq_id}/payments")
async def record_payment(rfq_id: str, req: PaymentRecordRequest):
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    validate_stage(rfq, VALID_PAYMENT_STAGES, "record payment")
    await check_complaint_block(rfq_id)
    now = datetime.now(timezone.utc).isoformat()
    payment_id = str(uuid.uuid4())
    await db.payments.insert_one({
        "payment_id": payment_id, "rfq_id": rfq_id,
        "amount": req.amount, "payment_method": req.payment_method,
        "reference_number": req.reference_number, "milestone": req.milestone,
        "file_ids": req.file_ids, "payer_glid": req.payer_glid,
        "payer_type": req.payer_type, "status": "pending",
        "created_at": now,
    })
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": req.payer_glid, "sender_type": req.payer_type,
        "content": f"Payment recorded: INR {req.amount:,.0f} ({req.milestone})",
        "message_type": "system", "metadata": {"type": "payment", "amount": req.amount},
        "created_at": now,
    })
    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()), "rfq_id": rfq_id, "action": "PAYMENT_RECORDED",
        "actor_glid": req.payer_glid, "actor_type": req.payer_type,
        "details": f"Payment INR {req.amount:,.0f} ({req.milestone}) - Ref: {req.reference_number}",
        "created_at": now,
    })
    return {"payment_id": payment_id, "status": "pending"}


@api_router.get("/rfqs/{rfq_id}/payments")
async def list_payments(rfq_id: str):
    payments = await db.payments.find({"rfq_id": rfq_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"payments": payments}


@api_router.post("/rfqs/{rfq_id}/payments/{payment_id}/confirm")
async def confirm_payment(rfq_id: str, payment_id: str):
    now = datetime.now(timezone.utc).isoformat()
    result = await db.payments.update_one(
        {"payment_id": payment_id, "status": "pending"},
        {"$set": {"status": "confirmed", "confirmed_at": now}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Payment not found or already processed")
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": "system", "sender_type": "system",
        "content": "Payment confirmed by seller.",
        "message_type": "system", "metadata": {}, "created_at": now,
    })
    await check_auto_stage(rfq_id)
    return {"message": "Payment confirmed"}


@api_router.post("/rfqs/{rfq_id}/payments/{payment_id}/reject")
async def reject_payment(rfq_id: str, payment_id: str):
    now = datetime.now(timezone.utc).isoformat()
    await db.payments.update_one(
        {"payment_id": payment_id}, {"$set": {"status": "rejected", "rejected_at": now}}
    )
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": "system", "sender_type": "system",
        "content": "Payment rejected by seller. Please verify and resend.",
        "message_type": "system", "metadata": {}, "created_at": now,
    })
    return {"message": "Payment rejected"}


# ============= SHIPMENTS =============
@api_router.post("/rfqs/{rfq_id}/shipments")
async def add_shipment(rfq_id: str, req: ShipmentCreateRequest):
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    validate_stage(rfq, VALID_SHIPMENT_STAGES, "add shipment")
    await check_complaint_block(rfq_id)
    now = datetime.now(timezone.utc).isoformat()
    shipment_id = str(uuid.uuid4())
    await db.shipments.insert_one({
        "shipment_id": shipment_id, "rfq_id": rfq_id,
        "lr_number": req.lr_number, "tracking_number": req.tracking_number,
        "carrier": req.carrier, "quantity_shipped": req.quantity_shipped,
        "eway_bill": req.eway_bill, "notes": req.notes,
        "status": "dispatched", "created_at": now,
    })
    await db.rfqs.update_one({"rfq_id": rfq_id}, {"$set": {
        "stage": "DISPATCHED", "fulfillment_progress": FULFILLMENT_PROGRESS["DISPATCHED"],
        "last_updated": now,
    }})
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": "system", "sender_type": "system",
        "content": f"Shipment dispatched: {req.quantity_shipped} units | LR: {req.lr_number or 'N/A'} | Tracking: {req.tracking_number or 'Pending'}",
        "message_type": "system", "metadata": {"type": "shipment"}, "created_at": now,
    })
    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()), "rfq_id": rfq_id, "action": "SHIPMENT_DISPATCHED",
        "actor_glid": "seller", "actor_type": "seller",
        "details": f"Shipment: {req.quantity_shipped} units, LR: {req.lr_number}",
        "created_at": now,
    })
    if req.tracking_number:
        await check_auto_stage(rfq_id)
    return {"shipment_id": shipment_id}


@api_router.get("/rfqs/{rfq_id}/shipments")
async def list_shipments(rfq_id: str):
    shipments = await db.shipments.find({"rfq_id": rfq_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"shipments": shipments}


@api_router.put("/rfqs/{rfq_id}/shipments/{shipment_id}/status")
async def update_shipment_status(rfq_id: str, shipment_id: str, tracking_number: str = "", status: str = "in_transit"):
    now = datetime.now(timezone.utc).isoformat()
    update = {"status": status, "updated_at": now}
    if tracking_number:
        update["tracking_number"] = tracking_number
    await db.shipments.update_one({"shipment_id": shipment_id}, {"$set": update})
    await check_auto_stage(rfq_id)
    return {"message": "Shipment updated"}


# ============= DELIVERY =============
@api_router.post("/rfqs/{rfq_id}/delivery")
async def record_delivery(rfq_id: str, req: DeliveryRecordRequest):
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    validate_stage(rfq, VALID_DELIVERY_STAGES, "record delivery")
    now = datetime.now(timezone.utc).isoformat()
    delivery_id = str(uuid.uuid4())
    await db.delivery_records.insert_one({
        "delivery_id": delivery_id, "rfq_id": rfq_id,
        "delivery_status": req.delivery_status, "quality_status": req.quality_status,
        "notes": req.notes, "photo_file_ids": req.photo_file_ids,
        "quantity_received": req.quantity_received, "created_at": now,
    })
    stage = "DELIVERED"
    await db.rfqs.update_one({"rfq_id": rfq_id}, {"$set": {
        "stage": stage, "fulfillment_progress": FULFILLMENT_PROGRESS[stage], "last_updated": now,
    }})
    quality_text = {"ok": "Quality OK", "damaged": "Quality Issue - Damaged", "mixed": "Mixed Quality"}.get(req.quality_status, req.quality_status)
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": "system", "sender_type": "system",
        "content": f"Delivery confirmed: {req.delivery_status.title()} ({req.quantity_received} units) | {quality_text}",
        "message_type": "system", "metadata": {"type": "delivery"}, "created_at": now,
    })
    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()), "rfq_id": rfq_id, "action": "DELIVERY_CONFIRMED",
        "actor_glid": "buyer", "actor_type": "buyer",
        "details": f"Delivery: {req.delivery_status}, Quality: {req.quality_status}, Qty: {req.quantity_received}",
        "created_at": now,
    })
    await check_auto_stage(rfq_id)
    return {"delivery_id": delivery_id}


@api_router.get("/rfqs/{rfq_id}/delivery")
async def list_deliveries(rfq_id: str):
    records = await db.delivery_records.find({"rfq_id": rfq_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"deliveries": records}


# ============= COMPLAINTS =============
@api_router.post("/rfqs/{rfq_id}/complaints")
async def raise_complaint(rfq_id: str, req: ComplaintCreateRequest):
    now = datetime.now(timezone.utc).isoformat()
    complaint_id = str(uuid.uuid4())
    await db.complaints.insert_one({
        "complaint_id": complaint_id, "rfq_id": rfq_id,
        "category": req.category, "description": req.description,
        "complainant_glid": req.complainant_glid, "complainant_type": req.complainant_type,
        "file_ids": req.file_ids, "status": "open",
        "responses": [], "created_at": now,
    })
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": req.complainant_glid, "sender_type": req.complainant_type,
        "content": f"Complaint raised: {req.category} - {req.description}",
        "message_type": "system",
        "metadata": {"type": "complaint", "complaint_id": complaint_id}, "created_at": now,
    })
    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()), "rfq_id": rfq_id, "action": "COMPLAINT_RAISED",
        "actor_glid": req.complainant_glid, "actor_type": req.complainant_type,
        "details": f"Complaint: {req.category} - {req.description}", "created_at": now,
    })
    return {"complaint_id": complaint_id}


@api_router.get("/rfqs/{rfq_id}/complaints")
async def list_complaints(rfq_id: str):
    complaints = await db.complaints.find({"rfq_id": rfq_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"complaints": complaints}


@api_router.post("/rfqs/{rfq_id}/complaints/{complaint_id}/respond")
async def respond_to_complaint(rfq_id: str, complaint_id: str, response: str = "", responder_glid: str = "", responder_type: str = ""):
    now = datetime.now(timezone.utc).isoformat()
    await db.complaints.update_one(
        {"complaint_id": complaint_id},
        {"$push": {"responses": {"response": response, "responder_glid": responder_glid, "responder_type": responder_type, "created_at": now}}}
    )
    return {"message": "Response added"}


@api_router.post("/rfqs/{rfq_id}/complaints/{complaint_id}/resolve")
async def resolve_complaint(rfq_id: str, complaint_id: str):
    now = datetime.now(timezone.utc).isoformat()
    await db.complaints.update_one(
        {"complaint_id": complaint_id}, {"$set": {"status": "resolved", "resolved_at": now}}
    )
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": "system", "sender_type": "system",
        "content": "Complaint resolved.", "message_type": "system",
        "metadata": {}, "created_at": now,
    })
    await check_auto_stage(rfq_id)
    return {"message": "Complaint resolved"}


@api_router.post("/rfqs/{rfq_id}/complaints/{complaint_id}/escalate")
async def escalate_complaint(rfq_id: str, complaint_id: str):
    now = datetime.now(timezone.utc).isoformat()
    await db.complaints.update_one(
        {"complaint_id": complaint_id}, {"$set": {"status": "escalated", "escalated_at": now}}
    )
    return {"message": "Complaint escalated"}


# ============= REVIEWS =============
@api_router.post("/rfqs/{rfq_id}/review")
async def submit_review(rfq_id: str, req: ReviewCreateRequest):
    now = datetime.now(timezone.utc).isoformat()
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    validate_stage(rfq, VALID_REVIEW_STAGES, "submit review")
    existing = await db.reviews.find_one({"rfq_id": rfq_id})
    if existing:
        raise HTTPException(status_code=400, detail="Review already submitted for this RFQ")

    await db.reviews.insert_one({
        "review_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "seller_glid": rfq["seller_glid"], "rating": max(1, min(5, req.rating)),
        "comment": req.comment, "reviewer_glid": req.reviewer_glid,
        "seller_response": None, "created_at": now,
    })
    await db.rfqs.update_one({"rfq_id": rfq_id}, {"$set": {
        "stage": "REVIEW_SUBMITTED", "fulfillment_progress": FULFILLMENT_PROGRESS.get("REVIEW_SUBMITTED", 95), "last_updated": now,
    }})
    await db.messages.insert_one({
        "message_id": str(uuid.uuid4()), "rfq_id": rfq_id,
        "sender_glid": req.reviewer_glid, "sender_type": "buyer",
        "content": f"Review submitted: {'*' * req.rating} ({req.rating}/5) - {req.comment}",
        "message_type": "system", "metadata": {"type": "review", "rating": req.rating},
        "created_at": now,
    })
    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()), "rfq_id": rfq_id, "action": "REVIEW_SUBMITTED",
        "actor_glid": req.reviewer_glid, "actor_type": "buyer",
        "details": f"Rated {req.rating}/5 stars", "created_at": now,
    })
    # Update seller trust score
    seller_glid = rfq["seller_glid"]
    all_reviews = await db.reviews.find({"seller_glid": seller_glid}, {"_id": 0}).to_list(100)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews) if all_reviews else 0
    await db.rfqs.update_one({"rfq_id": rfq_id}, {"$set": {
        "stage": "CLOSED", "fulfillment_progress": 100, "last_updated": now,
        "seller_trust_score": round(avg_rating, 1),
    }})
    await db.activity_logs.insert_one({
        "log_id": str(uuid.uuid4()), "rfq_id": rfq_id, "action": "AUTO_STAGE_CLOSED",
        "actor_glid": "system", "actor_type": "system",
        "details": "Order closed after review submission", "created_at": now,
    })
    return {"message": "Review submitted, order closed"}


@api_router.get("/rfqs/{rfq_id}/review")
async def get_review(rfq_id: str):
    review = await db.reviews.find_one({"rfq_id": rfq_id}, {"_id": 0})
    return {"review": review}


@api_router.post("/rfqs/{rfq_id}/review/respond")
async def respond_to_review(rfq_id: str, response: str = "", responder_glid: str = ""):
    now = datetime.now(timezone.utc).isoformat()
    await db.reviews.update_one(
        {"rfq_id": rfq_id},
        {"$set": {"seller_response": {"response": response, "responder_glid": responder_glid, "created_at": now}}}
    )
    return {"message": "Response added to review"}


@api_router.get("/sellers/{glid}/reviews")
async def get_seller_reviews(glid: str):
    reviews = await db.reviews.find({"seller_glid": glid}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"reviews": reviews}


@api_router.get("/sellers/{glid}/trust-score")
async def get_trust_score(glid: str):
    reviews = await db.reviews.find({"seller_glid": glid}, {"_id": 0}).to_list(100)
    verified_count = await db.rfqs.count_documents({"seller_glid": glid, "seller_verified.verified": True})
    total_reviews = len(reviews)
    avg_rating = (sum(r["rating"] for r in reviews) / total_reviews) if total_reviews > 0 else 0
    complaints = await db.complaints.count_documents({"rfq_id": {"$in": [r.get("rfq_id") for r in reviews]}})
    return {
        "glid": glid, "total_reviews": total_reviews, "avg_rating": round(avg_rating, 1),
        "verified_count": verified_count, "complaint_count": complaints,
        "trust_score": round(min(5.0, avg_rating + (0.5 if verified_count > 0 else 0)), 1),
    }


# ============= RESET =============
@api_router.post("/reset")
async def reset_database():
    await db.glid_network.drop()
    await db.rfqs.drop()
    await db.messages.drop()
    await db.activity_logs.drop()
    await db.video_rooms.drop()
    await db.video_calls.drop()
    await db.files.drop()
    await db.proforma_invoices.drop()
    await db.payments.drop()
    await db.shipments.drop()
    await db.delivery_records.drop()
    await db.complaints.drop()
    await db.reviews.drop()
    await seed_database()
    return {"message": "Database reset to seed state"}


# ============= ROOT =============
@api_router.get("/")
async def root():
    return {"message": "GLID Procurement Lead Manager API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
