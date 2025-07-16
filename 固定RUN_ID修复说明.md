# 固定RUN_ID修复说明

## 问题描述
用户反馈：当用户没有新增session时，应当是同一个RUN_ID。

原来的逻辑是每次发送消息都会获取最新的run，如果后端为每次消息创建新的run，那么前端就会使用不同的RUN_ID。

## 解决方案
实现在同一个session中使用固定的RUN_ID，只有当用户创建新session时才生成新的RUN_ID。

## 修改内容

### 1. 添加sessionRunId状态变量
```typescript
const [sessionRunId, setSessionRunId] = React.useState<string | null>(null); // 固定的session run ID
```

### 2. 添加生成固定run ID的函数
```typescript
// 生成固定的session run ID
const generateSessionRunId = (): string => {
  return `session_${session?.id || 'default'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
```

### 3. 修改session初始化逻辑
在`initializeSession`函数中，为每个session生成固定的run ID：
```typescript
// 生成固定的session run ID（只在session初始化时生成一次）
const fixedRunId = generateSessionRunId();
setSessionRunId(fixedRunId);
```

### 4. 修改runTask函数
不再依赖`currentRun`，直接使用固定的`sessionRunId`：
```typescript
// 使用固定的sessionRunId，如果没有则生成一个
let runId = sessionRunId;
if (!runId) {
  runId = generateSessionRunId();
  setSessionRunId(runId);
}

// Setup websocket connection
const socket = setupWebSocket(runId, fresh_socket, false);
```

### 5. 修改WebSocket相关调用
更新所有使用run ID的地方：
- 初始化WebSocket连接时使用固定的run ID
- 消息处理时使用固定的run ID
- 处理计划时使用固定的run ID

### 6. 修改消息创建逻辑
在`handleWebSocketMessage`中使用固定的run ID：
```typescript
const newMessage = createMessage(
  message.data as AgentMessageConfig,
  sessionRunId || generateSessionRunId(),
  session.id
);
```

## 主要修改的文件
- `frontend-zh/src/components/views/chat/chat.tsx`

## 生效原理
1. 当用户打开一个session时，生成一个固定的run ID
2. 在整个session生命周期中，所有消息都使用这个固定的run ID
3. 只有当用户切换到新session时，才会生成新的run ID
4. 所有WebSocket连接和消息处理都使用这个固定的run ID

## 预期效果
- 同一个session中的所有消息都会有相同的run_id
- 用户发送多次消息不会创建新的run
- 只有切换session时才会生成新的run_id
- 保持消息的连续性和完整性

## 向后兼容性
- 保持现有的消息格式不变
- 保持现有的API调用不变
- 只修改了run ID的生成和使用逻辑

## 测试方法
1. 打开一个session
2. 发送多次消息
3. 检查所有消息的run_id是否相同
4. 切换到新session
5. 检查新session的消息是否有新的run_id
6. 回到原session，检查run_id是否保持不变 