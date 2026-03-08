import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { submitReview, getReview, respondToReview } from "@/lib/api";
import { toast } from "sonner";
import { Star, MessageSquare } from "lucide-react";

const StarRating = ({ value, onChange, readOnly = false }) => (
  <div className="flex gap-0.5" data-testid="star-rating">
    {[1, 2, 3, 4, 5].map((i) => (
      <button
        key={i}
        type="button"
        onClick={() => !readOnly && onChange(i)}
        className={`${readOnly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
        data-testid={`star-${i}`}
      >
        <Star size={20} fill={i <= value ? "#f59e0b" : "none"} stroke={i <= value ? "#f59e0b" : "#cbd5e1"} />
      </button>
    ))}
  </div>
);

export const ReviewTab = ({ rfq, rfqId, view, glid, onRefresh }) => {
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [responseText, setResponseText] = useState("");

  const lastUpdated = rfq?.last_updated;
  useEffect(() => {
    getReview(rfqId).then((r) => { setReview(r.data.review); setLoading(false); }).catch(() => setLoading(false));
  }, [rfqId, lastUpdated]);

  const handleSubmit = async () => {
    if (rating === 0) { toast.error("Please select a rating"); return; }
    if (!comment.trim()) { toast.error("Please add a comment"); return; }
    try {
      await submitReview(rfqId, { rating, comment, reviewer_glid: glid });
      toast.success("Review submitted! Order closed.");
      const r = await getReview(rfqId);
      setReview(r.data.review);
      if (onRefresh) onRefresh();
    } catch (e) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleRespond = async () => {
    if (!responseText.trim()) return;
    try {
      await respondToReview(rfqId, { response: responseText, responder_glid: glid });
      toast.success("Response added");
      const r = await getReview(rfqId);
      setReview(r.data.review);
      setResponseText("");
    } catch (e) { toast.error("Failed"); }
  };

  if (loading) return <p className="text-xs text-slate-400 py-4">Loading...</p>;

  if (!review && view === "buyer") {
    return (
      <div className="space-y-3 pt-3" data-testid="review-form">
        <p className="text-xs font-semibold text-slate-600">Rate this Transaction</p>
        <StarRating value={rating} onChange={setRating} />
        <div><Label className="text-xs">Your Review</Label><Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Share your experience..." data-testid="review-comment" /></div>
        <Button size="sm" onClick={handleSubmit} data-testid="submit-review-btn"><Star size={14} /> Submit Review</Button>
      </div>
    );
  }

  if (review) {
    return (
      <div className="space-y-3 pt-3" data-testid="review-display">
        <div className="flex items-center gap-2">
          <StarRating value={review.rating} readOnly />
          <span className="text-sm font-bold">{review.rating}/5</span>
        </div>
        <p className="text-sm text-slate-700">{review.comment}</p>
        <p className="text-xs text-slate-400">By GLID {review.reviewer_glid}</p>

        {review.seller_response && (
          <div className="bg-slate-50 border rounded p-3 mt-2">
            <p className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1"><MessageSquare size={12} /> Seller Response</p>
            <p className="text-sm text-slate-700">{review.seller_response.response}</p>
          </div>
        )}

        {!review.seller_response && view === "seller" && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs font-semibold text-slate-600">Respond to Review</p>
            <Textarea value={responseText} onChange={(e) => setResponseText(e.target.value)} rows={2} placeholder="Your response..." data-testid="review-response" />
            <Button size="sm" variant="outline" onClick={handleRespond} data-testid="respond-review-btn"><MessageSquare size={14} /> Respond</Button>
          </div>
        )}
      </div>
    );
  }

  return <p className="text-xs text-slate-400 py-4 text-center">{view === "seller" ? "Waiting for buyer review." : "Delivery must be confirmed first."}</p>;
};
