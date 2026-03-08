import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "@/App";
import { Navbar } from "@/components/Navbar";
import { StageBadge } from "@/components/StageBadge";
import { ProbabilityIndicator } from "@/components/ProbabilityIndicator";
import { MessageThread } from "@/components/MessageThread";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchRfq, fetchMessages, fetchActivity, performAction, initiateCall, endCall, getActiveCalls, verifySeller, listRfqFiles } from "@/lib/api";
import { STAGES, STAGE_LABELS, POST_DEAL_STAGES, FULFILLMENT_PROGRESS } from "@/lib/constants";
import {
  ArrowLeft,
  Send,
  DollarSign,
  CheckCircle2,
  XCircle,
  Calendar,
  FileUp,
  MessageSquare,
  Video,
  VideoOff,
  PhoneCall,
  ShieldCheck,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { VideoCallPanel } from "@/components/VideoCallPanel";
import { VerificationBadge } from "@/components/VerificationBadge";
import { PostDealTabs } from "@/components/PostDealTabs";
import { ComplaintPanel } from "@/components/ComplaintPanel";
import { FileUpload, FileList } from "@/components/FileUpload";
import { InlineActionBar } from "@/components/InlineActionBar";

export default function RFQWorkspace() {
  const { rfqId } = useParams();
  const [searchParams] = useSearchParams();
  const { view, glid, setView, setGlid } = useAppContext();
  const navigate = useNavigate();

  const [rfq, setRfq] = useState(null);
  const [messages, setMessages] = useState([]);
  const [activity, setActivity] = useState([]);
  const [messageInput, setMessageInput] = useState("");
  const [actionMode, setActionMode] = useState(null);
  const [actionAmount, setActionAmount] = useState("");
  const [actionDate, setActionDate] = useState("");
  const [videoRoomUrl, setVideoRoomUrl] = useState(null);
  const [showVideo, setShowVideo] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);
  const [callStatus, setCallStatus] = useState(null);
  const [showVerifyPrompt, setShowVerifyPrompt] = useState(false);
  const [rfqFiles, setRfqFiles] = useState([]);
  const ringAudioRef = useRef(null);

  // Ring tone for outgoing calls
  useEffect(() => {
    if (callStatus === "ringing") {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const gain = ctx.createGain();
        gain.gain.value = 0.1;
        gain.connect(ctx.destination);
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = 440;
        osc.connect(gain);
        osc.start();
        ringAudioRef.current = { ctx, osc };
        // Pulse pattern
        const pulse = setInterval(() => {
          gain.gain.value = gain.gain.value > 0 ? 0 : 0.1;
        }, 1000);
        ringAudioRef.current.pulse = pulse;
      } catch (e) {}
    } else {
      if (ringAudioRef.current) {
        try { ringAudioRef.current.osc.stop(); } catch (e) {}
        try { ringAudioRef.current.ctx.close(); } catch (e) {}
        clearInterval(ringAudioRef.current.pulse);
        ringAudioRef.current = null;
      }
    }
    return () => {
      if (ringAudioRef.current) {
        try { ringAudioRef.current.osc.stop(); } catch (e) {}
        try { ringAudioRef.current.ctx.close(); } catch (e) {}
        clearInterval(ringAudioRef.current.pulse);
        ringAudioRef.current = null;
      }
    };
  }, [callStatus]);

  useEffect(() => {
    const urlView = searchParams.get("view");
    const urlGlid = searchParams.get("glid");
    const joinCall = searchParams.get("joinCall");
    if (urlView && !view) setView(urlView);
    if (urlGlid && !glid) setGlid(urlGlid);
    if (joinCall === "true") {
      setShowVideo(true);
    }
  }, [searchParams, view, glid, setView, setGlid]);

  const loadData = useCallback(async () => {
    try {
      const [rfqRes, msgRes, actRes, filesRes] = await Promise.all([
        fetchRfq(rfqId),
        fetchMessages(rfqId),
        fetchActivity(rfqId),
        listRfqFiles(rfqId),
      ]);
      setRfq(rfqRes.data);
      setMessages(msgRes.data.messages);
      setActivity(actRes.data.logs);
      setRfqFiles(filesRes.data.files || []);

      // Check active calls for this RFQ
      if (glid) {
        const callsRes = await getActiveCalls(glid);
        const rfqCall = (callsRes.data.calls || []).find((c) => c.rfq_id === rfqId);
        if (rfqCall) {
          setCallStatus(rfqCall.status);
          if (rfqCall.room_url) setVideoRoomUrl(rfqCall.room_url);
          if (rfqCall.status === "active" && !showVideo) setShowVideo(true);
        } else {
          if (callStatus === "ringing" || callStatus === "active") {
            setCallStatus(null);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [rfqId, glid, showVideo, callStatus]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    try {
      await performAction(rfqId, {
        action: "send_message",
        actor_glid: glid,
        actor_type: view,
        content: messageInput,
        metadata: {},
      });
      setMessageInput("");
      loadData();
    } catch (err) {
      toast.error("Failed to send message");
    }
  };

  const handleAction = async (action, meta = {}) => {
    try {
      await performAction(rfqId, {
        action,
        actor_glid: glid,
        actor_type: view,
        content: meta.content || "",
        metadata: meta,
      });
      setActionMode(null);
      setActionAmount("");
      setActionDate("");
      toast.success(`Action: ${action.replace(/_/g, " ")}`);
      loadData();
    } catch (err) {
      toast.error("Action failed");
    }
  };

  const handleStartVideoCall = async () => {
    setVideoLoading(true);
    try {
      const res = await initiateCall(rfqId, { caller_glid: glid, caller_type: view });
      setVideoRoomUrl(res.data.room_url);
      setCallStatus("ringing");
      setShowVideo(true);
      toast.success("Calling... waiting for the other party to accept");
    } catch (err) {
      toast.error("Failed to initiate video call");
    }
    setVideoLoading(false);
  };

  const handleLeaveVideoCall = async () => {
    try {
      await endCall(rfqId);
    } catch (e) {
      // silent
    }
    setShowVideo(false);
    setVideoRoomUrl(null);
    setCallStatus(null);
    // If buyer, prompt verification after call
    if (view === "buyer" && !rfq?.seller_verified?.verified) {
      setShowVerifyPrompt(true);
    }
  };

  const handleVerifySeller = async (note) => {
    try {
      await verifySeller(rfqId, { verified_by_glid: glid, note });
      toast.success("Seller marked as verified");
      setShowVerifyPrompt(false);
      loadData();
    } catch (err) {
      toast.error("Verification failed");
    }
  };

  if (!rfq) return <div className="loading">Loading...</div>;

  const currentStageIndex = STAGES.indexOf(rfq.stage);
  const isPreDealClosed = rfq.stage === "DEAL_LOST";
  const isPostDeal = POST_DEAL_STAGES.includes(rfq.stage);
  const isFullyClosed = rfq.stage === "CLOSED" || rfq.stage === "DEAL_LOST";
  const fulfillmentProgress = FULFILLMENT_PROGRESS[rfq.stage] || 0;

  const buyerActions = [];
  const sellerActions = [];

  if (!isPostDeal && !isPreDealClosed) {
    if (view === "buyer") {
      buyerActions.push({ action: "counter_offer", label: "Counter Offer", icon: DollarSign, needsAmount: true });
      if (rfq.stage === "QUOTE_RECEIVED" || rfq.stage === "NEGOTIATION" || rfq.stage === "MEETING_SCHEDULED") {
        buyerActions.push({ action: "accept_quote", label: "Accept Quote", icon: CheckCircle2, variant: "success" });
        buyerActions.push({ action: "reject_quote", label: "Reject Quote", icon: XCircle, variant: "destructive" });
      }
      buyerActions.push({ action: "schedule_meeting", label: "Schedule Meeting", icon: Calendar, needsDate: true });
    }
    if (view === "seller") {
      sellerActions.push({ action: "send_quote", label: "Send Quote", icon: DollarSign, needsAmount: true });
      sellerActions.push({ action: "counter_offer", label: "Counter Offer", icon: DollarSign, needsAmount: true });
      sellerActions.push({
        action: "upload_quote",
        label: "Upload Quote",
        icon: FileUp,
      });
      sellerActions.push({ action: "close_deal_won", label: "Mark Won", icon: CheckCircle2, variant: "success" });
      sellerActions.push({ action: "close_deal_lost", label: "Mark Lost", icon: XCircle, variant: "destructive" });
    }
  }

  const actions = view === "buyer" ? buyerActions : sellerActions;

  return (
    <div className="workspace-layout" data-testid="rfq-workspace">
      <Navbar />
      <main className="workspace-main">
        <div className="workspace-header">
          <div className="workspace-header-left">
            <button
              onClick={() => navigate(`/${view}`)}
              className="back-btn"
              data-testid="back-btn"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <h2 className="workspace-title">{rfq.product}</h2>
            <StageBadge stage={rfq.stage} />
            {rfq.seller_verified?.verified && <VerificationBadge verification={rfq.seller_verified} />}
          </div>
          <div className="flex items-center gap-3">
            <ProbabilityIndicator value={rfq.probability_score} />
            {callStatus === "ringing" && (
              <span className="text-xs font-semibold text-amber-600 flex items-center gap-1" data-testid="call-ringing-indicator">
                <PhoneCall size={14} className="animate-pulse" /> Ringing...
              </span>
            )}
            <Button
              size="sm"
              onClick={showVideo ? handleLeaveVideoCall : handleStartVideoCall}
              disabled={videoLoading}
              className={showVideo ? "bg-red-600 hover:bg-red-700 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
              data-testid="video-call-btn"
            >
              {videoLoading ? (
                "Connecting..."
              ) : showVideo ? (
                <><VideoOff size={16} /> End Call</>
              ) : (
                <><Video size={16} /> Video Call</>
              )}
            </Button>
          </div>
        </div>

        <div className="workspace-grid">
          <div className="workspace-left">
            {/* RFQ Details */}
            <div className="detail-card" data-testid="rfq-details">
              <h4>RFQ Details</h4>
              <div className="detail-row">
                <span className="detail-label">Buyer GLID</span>
                <span className="detail-value">{rfq.buyer_glid}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Seller GLID</span>
                <span className="detail-value">{rfq.seller_glid}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Quantity</span>
                <span className="detail-value">{rfq.quantity?.toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Budget</span>
                <span className="detail-value">INR {rfq.budget?.toLocaleString()}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Priority</span>
                <span className={`priority-badge priority-${rfq.priority}`}>{rfq.priority}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Created</span>
                <span className="detail-value text-xs">
                  {formatDistanceToNow(new Date(rfq.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>

            {/* Stage Flow */}
            <div className="detail-card" data-testid="stage-flow">
              <h4>Stage Flow</h4>
              <div className="stage-flow">
                {(isPostDeal
                  ? POST_DEAL_STAGES
                  : STAGES.filter((s) => !POST_DEAL_STAGES.includes(s) || s === "DEAL_WON")
                ).filter((s) => s !== "DEAL_LOST").map((stage) => {
                  const stageList = isPostDeal ? POST_DEAL_STAGES : STAGES;
                  const isActive = stage === rfq.stage;
                  const isCompleted =
                    stageList.indexOf(stage) < stageList.indexOf(rfq.stage) && rfq.stage !== "DEAL_LOST";
                  return (
                    <div
                      key={stage}
                      className={`stage-step ${isActive ? "active" : ""} ${isCompleted ? "completed" : ""}`}
                    >
                      <span className="stage-step-dot" />
                      {STAGE_LABELS[stage]}
                    </div>
                  );
                })}
                {rfq.stage === "DEAL_LOST" && (
                  <div className="stage-step active" style={{ background: "#b91c1c" }}>
                    <span className="stage-step-dot" />
                    Deal Lost
                  </div>
                )}
              </div>
            </div>

            {/* Video KYC Verification Hint */}
            {!rfq.seller_verified?.verified && !isPostDeal && !isPreDealClosed && view === "buyer" && (
              <div className="detail-card" data-testid="verify-hint" style={{ border: "2px dashed #93c5fd", background: "#eff6ff" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Video size={16} className="text-blue-600" />
                  <span className="text-xs font-bold text-blue-800">Verify Seller via Video Call</span>
                </div>
                <p className="text-xs text-blue-700 mb-2">
                  Start a video call to verify the seller's identity and premises before proceeding with the deal.
                </p>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                  onClick={handleStartVideoCall}
                  disabled={videoLoading}
                  data-testid="verify-via-call-btn"
                >
                  <Video size={14} /> {videoLoading ? "Connecting..." : "Start Verification Call"}
                </Button>
              </div>
            )}

            {/* Actions */}
            {!isPostDeal && !isPreDealClosed && actions.length > 0 && (
              <div className="detail-card" data-testid="actions-panel">
                <h4>Actions</h4>
                <div className="workspace-actions">
                  {actions.map((a) => (
                    <Button
                      key={a.action}
                      size="sm"
                      variant={
                        a.variant === "destructive"
                          ? "destructive"
                          : a.variant === "success"
                            ? "default"
                            : "outline"
                      }
                      onClick={() => {
                        if (a.needsAmount || a.needsDate) {
                          setActionMode(a.action);
                        } else {
                          handleAction(a.action, {
                            content: a.label,
                            filename: a.action === "upload_quote" ? "quote_document.pdf" : undefined,
                          });
                        }
                      }}
                      className={a.variant === "success" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                      data-testid={`action-${a.action}`}
                    >
                      <a.icon size={14} /> {a.label}
                    </Button>
                  ))}
                </div>

                {actionMode && (
                  <div className="action-form" data-testid="action-form">
                    {(actionMode === "counter_offer" || actionMode === "send_quote") && (
                      <>
                        <label>Amount (INR)</label>
                        <Input
                          type="number"
                          value={actionAmount}
                          onChange={(e) => setActionAmount(e.target.value)}
                          placeholder="Enter amount..."
                          data-testid="action-amount-input"
                        />
                        <div className="action-form-buttons">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAction(actionMode, {
                                amount: parseFloat(actionAmount),
                                content: `${actionMode === "send_quote" ? "Quote" : "Counter offer"}: INR ${Number(actionAmount).toLocaleString()}`,
                              })
                            }
                            data-testid="action-submit-btn"
                          >
                            Submit
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setActionMode(null)}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                    {actionMode === "schedule_meeting" && (
                      <>
                        <label>Meeting Date</label>
                        <Input
                          type="date"
                          value={actionDate}
                          onChange={(e) => setActionDate(e.target.value)}
                          data-testid="action-date-input"
                        />
                        <div className="action-form-buttons">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleAction("schedule_meeting", {
                                date: actionDate,
                                content: `Meeting scheduled for ${actionDate}`,
                              })
                            }
                            data-testid="action-schedule-btn"
                          >
                            Schedule
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setActionMode(null)}>
                            Cancel
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Fulfillment Progress (Post-Deal) */}
            {isPostDeal && (
              <div className="detail-card" data-testid="fulfillment-progress">
                <h4>Fulfillment Progress</h4>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
                  <span>{STAGE_LABELS[rfq.stage]}</span>
                  <span>{fulfillmentProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${fulfillmentProgress}%`,
                      background: fulfillmentProgress === 100 ? '#10b981' : '#3b82f6',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Post-Deal Tabs */}
            {isPostDeal && (
              <PostDealTabs rfq={rfq} rfqId={rfqId} view={view} glid={glid} onRefresh={loadData} />
            )}

            {/* Complaints (Post-Deal) */}
            {isPostDeal && (
              <ComplaintPanel rfqId={rfqId} view={view} glid={glid} onRefresh={loadData} rfq={rfq} />
            )}

            {/* Shared Files */}
            {rfqFiles.length > 0 && (
              <div className="detail-card" data-testid="shared-files">
                <h4>Shared Files ({rfqFiles.length})</h4>
                <FileList files={rfqFiles} />
              </div>
            )}

            {/* Activity Log */}
            <div className="detail-card" data-testid="activity-log">
              <h4>Activity Log</h4>
              <div className="activity-list">
                {activity.map((log) => (
                  <div key={log.log_id} className="activity-item" data-testid={`activity-${log.log_id}`}>
                    <span className="activity-time">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                    <span className="activity-detail">{log.details}</span>
                  </div>
                ))}
                {activity.length === 0 && (
                  <span className="text-xs text-slate-400">No activity yet</span>
                )}
              </div>
            </div>

            {/* Seller Verification Prompt */}
            {showVerifyPrompt && view === "buyer" && (
              <div className="detail-card" data-testid="verify-seller-prompt" style={{ border: "2px solid #a7f3d0" }}>
                <h4 style={{ color: "#047857" }}>Verify Seller After Video KYC</h4>
                <p className="text-sm text-slate-600 mb-3">
                  Based on your video call, would you like to mark this seller as verified?
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => handleVerifySeller("Verified — premises inspected, safe to deal")}
                    data-testid="verify-safe-btn"
                  >
                    <ShieldCheck size={14} /> Verified — Safe to Deal
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleVerifySeller("Verified — identity confirmed")}
                    data-testid="verify-identity-btn"
                  >
                    <ShieldCheck size={14} /> Identity Confirmed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowVerifyPrompt(false)}
                    data-testid="verify-skip-btn"
                  >
                    Skip for Now
                  </Button>
                </div>
              </div>
            )}

            {/* Already verified indicator */}
            {rfq.seller_verified?.verified && (
              <div className="detail-card" data-testid="verification-status" style={{ border: "1px solid #a7f3d0", background: "#f0fdf4" }}>
                <h4 style={{ color: "#047857" }}>Seller Verification</h4>
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck size={16} className="text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">Verified Seller</span>
                </div>
                <p className="text-xs text-slate-500">{rfq.seller_verified.note}</p>
                <p className="text-xs text-slate-400 mt-1">
                  By GLID {rfq.seller_verified.verified_by} &bull;{" "}
                  {formatDistanceToNow(new Date(rfq.seller_verified.verified_at), { addSuffix: true })}
                </p>
              </div>
            )}
          </div>
          <div className="workspace-right" data-testid="message-panel">
            {showVideo && videoRoomUrl && (
              <div data-testid="video-call-container" style={{ borderBottom: "1px solid #e2e8f0" }}>
                <VideoCallPanel roomUrl={videoRoomUrl} onLeave={handleLeaveVideoCall} />
              </div>
            )}
            <div className="message-header">
              <MessageSquare size={16} />
              Message Thread
            </div>
            <MessageThread messages={messages} currentGlid={glid} />
            {!isFullyClosed && isPostDeal && (
              <InlineActionBar rfq={rfq} rfqId={rfqId} view={view} glid={glid} onRefresh={loadData} />
            )}
            {!isFullyClosed && (
              <div className="message-input-area" data-testid="message-input-area">
                <FileUpload rfqId={rfqId} glid={glid} viewType={view} onFilesUploaded={() => loadData()} compact />
                <Input
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type a message..."
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  data-testid="message-input"
                />
                <Button size="sm" onClick={handleSendMessage} data-testid="send-message-btn">
                  <Send size={16} />
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
