import React, { useMemo, useState, useRef, useEffect } from "react";
import { Link } from "gatsby";
import {
  Plus,
  Edit,
  Trash2,
  InfoIcon,
  MoreVertical,
  StopCircle,
  MessageSquare,
  Code,
} from "lucide-react";

type RunStatus = "active" | "awaiting_input" | "paused" | "completed" | "failed";
interface Session {
  id: number;
  name: string;
  created_at: string;
}

const mockSessions: Session[] = [
  { id: 1, name: "翻译一篇关于AI的文章", created_at: new Date().toISOString() },
  { id: 2, name: "编写一个Python脚本", created_at: new Date(new Date().setDate(new Date().getDate() - 1)).toISOString() },
  { id: 3, name: "市场调研报告", created_at: new Date(new Date().setDate(new Date().getDate() - 3)).toISOString() },
  { id: 4, name: "上个月的财务总结", created_at: new Date(new Date().setDate(new Date().getDate() - 35)).toISOString() },
];

const mockSessionRunStatuses: { [sessionId: number]: RunStatus } = {
  1: "active",
  2: "paused",
  3: "completed",
  4: "failed",
};

const DropdownMenu: React.FC<{ session: Session; isActive: boolean }> = ({ session, isActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={(e) => {
          e.stopPropagation(); // 防止触发父元素的 onClick
          setIsOpen(!isOpen);
        }}
        className="p-1 rounded hover:bg-gray-300"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-xl z-10 border border-gray-200">
          <div className="py-1">
            <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
              <Edit className="w-4 h-4 mr-2" /> 编辑
            </a>
            <a href="#" className={`flex items-center px-4 py-2 text-sm ${isActive ? 'text-red-600 hover:bg-red-50' : 'text-gray-400 cursor-not-allowed'}`}>
              <StopCircle className="w-4 h-4 mr-2" /> 停止
            </a>
             <a href="#" className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-2" /> 删除
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const [sessions] = useState<Session[]>(mockSessions);
  const [currentSession, setCurrentSession] = useState<Session | null>(mockSessions[0]);
  const [sessionRunStatuses] = useState(mockSessionRunStatuses);

  const groupSessions = (sessions: Session[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const last7Days = new Date(today);
    last7Days.setDate(last7Days.getDate() - 7);
    const last30Days = new Date(today);
    last30Days.setDate(last30Days.getDate() - 30);

    return {
      today: sessions.filter((s) => new Date(s.created_at) >= today),
      yesterday: sessions.filter((s) => new Date(s.created_at) >= yesterday && new Date(s.created_at) < today),
      last7Days: sessions.filter((s) => new Date(s.created_at) >= last7Days && new Date(s.created_at) < yesterday),
      last30Days: sessions.filter((s) => new Date(s.created_at) >= last30Days && new Date(s.created_at) < last7Days),
      older: sessions.filter((s) => new Date(s.created_at) < last30Days),
    };
  };

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [sessions]
  );

  const groupedSessions = useMemo(() => groupSessions(sortedSessions), [sortedSessions]);

  const renderSessionGroup = (sessions: Session[]) => (
    <>
      {sessions.map((s) => {
        const status = sessionRunStatuses[s.id];
        const isActive = ["active", "awaiting_input", "paused"].includes(status);
        return (
          <div key={s.id} className="relative">
            <div
              className={`group flex items-center justify-between p-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded-md ${
                currentSession?.id === s.id ? "bg-gray-200 border-l-2 border-blue-600" : ""
              }`}
              onClick={() => setCurrentSession(s)}
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="truncate text-sm font-medium">{s.name}</span>
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <DropdownMenu session={s} isActive={isActive} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );

  return (
    <aside className="w-64 flex-shrink-0 bg-gray-50 text-gray-800 flex flex-col border-r border-gray-200 p-2 space-y-2">
      <div className="flex items-center justify-between px-2 pt-2">
        <span className="text-lg font-semibold">Magentic</span>
        <div className="relative group">
           <button className="p-2 rounded-full hover:bg-gray-200">
             <Plus className="w-5 h-5" />
           </button>
           <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max px-2 py-1 bg-gray-700 text-white text-xs rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
             创建新会话
           </div>
        </div>
      </div>

      <nav className="px-2">
        <Link to="/chat" className="flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md hover:bg-gray-200 text-gray-700" activeClassName="bg-gray-200 text-blue-600">
          <MessageSquare className="w-5 h-5" />
          <span>聊天</span>
        </Link>
        <Link to="/ide" className="flex items-center gap-3 px-2 py-2 text-sm font-medium rounded-md hover:bg-gray-200 text-gray-700" activeClassName="bg-gray-200 text-blue-600">
          <Code className="w-5 h-5" />
          <span>IDE</span>
        </Link>
      </nav>

      <div className="border-t border-gray-200 mx-2"></div>

      <div className="flex items-center justify-between px-2 pt-2">
        <span className="text-lg font-semibold">会话</span>
      </div>

      <div className="overflow-y-auto px-2 space-y-2 h-[calc(100vh-210px)]">
        {sortedSessions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm border border-dashed rounded-lg">
            <InfoIcon className="w-4 h-4 inline-block mr-1.5" />
            没有最近的会话
          </div>
        ) : (
          <>
            {groupedSessions.today.length > 0 && (
              <div>
                <div className="py-2 text-xs font-bold text-gray-500 uppercase">今天</div>
                <div className="space-y-1">{renderSessionGroup(groupedSessions.today)}</div>
              </div>
            )}
            {groupedSessions.yesterday.length > 0 && (
              <div>
                <div className="py-2 text-xs font-bold text-gray-500 uppercase">昨天</div>
                <div className="space-y-1">{renderSessionGroup(groupedSessions.yesterday)}</div>
              </div>
            )}
             {groupedSessions.last7Days.length > 0 && (
              <div>
                <div className="py-2 text-xs font-bold text-gray-500 uppercase">最近7天</div>
                <div className="space-y-1">{renderSessionGroup(groupedSessions.last7Days)}</div>
              </div>
            )}
            {groupedSessions.last30Days.length > 0 && (
              <div>
                <div className="py-2 text-xs font-bold text-gray-500 uppercase">最近30天</div>
                <div className="space-y-1">{renderSessionGroup(groupedSessions.last30Days)}</div>
              </div>
            )}
            {groupedSessions.older.length > 0 && (
              <div>
                <div className="py-2 text-xs font-bold text-gray-500 uppercase">更早以前</div>
                <div className="space-y-1">{renderSessionGroup(groupedSessions.older)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};

export default Sidebar; 