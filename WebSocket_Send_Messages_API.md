# WebSocket 发送消息 API 文档

## 概述
本文档描述了聊天应用中客户端向服务器发送的WebSocket消息类型及其格式规范。

## 连接信息
- **协议**: WebSocket
- **URL格式**: `ws://[host]/api/ws/runs/[runId]` 或 `wss://[host]/api/ws/runs/[runId]`
- **数据格式**: JSON

## 发送消息类型

### 1. 启动任务 (start)

**触发场景**: 
- 用户提交新任务
- 执行计划任务

**消息结构**:
```json
{
  "type": "start",
  "task": "{\"content\":\"任务描述\",\"plan\":\"计划JSON字符串\"}",
  "files": ["base64编码的文件数组"],
  "team_config": {
    "name": "团队名称",
    "participants": [],
    "team_type": "RoundRobinGroupChat",
    "component_type": "team"
  },
  "settings_config": {
    "plan": {
      "task": "任务描述",
      "steps": [],
      "plan_summary": "计划摘要"
    }
  }
}
```

**字段说明**:
- `type`: 消息类型，固定为 "start"
- `task`: 任务JSON字符串，包含内容和计划
  - `content`: 任务描述文本
  - `plan`: 计划步骤的JSON字符串（可选）
- `files`: 上传文件的base64编码数组（可选）
- `team_config`: 团队配置对象
- `settings_config`: 设置配置对象

**计划执行特殊格式**:
```json
{
  "type": "start",
  "id": "plan_1234567890",
  "task": "具体任务描述",
  "team_config": {},
  "settings_config": {
    "plan": {
      "task": "任务描述",
      "steps": [
        {
          "title": "步骤标题",
          "details": "步骤详情",
          "agent_name": "代理名称"
        }
      ],
      "plan_summary": "计划摘要"
    }
  },
  "sessionId": 123
}
```

---

### 2. 输入响应 (input_response)

**触发场景**: 
- 用户提供文本输入
- 批准或拒绝请求
- 重新生成计划

**消息结构**:
```json
{
  "type": "input_response",
  "response": "{\"accepted\":true,\"content\":\"用户响应内容\",\"plan\":\"计划JSON字符串\"}"
}
```

**字段说明**:
- `type`: 消息类型，固定为 "input_response"
- `response`: 响应JSON字符串，包含以下字段：
  - `accepted`: 布尔值，是否接受请求
  - `content`: 用户输入的文本内容
  - `plan`: 计划步骤的JSON字符串（可选）

**具体示例**:

#### 文本输入响应
```json
{
  "type": "input_response",
  "response": "{\"accepted\":false,\"content\":\"用户的文本回复\"}"
}
```

#### 批准请求响应
```json
{
  "type": "input_response", 
  "response": "{\"accepted\":true,\"content\":\"approve\"}"
}
```

#### 计划修改响应
```json
{
  "type": "input_response",
  "response": "{\"accepted\":true,\"content\":\"Plan Accepted\",\"plan\":\"[{\\\"title\\\":\\\"步骤1\\\",\\\"details\\\":\\\"详情\\\"}]\"}"
}
```

#### 重新生成计划
```json
{
  "type": "input_response",
  "response": "{\"content\":\"Regenerate a plan that improves on the current plan\",\"plan\":\"现有计划JSON\"}"
}
```

---

### 3. 停止任务 (stop)

**触发场景**: 
- 用户取消任务
- 手动停止执行

**消息结构**:
```json
{
  "type": "stop",
  "reason": "停止原因"
}
```

**字段说明**:
- `type`: 消息类型，固定为 "stop"
- `reason`: 停止原因描述

**示例**:
```json
{
  "type": "stop",
  "reason": "Cancelled by user"
}
```

---

### 4. 暂停任务 (pause)

**触发场景**: 
- 用户暂停任务执行

**消息结构**:
```json
{
  "type": "pause"
}
```

**字段说明**:
- `type`: 消息类型，固定为 "pause"

**限制条件**:
- 只有在任务状态为 "active" 时才能暂停
- 不能在 "awaiting_input" 或 "connected" 状态下暂停

---

## 发送消息的触发函数

### 1. runTask() 函数
**触发**: 用户开始新任务
**发送**: `start` 消息
**包含**: 任务内容、文件、团队配置、设置配置

### 2. processPlan() 函数
**触发**: 执行计划任务
**发送**: `start` 消息（计划执行版本）
**包含**: 计划详情、会话ID

### 3. handleInputResponse() 函数
**触发**: 用户提供输入响应
**发送**: `input_response` 消息
**包含**: 接受状态、内容、计划（可选）

### 4. handleRegeneratePlan() 函数
**触发**: 重新生成计划
**发送**: `input_response` 消息
**包含**: 重新生成请求和当前计划

### 5. handleCancel() 函数
**触发**: 用户取消任务
**发送**: `stop` 消息
**包含**: 取消原因

### 6. handlePause() 函数
**触发**: 用户暂停任务
**发送**: `pause` 消息
**包含**: 无额外数据

---

## 数据处理逻辑

### 文件处理
```typescript
// 文件会被转换为base64编码
const processedFiles = await convertFilesToBase64(files);
```

### 计划处理
```typescript
// 计划步骤会被转换为JSON字符串
const planString = plan ? convertPlanStepsToJsonString(plan.steps) : "";
```

### 任务JSON包装
```typescript
const taskJson = {
  content: query,
  ...(planString !== "" && { plan: planString }),
};
```

---

## 发送前的验证

### WebSocket连接验证
```typescript
// 检查连接状态
if (activeSocketRef.current.readyState !== WebSocket.OPEN) {
  throw new Error("WebSocket connection not available");
}
```

### 状态验证
```typescript
// 暂停时的状态检查
if (currentRun.status == "awaiting_input" || currentRun.status == "connected") {
  return; // 不能暂停
}
```

---

## 错误处理

### 连接错误
- 检查WebSocket连接状态
- 在发送前验证连接可用性
- 捕获发送异常并调用错误处理函数

### 数据验证
- 验证必需字段的存在
- 检查数据格式的正确性
- 处理JSON序列化异常

---

## 注意事项

1. **消息格式**: 所有消息都必须是有效的JSON格式
2. **连接状态**: 发送前必须确认WebSocket连接处于OPEN状态
3. **错误处理**: 所有发送操作都应该包含错误处理逻辑
4. **状态同步**: 发送消息后需要更新相应的本地状态
5. **文件上传**: 文件需要转换为base64编码后传输
6. **计划处理**: 计划数据需要序列化为JSON字符串格式

## 使用示例

### 发送简单任务
```typescript
const message = {
  type: "start",
  task: JSON.stringify({
    content: "创建一个简单的网页"
  }),
  files: [],
  team_config: defaultTeamConfig,
  settings_config: currentSettings
};
socket.send(JSON.stringify(message));
```

### 发送输入响应
```typescript
const response = {
  type: "input_response",
  response: JSON.stringify({
    accepted: true,
    content: "我同意这个计划"
  })
};
socket.send(JSON.stringify(response));
``` 