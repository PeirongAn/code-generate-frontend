import React, { useState, useRef, useEffect } from "react";
import { Globe2, Code2 } from "lucide-react";
import { Run, Message } from "../../types/datamodel";
import { RenderMessage, messageUtils } from "./rendermessage";
import { getStatusIcon } from "../statusicon";
import DetailViewer from "./detail_viewer";
import CodeIDEEditor from "./CodeIDEEditor";
import { IPlanStep, IPlan } from "../../types/plan";
import ApprovalButtons from "./approval_buttons";
import ChatInput from "./chatinput";
import { IStatus } from "../../types/app";
import { RcFile } from "antd/es/upload";
import ConfirmationRenderer from "./ConfirmationRenderer";

const DETAIL_VIEWER_CONTAINER_ID = "detail-viewer-container";

interface RunViewProps {
  run: Run;
  onSavePlan?: (plan: IPlanStep[]) => void;
  onPause?: () => void;
  onRegeneratePlan?: () => void;
  isDetailViewerMinimized: boolean;
  setIsDetailViewerMinimized: (minimized: boolean) => void;
  showDetailViewer: boolean;
  setShowDetailViewer: (show: boolean) => void;
  onApprove?: () => void;
  onDeny?: () => void;
  onAcceptPlan?: (text: string) => void;
  // Add new props needed for ChatInput
  onInputResponse?: (query: string, accepted?: boolean, plan?: IPlan) => void;
  onRunTask?: (
    query: string,
    files: RcFile[],
    plan?: IPlan,
    fresh_socket?: boolean
  ) => void;
  onCancel?: () => void;
  error?: IStatus | null;
  chatInputRef?: React.RefObject<any>;
  onExecutePlan?: (plan: IPlan) => void;
  enable_upload?: boolean;
  // 浏览器控制相关 props
  novncPort?: string;
  onToggleDetailViewer?: () => void;
  // 代码编辑器控制相关 props
  hasCode?: boolean;
  showCodeEditor?: boolean;
  onToggleCodeEditor?: () => void;
  currentCode?: string;
  onCodeRun?: (code: string) => void;
  onCodeTest?: (code: string) => void;
  onOpenCodeInEditor?: (code: string) => void;
  isCodeEditorMinimized?: boolean;
  setIsCodeEditorMinimized?: (minimized: boolean) => void;
  // 消息列表
  messages: Message[];
}

const RunView: React.FC<RunViewProps> = ({
  run,
  onSavePlan,
  onPause,
  onRegeneratePlan,
  isDetailViewerMinimized,
  setIsDetailViewerMinimized,
  showDetailViewer,
  setShowDetailViewer,
  onApprove,
  onDeny,
  onAcceptPlan,
  // Add new props here
  onInputResponse,
  onRunTask,
  onCancel,
  error,
  chatInputRef,
  onExecutePlan,
  enable_upload = false,
  novncPort: externalNovncPort,
  onToggleDetailViewer,
  hasCode = false,
  showCodeEditor = false,
  onToggleCodeEditor,
  currentCode = "",
  onCodeRun,
  onCodeTest,
  onOpenCodeInEditor,
  isCodeEditorMinimized = false,
  setIsCodeEditorMinimized,
  messages,
}) => {
  const isConfirmationMessage = (message: Message): boolean => {
    // Type guard for status
    const status: string = message.status || "";
    return (
      message.type === "result" &&
      status === "failed" &&
      message.data?.message?.includes("确认规划")
    );
  };
  const threadContainerRef = useRef<HTMLDivElement | null>(null);
  const [localNovncPort, setLocalNovncPort] = useState<string | undefined>();
  
  // Use external novncPort if provided, otherwise use local state
  const novncPort = externalNovncPort || localNovncPort;
  const [detailViewerExpanded, setDetailViewerExpanded] = useState(false);
  const [detailViewerTab, setDetailViewerTab] = useState<
    "screenshots" | "live"
  >("live");
  const [codeEditorExpanded, setCodeEditorExpanded] = useState(false);
  const [hiddenMessageIndices, setHiddenMessageIndices] = useState<Set<number>>(
    new Set()
  );
  const [hiddenStepExecutionIndices, setHiddenStepExecutionIndices] = useState<
    Set<number>
  >(new Set());
  const [thinkingMessages, setThinkingMessages] = useState<Map<string, string>>(new Map());
  const [activeMessageTypes, setActiveMessageTypes] = useState<Map<string, string>>(new Map());

  const isTogglingRef = useRef(false);

  // Add this state to track repeated step indices and their earlier occurrences
  const [repeatedStepIndices, setRepeatedStepIndices] = useState<Set<number>>(
    new Set()
  );
  const [failedStepIndices, setFailedStepIndices] = useState<Set<number>>(
    new Set()
  );

  // Add ref for the latest user message
  const latestUserMessageRef = useRef<HTMLDivElement | null>(null);

  // Add state to track the last plan message index
  const [lastPlanIndex, setLastPlanIndex] = useState<number>(-1);

  // Add this with other refs near the top of the component
  const buttonsContainerRef = useRef<HTMLDivElement | null>(null);

  // Combine scroll behavior when messages or status change
  useEffect(() => {
    if (messages.length > 0 && threadContainerRef.current) {
      // Use a small delay to ensure the DOM has updated
      setTimeout(() => {
        const container = threadContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 100);
    }
  }, [messages, run.status]);

  // Effect to handle browser_address message
  useEffect(() => {
    const browserAddressMessages = messages.filter(
      (msg: Message) => msg?.config?.metadata?.type === "browser_address"
    );
    const lastBrowserAddressMsg =
      browserAddressMessages[browserAddressMessages.length - 1];
    console.log("Last browserAddressMsg", lastBrowserAddressMsg);
    // only update if novncPort is it is different from the current novncPort
    if (
      lastBrowserAddressMsg &&
      lastBrowserAddressMsg.config.metadata?.novnc_port !== novncPort
    ) {
      setLocalNovncPort(lastBrowserAddressMsg.config.metadata?.novnc_port);
      // Removed auto-show logic - now controlled manually
    }
  }, [messages]);

  const isEditable =
    run.status === "awaiting_input" &&
    messageUtils.isPlanContent(
      messages[messages.length - 1]?.config.content
    );

  // Add state for tracking images from multimodal messages
  const [messageImages, setMessageImages] = useState<{
    urls: string[];
    titles: string[];
    messageIndices: number[];
    currentIndex?: number;
  }>({
    urls: [],
    titles: [],
    messageIndices: [],
  });

  // Function to collect images from multimodal messages for browser steps
  const collectImagesFromMessages = (messages: Message[]) => {
    const images: {
      urls: string[];
      titles: string[];
      messageIndices: number[];
      currentIndex?: number;
    } = {
      urls: [],
      titles: [],
      messageIndices: [],
    };

    let latestImageIndex = -1;

    messages.forEach((msg: Message, msgIndex: number) => {
      if (
        Array.isArray(msg?.config?.content) &&
        msg?.config?.metadata?.type === "browser_screenshot"
      ) {
        msg.config.content.forEach((item: any, itemIndex: number) => {
          if (typeof item === "object" && ("url" in item || "data" in item)) {
            const imageUrl =
              ("url" in item && item.url) ||
              ("data" in item && item.data
                ? `data:image/png;base64,${item.data}`
                : "");
            images.urls.push(imageUrl);
            images.messageIndices.push(msgIndex);
            latestImageIndex = images.urls.length - 1;
          }
          if (typeof item === "string") {
            images.titles.push(item);
          }
        });
      }
    });

    setMessageImages({
      ...images,
      currentIndex: latestImageIndex >= 0 ? latestImageIndex : undefined,
    });
  };

  // Update images when messages change
  useEffect(() => {
    collectImagesFromMessages(messages);
  }, [messages]);

  const handleMaximize = () => {
    setIsDetailViewerMinimized(false);
    setShowDetailViewer(true);
  };

  // Update handleImageClick to use the correct image index
  const handleImageClick = (messageIndex: number) => {
    const imageIndices = messageImages.messageIndices
      .map((msgIdx, imgIdx) => ({ msgIdx, imgIdx }))
      .filter(({ msgIdx }) => msgIdx === messageIndex)
      .map(({ imgIdx }) => imgIdx);

    if (imageIndices.length > 0) {
      const lastImageIndex = imageIndices[imageIndices.length - 1];
      setMessageImages((prev) => ({
        ...prev,
        currentIndex: lastImageIndex,
      }));
      setDetailViewerTab("screenshots");
      handleMaximize();
    }
  };

  const toggleMessageVisibility = (index: number) => {
    setHiddenMessageIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const toggleStepExecutionVisibility = (index: number) => {
    setHiddenStepExecutionIndices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const isStepExecution = (message: Message): boolean => {
    return (
      message.config.metadata?.type === "step_execution" ||
      message.config.metadata?.type === "substep_execution"
    );
  };

  const handleSavePlan = () => {
    const lastMessage = messages[messages.length - 1];
    if (
      lastMessage &&
      typeof lastMessage.config.content === "string" &&
      messageUtils.isPlanMessage(lastMessage.config.metadata)
    ) {
      const plan = JSON.parse(lastMessage.config.content);
      if (onSavePlan) {
        onSavePlan(plan);
      }
    }
  };

  const handleApprove = () => {
    if (onApprove) {
      onApprove();
    }
  };

  const handleDeny = () => {
    if (onDeny) {
      onDeny();
    }
  };

  const handleAcceptPlan = (text: string) => {
    if (onAcceptPlan) {
      onAcceptPlan(text);
    }
  };

  const handleRegeneratePlan = () => {
    if (onRegeneratePlan) {
      onRegeneratePlan();
    }
  };

  return (
    <div className="flex h-full w-full flex-col">
      <div
        ref={threadContainerRef}
        className="flex-grow overflow-y-auto p-4"
        style={{ height: "calc(100vh - 200px)" }}
      >
        {messages.map((msg, index) => {
          if (isConfirmationMessage(msg)) {
            return (
              <ConfirmationRenderer
                key={msg.id || index}
                message={msg}
                onConfirm={onAcceptPlan}
                onCancel={onCancel}
              />
            );
          }
          return (
            <RenderMessage
              key={msg.id || index}
              message={msg.config}
              messageIdx={index}
              hidden={hiddenMessageIndices.has(index)}
              onToggleHide={() => toggleMessageVisibility(index)}
              onImageClick={handleImageClick}
              onOpenCodeInEditor={onOpenCodeInEditor}
            />
          );
        })}
      </div>
      <div
        ref={buttonsContainerRef}
        className="buttons-container shrink-0 p-4"
      >
        {run.input_request?.input_type === "approval" ? (
          <ApprovalButtons
            status={run.status}
            onApprove={handleApprove}
            onDeny={handleDeny}
          />
        ) : null}
        <ChatInput
          ref={chatInputRef}
          onSubmit={(query, files, accepted, plan) => {
            if (
              run.status === "awaiting_input" ||
              run.status === "paused"
            ) {
              if (onInputResponse) {
                onInputResponse(query, accepted, plan);
              }
            } else {
              if (onRunTask) {
                onRunTask(query, files, plan, true);
              }
            }
          }}
          error={error ?? null}
          onCancel={onCancel}
          runStatus={run.status}
          inputRequest={run.input_request}
          isPlanMessage={
            messages.length > 0 &&
            messageUtils.isPlanMessage(
              messages[messages.length - 1].config.metadata
            )
          }
          onPause={onPause}
          enable_upload={enable_upload}
          onExecutePlan={onExecutePlan}
        />
      </div>
      {showDetailViewer && (
        <div
          id={DETAIL_VIEWER_CONTAINER_ID}
          className={`fixed bottom-0 right-0 z-50 transition-all duration-300 ${
            isDetailViewerMinimized
              ? "h-12 w-48"
              : "h-full w-full md:h-3/4 md:w-3/4"
          }`}
        >
          <DetailViewer
            novncPort={novncPort}
            activeTab={detailViewerTab}
            images={messageImages.urls}
            imageTitles={[]} // Providing empty array as it's required
            currentIndex={messageImages.currentIndex ?? 0}
            onMinimize={() => setShowDetailViewer(false)}
            isExpanded={!isDetailViewerMinimized}
            onToggleExpand={() =>
              setIsDetailViewerMinimized(!isDetailViewerMinimized)
            }
            onIndexChange={(index) => {
              setMessageImages((prev) => ({ ...prev, currentIndex: index }));
            }}
          />
        </div>
      )}
      {showCodeEditor && (
        <div
          className={`fixed bottom-0 right-0 z-50 transition-all duration-300 ${
            isCodeEditorMinimized
              ? "h-12 w-48"
              : "h-full w-full md:h-3/4 md:w-3/4"
          }`}
        >
          <CodeIDEEditor
            code={currentCode}
            onRun={onCodeRun}
            onTest={onCodeTest}
            onMinimize={() => setShowCodeEditor(false)}
            isExpanded={!isCodeEditorMinimized}
            onToggleExpand={() =>
              setIsCodeEditorMinimized && setIsCodeEditorMinimized(!isCodeEditorMinimized)
            }
          />
        </div>
      )}
    </div>
  );
};

export default RunView;
