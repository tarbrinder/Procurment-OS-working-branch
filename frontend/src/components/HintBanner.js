import { Info, Clock, CheckCircle, AlertCircle, Users, DollarSign, Package, Truck } from "lucide-react";

/**
 * HintBanner - Shows contextual guidance based on RFQ stage and user role
 * Displays next steps, waiting states, and action prompts
 */
export function HintBanner({ rfq, userRole }) {
  if (!rfq) return null;

  const stage = rfq.stage;
  const isBuyer = userRole === "buyer";
  const isSeller = userRole === "seller";

  // Define hints for each stage and role
  const hints = {
    RFQ_SENT: {
      buyer: {
        icon: Clock,
        text: "RFQ sent to seller. Waiting for seller to acknowledge and provide quote.",
        action: null,
        color: "bg-blue-50 border-blue-200 text-blue-800"
      },
      seller: {
        icon: AlertCircle,
        text: "New RFQ received! Review the requirements and submit your best quote.",
        action: "Submit Quote",
        color: "bg-orange-50 border-orange-200 text-orange-800"
      }
    },
    SELLER_VERIFIED: {
      buyer: {
        icon: Clock,
        text: "Seller verified. Waiting for their quotation.",
        action: null,
        color: "bg-blue-50 border-blue-200 text-blue-800"
      },
      seller: {
        icon: AlertCircle,
        text: "You're verified! Please submit your quotation with pricing and terms.",
        action: "Send Quote",
        color: "bg-orange-50 border-orange-200 text-orange-800"
      }
    },
    QUOTE_RECEIVED: {
      buyer: {
        icon: AlertCircle,
        text: "Quote received! Review the pricing and terms. You can accept, negotiate, or schedule a meeting.",
        action: "Review Quote",
        color: "bg-orange-50 border-orange-200 text-orange-800"
      },
      seller: {
        icon: Clock,
        text: "Quote submitted. Waiting for buyer's response.",
        action: null,
        color: "bg-blue-50 border-blue-200 text-blue-800"
      }
    },
    NEGOTIATION: {
      buyer: {
        icon: Users,
        text: "Negotiation in progress. Discuss pricing, terms, and delivery timeline with the seller.",
        action: "Continue Negotiation",
        color: "bg-purple-50 border-purple-200 text-purple-800"
      },
      seller: {
        icon: Users,
        text: "Negotiation phase. Work with buyer to finalize pricing and terms.",
        action: "Negotiate",
        color: "bg-purple-50 border-purple-200 text-purple-800"
      }
    },
    MEETING_SCHEDULED: {
      buyer: {
        icon: Clock,
        text: "Meeting scheduled. Join the call to discuss details and finalize the deal.",
        action: "Join Meeting",
        color: "bg-blue-50 border-blue-200 text-blue-800"
      },
      seller: {
        icon: Clock,
        text: "Meeting scheduled with buyer. Be prepared to discuss your offering in detail.",
        action: "Join Meeting",
        color: "bg-blue-50 border-blue-200 text-blue-800"
      }
    },
    DEAL_WON: {
      buyer: {
        icon: CheckCircle,
        text: "Deal won! Next step: Generate Purchase Order to formalize the agreement.",
        action: "Generate PO",
        color: "bg-green-50 border-green-200 text-green-800"
      },
      seller: {
        icon: CheckCircle,
        text: "Congratulations! Deal won. Waiting for buyer to generate Purchase Order.",
        action: null,
        color: "bg-green-50 border-green-200 text-green-800"
      }
    },
    PO_GENERATED: {
      buyer: {
        icon: Clock,
        text: "Purchase Order generated. Waiting for seller to send proforma invoice.",
        action: null,
        color: "bg-blue-50 border-blue-200 text-blue-800"
      },
      seller: {
        icon: AlertCircle,
        text: "PO received from buyer. Send your proforma invoice with final pricing and terms.",
        action: "Send Proforma",
        color: "bg-orange-50 border-orange-200 text-orange-800"
      }
    },
    PROFORMA_SENT: {
      buyer: {
        icon: AlertCircle,
        text: "Proforma invoice received. Review and accept to proceed with payment.",
        action: "Review & Accept",
        color: "bg-orange-50 border-orange-200 text-orange-800"
      },
      seller: {
        icon: Clock,
        text: "Proforma sent to buyer. Waiting for their acceptance.",
        action: null,
        color: "bg-blue-50 border-blue-200 text-blue-800"
      }
    },
    PROFORMA_ACCEPTED: {
      buyer: {
        icon: DollarSign,
        text: "Proforma accepted. Proceed with payment as per agreed terms.",
        action: "Make Payment",
        color: "bg-green-50 border-green-200 text-green-800"
      },
      seller: {
        icon: Clock,
        text: "Proforma accepted by buyer. Awaiting payment confirmation.",
        action: null,
        color: "bg-blue-50 border-blue-200 text-blue-800"
      }
    },
    PAYMENT_PENDING: {
      buyer: {
        icon: DollarSign,
        text: "Payment pending. Complete payment to move forward with order fulfillment.",
        action: "Pay Now",
        color: "bg-orange-50 border-orange-200 text-orange-800"
      },
      seller: {
        icon: Clock,
        text: "Waiting for buyer's payment. Order will proceed once payment is received.",
        action: null,
        color: "bg-blue-50 border-blue-200 text-blue-800"
      }
    },
    PAYMENT_PARTIAL: {
      buyer: {
        icon: DollarSign,
        text: "Partial payment received. Complete remaining payment as per terms.",
        action: "Complete Payment",
        color: "bg-yellow-50 border-yellow-200 text-yellow-800"
      },
      seller: {
        icon: Clock,
        text: "Partial payment received. Awaiting full payment before dispatch.",
        action: null,
        color: "bg-blue-50 border-blue-200 text-blue-800"
      }
    },
    PAYMENT_RECEIVED: {
      buyer: {
        icon: Clock,
        text: "Payment complete! Seller will now dispatch the order.",
        action: null,
        color: "bg-green-50 border-green-200 text-green-800"
      },
      seller: {
        icon: Package,
        text: "Payment received! Prepare and dispatch the order.",
        action: "Mark as Dispatched",
        color: "bg-green-50 border-green-200 text-green-800"
      }
    },
    DISPATCHED: {
      buyer: {
        icon: Truck,
        text: "Order dispatched! Track shipment and prepare for delivery.",
        action: "Track Order",
        color: "bg-blue-50 border-blue-200 text-blue-800"
      },
      seller: {
        icon: Truck,
        text: "Order dispatched. Monitor shipment until delivery is confirmed.",
        action: "Update Tracking",
        color: "bg-blue-50 border-blue-200 text-blue-800"
      }
    },
    IN_TRANSIT: {
      buyer: {
        icon: Truck,
        text: "Shipment in transit. Prepare to receive and inspect the order.",
        action: "Track Shipment",
        color: "bg-blue-50 border-blue-200 text-blue-800"
      },
      seller: {
        icon: Clock,
        text: "Shipment in transit. Waiting for delivery confirmation from buyer.",
        action: null,
        color: "bg-blue-50 border-blue-200 text-blue-800"
      }
    },
    DELIVERED: {
      buyer: {
        icon: CheckCircle,
        text: "Order delivered! Inspect the items and confirm delivery status.",
        action: "Confirm Delivery",
        color: "bg-green-50 border-green-200 text-green-800"
      },
      seller: {
        icon: Clock,
        text: "Order delivered. Waiting for buyer's confirmation and feedback.",
        action: null,
        color: "bg-blue-50 border-blue-200 text-blue-800"
      }
    },
    REVIEW_SUBMITTED: {
      buyer: {
        icon: CheckCircle,
        text: "Thank you for your review! This RFQ will be closed soon.",
        action: null,
        color: "bg-green-50 border-green-200 text-green-800"
      },
      seller: {
        icon: CheckCircle,
        text: "Buyer has submitted review. Transaction complete!",
        action: null,
        color: "bg-green-50 border-green-200 text-green-800"
      }
    },
    CLOSED: {
      buyer: {
        icon: CheckCircle,
        text: "RFQ completed successfully. You can view the complete transaction history.",
        action: null,
        color: "bg-gray-50 border-gray-200 text-gray-800"
      },
      seller: {
        icon: CheckCircle,
        text: "Transaction completed. Thank you for your business!",
        action: null,
        color: "bg-gray-50 border-gray-200 text-gray-800"
      }
    },
    DEAL_LOST: {
      buyer: {
        icon: Info,
        text: "This deal did not proceed. You can create a new RFQ if needed.",
        action: null,
        color: "bg-gray-50 border-gray-200 text-gray-800"
      },
      seller: {
        icon: Info,
        text: "Deal was not finalized. Better luck with future opportunities!",
        action: null,
        color: "bg-gray-50 border-gray-200 text-gray-800"
      }
    }
  };

  const hint = hints[stage]?.[isBuyer ? "buyer" : "seller"];

  if (!hint) return null;

  const Icon = hint.icon;

  return (
    <div className={`rounded-lg border-2 p-4 mb-6 ${hint.color}`}>
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium leading-relaxed">{hint.text}</p>
          {hint.action && (
            <p className="text-xs mt-1 opacity-75">💡 Suggested Action: {hint.action}</p>
          )}
        </div>
      </div>
    </div>
  );
}
