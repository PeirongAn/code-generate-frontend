# WebSocket 接收消息 API 文档

## 概述
本文档描述了聊天应用中客户端接收的WebSocket消息类型及其处理逻辑。

## 连接信息
- **协议**: WebSocket
- **URL格式**: `ws://[host]/api/ws/runs/[runId]` 或 `wss://[host]/api/ws/runs/[runId]`
- **数据格式**: JSON

## 接收消息类型规范

### 1. 错误消息 (error)

**消息结构**:
```json
{
  "type": "error",
  "error": "错误描述信息"
}
```

**字段说明**:
- `type`: 消息类型，固定为 "error"
- `error`: 错误详情描述

**处理逻辑**:
- 清除输入超时定时器
- 关闭WebSocket连接
- 清除活跃socket引用
- 在控制台输出错误信息

---

### 2. 普通消息 (message)

**消息结构**:
```json
{
  "type": "message",
  "data": {
    "content": "消息内容",
    "metadata": {
      "agent_name": "代理名称",
      "timestamp": "时间戳",
      "message_type": "消息类型"
    }
  }
}
```

**字段说明**:
- `type`: 消息类型，固定为 "message"
- `data`: 消息数据，类型为 `AgentMessageConfig`
  - `content`: 消息内容
  - `metadata`: 消息元数据

**处理逻辑**:
- 验证消息数据存在性
- 创建新的Message对象
- 将消息添加到当前运行的消息列表中

---

### 3. 输入请求 (input_request)

**消息结构**:

#### 文本输入请求
```json
{
  "type": "input_request",
  "input_type": "text_input"
}
```

#### 批准请求
```json
{
  "type": "input_request",
  "input_type": "approval",
  "prompt": "请求批准的提示信息"
}
```

**字段说明**:
- `type`: 消息类型，固定为 "input_request"
- `input_type`: 输入类型
  - `"text_input"`: 文本输入请求
  - `"approval"`: 批准请求
  - `null`: 默认为文本输入
- `prompt`: 批准请求的提示信息（仅在 `input_type` 为 "approval" 时存在）

**处理逻辑**:
- 根据输入类型创建对应的输入请求对象
- 重置更新的计划数组 (`setUpdatedPlan([])`)
- 更新运行状态为 "awaiting_input"
- 设置输入请求对象到当前运行

---

### 4. 系统状态消息 (system)

**消息结构**:
```json
{
  "type": "system",
  "status": "运行状态"
}
```

**字段说明**:
- `type`: 消息类型，固定为 "system"
- `status`: 运行状态，类型为 `BaseRunStatus`
  - 可能的值: "active", "awaiting_input", "paused", "pausing", "stopped", "complete", "error"

**处理逻辑**:
- 直接更新当前运行的状态

---

### 5. 结果消息 (result/completion)

**消息结构**:
```json
{
  "type": "result",
  "status": "complete",
  "data": {
    "task_result": "任务结果",
    "usage": {
      "tokens": 1000,
      "cost": 0.02
    },
    "duration": 30.5
  }
}
```

**字段说明**:
- `type`: 消息类型，"result" 或 "completion"
- `status`: 最终状态
  - `"complete"`: 完成
  - `"error"`: 错误
  - `"stopped"`: 停止
- `data`: 结果数据（可选）
  - `task_result`: 任务执行结果
  - `usage`: 资源使用情况
  - `duration`: 执行时长

**处理逻辑**:
- 根据状态字段映射到对应的 `BaseRunStatus`
- 验证数据是否为 `TeamResult` 类型
- 关闭WebSocket连接
- 清除活跃socket引用
- 更新运行状态和团队结果

---

## 数据类型定义

### BaseRunStatus
```typescript
type BaseRunStatus = 
  | "active"
  | "awaiting_input"
  | "paused"
  | "pausing"
  | "stopped"
  | "complete"
  | "error";
```

### InputRequest
```typescript
interface InputRequest {
  input_type: "text_input" | "approval";
  prompt?: string; // 仅在 approval 类型时存在
}
```

### TeamResult
```typescript
interface TeamResult {
  task_result: string;
  usage: {
    tokens: number;
    cost: number;
  };
  duration: number;
}
```

### AgentMessageConfig
```typescript
interface AgentMessageConfig {
  content: string;
  metadata: {
    agent_name?: string;
    timestamp?: string;
    message_type?: string;
    [key: string]: any;
  };
}
```

## 消息处理流程

### 完整处理流程（组件可见时）
1. **接收消息** → **解析JSON** → **类型判断**
2. **根据类型调用相应处理逻辑**
3. **更新应用状态**
4. **触发UI重新渲染**

### 精简处理流程（组件不可见时）
1. **接收消息** → **解析JSON** → **类型判断**
2. **只处理系统状态消息**
3. **更新运行状态**
4. **不触发UI重新渲染**

## 注意事项

1. **状态管理**: 所有消息处理都通过 `setCurrentRun` 进行状态更新
2. **连接管理**: 在错误或完成时会自动关闭WebSocket连接
3. **计划重置**: 在收到输入请求时会重置计划状态
4. **类型安全**: 所有消息都需要进行类型检查和验证
5. **会话验证**: 处理消息前会验证当前运行和会话ID的有效性 