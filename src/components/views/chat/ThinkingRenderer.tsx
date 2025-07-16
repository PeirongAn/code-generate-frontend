import React, { useEffect, useState } from 'react';
import { Brain, ChevronDown, ChevronRight } from 'lucide-react';

interface ThinkingRendererProps {
  content: string;
  isComplete: boolean;
  timestamp?: string;
  className?: string;
}

const ThinkingRenderer: React.FC<ThinkingRendererProps> = ({
  content,
  isComplete,
  timestamp,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [displayContent, setDisplayContent] = useState('');
  
  // 动态显示内容，模拟打字机效果
  useEffect(() => {
    if (content.length > displayContent.length) {
      const timeoutId = setTimeout(() => {
        setDisplayContent(content.substring(0, displayContent.length + 1));
      }, 50); // 打字机效果延迟
      
      return () => clearTimeout(timeoutId);
    }
  }, [content, displayContent]);

  // 当内容变化时，重置显示内容
  useEffect(() => {
    if (content.length < displayContent.length) {
      setDisplayContent(content);
    }
  }, [content]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className={`thinking-renderer border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-r-lg p-4 my-2 ${className}`}>
      <div className="flex items-center justify-between cursor-pointer" onClick={toggleExpanded}>
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <span className="font-medium text-blue-800 dark:text-blue-200">
            推理中{!isComplete && '...'}
          </span>
          {!isComplete && (
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-100"></div>
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse delay-200"></div>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {timestamp && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {new Date(timestamp).toLocaleTimeString()}
            </span>
          )}
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
      
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-700">
          <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {displayContent}
            {!isComplete && displayContent === content && (
              <span className="inline-block w-2 h-4 bg-blue-600 ml-1 animate-pulse" />
            )}
          </div>
          {content.length > 100 && (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              字符数: {content.length}
            </div>
          )}
        </div>
      )}
      
      {!isExpanded && content.length > 0 && (
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {content.substring(0, 80)}
          {content.length > 80 && '...'}
          {!isComplete && displayContent === content && (
            <span className="inline-block w-2 h-4 bg-blue-600 ml-1 animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
};

export default ThinkingRenderer; 