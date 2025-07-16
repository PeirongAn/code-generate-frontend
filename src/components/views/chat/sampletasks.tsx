import React, { useState, useEffect } from "react";

interface SampleTasksProps {
  onSelect: (task: string) => void;
}

const SAMPLE_TASKS = [
  "帮我制定打了就跑的计划",
  "今天我附近的邮局几点关门？"
];

const SampleTasks: React.FC<SampleTasksProps> = ({ onSelect }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    handleResize(); // Initial width
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isLargeScreen = windowWidth >= 1024; // lg breakpoint
  const tasksPerRow = windowWidth >= 1024 ? 3 : windowWidth >= 640 ? 2 : 1; // 3 columns on lg, 2 on sm, 1 on mobile
  const defaultVisibleTasks = tasksPerRow * 2;
  const maxVisibleTasks = isLargeScreen
    ? SAMPLE_TASKS.length
    : isExpanded
    ? SAMPLE_TASKS.length
    : defaultVisibleTasks;
  const visibleTasks = SAMPLE_TASKS.slice(0, maxVisibleTasks);
  const shouldShowToggle =
    !isLargeScreen && SAMPLE_TASKS.length > defaultVisibleTasks;

  return (
    <div className="mb-6">
      <div className="mt-4 mb-2 text-sm opacity-70 text-secondary">
        或者参考以下的示例任务{" "}
      </div>
      <div className="flex flex-col gap-2 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
          {visibleTasks.map((task, idx) => (
            <button
              key={idx}
              className="rounded px-4 py-2 text-left transition-colors text-primary hover:bg-secondary bg-tertiary min-h-[3rem] flex items-center"
              onClick={() => onSelect(task)}
              type="button"
            >
              <span className="text-sm leading-relaxed">{task}</span>
            </button>
          ))}
        </div>
        {shouldShowToggle && (
          <button
            className="text-primary hover:text-secondary transition-colors text-sm font-medium mt-1"
            onClick={() => setIsExpanded(!isExpanded)}
            type="button"
          >
            {isExpanded ? "Show less..." : "Show more sample tasks..."}
          </button>
        )}
      </div>
    </div>
  );
};

export default SampleTasks;
