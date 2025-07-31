import { RcFile } from "antd/es/upload";
import React, { useEffect, useRef, useState } from "react";
import { IStatus } from "../../types/app";
import { Message, Run } from "../../types/datamodel";
import { IPlan, IPlanStep } from "../../types/plan";
import { getStatusIcon } from "../statusicon";
import CodeIDEEditor from "./CodeIDEEditor";
import ConfirmationRenderer from "./ConfirmationRenderer";
import ApprovalButtons from "./approval_buttons";
import ChatInput from "./chatinput";
import DetailViewer from "./detail_viewer";
import { RenderMessage, messageUtils } from "./rendermessage";

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
  setShowCodeEditor: (show: boolean) => void;
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
  sessionId: string;
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
  setShowCodeEditor,
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
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
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
  const handleToggleHide = async (messageIndex: number, expanded: boolean) => {
    // If a toggle operation is already in progress, ignore this request
    if (isTogglingRef.current) {
      console.log(
        "Something bad: Toggle operation already in progress, ignoring request"
      );
      return;
    }

    try {
      isTogglingRef.current = true;
      const newIndicesToHide = new Set();

      // Find the next significant message index
      let nextSignificantIndex = run.messages.length; // Default to end of messages
      for (let i = messageIndex + 1; i < run.messages.length; i++) {
        const msg = run.messages[i];
        const content = msg.config.content;

        // Check if this is a significant message that should stop the hiding
        if (
          typeof content === "string" &&
          (messageUtils.isFinalAnswer(msg.config.metadata) ||
            messageUtils.isPlanMessage(msg.config.metadata))
        ) {
          nextSignificantIndex = i;
          break;
        }

        // Check for messages with title and details that aren't duplicates
        if (
          messageUtils.isStepExecution(msg.config.metadata) &&
          typeof content === "string"
        ) {
          try {
            const currentStep = JSON.parse(content);
            if (currentStep.title && currentStep.details) {
              // Check if this step is a duplicate of any previous step
              const earlierMessages = run.messages.slice(0, i);
              const isDuplicate = earlierMessages.some(
                (earlierMsg: Message) => {
                  if (typeof earlierMsg.config.content !== "string")
                    return false;
                  try {
                    const earlierContent = JSON.parse(
                      earlierMsg.config.content
                    );
                    return (
                      earlierContent.title === currentStep.title &&
                      earlierContent.details === currentStep.details
                    );
                  } catch {
                    return false;
                  }
                }
              );

              if (!isDuplicate) {
                nextSignificantIndex = i;
                break;
              }
            }
          } catch {
            // If we can't parse the JSON, continue to next message
            continue;
          }
        }
      }

      // Update hidden states for messages between current and next significant message
      for (let i = messageIndex + 1; i < nextSignificantIndex; i++) {
        newIndicesToHide.add(i);
      }
      if (!expanded) {
        setHiddenMessageIndices((prevSet) => {
          const updatedSet = new Set(prevSet);
          newIndicesToHide.forEach((index: any) => updatedSet.add(index));
          return updatedSet;
        });
      } else {
        setHiddenMessageIndices((prevSet) => {
          const updatedSet = new Set(prevSet);
          newIndicesToHide.forEach((index: any) => updatedSet.delete(index));
          return updatedSet;
        });
      }
    } finally {
      // Always reset the toggling flag when done
      isTogglingRef.current = false;
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
  useEffect(() => {
    if (!run.messages.length) return;

    const updatedMessages = [...run.messages];

    // updatedMessages.forEach((msg: Message, idx: number) => {
    //   if (idx === 0) return;

    //   const userPlans = messageUtils.findUserPlan(msg.config.content);

    //   // Check if this is a user message with a plan
    //   if (messageUtils.isUser(msg.config.source) && userPlans.length > 0) {
    //     const prevIdx = idx - 1;
    //     const prevMsg = updatedMessages[prevIdx];

    //     // Check if previous message is a plan
    //     if (prevMsg && messageUtils.isPlanMessage(prevMsg.config.metadata)) {
    //       try {
    //         // Create a new message object with updated content
    //         const updatedContent = messageUtils.updatePlan(
    //           prevMsg.config.content,
    //           userPlans
    //         );

    //         if (updatedContent !== prevMsg.config.content) {
    //           updatedMessages[prevIdx] = {
    //             ...prevMsg,
    //             config: {
    //               ...prevMsg.config,
    //               content: updatedContent,
    //               version: (prevMsg.config.version || 0) + 1,
    //             },
    //           };
    //         }
    //       } catch (error) {
    //         console.error(
    //           `Error updating plan for message at index ${prevIdx}:`,
    //           error
    //         );
    //       }
    //     }
    //   }
    // });
    console.log('##### updatedMessages #####', updatedMessages);
    setLocalMessages(updatedMessages);
  }, [run.messages]);
  const isStepExecution = (message: Message): boolean => {
    return (
      message.config.metadata?.type === "step_execution" ||
      message.config.metadata?.type === "substep_execution"
    );
  };

  useEffect(() => {
    const newRepeatedIndices = new Set<number>();
    const newFailedIndices = new Set<number>();
    const newRepeatedHistory = new Map<number, number[]>();

    // For each message that is a step execution
    run.messages.forEach((msg: Message, msgIndex: number) => {
      if (!isStepExecution(msg)) return;

      try {
        const content = JSON.parse(String(msg.config.content));

        // Look for earlier messages with same step details
        const earlierMessages = run.messages.slice(0, msgIndex);
        const identicalStepIndices: number[] = [];

        // Find all identical steps
        earlierMessages.forEach((earlierMsg: Message, idx: number) => {
          if (typeof earlierMsg.config.content !== "string") return;
          try {
            const earlierContent = JSON.parse(earlierMsg.config.content);
            if (
              earlierContent.index === content.index &&
              earlierContent.title === content.title &&
              earlierContent.details === content.details
            ) {
              identicalStepIndices.push(idx);
            }
          } catch {
            return;
          }
        });
        console.log('##### identicalStepIndices #####', identicalStepIndices);
        // If we found identical steps, check for Final Answer or Plan after the last one
        if (identicalStepIndices.length > 0) {
          const messagesBetween = run.messages.slice(
            identicalStepIndices[identicalStepIndices.length - 1] + 1,
            msgIndex
          );

          const hasSeparator = messagesBetween.some((msg: Message) => {
            if (typeof msg.config.content !== "string") return false;
            return (
              messageUtils.isPlanMessage(msg.config.metadata) ||
              messageUtils.isFinalAnswer(msg.config.metadata)
            );
          });

          // Only mark as repeated if there's no separator
          if (!hasSeparator) {
            newRepeatedIndices.add(msgIndex);
            newRepeatedHistory.set(msgIndex, identicalStepIndices);
          }
        }

        // Separate step failure detection
        const nextMessages = run.messages.slice(msgIndex + 1);
        for (const nextMsg of nextMessages) {
          if (typeof nextMsg.config.content !== "string") continue;

          // If we find a step execution, plan, or final answer before finding "Replanning...", break
          try {
            if (messageUtils.isStepExecution(nextMsg.config.metadata)) break;
            if (messageUtils.isPlanMessage(nextMsg.config.metadata)) break;
            if (nextMsg.config.metadata?.type === "replanning") {
              newFailedIndices.add(msgIndex);
              break;
            }
          } catch {
            if (messageUtils.isFinalAnswer(nextMsg.config.metadata)) break;
          }
        }
      } catch {
        // Skip if we can't parse the message
      }
    });
    setRepeatedStepIndices(newRepeatedIndices);
    setFailedStepIndices(newFailedIndices);
    console.log('##### newRepeatedIndices #####', newRepeatedIndices);
    console.log('##### newFailedIndices #####', newFailedIndices);

    // handle auto-hiding of previous step execution messages
    const newHiddenStepExecutionIndices = new Set(hiddenStepExecutionIndices);
    // Process messages in order
    (async () => {
      for (let i = 0; i < run.messages.length; i++) {
        const msg: Message = run.messages[i];
        if (typeof msg.config.content !== "string") continue;

        try {
          // If this is a final answer, hide all previous step executions
          if (messageUtils.isFinalAnswer(msg.config.metadata)) {
            for (let j = 0; j < i; j++) {
              const prevMsg: Message = run.messages[j];
              if (typeof prevMsg.config.content === "string") {
                try {
                  if (messageUtils.isStepExecution(prevMsg.config.metadata)) {
                    newHiddenStepExecutionIndices.add(j);
                    handleToggleHide(j, false);
                    // delay for 100ms
                    await new Promise((resolve) => setTimeout(resolve, 100));
                  }
                } catch {}
              }
            }
            continue;
          }
          const content = JSON.parse(msg.config.content);

          // If this is a step execution that's not repeated
          if (
            messageUtils.isStepExecution(msg.config.metadata) &&
            !newRepeatedIndices.has(i)
          ) {
            // Hide all previous step executions
            for (let j = 0; j < i; j++) {
              const prevMsg: Message = run.messages[j];
              if (typeof prevMsg.config.content === "string") {
                try {
                  if (messageUtils.isStepExecution(prevMsg.config.metadata)) {
                    if (!newRepeatedIndices.has(j)) {
                      handleToggleHide(j, false);
                      newHiddenStepExecutionIndices.add(j);
                      // delay for 100ms
                      await new Promise((resolve) => setTimeout(resolve, 100));
                    }
                  }
                } catch {}
              }
            }
          }
        } catch {}
      }

      if (
        newHiddenStepExecutionIndices.size > 0 &&
        newHiddenStepExecutionIndices !== hiddenStepExecutionIndices
      ) {
        setHiddenStepExecutionIndices((prevSet) => {
          const updatedSet = new Set<number>(prevSet);
          Array.from(newHiddenStepExecutionIndices).forEach((index) => {
            updatedSet.add(index);
          });
          return updatedSet;
        });
      }
    })();
  }, [run.messages]);

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
  // Add this before the return statement
  const lastMessage = localMessages[localMessages.length - 2];
  const isPlanMsg =
  lastMessage && messageUtils.isPlanMessage(lastMessage.config.metadata);

  return (
    <div className="flex h-full w-full flex-col">
      <div
        ref={threadContainerRef}
        className="flex-grow overflow-y-auto p-4"
        style={{ height: "calc(100vh - 200px)" }}
      >
          {localMessages.length > 0 &&
            localMessages.map((msg: Message, idx: number) => {
              const isCurrentMessagePlan =
                typeof msg.config.content === "string" &&
                messageUtils.isPlanMessage(msg.config.metadata);

              const isLatestPlan =
                isCurrentMessagePlan && idx === localMessages.length - 1;

              const shouldForceCollapse =
                isCurrentMessagePlan && idx !== lastPlanIndex;

              return (
                <div
                  key={`message-${msg.id || idx}-${run.id}`}
                  className="w-full"
                  ref={
                    messageUtils.isUser(msg.config.source)
                      ? latestUserMessageRef
                      : null
                  }
                >
                  <RenderMessage
                    key={`render-${msg.id || idx}-${msg.config.version || 0}`}
                    message={msg.config}
                    sessionId={msg.session_id}
                    messageIdx={idx}
                    isLast={idx === localMessages.length - 1}
                    isEditable={isEditable && idx === localMessages.length - 1}
                    hidden={
                      hiddenMessageIndices.has(idx)
                    }
                    is_step_repeated={repeatedStepIndices.has(idx)}
                    is_step_failed={failedStepIndices.has(idx)}
                    onSavePlan={onSavePlan}
                    onImageClick={() => handleImageClick(idx)}
                    onToggleHide={(expanded: boolean) =>
                      handleToggleHide(idx, expanded)
                    }
                    runStatus={run.status}
                    onRegeneratePlan={
                      isLatestPlan ? handleRegeneratePlan : undefined
                    }
                    forceCollapsed={false}
                  />
                </div>
              );
            })}
                  {/* Status Icon at top */}
        <div className="pt-2 pb-2 flex-shrink-0">
            <div className="inline-block">
              {getStatusIcon(
                run.status,
                run.error_message,
                run.team_result?.task_result?.stop_reason,
                run.input_request
              )}
            </div>
        </div>

          {/* Approval Buttons after status */}
          <div className="flex-shrink-0">
            <ApprovalButtons
              status={run.status}
              inputRequest={run.input_request}
              isPlanMessage={isPlanMsg}
              onApprove={onApprove}
              onDeny={onDeny}
              onAcceptPlan={onAcceptPlan}
              onRegeneratePlan={onRegeneratePlan}
            />
          </div>
    
        
      </div>
      <div
        ref={buttonsContainerRef}
        className="buttons-container shrink-0 p-4"
      >
       
        <ChatInput
          ref={chatInputRef}
          onSubmit={(query, files, accepted, plan) => {
            console.log('##### run currentRun.status #####', run.status);
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
