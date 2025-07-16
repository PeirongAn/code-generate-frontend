import React, { useState } from 'react';
import { RenderMessage } from './rendermessage';
import { AgentMessageConfig } from '../../types/datamodel';

const ResponseStepsExample: React.FC = () => {
  const [showExample, setShowExample] = useState(false);

  // 示例数据：包含步骤的响应消息
  const exampleStepsResponse: AgentMessageConfig = {
    source: "assistant",
    content: `{
  "steps": [
    "step1: 战场态势感知与目标筛选 - 运用卫星/无人机获取敌方指挥节点实时位置，结合情报数据库验证目标价值等级",
    "step2: 火力-目标匹配计算 - 基于PHALANX算法评估目标防护强度，分配12管远程火箭炮集群实施多波次饱和打击",
    "step3: 电磁压制与佯动实施 - 启动反辐射无人机诱骗敌方雷达，同时释放金属箔条制造虚假目标群",
    "step4: 精确打击与毁伤评估 - 执行3分钟急速射后，通过激光雷达扫描判定指挥所结构坍塌率≥75%",
    "step5: 预设路线脱离与重组 - 按照Z字形机动路线撤出战场，途中进行红外信号遮蔽处理",
    "step6: 应急响应预案启动 - 若遇敌方歼击机拦截，立即释放热源诱饵并转入超低空突防模式"
  ],
  "needs_plan": false,
  "dialog": "",
  "plan_summary": "基于敌方中等强度防空体系，采用分布式打击模式：12管远程火箭炮集群在电子战掩护下，对二级指挥节点实施3分钟饱和打击。当激光毁伤评估显示结构坍塌率达标后，按预设6条备用路线交替机动撤离。配备2架反辐射无人机实施伴随压制，设置热源诱饵临界触发阈值为RCS≥5㎡。"
}`,
    metadata: {
      type: "response",
      is_complete: true
    },
    version: 1
  };

  // 普通响应消息（用于对比）
  const normalResponse: AgentMessageConfig = {
    source: "assistant",
    content: "这是一个普通的响应消息，不包含步骤信息，所以会以普通的 Markdown 格式显示。",
    metadata: {
      type: "response",
      is_complete: true
    },
    version: 1
  };

  // 分步推送的响应消息示例
  const streamingResponse: AgentMessageConfig = {
    source: "assistant",
    content: `{
  "steps": [
    "step1: 初始化系统配置 - 检查硬件状态和网络连接",
    "step2: 数据预处理 - 清洗和格式化输入数据"
  ],
  "needs_plan": false,
  "plan_summary": "系统正在处理中..."
}`,
    metadata: {
      type: "response",
      is_complete: false
    },
    version: 1
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
          响应步骤展示示例
        </h1>
        
        <div className="mb-6">
          <button
            onClick={() => setShowExample(!showExample)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showExample ? '隐藏示例' : '显示示例'}
          </button>
        </div>

        {showExample && (
          <div className="space-y-8">
            {/* 包含步骤的响应消息 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                包含步骤的响应消息（使用 PlanView 组件）
              </h2>
              <div className="border-l-4 border-blue-500 pl-4">
                <RenderMessage
                  message={exampleStepsResponse}
                  sessionId={1}
                  messageIdx={0}
                  isLast={true}
                  runStatus="completed"
                />
              </div>
            </div>

            {/* 普通响应消息 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                普通响应消息（Markdown 格式）
              </h2>
              <div className="border-l-4 border-gray-500 pl-4">
                <RenderMessage
                  message={normalResponse}
                  sessionId={1}
                  messageIdx={1}
                  isLast={true}
                  runStatus="completed"
                />
              </div>
            </div>

            {/* 分步推送的响应消息 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg">
              <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">
                进行中的响应消息（部分步骤）
              </h2>
              <div className="border-l-4 border-orange-500 pl-4">
                <RenderMessage
                  message={streamingResponse}
                  sessionId={1}
                  messageIdx={2}
                  isLast={true}
                  runStatus="running"
                />
              </div>
            </div>
          </div>
        )}

        {/* 消息格式说明 */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">
            响应消息格式说明
          </h3>
          
          <div className="mb-4">
            <h4 className="font-medium mb-2 text-blue-700 dark:text-blue-300">
              包含步骤的响应格式：
            </h4>
            <pre className="text-sm text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 p-3 rounded overflow-x-auto">
{`{
  "type": "message",
  "run_id": "xxx",
  "data": {
    "content": "{
      \\"steps\\": [
        \\"step1: 描述...\\"，
        \\"step2: 描述...\\"
      ],
      \\"plan_summary\\": \\"计划摘要\\"
    }",
    "metadata": {
      "type": "response",
      "is_complete": true
    }
  }
}`}
            </pre>
          </div>

          <div className="mb-4">
            <h4 className="font-medium mb-2 text-blue-700 dark:text-blue-300">
              功能特点：
            </h4>
            <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
              <li>• 自动识别包含 <code>steps</code> 数组的响应消息</li>
              <li>• 使用 PlanView 组件展示步骤，而不是 JSON 格式</li>
              <li>• 支持计划摘要显示</li>
              <li>• 支持分步推送和内容累积</li>
              <li>• 只读模式，不允许编辑</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2 text-blue-700 dark:text-blue-300">
              渲染逻辑：
            </h4>
            <ol className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
              <li>1. 检查 <code>metadata.type === "response"</code></li>
              <li>2. 解析 content 中的 JSON 格式</li>
              <li>3. 如果包含 <code>steps</code> 数组，使用 PlanView 组件</li>
              <li>4. 如果包含 <code>plan_summary</code>，显示计划摘要</li>
              <li>5. 否则使用普通的 Markdown 渲染</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResponseStepsExample; 