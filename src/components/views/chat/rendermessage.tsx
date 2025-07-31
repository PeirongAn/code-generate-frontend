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
import ThinkingRenderer from "./ThinkingRenderer";

// Types
interface MessageProps {
  message: AgentMessageConfig;
  sessionId: number | string;
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
  onToggleCodeEditor?: (code: string) => void;
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

const extractJson = (text: string): { json: string | null; remaining: string } => {
    const startIndex = text.indexOf('{');
    if (startIndex === -1) {
        return { json: null, remaining: text };
    }

    let braceCount = 0;
    let endIndex = -1;

    for (let i = startIndex; i < text.length; i++) {
        if (text[i] === '{') {
        braceCount++;
        } else if (text[i] === '}') {
        braceCount--;
        }

        if (braceCount === 0 && text[i] === '}') {
        endIndex = i;
        break;
        }
    }

    if (endIndex !== -1) {
        const jsonString = text.substring(startIndex, endIndex + 1);
        try {
        JSON.parse(jsonString); // Validate if it's actual JSON
        const remainingText = text.substring(endIndex + 1);
        return { json: jsonString, remaining: remainingText };
        } catch (e) {
        // It looked like JSON, but wasn't.
        return { json: null, remaining: text };
        }
    }

    // No matching brace found
    return { json: null, remaining: text };
}

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
      text: parsedContent.content || message_content,
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
    if (
      (parsedContent.steps && Array.isArray(parsedContent.steps)) ||
      parsedContent.dialog
    ) {
      if (parsedContent.dialog) {
        return { type: "default" as const, content: parsedContent.dialog };
      }
      return { type: "plan" as const, content: parsedContent };
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
              <MarkdownRenderer content={item} />
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
          <MarkdownRenderer content={item} />
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
          <MarkdownRenderer content={result.content} />
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
  sessionId: number | string;
  messageIdx: number;
}
interface RenderAgentErrorProps {
  content: string;
  metadata?: Record<string, any>;
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

const RenderAgentError: React.FC<RenderAgentErrorProps> = memo(
  ({ content, metadata }) => {
    const agentType = metadata?.agent_type || "unknown";
    const error = metadata?.error;
    const success = metadata?.success;

    return (
      <div className="agent-error-container rounded-lg border border-red-200 bg-gradient-to-r from-red-50 to-rose-50 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-sm font-semibold text-red-800">
                代理错误
              </span>
              {agentType !== "unknown" && (
                <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded">
                  {agentType}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-700">
              <MarkdownRenderer content={content} indented={false} />
            </div>
            {error && (
              <div className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded">
                错误详情: {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

RenderAgentError.displayName = "RenderAgentError";

RenderFinalAnswer.displayName = "RenderFinalAnswer";

// Message type checking utilities
export const messageUtils = {
  isToolCallContent(content: unknown): content is FunctionCall[] {
    return (
      Array.isArray(content) &&
      content.every((item) => typeof item === "object" && "function" in item)
    );
  },

  isMultiModalContent(content: unknown): content is (string | ImageContent)[] {
    if (!Array.isArray(content)) {
      return false;
    }
    // Check if it's not a FunctionExecutionResult array
    if (content.every((item) => typeof item === "object" && item !== null && "call_id" in item)) {
      return false;
    }
    return (
      content.every(
        (item) =>
          typeof item === "string" ||
          (typeof item === "object" && item !== null && "url" in item)
      )
    );
  },
  isFunctionExecutionResult(
    content: unknown
  ): content is FunctionExecutionResult[] {
    return (
      Array.isArray(content) &&
      content.every(
        (item) => typeof item === "object" && "function_name" in item
      )
    );
  },
  isFinalAnswer(metadata?: Record<string, any>): boolean {
    return metadata?.type === "final_answer";
  },

  isPlanMessage(metadata?: Record<string, any>): boolean {
    return metadata?.type === "steps" || metadata?.content_type === "steps";
  },

  isStepExecution(metadata?: Record<string, any>): boolean {
    return metadata?.type === "step_execution";
  },

  isThinkingMessage(metadata?: Record<string, any>): boolean {
    return metadata?.type === "thinking";
  },

  isResponseMessage(metadata?: Record<string, any>): boolean {
    return metadata?.type === "response";
  },

  isUserInputMessage(metadata?: Record<string, any>): boolean {
    return metadata?.type === "user_input";
  },

  isAgentErrorMessage(metadata?: Record<string, any>): boolean {
    return (
      typeof metadata?.type === "string" && metadata.type.startsWith("agent_error")
    );
  },

  extractJsonFromMarkdown(content: string): string | null {
    // New regex without 's' flag, using [\s\S] instead of .
    const regex = /```json\n([\s\S]*?)\n```/;
    const match = content.match(regex);
    if (match && match[1]) {
      return match[1];
    } else {
      return null;
    }
  },

  isPlanContent(content: unknown): content is string {
    if (typeof content !== 'string') {
      return false;
    }
    try {
        if (!content.trim().startsWith('{')) {
          return false;
        }
      const parsed = JSON.parse(content);
        return typeof parsed === "object" && parsed !== null && ("task" in parsed || "steps" in parsed || "plan_summary" in parsed);
      } catch (e) {
      return false;
    }
  },

  extractPlanAndRemainingText(content: string): { plan: object | null; remaining: string } {
    const { json, remaining } = extractJson(content);

    if (json) {
      try {
        const parsed = JSON.parse(json);
        if (typeof parsed === "object" && parsed !== null && ("task" in parsed || "steps" in parsed || "plan_summary" in parsed)) {
          return { plan: parsed, remaining: remaining.trim() };
        }
      } catch (e) {
        // Fall through
      }
    }

    return { plan: null, remaining: content };
  },

  isStepsResponse(content: unknown): boolean {
    if (typeof content !== "string") return false;
    let jsonString = this.extractJsonFromMarkdown(content);
    if (!jsonString) {
      if (content.trim().startsWith('{')) {
        jsonString = content;
      } else {
        return false;
      }
    }
    try {
      const parsed = JSON.parse(jsonString);
      return typeof parsed === "object" && parsed !== null && ("steps" in parsed || "dialog" in parsed);
    } catch {
      return false;
    }
  },

  parseStepsFromResponse(content: string): { steps: IPlanStep[]; summary?: string; dialog?: string } {
    let jsonString = this.extractJsonFromMarkdown(content);
    if (!jsonString) {
      if (content.trim().startsWith('{')) {
        jsonString = content;
      } else {
        return { steps: [] };
      }
    }
    console.log('####get parseStepsFromResponse####', content)
    try {
      const parsed = JSON.parse(jsonString);
      const rawSteps = parsed.steps || [];

      if (rawSteps.length === 0) {
        return { steps: [], summary: parsed.plan_summary, dialog: parsed.dialog };
      }

      const firstStep = rawSteps[0];
      let normalizedSteps: IPlanStep[] = [];

      // Case 1: Array of strings like ["step1: ..."]
      if (typeof firstStep === 'string') {
        normalizedSteps = rawSteps.map((stepString: string) => {
          const parts = stepString.split(/:(.*)/); // Split only on the first colon, removed 's' flag
          return {
            title: parts[0]?.trim() || "Step",
            details: parts[1]?.trim() || stepString,
            enabled: true,
            agent_name: "",
          };
        });
      }
      // Case 2: Array of objects like [{"step1": "..."}]
      else if (typeof firstStep === 'object' && firstStep !== null && !('details' in firstStep)) {
        rawSteps.forEach((step: any) => {
          if (typeof step === 'object' && step !== null) {
            for (const key in step) {
              if (Object.prototype.hasOwnProperty.call(step, key)) {
                normalizedSteps.push({
                  title: key,
                  details: String(step[key]),
                  enabled: true,
                  agent_name: "",
                });
                break; // Process only the first key-value pair
              }
            }
          }
        });
      }
      // Case 3: Already in the correct format
      else {
        normalizedSteps = rawSteps;
      }

      return {
        steps: normalizedSteps,
        summary: parsed.plan_summary,
        dialog: parsed.dialog,
      };
    } catch (e) {
      console.error("Failed to parse steps from response:", e);
      return { steps: [] };
    }
  },

  isCodeMessage(message: AgentMessageConfig): boolean {
    // if (message.content) {
    //   const contentStr = Array.isArray(message.content)
    //     ? message.content.join("\n")
    //     : String(message.content);
    //   const codeBlockRegex = /```.*\n[\s\S]*?\n```/;
    //   return codeBlockRegex.test(contentStr);
    // }
    // return false;
    return message.metadata?.type === "codes";
  },

  isBrowserMessage(message: AgentMessageConfig): boolean {
    return (
      message.metadata?.agent_name === "Web Surfer" ||
      (message.metadata?.content_type === "browser_actions" &&
        Array.isArray(message.content))
    );
  },
  findUserPlan(content: unknown): IPlanStep[] {
    if (typeof content !== "string") {
      return [];
    }
    try {
      const parsedContent = JSON.parse(content);
      if (parsedContent.plan) {
        return convertToIPlanSteps(parsedContent.plan);
      }
      return [];
    } catch (e) {
      return [];
    }
  },

  updatePlan(content: unknown, planSteps: IPlanStep[]): string {
    if (typeof content !== "string") {
      return String(content);
    }
    try {
      const parsedContent = JSON.parse(content);
      if (parsedContent.plan) {
        parsedContent.plan = planSteps;
        return JSON.stringify(parsedContent, null, 2);
      }
      return content;
    } catch (e) {
      return content;
    }
  },

  isUser(source: string): boolean {
    return source === "user";
  },
};

const RenderUserMessage: React.FC<MessageProps> = memo((props) => {
  const parsedContent = parseUserContent(props.message);
  const textContent = parsedContent.text;

  const contentHasPlan = 'plan' in parsedContent && parsedContent.plan;

  return (
    <div className="flex items-start gap-3 justify-end">
      <div className="w-full max-w-full lg:max-w-4xl text-sm bg-white rounded-lg p-4 shadow-sm order-1">
        {contentHasPlan ? (
          <RenderPlan
            content={{ steps: parsedContent.plan }}
            isEditable={false}
            forceCollapsed={false}
            {...props}
          />
        ) : null}
        {messageUtils.isMultiModalContent(textContent) ? (
          <RenderMultiModal content={textContent} />
        ) : messageUtils.isFunctionExecutionResult(textContent) ? (
          <RenderToolResult content={textContent} />
        ) : (
          <MarkdownRenderer
            content={
              messageUtils.isToolCallContent(textContent)
                ? `\`\`\`json\n${JSON.stringify(textContent, null, 2)}\n\`\`\``
                : String(textContent)
            }
          />
        )}
      </div>
      <div className="relative w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold order-2">
        U
        </div>
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
    isLast,
    className,
    isEditable,
    hidden,
    is_step_repeated,
    is_step_failed,
    onSavePlan,
    onImageClick,
    onToggleHide,
    onRegeneratePlan,
    runStatus,
    forceCollapsed,
    onOpenCodeEditor,
    novncPort,
    showDetailViewer,
    onToggleDetailViewer,
    showCodeEditor,
    isCodeEditorMinimized,
    onToggleCodeEditor,
    onMinimizeCodeEditor,
  }) => {
    if (hidden) {
      return (
        <div
          className="flex items-center text-gray-500 cursor-pointer"
          onClick={() => {
            console.log('##### toggle hide #####')
            onToggleHide?.(true)
          }}
        >
          {/* <ChevronRight size={16} />
          <span>Show hidden messages</span> */}
        </div>
      );
    }

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
                    'plan' in parsedContent && parsedContent.plan && parsedContent.plan.length > 0
                      ? "w-[80%]"
                      : "max-w-[80%]"
                  }`
                : "w-full text-primary"
            } break-words overflow-hidden`}
          >
            {/* Show user message content first */}
            {(isUser || isUserProxy) && (
              <RenderUserMessage
                message={message}
                sessionId={sessionId}
                messageIdx={messageIdx}
                isLast={isLast}
                className={className}
                isEditable={isEditable}
                hidden={hidden}
                is_step_repeated={is_step_repeated}
                is_step_failed={is_step_failed}
                onSavePlan={onSavePlan}
                onImageClick={onImageClick}
                onToggleHide={onToggleHide}
                onRegeneratePlan={onRegeneratePlan}
                runStatus={runStatus}
                forceCollapsed={forceCollapsed}
                onOpenCodeEditor={onOpenCodeEditor}
                novncPort={novncPort}
                showDetailViewer={showDetailViewer}
                onToggleDetailViewer={onToggleDetailViewer}
                showCodeEditor={showCodeEditor}
                isCodeEditorMinimized={isCodeEditorMinimized}
                onToggleCodeEditor={onToggleCodeEditor}
                onMinimizeCodeEditor={onMinimizeCodeEditor}
              />
            )}
            {/* Handle other content types */}
            {!isUser &&
              !isUserProxy &&
              (messageUtils.isAgentErrorMessage(message.metadata) ? (
                <RenderAgentError
                  content={String(parsedContent.text)}
                  metadata={message.metadata}
                />
              ) : messageUtils.isThinkingMessage(message.metadata) ? (
                <ThinkingRenderer
                  content={String(parsedContent.text)}
                  isComplete={message.metadata?.is_complete || false}
                  timestamp={message.metadata?.timestamp}
                />
              ) : messageUtils.isPlanMessage(message.metadata) ? (
                (() => {
                  const { steps, summary, dialog } = messageUtils.parseStepsFromResponse(String(parsedContent.text));
                  return (
                    <div className="response-steps">
                      {summary && (
                        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <h4 className="font-semibold text-blue-800 dark:text-blue-200 mb-2">
                            计划摘要
                          </h4>
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            {summary}
                          </p>
                        </div>
                      )}
                      {dialog && (
                        <div className="mb-2">
                          <MarkdownRenderer content={dialog} />
                        </div>
                      )}
                      {steps && steps.length > 0 && (
                        <PlanView
                          task="执行计划"
                          plan={steps}
                          setPlan={() => {}} // 只读模式
                          viewOnly={true}
                          isCollapsed={false}
                          forceCollapsed={false}
                        />
                      )}
                    </div>
                  );
                })()
              ) : orchestratorContent?.type === "plan" ? (
                <RenderPlan
                  content={orchestratorContent.content}
                  isEditable={isEditable || false}
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
                <RenderToolCall content={parsedContent.text as FunctionCall[]} />
              ) : messageUtils.isMultiModalContent(parsedContent.text) ? (
                message.metadata?.type === "browser_screenshot" ? (
                  <RenderMultiModalBrowserStep
                    content={parsedContent.text as (string | ImageContent)[]}
                    onImageClick={onImageClick}
                  />
                ) : (
                  <RenderMultiModal content={parsedContent.text as (string | ImageContent)[]} />
                )
              ) : messageUtils.isFunctionExecutionResult(parsedContent.text) ? (
                <RenderToolResult content={parsedContent.text as FunctionExecutionResult[]} />
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
