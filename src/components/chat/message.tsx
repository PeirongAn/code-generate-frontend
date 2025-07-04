import * as React from "react";
import ReactMarkdown from "react-markdown";

interface MessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

const Message: React.FC<MessageProps> = ({ role, content, timestamp }) => {
  const isUser = role === "user";

  return (
    <div
      className={`flex ${
        isUser ? "justify-end" : "justify-start"
      } mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
          isUser
            ? "bg-blue-500 text-white"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        {timestamp && (
          <div
            className={`text-xs mt-1 ${
              isUser ? "text-blue-100" : "text-gray-500"
            }`}
          >
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message; 