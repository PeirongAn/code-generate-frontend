import React, { useState, useEffect } from 'react';
import ThinkingRenderer from './ThinkingRenderer';

interface ThinkingExampleProps {}

const ThinkingExample: React.FC<ThinkingExampleProps> = () => {
  const [thinkingContent, setThinkingContent] = useState('');
  const [isComplete, setIsComplete] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  // 模拟推理消息的示例数据
  const simulateThinkingMessages = [
    { content: "我需要分析这个问题", is_complete: false },
    { content: "。首先，让我理解用户的需求", is_complete: false },
    { content: "，然后制定解决方案。", is_complete: false },
    { content: "\n\n问题分析：", is_complete: false },
    { content: "\n1. 用户需要一个推理组件", is_complete: false },
    { content: "\n2. 组件需要支持分步推送", is_complete: false },
    { content: "\n3. 需要有完成状态标识", is_complete: false },
    { content: "\n\n解决方案：", is_complete: false },
    { content: "\n- 创建ThinkingRenderer组件", is_complete: false },
    { content: "\n- 支持动态内容更新", is_complete: false },
    { content: "\n- 添加完成状态处理", is_complete: true },
  ];

  const startSimulation = () => {
    setIsSimulating(true);
    setThinkingContent('');
    setIsComplete(false);
    
    let messageIndex = 0;
    const interval = setInterval(() => {
      if (messageIndex >= simulateThinkingMessages.length) {
        clearInterval(interval);
        setIsSimulating(false);
        return;
      }
      
      const message = simulateThinkingMessages[messageIndex];
      setThinkingContent(prev => prev + message.content);
      setIsComplete(message.is_complete);
      messageIndex++;
    }, 500);
  };

  const resetSimulation = () => {
    setThinkingContent('');
    setIsComplete(false);
    setIsSimulating(false);
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
          推理组件示例
        </h1>
        
        <div className="mb-6">
          <div className="flex gap-4 mb-4">
            <button
              onClick={startSimulation}
              disabled={isSimulating}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSimulating ? '推理中...' : '开始推理模拟'}
            </button>
            <button
              onClick={resetSimulation}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              重置
            </button>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            <p>这个示例展示了如何使用ThinkingRenderer组件来渲染推理内容。</p>
            <p>点击"开始推理模拟"按钮来查看分步推送的效果。</p>
          </div>
        </div>

        {/* 推理组件展示 */}
        {(thinkingContent || isSimulating) && (
          <div className="mb-6">
            <ThinkingRenderer
              content={thinkingContent}
              isComplete={isComplete}
              timestamp={new Date().toISOString()}
            />
          </div>
        )}

        {/* 静态示例 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
            静态示例
          </h2>
          <ThinkingRenderer
            content="这是一个静态的推理内容示例。用户可以展开查看详细的推理过程。这里可以包含多行文本，包括分析步骤、逻辑推理、决策过程等内容。"
            isComplete={true}
            timestamp="2025-01-14T12:00:00Z"
          />
        </div>

        {/* 进行中的示例 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
            进行中的推理
          </h2>
          <ThinkingRenderer
            content="正在分析问题..."
            isComplete={false}
            timestamp="2025-01-14T12:05:00Z"
          />
        </div>

        {/* 消息格式说明 */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">
            消息格式说明
          </h3>
          <pre className="text-sm text-blue-700 dark:text-blue-300 overflow-x-auto">
{`{
  "type": "message",
  "run_id": "90a8c5c7-4745-46ee-a874-c0d4246a5aca",
  "data": {
    "content": "优化。问题应",
    "metadata": {
      "type": "thinking",
      "is_complete": false
    }
  },
  "timestamp": "2025-07-14T11:58:24.175050"
}`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default ThinkingExample; 