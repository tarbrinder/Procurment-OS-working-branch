import { useRef, useEffect } from "react";
import { format } from "date-fns";

export const MessageThread = ({ messages, currentGlid }) => {
  const bottomRef = useRef(null);
  const prevCountRef = useRef(0);
  const listRef = useRef(null);

  useEffect(() => {
    // Only auto-scroll when NEW messages arrive, not on every poll
    if (messages.length > prevCountRef.current && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  return (
    <div className="message-list" ref={listRef} data-testid="message-thread">
      {messages.map((msg) => {
        const isSent = msg.sender_glid === currentGlid;
        const isSystem = msg.message_type === "system";
        const isQuote = msg.message_type === "quote";
        const isCounter = msg.message_type === "counter_offer";

        let bubbleClass = "message-bubble";
        if (isSystem) {
          bubbleClass += " system";
        } else if (isQuote) {
          bubbleClass += ` quote-msg ${isSent ? "sent" : "received"}`;
        } else if (isCounter) {
          bubbleClass += ` counter-msg ${isSent ? "sent" : "received"}`;
        } else {
          bubbleClass += isSent ? " sent" : " received";
        }

        return (
          <div key={msg.message_id} className={bubbleClass} data-testid={`message-${msg.message_id}`}>
            <div>{msg.content}</div>
            {(isQuote || isCounter) && msg.metadata?.amount && (
              <div className="font-bold mt-1">
                Amount: INR {Number(msg.metadata.amount).toLocaleString()}
              </div>
            )}
            {(isQuote || isCounter) && msg.metadata?.quoted_amount && (
              <div className="font-bold mt-1">
                Amount: INR {Number(msg.metadata.quoted_amount).toLocaleString()}
              </div>
            )}
            <div className="message-meta">
              GLID {msg.sender_glid} &bull;{" "}
              {format(new Date(msg.created_at), "MMM d, h:mm a")}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
};
