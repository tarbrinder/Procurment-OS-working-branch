import React from 'react';
import { Badge } from '@/components/ui/badge';

// Helper to format field names (snake_case → Title Case)
export const formatFieldName = (fieldName) => {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper to format field values
export const formatFieldValue = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

// Get RFQ title from rfq_data or fallback to product
export const getRFQTitle = (rfq) => {
  if (rfq.rfq_data) {
    const displayConfig = rfq.display_config || {};
    const titleField = displayConfig.title_field || 'category';
    return rfq.rfq_data[titleField] || rfq.rfq_data.product || rfq.product || 'Custom RFQ';
  }
  return rfq.product || 'RFQ';
};

// Get RFQ subtitle from rfq_data
export const getRFQSubtitle = (rfq) => {
  if (rfq.rfq_data && rfq.display_config?.subtitle_fields) {
    const parts = rfq.display_config.subtitle_fields
      .map(field => rfq.rfq_data[field])
      .filter(Boolean);
    return parts.join(' - ');
  }
  return null;
};

// Get key fields for display
export const getKeyFields = (rfq) => {
  if (rfq.rfq_data) {
    const displayConfig = rfq.display_config || {};
    const keyFields = displayConfig.key_fields || [];
    
    if (keyFields.length > 0) {
      return keyFields.map(field => ({
        name: field,
        value: rfq.rfq_data[field]
      })).filter(item => item.value !== undefined);
    }
    
    // Default: show first 3 non-standard fields
    const standardFields = ['category', 'product', 'description', 'quantity', 'budget'];
    return Object.keys(rfq.rfq_data)
      .filter(key => !standardFields.includes(key))
      .slice(0, 3)
      .map(field => ({
        name: field,
        value: rfq.rfq_data[field]
      }));
  }
  return [];
};

// Dynamic RFQ Details Component
export const DynamicRFQDetails = ({ rfq, className = "" }) => {
  const rfqData = rfq.rfq_data || {};
  
  if (Object.keys(rfqData).length === 0) {
    // Fallback to old format
    return (
      <div className={`space-y-2 ${className}`}>
        {rfq.product && (
          <div className="flex justify-between">
            <span className="text-slate-600">Product:</span>
            <span className="font-medium">{rfq.product}</span>
          </div>
        )}
        {rfq.quantity && (
          <div className="flex justify-between">
            <span className="text-slate-600">Quantity:</span>
            <span className="font-medium">{rfq.quantity}</span>
          </div>
        )}
        {rfq.budget && (
          <div className="flex justify-between">
            <span className="text-slate-600">Budget:</span>
            <span className="font-medium">₹{rfq.budget.toLocaleString()}</span>
          </div>
        )}
        {rfq.description && (
          <div className="flex justify-between">
            <span className="text-slate-600">Description:</span>
            <span className="font-medium">{rfq.description}</span>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div className={`grid grid-cols-2 gap-3 ${className}`}>
      {Object.entries(rfqData).map(([key, value]) => (
        <div key={key} className="space-y-1">
          <div className="text-xs text-slate-500">{formatFieldName(key)}</div>
          <div className="text-sm font-medium">{formatFieldValue(value)}</div>
        </div>
      ))}
    </div>
  );
};

// Compact RFQ Card (for dashboard list)
export const CompactRFQCard = ({ rfq }) => {
  const title = getRFQTitle(rfq);
  const subtitle = getRFQSubtitle(rfq);
  const keyFields = getKeyFields(rfq);
  
  return (
    <div className="space-y-1">
      <div className="font-semibold text-slate-900">{title}</div>
      {subtitle && (
        <div className="text-sm text-slate-600">{subtitle}</div>
      )}
      {keyFields.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {keyFields.map((item, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {formatFieldName(item.name)}: {formatFieldValue(item.value)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

// Broadcast indicator
export const BroadcastBadge = ({ rfq }) => {
  if (rfq.is_broadcast) {
    return (
      <Badge variant="outline" className="ml-2">
        <span className="mr-1">📢</span>
        Broadcast
      </Badge>
    );
  }
  return null;
};

export default {
  formatFieldName,
  formatFieldValue,
  getRFQTitle,
  getRFQSubtitle,
  getKeyFields,
  DynamicRFQDetails,
  CompactRFQCard,
  BroadcastBadge,
};
