import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getIncomingCalls, acceptCall, declineCall } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Phone, PhoneOff, Video } from "lucide-react";

const RING_TONE_FREQ = [440, 480]; // Standard ringtone frequencies

export const IncomingCallsWidget = ({ glid, view }) => {
  const [calls, setCalls] = useState([]);
  const navigate = useNavigate();
  const audioCtxRef = useRef(null);
  const oscillatorsRef = useRef([]);
  const ringIntervalRef = useRef(null);

  const startRingtone = useCallback(() => {
    if (audioCtxRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 0.15;
      gainNode.connect(ctx.destination);

      const oscs = RING_TONE_FREQ.map((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        osc.connect(gainNode);
        osc.start();
        return osc;
      });
      oscillatorsRef.current = oscs;

      // Ring pattern: 1s on, 2s off
      let ringing = true;
      ringIntervalRef.current = setInterval(() => {
        gainNode.gain.value = ringing ? 0 : 0.15;
        ringing = !ringing;
      }, ringing ? 1000 : 2000);
    } catch (e) {
      console.warn("Audio not available:", e);
    }
  }, []);

  const stopRingtone = useCallback(() => {
    oscillatorsRef.current.forEach((osc) => { try { osc.stop(); } catch (e) {} });
    oscillatorsRef.current = [];
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) {}
      audioCtxRef.current = null;
    }
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
  }, []);

  const loadCalls = useCallback(async () => {
    if (!glid) return;
    try {
      const res = await getIncomingCalls(glid);
      setCalls(res.data.calls || []);
    } catch (e) {
      // silent
    }
  }, [glid]);

  useEffect(() => {
    loadCalls();
    const interval = setInterval(loadCalls, 2000);
    return () => clearInterval(interval);
  }, [loadCalls]);

  // Manage ringtone based on calls
  useEffect(() => {
    if (calls.length > 0) {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [calls.length, startRingtone, stopRingtone]);

  const handleAccept = async (call) => {
    stopRingtone();
    try {
      await acceptCall(call.rfq_id);
      navigate(`/rfq/${call.rfq_id}?view=${view}&glid=${glid}&joinCall=true`);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDecline = async (call) => {
    try {
      await declineCall(call.rfq_id);
      loadCalls();
    } catch (e) {
      console.error(e);
    }
  };

  if (calls.length === 0) return null;

  return (
    <div className="incoming-calls-widget" data-testid="incoming-calls-widget">
      <div className="icw-header">
        <Phone size={14} className="icw-ring-icon" />
        <span>Incoming Calls ({calls.length})</span>
      </div>
      {calls.map((call) => (
        <div key={call.call_id} className="icw-call-card" data-testid={`incoming-call-${call.call_id}`}>
          <div className="icw-call-info">
            <div className="icw-caller">
              <Video size={14} />
              <span className="icw-caller-name">GLID {call.caller_glid}</span>
            </div>
            <div className="icw-product">{call.product}</div>
          </div>
          <div className="icw-call-actions">
            <Button
              size="sm"
              className="icw-accept-btn"
              onClick={() => handleAccept(call)}
              data-testid={`accept-call-${call.call_id}`}
            >
              <Phone size={14} /> Accept
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => handleDecline(call)}
              data-testid={`decline-call-${call.call_id}`}
            >
              <PhoneOff size={14} /> Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
