import React, { useState } from "react";
import { SendHorizontal } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled = false }) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-gray-200 p-4 bg-white"
    >
      <div className="flex items-end space-x-2">
        <div className="flex-1">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="输入消息..."
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={1}
            disabled={disabled}
          />
        </div>
        <button
          type="submit"
          disabled={!message.trim() || disabled}
          className={`p-3 rounded-full flex items-center justify-center ${
            !message.trim() || disabled
              ? "bg-gray-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          } text-white transition-colors`}
        >
          <SendHorizontal className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
};

export default ChatInput; 