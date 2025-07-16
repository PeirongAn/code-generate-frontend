import React from "react";
import { Message } from "../../types/datamodel";
import Markdown from "./markdown";
import { messageUtils } from "./rendermessage";
import FileRenderer from "../../common/filerenderer";
import { IPlan } from "../../types/plan";
import PlanCard from "../../features/Plans/PlanCard";
import ToolCallCard from "./toolcall";
import { FaUser, FaRobot } from "react-icons/fa";

interface MessageCardProps {
  message: Message;
  isLastMessage: boolean;
}

const MessageCard: React.FC<MessageCardProps> = ({
  message,
  isLastMessage,
}) => {
  const content = message.config.content;
  const source = message.config.source;
  const isUser = source === "user";

  const renderContent = () => {
    if (messageUtils.isError(content)) {
      return <pre className="text-red-500 text-sm whitespace-pre-wrap">{content}</pre>;
    }

    const { plan, remaining } = messageUtils.extractPlanAndRemainingText(content);
    
    if (plan) {
      const planData = plan as IPlan;
      return (
        <>
          <PlanCard plan={planData} />
          {remaining && <Markdown content={remaining} />}
        </>
      );
    }
    
    if (messageUtils.isToolCall(content)) {
      try {
        const toolCall = JSON.parse(content);
        return <ToolCallCard toolCall={toolCall} />;
      } catch (e) {
        // fallthrough: render as markdown if parsing fails
      }
    }

    return <Markdown content={content} />;
  };

  const formattedTime = new Date(message.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const messageClass = isUser
    ? "bg-blue-500 text-white self-end"
    : "bg-gray-200 text-gray-800 self-start";

  const icon = isUser ? (
    <FaUser className="w-6 h-6 text-white" />
  ) : (
    <FaRobot className="w-6 h-6 text-gray-600" />
  );

  const iconContainerClass = isUser
    ? "bg-blue-600 rounded-full flex items-center justify-center w-10 h-10 order-2"
    : "bg-gray-300 rounded-full flex items-center justify-center w-10 h-10 order-1";

  const messageContainerClass = `flex items-start gap-3 my-4 ${
    isUser ? "justify-end" : "justify-start"
  }`;
  
  const bubbleClass = `relative max-w-xl lg:max-w-2xl px-4 py-2 rounded-lg shadow ${messageClass} ${
    isUser ? "order-1" : "order-2"
  }`;

  return (
    <div className={messageContainerClass}>
      <div className={iconContainerClass}>{icon}</div>
      <div className={bubbleClass}>
        {renderContent()}
        <div className="text-xs text-right mt-2 opacity-70">
          {formattedTime}
        </div>
      </div>
    </div>
  );
};

export default MessageCard;
 