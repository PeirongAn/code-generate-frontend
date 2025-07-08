import React, { useState, useRef, useEffect } from "react";
import { 
  Play, 
  TestTube, 
  Minus, 
  Maximize2, 
  Minimize2,
  Copy,
  Download,
  RotateCcw,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "antd";

interface CodeIDEEditorProps {
  code: string;
  language?: string;
  onMinimize: () => void;
  onToggleExpand: () => void;
  isExpanded: boolean;
  onRun?: (code: string) => void;
  onTest?: (code: string) => void;
  terminalOutput?: string;
  isRunning?: boolean;
  isTesting?: boolean;
  readOnly?: boolean;
  onCodeChange?: (code: string) => void;
}

interface TerminalLine {
  text: string;
  type: 'normal' | 'error' | 'success' | 'warning';
  timestamp: string;
}

const CodeIDEEditor: React.FC<CodeIDEEditorProps> = ({
  code,
  language = "python",
  onMinimize,
  onToggleExpand,
  isExpanded,
  onRun,
  onTest,
  terminalOutput = "",
  isRunning = false,
  isTesting = false,
  readOnly = false,
  onCodeChange,
}) => {
  console.log('##### CodeIDEEditor rendering with props #####', {
    code: code.substring(0, 100) + (code.length > 100 ? '...' : ''),
    language,
    isExpanded,
    isRunning,
    isTesting,
    readOnly
  });
  const [currentCode, setCurrentCode] = useState(code);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([]);
  const [isTerminalMinimized, setIsTerminalMinimized] = useState(false);
  const [editorHeight, setEditorHeight] = useState(80); // 默认编辑器占80%
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update code when prop changes
  useEffect(() => {
    if (code !== currentCode) {
      setCurrentCode(code);
    }
  }, [code]);

  // Update terminal output
  useEffect(() => {
    if (terminalOutput) {
      const lines = terminalOutput.split('\n').map(line => ({
        text: line,
        type: 'normal' as const,
        timestamp: new Date().toLocaleTimeString(),
      }));
      setTerminalLines(lines);
    }
  }, [terminalOutput]);

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalLines]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value;
    setCurrentCode(newCode);
    onCodeChange?.(newCode);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Insert 4 spaces for tab
      const newCode = currentCode.substring(0, start) + '    ' + currentCode.substring(end);
      setCurrentCode(newCode);
      onCodeChange?.(newCode);
      
      // Move cursor to after the inserted spaces
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  const handleRun = () => {
    if (onRun && !isRunning) {
      onRun(currentCode);
      // Add running status to terminal
      setTerminalLines(prev => [...prev, {
        text: '>>> 运行代码...',
        type: 'normal',
        timestamp: new Date().toLocaleTimeString(),
      }]);
    }
  };

  const handleTest = () => {
    if (onTest && !isTesting) {
      onTest(currentCode);
      // Add testing status to terminal
      setTerminalLines(prev => [...prev, {
        text: '>>> 测试代码...',
        type: 'normal',
        timestamp: new Date().toLocaleTimeString(),
      }]);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentCode);
  };

  const handleDownload = () => {
    const blob = new Blob([currentCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code.${language}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setCurrentCode(code);
    onCodeChange?.(code);
  };

  const clearTerminal = () => {
    setTerminalLines([]);
  };

  const toggleTerminal = () => {
    setIsTerminalMinimized(!isTerminalMinimized);
  };

  // 拖拽分割线处理
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const headerHeight = 120; // 头部和按钮区域的高度
    const availableHeight = containerRect.height - headerHeight;
    const mouseY = e.clientY - containerRect.top - headerHeight;
    
    // 计算新的编辑器高度百分比
    const newEditorHeight = Math.max(20, Math.min(80, (mouseY / availableHeight) * 100));
    setEditorHeight(newEditorHeight);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // 添加全局鼠标事件监听
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const getLineNumbers = () => {
    const lineCount = currentCode.split('\n').length;
    return Array.from({ length: lineCount }, (_, i) => i + 1);
  };

  const getCodeStats = () => {
    const lines = currentCode.split('\n').length;
    const characters = currentCode.length;
    const words = currentCode.split(/\s+/).filter(word => word.length > 0).length;
    return { lines, characters, words };
  };

  const stats = getCodeStats();

  return (
    <div 
      ref={containerRef}
      className="bg-tertiary rounded-lg shadow-lg p-4 h-full flex flex-col relative overflow-hidden"
      style={{ minHeight: '500px' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4 border-b flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          </div>
          <span className="text-sm font-medium text-primary">
            代码编辑器
          </span>
          <span className="text-xs text-secondary">
            {language.toUpperCase()}
          </span>
        </div>
        
        <div className="flex gap-2">
          {/* Action buttons */}
          <button
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            onClick={handleCopy}
            title="复制代码"
          >
            <Copy size={16} />
          </button>
          
          <button
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            onClick={handleDownload}
            title="下载代码"
          >
            <Download size={16} />
          </button>
          
          <button
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            onClick={handleReset}
            disabled={currentCode === code}
            title="重置代码"
          >
            <RotateCcw size={16} />
          </button>
          
          {/* Control buttons */}
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title={isExpanded ? "恢复大小" : "全屏"}
          >
            {isExpanded ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
          </button>
          
          <button
            onClick={onMinimize}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="最小化"
          >
            <Minus size={20} />
          </button>
        </div>
      </div>

      {/* Code Editor Section */}
      <div 
        className="flex flex-col mb-2" 
        style={{ height: `${editorHeight}%` }}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-primary">代码编辑器</span>
        </div>
        
        <div className="flex-1 flex border border-gray-200 dark:border-gray-700 rounded overflow-hidden">
          {/* Line numbers */}
          <div className="w-12 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 py-3 px-2 text-xs text-secondary font-mono leading-6 overflow-hidden">
            {getLineNumbers().map(num => (
              <div key={num} className="text-right">
                {num}
              </div>
            ))}
          </div>
          
          {/* Code editor */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={currentCode}
              onChange={handleCodeChange}
              onKeyDown={handleKeyDown}
              readOnly={readOnly}
              className="w-full h-full p-3 text-sm font-mono leading-6 bg-white dark:bg-gray-900 text-primary border-none outline-none resize-none overflow-y-auto min-h-0"
              style={{
                tabSize: 4,
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              }}
              placeholder={readOnly ? "代码内容将在这里显示..." : "在这里编写你的代码..."}
            />
          </div>
        </div>
      </div>

      {/* Resizable Divider */}
      {!isTerminalMinimized && (
        <div 
          className="flex items-center justify-center h-2 cursor-row-resize hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors group"
          onMouseDown={handleMouseDown}
        >
          <div className="w-8 h-1 bg-gray-300 dark:bg-gray-600 rounded-full group-hover:bg-gray-400 dark:group-hover:bg-gray-500 transition-colors"></div>
        </div>
      )}

      {/* Button Bar */}
      <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded mb-4 flex-shrink-0">
        <div className="flex items-center gap-4 text-xs text-secondary">
          <span>{stats.lines} 行</span>
          <span>{stats.characters} 字符</span>
          <span>{stats.words} 单词</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            type="primary"
            size="small"
            icon={<TestTube size={14} />}
            onClick={handleTest}
            loading={isTesting}
            disabled={!currentCode.trim() || isRunning}
          >
            测试
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<Play size={14} />}
            onClick={handleRun}
            loading={isRunning}
            disabled={!currentCode.trim() || isTesting}
          >
            运行
          </Button>
          <button
            onClick={toggleTerminal}
            className={`text-xs transition-colors px-2 py-1 rounded border ${
              isTerminalMinimized
                ? "text-primary bg-blue-50 border-blue-300 hover:bg-blue-100"
                : "text-secondary border-gray-300 hover:text-primary hover:border-gray-400"
            }`}
          >
            {isTerminalMinimized ? (
              <>
                <Eye size={12} className="inline mr-1" />
                显示终端
              </>
            ) : (
              <>
                <EyeOff size={12} className="inline mr-1" />
                隐藏终端
              </>
            )}
          </button>
          <button
            onClick={clearTerminal}
            className="text-xs text-secondary hover:text-primary transition-colors px-2 py-1 rounded border border-gray-300 hover:border-gray-400"
          >
            清空终端
          </button>
        </div>
      </div>

      {/* Terminal Section */}
      {!isTerminalMinimized && (
        <div 
          className="flex flex-col min-h-0 mt-2" 
          style={{ height: `${100 - editorHeight}%` }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-primary">终端输出</span>
              {terminalLines.length > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {terminalLines.length}
                </span>
              )}
            </div>
            <button
              onClick={toggleTerminal}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              title="最小化终端"
            >
              <Minus size={16} />
            </button>
          </div>
        
        <div
          ref={terminalRef}
          className="flex-1 p-3 bg-gray-900 text-gray-100 font-mono text-sm overflow-y-auto rounded border border-gray-200 dark:border-gray-700 min-h-0"
        >
          {terminalLines.length === 0 ? (
            <div className="text-secondary">
              等待代码运行输出...
            </div>
          ) : (
            terminalLines.map((line, index) => (
              <div
                key={index}
                className={`mb-1 ${
                  line.type === 'error' ? 'text-red-400' :
                  line.type === 'success' ? 'text-green-400' :
                  line.type === 'warning' ? 'text-yellow-400' :
                  'text-gray-100'
                }`}
              >
                <span className="text-gray-500 text-xs mr-2">
                  {line.timestamp}
                </span>
                {line.text}
              </div>
            ))
          )}
          
          {(isRunning || isTesting) && (
            <div className="flex items-center gap-2 text-blue-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              {isRunning ? '运行中...' : '测试中...'}
            </div>
          )}
        </div>
        </div>
      )}
    </div>
  );
};

export default CodeIDEEditor;
