import React, { useState, memo, useEffect } from "react";
import {
  Globe2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileTextIcon,
  ImageIcon,
  CheckCircle,
  RefreshCw,
  Clock,
  Code2,
  ExternalLink,
} from "lucide-react";
import {
  AgentMessageConfig,
  FunctionCall,
  FunctionExecutionResult,
  ImageContent,
} from "../../types/datamodel";
import { ClickableImage } from "../atoms";
import MarkdownRenderer from "../../common/markdownrender";
import PlanView from "./plan";
import { IPlanStep, convertToIPlanSteps } from "../../types/plan";
import RenderFile from "../../common/filerenderer";
import LearnPlanButton from "../../features/Plans/LearnPlanButton";

// Types
interface MessageProps {
  message: AgentMessageConfig;
  sessionId: number;
  messageIdx: number;
  isLast?: boolean;
  className?: string;
  isEditable?: boolean;
  hidden?: boolean;
  is_step_repeated?: boolean;
  is_step_failed?: boolean;
  onSavePlan?: (plan: IPlanStep[]) => void;
  onImageClick?: (index: number) => void;
  onToggleHide?: (expanded: boolean) => void;
  onRegeneratePlan?: () => void;
  runStatus?: string;
  forceCollapsed?: boolean;
  onOpenCodeEditor?: (code: string) => void;
  // 浏览器控制相关 props
  novncPort?: string;
  showDetailViewer?: boolean;
  onToggleDetailViewer?: () => void;
  // 代码编辑器控制相关 props
  showCodeEditor?: boolean;
  isCodeEditorMinimized?: boolean;
  onToggleCodeEditor?: () => void;
  onMinimizeCodeEditor?: () => void;
}

interface RenderPlanProps {
  content: any;
  isEditable: boolean;
  onSavePlan?: (plan: IPlanStep[]) => void;
  onRegeneratePlan?: () => void;
  forceCollapsed?: boolean;
}

interface RenderStepExecutionProps {
  content: {
    index: number;
    title: string;
    plan_length: number;
    agent_name: string;
    instruction?: string;
    progress_summary: string;
    details: string;
  };
  hidden?: boolean;
  is_step_repeated?: boolean;
  is_step_failed?: boolean;
  runStatus: string;
  onToggleHide?: (expanded: boolean) => void;
}

interface ParsedContent {
  text:
    | string
    | FunctionCall[]
    | (string | ImageContent)[]
    | FunctionExecutionResult[];
  metadata?: Record<string, string>;
  plan?: IPlanStep[];
}

interface AttachedFile {
  name: string;
  type: string;
}

// Helper functions
const getImageSource = (item: ImageContent): string => {
  if (item.url) return item.url;
  if (item.data) return `data:image/png;base64,${item.data}`;
  return "/api/placeholder/400/320";
};

const getStepIcon = (
  status: string,
  runStatus: string,
  is_step_repeated?: boolean,
  is_step_failed?: boolean
) => {
  if (is_step_failed)
    return <AlertTriangle size={16} className="text-magenta-800" />;
  if (is_step_repeated)
    return <AlertTriangle size={16} className="text-magenta-800" />;
  if (status === "completed")
    return <CheckCircle size={16} className="text-magenta-800" />;
  if (status === "current" && runStatus === "active")
    return <RefreshCw size={16} className="text-magenta-800 animate-spin" />;
  if (status === "upcoming")
    return <Clock size={16} className="text-gray-400" />;
  if (status === "failed")
    return <AlertTriangle size={16} className="text-magenta-500" />;
  return null;
};

const parseUserContent = (content: AgentMessageConfig): ParsedContent => {
  const message_content = content.content;

  if (Array.isArray(message_content)) {
    return { text: message_content, metadata: content.metadata };
  }

  // If content is not a string, convert it to string
  if (typeof message_content !== "string") {
    return { text: String(message_content), metadata: content.metadata };
  }

  try {
    const parsedContent = JSON.parse(message_content);

    // Handle case where content is in content field
    if (parsedContent.content) {
      const text = parsedContent.content?.content || parsedContent.content;
      // If text is an array, it might contain images
      if (Array.isArray(text)) {
        return { text, metadata: content.metadata };
      }
      return { text, metadata: content.metadata };
    }

    // Handle case where plan exists
    let planSteps: IPlanStep[] = [];
    if (parsedContent.plan && typeof parsedContent.plan === "string") {
      try {
        planSteps = convertToIPlanSteps(parsedContent.plan);
      } catch (e) {
        console.error("Failed to parse plan:", e);
        planSteps = [];
      }
    }

    // Return both the content and plan if they exist
    return {
      text: parsedContent.content || content,
      plan: planSteps.length > 0 ? planSteps : undefined,
      metadata: content.metadata,
    };
  } catch (e) {
    // If JSON parsing fails, return original content
    return { text: message_content, metadata: content.metadata };
  }
};

const parseContent = (content: any): string => {
  if (typeof content !== "string") return String(content);

  try {
    const parsedContent = JSON.parse(content);
    return parsedContent.content?.content || parsedContent.content || content;
  } catch {
    return content;
  }
};

const parseorchestratorContent = (
  content: string,
  metadata?: Record<string, any>
) => {
  if (messageUtils.isFinalAnswer(metadata)) {
    return {
      type: "final-answer" as const,
      content: content.substring("Final Answer:".length).trim(),
    };
  }

  try {
    const parsedContent = JSON.parse(content);
    if (messageUtils.isPlanMessage(metadata)) {
      return { type: "plan" as const, content: parsedContent };
    }
    if (messageUtils.isStepExecution(metadata)) {
      return { type: "step-execution" as const, content: parsedContent };
    }
  } catch {}

  return { type: "default" as const, content };
};

const RenderMultiModalBrowserStep: React.FC<{
  content: (string | ImageContent)[];
  onImageClick?: (index: number) => void;
}> = memo(({ content, onImageClick }) => (
  <div className="text-sm">
    {content.map((item, index) => {
      if (typeof item !== "string") return null;

      const hasNextImage =
        index < content.length - 1 && typeof content[index + 1] === "object";

      return (
        <div key={index} className="relative pl-4">
          {/* Full-height connector line */}
          <div
            className="absolute top-0 bottom-0 left-0 w-2 border-l-[2px] border-b-[2px] rounded-bl-lg"
            style={{ borderColor: "var(--color-border-secondary)" }}
          />

          {/* Content container */}
          <div className="flex items-center h-full">
            {hasNextImage && (
              <div className="flex-shrink-0 mr-1 -ml-1 mt-2">
                <Globe2
                  size={16}
                  className="text-magenta-800 hover:text-magenta-900 cursor-pointer"
                  onClick={() => onImageClick?.(index)}
                />
              </div>
            )}

            {/* Text content */}
            <div
              className="flex-1 cursor-pointer mt-2"
              onClick={() => onImageClick?.(index)}
            >
              <MarkdownRenderer content={item} indented={true} />
            </div>
          </div>
        </div>
      );
    })}
  </div>
));

const RenderMultiModal: React.FC<{
  content: (string | ImageContent)[];
}> = memo(({ content }) => (
  <div className="space-y-2 text-sm">
    {content.map((item, index) => (
      <div key={index}>
        {typeof item === "string" ? (
          <MarkdownRenderer content={item} indented={true} />
        ) : (
          <ClickableImage
            src={getImageSource(item)}
            alt={`Content ${index}`}
            className="max-w-[400px]  max-h-[30vh] rounded-lg"
          />
        )}
      </div>
    ))}
  </div>
));

const RenderToolCall: React.FC<{ content: FunctionCall[] }> = memo(
  ({ content }) => (
    <div className="space-y-2 text-sm">
      {content.map((call) => (
        <div key={call.id} className="border border-secondary rounded p-2">
          <div className="font-medium">Function: {call.name}</div>
          <MarkdownRenderer
            content={JSON.stringify(JSON.parse(call.arguments), null, 2)}
            indented={true}
          />
        </div>
      ))}
    </div>
  )
);

const RenderToolResult: React.FC<{ content: FunctionExecutionResult[] }> = memo(
  ({ content }) => (
    <div className="space-y-2 text-sm">
      {content.map((result) => (
        <div key={result.call_id} className="rounded p-2">
          <div className="font-medium">Result ID: {result.call_id}</div>
          <MarkdownRenderer content={result.content} indented={true} />
        </div>
      ))}
    </div>
  )
);

const RenderPlan: React.FC<RenderPlanProps> = memo(
  ({ content, isEditable, onSavePlan, onRegeneratePlan, forceCollapsed }) => {
    // Make sure content.steps is an array before using it
    const initialSteps = Array.isArray(content.steps) ? content.steps : [];

    // Convert to IPlanStep[] if needed
    const initialPlanSteps: IPlanStep[] = initialSteps.map((step: any) => ({
      title: step.title || "",
      details: step.details || "",
      enabled: step.enabled !== false,
      open: step.open || false,
      agent_name: step.agent_name || "",
    }));

    const [planSteps, setPlanSteps] = useState<IPlanStep[]>(initialPlanSteps);

    return (
      <div className="space-y-2 text-sm">
        <PlanView
          task={content.task || "Untitled Task"}
          plan={planSteps}
          setPlan={setPlanSteps}
          viewOnly={!isEditable}
          onSavePlan={onSavePlan}
          onRegeneratePlan={onRegeneratePlan}
          forceCollapsed={forceCollapsed}
          fromMemory={content.from_memory || false}
        />
      </div>
    );
  }
);

const RenderStepExecution: React.FC<RenderStepExecutionProps> = memo(
  ({
    content,
    hidden,
    is_step_repeated, // is_step_repeated means the step is being re-tried
    is_step_failed, // is_step_failed means the step is being re-planned
    runStatus,
    onToggleHide,
  }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
      if (hidden && isExpanded) {
        setIsExpanded(false);
      } else if (!hidden && !isExpanded) {
        setIsExpanded(true);
      }
    }, [hidden]);

    const handleToggle = () => {
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      onToggleHide?.(newExpanded);
    };

    const isUserProxyInstruction = content.agent_name === "user_proxy";

    if (is_step_repeated && !hidden) {
      return (
        <div className="">
          {isUserProxyInstruction && content.instruction && (
            <div className="flex items-start">
              <MarkdownRenderer content={content.instruction} />
            </div>
          )}

          {!isUserProxyInstruction && content.instruction && (
            <MarkdownRenderer
              content={content.progress_summary}
              indented={true}
            />
          )}
        </div>
      );
    }
    if (is_step_repeated && hidden) {
      return null;
    }
    // if hidden add success green thingy

    return (
      <div className="flex flex-col">
        {!isUserProxyInstruction &&
          content.instruction &&
          content.index !== 0 && (
            <div className=" mb-2">
              <MarkdownRenderer
                content={content.progress_summary}
                indented={true}
              />
            </div>
          )}
        <div
          className={`relative border-2 border-transparent hover:border-gray-300 rounded-lg p-2 cursor-pointer overflow-hidden bg-secondary`}
          onClick={handleToggle}
        >
          <div className="flex items-center w-full">
            <button
              className="flex-none flex items-center justify-center w-8 h-8 rounded-full bg-secondary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
              aria-label={
                isExpanded
                  ? "Hide following messages"
                  : "Show following messages"
              }
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-primary" />
              ) : (
                <ChevronRight size={16} className="text-primary" />
              )}
            </button>
            <div className="flex-1 mx-2">
              <div className="font-semibold text-primary">
                Step {content.index + 1}: {content.title}
              </div>
            </div>
            <div className="flex-none">
              {getStepIcon(
                hidden ? "completed" : "current",
                runStatus,
                is_step_repeated,
                is_step_failed
              )}
            </div>
          </div>
        </div>
        <div>
          {isUserProxyInstruction && content.instruction && isExpanded && (
            <div className="flex items-start">
              <MarkdownRenderer content={content.instruction} />
            </div>
          )}
        </div>
      </div>
    );
  }
);

interface RenderFinalAnswerProps {
  content: string;
  sessionId: number;
  messageIdx: number;
}

const RenderFinalAnswer: React.FC<RenderFinalAnswerProps> = memo(
  ({ content, sessionId, messageIdx }) => {
    return (
      <div className="border-2 border-secondary rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div className="font-semibold text-primary">Final Answer</div>
          <LearnPlanButton
            sessionId={sessionId}
            messageId={messageIdx}
            onSuccess={(planId: string) => {
              console.log("Plan created with ID:", planId);
            }}
          />
        </div>
        <div className="break-words">
          <MarkdownRenderer content={content} />
        </div>
      </div>
    );
  }
);

RenderFinalAnswer.displayName = "RenderFinalAnswer";

// Message type checking utilities
export const messageUtils = {
  isToolCallContent(content: unknown): content is FunctionCall[] {
    if (!Array.isArray(content)) return false;
    return content.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "arguments" in item &&
        "name" in item
    );
  },

  isMultiModalContent(content: unknown): content is (string | ImageContent)[] {
    if (!Array.isArray(content)) return false;
    return content.every(
      (item) =>
        typeof item === "string" ||
        (typeof item === "object" &&
          item !== null &&
          ("url" in item || "data" in item))
    );
  },

  isFunctionExecutionResult(
    content: unknown
  ): content is FunctionExecutionResult[] {
    if (!Array.isArray(content)) return false;
    return content.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "call_id" in item &&
        "content" in item
    );
  },

  isFinalAnswer(metadata?: Record<string, any>): boolean {
    return metadata?.type === "final_answer";
  },

  isPlanMessage(metadata?: Record<string, any>): boolean {
    return metadata?.type === "plan_message";
  },

  isStepExecution(metadata?: Record<string, any>): boolean {
    return metadata?.type === "step_execution";
  },

  isCodeMessage(message: AgentMessageConfig): boolean {
    // Check if metadata type is "code"
    if (message.metadata?.type === "code") {
      return true;
    }
    
    // Check if content contains code patterns
    if (typeof message.content === "string") {
      return (
        message.content.includes("```python") ||
        message.content.includes("def ") ||
        message.content.includes("import ")
      );
    }
    
    return false;
  },

  isBrowserMessage(message: AgentMessageConfig): boolean {
    const content = String(message.content);
    
    // Check if message has browser metadata
    if (message.metadata?.type === "browser_address" || message.metadata?.type === "browser_screenshot") {
      return true;
    }
    
    // Check if content contains browser-related keywords
    if (content.includes("browser") || content.includes("navigate") || content.includes("click") || content.includes("screenshot")) {
      return true;
    }
    
    // Check for URLs
    if (content.includes("http://") || content.includes("https://") || content.includes("localhost:")) {
      return true;
    }
    
    return false;
  },

  findUserPlan(content: unknown): IPlanStep[] {
    if (typeof content !== "string") return [];
    try {
      const parsedContent = JSON.parse(content);
      let plan = [];
      if (parsedContent.plan && typeof parsedContent.plan === "string") {
        plan = JSON.parse(parsedContent.plan);
      }
      return plan;
    } catch {
      return [];
    }
  },

  updatePlan(content: unknown, planSteps: IPlanStep[]): string {
    if (typeof content !== "string") return "";

    try {
      const parsedContent = JSON.parse(content);

      if (typeof parsedContent === "object" && parsedContent !== null) {
        parsedContent.steps = planSteps;
        return JSON.stringify(parsedContent);
      }

      return "";
    } catch (error) {
      console.error("Failed to update plan:", error);
      return "";
    }
  },

  isUser(source: string): boolean {
    return source === "user" || source === "user_proxy";
  },
};

const RenderUserMessage: React.FC<{
  parsedContent: ParsedContent;
  isUserProxy: boolean;
}> = memo(({ parsedContent, isUserProxy }) => {
  // Parse attached files from metadata if present
  const attachedFiles: AttachedFile[] = React.useMemo(() => {
    if (parsedContent.metadata?.attached_files) {
      try {
        return JSON.parse(parsedContent.metadata.attached_files);
      } catch (e) {
        console.error("Failed to parse attached_files:", e);
        return [];
      }
    }
    return [];
  }, [parsedContent.metadata?.attached_files]);

  return (
    <div className="space-y-2">
      {/* Show attached file icons if present */}
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1  rounded px-2 py-1 text-xs"
              title={file.name}
            >
              {file.type.startsWith("image") ? (
                <ImageIcon className="w-3 h-3" />
              ) : (
                <FileTextIcon className="w-3 h-3" />
              )}
              <span className="truncate max-w-[150px]">{file.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Existing content rendering */}
      {messageUtils.isMultiModalContent(parsedContent.text) ? (
        <div className="space-y-2">
          {parsedContent.text.map((item, index) => (
            <div key={index}>
              {typeof item === "string" ? (
                <div className="break-words whitespace-pre-wrap overflow-wrap-anywhere">
                  {parseContent(item)}
                </div>
              ) : (
                <></>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="break-words whitespace-pre-wrap overflow-wrap-anywhere">
          {String(parsedContent.text)}
        </div>
      )}

      {parsedContent.plan &&
        Array.isArray(parsedContent.plan) &&
        parsedContent.plan.length > 0 && (
          <PlanView
            task={""}
            plan={parsedContent.plan}
            setPlan={() => {}} // No-op since it's read-only
            viewOnly={true}
            onSavePlan={() => {}} // No-op since it's read-only
          />
        )}
    </div>
  );
});

RenderUserMessage.displayName = "RenderUserMessage";

// Code preview component
const RenderCodePreview: React.FC<{
  content: string;
  onOpenCodeEditor?: (code: string) => void;
}> = memo(({ content, onOpenCodeEditor }) => {
  const extractCodeFromContent = (content: string): string => {
    // Try to extract code from markdown code blocks
    const codeBlockMatch = content.match(/```(?:python)?\n?([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    
    // If no code block, check if content looks like code
    if (content.includes("def ") || content.includes("import ") || content.includes("class ")) {
      return content;
    }
    
    return "";
  };

  const extractedCode = extractCodeFromContent(content);
  
  if (!extractedCode) {
    // If no code found, render as normal markdown
    return (
      <div className="break-words">
        <MarkdownRenderer content={content} indented={true} />
      </div>
    );
  }

  // Show preview of first few lines
  const lines = extractedCode.split('\n');
  const previewLines = lines.slice(0, 5); // Show first 5 lines
  const hasMore = lines.length > 5;
  const previewCode = previewLines.join('\n') + (hasMore ? '\n...' : '');

  return (
    <div className="space-y-3">
      {/* Render any text before the code block */}
      {content !== extractedCode && (
        <div className="break-words">
          <MarkdownRenderer 
            content={content.replace(/```(?:python)?\n?[\s\S]*?```/, '[代码块]')} 
            indented={true} 
          />
        </div>
      )}
      
      {/* Code preview */}
      <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Python 代码
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {lines.length} 行
            </span>
          </div>
        </div>
        
        {/* Code preview */}
        <div className="relative">
          <pre className="p-3 text-sm font-mono bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-x-auto">
            <code>{previewCode}</code>
          </pre>
          
          {/* Gradient overlay if there's more content */}
          {hasMore && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
          )}
        </div>
        
        {/* Code statistics */}
        <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {lines.length} 行代码 {hasMore && `(显示前 ${previewLines.length} 行)`}
          </div>
        </div>
      </div>
    </div>
  );
});

RenderCodePreview.displayName = "RenderCodePreview";

// Main component
export const RenderMessage: React.FC<MessageProps> = memo(
  ({
    message,
    sessionId,
    messageIdx,
    runStatus,
    isLast = false,
    className = "",
    isEditable = false,
    hidden = false,
    is_step_repeated = false,
    is_step_failed = false,
    onSavePlan,
    onImageClick,
    onToggleHide,
    onRegeneratePlan,
    forceCollapsed = false,
    onOpenCodeEditor,
    novncPort,
    showDetailViewer = false,
    onToggleDetailViewer,
    showCodeEditor = false,
    isCodeEditorMinimized = false,
    onToggleCodeEditor,
    onMinimizeCodeEditor,
  }) => {
    if (!message) return null;
    if (message.metadata?.type === "browser_address") return null;

    const isUser = messageUtils.isUser(message.source);
    const isUserProxy = message.source === "user_proxy";
    const isOrchestrator = ["Orchestrator"].includes(message.source);

    const parsedContent =
      isUser || isUserProxy
        ? parseUserContent(message)
        : { text: message.content, metadata: message.metadata };

    // Use new plan message check
    const isPlanMsg = messageUtils.isPlanMessage(message.metadata);

    const orchestratorContent =
      isOrchestrator && typeof message.content === "string"
        ? parseorchestratorContent(message.content, message.metadata)
        : null;

    // Hide regeneration request messages
    if (
      parsedContent.text ===
      "Regenerate a plan that improves on the current plan"
    ) {
      return null;
    }

    return (
      <div
        className={`relative group mb-3 ${className} w-full break-words ${
          hidden &&
          (!orchestratorContent ||
            orchestratorContent.type !== "step-execution")
            ? "hidden"
            : ""
        }`}
      >
        <div
          className={`flex ${
            isUser || isUserProxy ? "justify-end" : "justify-start"
          } items-start w-full transition-all duration-200`}
        >
          <div
            className={`${
              isUser || isUserProxy
                ? `text-primary rounded-2xl bg-tertiary rounded-tr-sm px-4 py-2 ${
                    parsedContent.plan && parsedContent.plan.length > 0
                      ? "w-[80%]"
                      : "max-w-[80%]"
                  }`
                : "w-full text-primary"
            } break-words overflow-hidden`}
          >
            {/* Show user message content first */}
            {(isUser || isUserProxy) && (
              <RenderUserMessage
                parsedContent={parsedContent}
                isUserProxy={isUserProxy}
              />
            )}
            {/* Handle other content types */}
            {!isUser &&
              !isUserProxy &&
              (isPlanMsg ? (
                <RenderPlan
                  content={orchestratorContent?.content || {}}
                  isEditable={isEditable}
                  onSavePlan={onSavePlan}
                  onRegeneratePlan={onRegeneratePlan}
                  forceCollapsed={forceCollapsed}
                />
              ) : orchestratorContent?.type === "step-execution" ? (
                <RenderStepExecution
                  content={orchestratorContent.content}
                  hidden={hidden}
                  is_step_repeated={is_step_repeated}
                  is_step_failed={is_step_failed}
                  runStatus={runStatus || ""}
                  onToggleHide={onToggleHide}
                />
              ) : orchestratorContent?.type === "final-answer" ? (
                <RenderFinalAnswer
                  content={orchestratorContent.content}
                  sessionId={sessionId}
                  messageIdx={messageIdx}
                />
              ) : messageUtils.isToolCallContent(parsedContent.text) ? (
                <RenderToolCall content={parsedContent.text} />
              ) : messageUtils.isMultiModalContent(parsedContent.text) ? (
                message.metadata?.type === "browser_screenshot" ? (
                  <RenderMultiModalBrowserStep
                    content={parsedContent.text}
                    onImageClick={onImageClick}
                  />
                ) : (
                  <RenderMultiModal content={parsedContent.text} />
                )
              ) : messageUtils.isFunctionExecutionResult(parsedContent.text) ? (
                <RenderToolResult content={parsedContent.text} />
              ) : (
                <div className="break-words">
                  {message.metadata?.type === "file" ? (
                    <RenderFile message={message} />
                  ) : messageUtils.isCodeMessage(message) ? (
                    <RenderCodePreview
                      content={String(parsedContent.text)}
                      onOpenCodeEditor={onOpenCodeEditor}
                    />
                  ) : (
                    <MarkdownRenderer
                      content={String(parsedContent.text)}
                      indented={
                        !orchestratorContent ||
                        orchestratorContent.type !== "default"
                      }
                    />
                  )}
                </div>
              ))}
          </div>
        </div>
        
        {/* Control buttons for browser and code actions */}
        {!isUser && !isUserProxy && (
          <div className="mt-2 flex justify-start gap-2">
            {/* Browser control button */}
            {messageUtils.isBrowserMessage(message) && novncPort && onToggleDetailViewer && (
              <button
                type="button"
                onClick={onToggleDetailViewer}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  showDetailViewer
                    ? "bg-magenta-800 hover:bg-magenta-900 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                }`}
              >
                <Globe2 size={14} />
                {showDetailViewer ? "隐藏浏览器" : "显示浏览器"}
              </button>
            )}
            
            {/* Code editor control button */}
            {messageUtils.isCodeMessage(message) && (onOpenCodeEditor || onToggleCodeEditor) && (
              <button
                type="button"
                onClick={() => {
                  if (showCodeEditor && !isCodeEditorMinimized) {
                    // If code editor is showing (not minimized), minimize it
                    if (onMinimizeCodeEditor) {
                      onMinimizeCodeEditor();
                    }
                  } else if (onOpenCodeEditor) {
                    // If code editor is not showing, open it
                    const extractCodeFromContent = (content: string): string => {
                      console.log('##### get content #####', content)
                      // Try to extract code from markdown code blocks
                      const codeBlockMatch = content.match(/```(?:python)?\n?([\s\S]*?)```/);
                      if (codeBlockMatch) {
                        return codeBlockMatch[1].trim();
                      }
                      
                      // If no code block, check if content looks like code
                      if (content.includes("def ") || content.includes("import ") || content.includes("class ")) {
                        return content;
                      }
                      
                      return content;
                    };
                    
                    const codeContent = extractCodeFromContent(String(parsedContent.text));
                    console.log('##### get codeContent #####', codeContent)
                    onOpenCodeEditor(codeContent);
                  }
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
                  showCodeEditor && !isCodeEditorMinimized
                    ? "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                <Code2 size={14} />
                {showCodeEditor && !isCodeEditorMinimized ? "隐藏代码编辑器" : "显示代码编辑器"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

RenderMessage.displayName = "RenderMessage";
