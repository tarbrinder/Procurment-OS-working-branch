import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InvoiceTab } from "@/components/InvoiceTab";
import { PaymentTab } from "@/components/PaymentTab";
import { ShipmentTab } from "@/components/ShipmentTab";
import { DeliveryTab } from "@/components/DeliveryTab";
import { ReviewTab } from "@/components/ReviewTab";
import { FileText, CreditCard, Truck, PackageCheck, Star } from "lucide-react";

export const PostDealTabs = ({ rfq, rfqId, view, glid, onRefresh }) => {
  const stage = rfq?.stage;
  const stageOrder = [
    "DEAL_WON", "PROFORMA_SENT", "PROFORMA_ACCEPTED",
    "PAYMENT_PENDING", "PAYMENT_PARTIAL", "PAYMENT_RECEIVED",
    "DISPATCHED", "IN_TRANSIT", "DELIVERED", "REVIEW_SUBMITTED", "CLOSED",
  ];
  const stageIdx = stageOrder.indexOf(stage);

  return (
    <div className="detail-card" data-testid="post-deal-tabs" style={{ padding: "0.75rem" }}>
      <Tabs defaultValue="invoice" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-9">
          <TabsTrigger value="invoice" className="text-xs flex items-center gap-1" data-testid="tab-invoice">
            <FileText size={12} /> Invoice
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs flex items-center gap-1" data-testid="tab-payments">
            <CreditCard size={12} /> Payments
          </TabsTrigger>
          <TabsTrigger value="shipments" className="text-xs flex items-center gap-1" data-testid="tab-shipments">
            <Truck size={12} /> Shipments
          </TabsTrigger>
          <TabsTrigger value="delivery" className="text-xs flex items-center gap-1" data-testid="tab-delivery">
            <PackageCheck size={12} /> Delivery
          </TabsTrigger>
          <TabsTrigger value="review" className="text-xs flex items-center gap-1" data-testid="tab-review">
            <Star size={12} /> Review
          </TabsTrigger>
        </TabsList>
        <TabsContent value="invoice">
          <InvoiceTab rfq={rfq} rfqId={rfqId} view={view} glid={glid} onRefresh={onRefresh} />
        </TabsContent>
        <TabsContent value="payments">
          <PaymentTab rfq={rfq} rfqId={rfqId} view={view} glid={glid} onRefresh={onRefresh} />
        </TabsContent>
        <TabsContent value="shipments">
          <ShipmentTab rfq={rfq} rfqId={rfqId} view={view} glid={glid} onRefresh={onRefresh} />
        </TabsContent>
        <TabsContent value="delivery">
          <DeliveryTab rfq={rfq} rfqId={rfqId} view={view} glid={glid} onRefresh={onRefresh} />
        </TabsContent>
        <TabsContent value="review">
          <ReviewTab rfq={rfq} rfqId={rfqId} view={view} glid={glid} onRefresh={onRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
