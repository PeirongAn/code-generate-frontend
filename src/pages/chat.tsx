import * as React from "react";
import CodingAssistantLayout from "../components/layout";
import Message from "../components/chat/message";
import ChatInput from "../components/chat/input";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = React.useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      content: "你好！我是你的AI编程助手。有什么我可以帮你的吗？",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSendMessage = async (content: string) => {
    // 添加用户消息
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // TODO: 这里添加实际的API调用
      // 模拟API响应
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "我收到了你的消息，正在处理中...",
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("发送消息失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CodingAssistantLayout title="聊天" link="/chat">
      <div className="flex flex-col h-full">
        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message) => (
            <Message
              key={message.id}
              role={message.role}
              content={message.content}
              timestamp={message.timestamp}
            />
          ))}
        </div>

        {/* 输入框 */}
        <ChatInput onSend={handleSendMessage} disabled={isLoading} />
      </div>
    </CodingAssistantLayout>
  );
};

export default ChatPage; 