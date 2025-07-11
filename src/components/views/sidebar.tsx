import React, { useMemo } from "react";
import { Tooltip, Dropdown, Menu } from "antd";
import {
  Plus,
  Edit,
  Trash2,
  InfoIcon,
  RefreshCcw,
  Loader2,
  FileText,
  Archive,
  MoreVertical,
  StopCircle,
} from "lucide-react";
import type { Session, RunStatus } from "../types/datamodel";
import SubMenu from "../common/SubMenu";
import { SessionRunStatusIndicator } from "./statusicon";
import LearnPlanButton from "../features/Plans/LearnPlanButton";
import { Button } from "../common/Button";

interface SidebarProps {
  isOpen: boolean;
  sessions: Session[];
  currentSession: Session | null;
  onToggle: () => void;
  onSelectSession: (session: Session) => void;
  onEditSession: (session?: Session) => void;
  onDeleteSession: (sessionId: number) => void;
  isLoading?: boolean;
  sessionRunStatuses: { [sessionId: number]: RunStatus };
  activeSubMenuItem: string;
  onSubMenuChange: (tabId: string) => void;
  onStopSession: (sessionId: number) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  sessions,
  currentSession,
  onToggle,
  onSelectSession,
  onEditSession,
  onDeleteSession,
  isLoading = false,
  sessionRunStatuses,
  activeSubMenuItem,
  onSubMenuChange,
  onStopSession,
}) => {
  // Group sessions by time period
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
      today: sessions.filter((s) => {
        const date = new Date(s.created_at || "");
        return date >= today;
      }),
      yesterday: sessions.filter((s) => {
        const date = new Date(s.created_at || "");
        return date >= yesterday && date < today;
      }),
      last7Days: sessions.filter((s) => {
        const date = new Date(s.created_at || "");
        return date >= last7Days && date < yesterday;
      }),
      last30Days: sessions.filter((s) => {
        const date = new Date(s.created_at || "");
        return date >= last30Days && date < last7Days;
      }),
      older: sessions.filter((s) => {
        const date = new Date(s.created_at || "");
        return date < last30Days;
      }),
    };
  };

  // Sort sessions by date in descending order (most recent first)
  const sortedSessions = useMemo(
    () =>
      [...sessions].sort((a, b) => {
        return (
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
        );
      }),
    [sessions]
  );

  const groupedSessions = useMemo(
    () => groupSessions(sortedSessions),
    [sortedSessions]
  );

  // Helper function to render session group
  const renderSessionGroup = (sessions: Session[]) => (
    <>
      {sessions.map((s) => {
        if (!s.id) return null;
        const status = sessionRunStatuses[s.id];
        const isActive = [
          "active",
          "awaiting_input",
          "pausing",
          "paused",
        ].includes(status);
        return (
          <div key={s.id} className="relative">
            <div
              className={`group flex items-center justify-between p-2 py-1 text-sm ${
                isLoading
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer hover:bg-tertiary"
              } ${
                currentSession?.id === s.id
                  ? " border-l-2 border-magenta-800 bg-secondary"
                  : ""
              }`}
              onClick={() => !isLoading && onSelectSession(s)}
            >
              <div className="flex items-center gap-2 flex-1">
                <span className="truncate text-sm">
                  {s.name.slice(0, 20)}
                  {s.name.length > 20 ? "..." : ""}
                </span>
                {s.id && (
                  <SessionRunStatusIndicator
                    status={sessionRunStatuses[s.id]}
                  />
                )}
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Dropdown
                  trigger={["click"]}
                  overlay={
                    <Menu>
                      <Menu.Item
                        key="edit"
                        onClick={(e) => {
                          e.domEvent.stopPropagation();
                          onEditSession(s);
                        }}
                      >
                        <Edit className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />{" "}
                        编辑
                      </Menu.Item>
                      <Menu.Item
                        key="stop"
                        onClick={(e) => {
                          e.domEvent.stopPropagation();
                          if (isActive && s.id) onStopSession(s.id);
                        }}
                        disabled={!isActive}
                        danger
                      >
                        <StopCircle className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />{" "}
                        停止
                      </Menu.Item>
                      <Menu.Item
                        key="delete"
                        onClick={(e) => {
                          e.domEvent.stopPropagation();
                          if (s.id) onDeleteSession(s.id);
                        }}
                        danger
                      >
                        <Trash2 className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />{" "}
                        删除
                      </Menu.Item>
                      <Menu.Item
                        key="learn-plan"
                        onClick={(e) => e.domEvent.stopPropagation()}
                      >
                        <LearnPlanButton
                          sessionId={Number(s.id)}
                          messageId={-1}
                        />
                      </Menu.Item>
                    </Menu>
                  }
                  placement="bottomRight"
                >
                  <Button
                    variant="tertiary"
                    size="sm"
                    icon={<MoreVertical className="w-4 h-4" />}
                    onClick={(e) => e.stopPropagation()}
                    className="!p-0 min-w-[24px] h-6"
                  />
                </Dropdown>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );

    return (
    <aside className="w-64 flex-shrink-0 bg-primary text-primary flex flex-col p-2 space-y-4 h-full border-r border-secondary">
        <div className="mb-4">
          <SubMenu
            items={[
              {
                id: "current_session",
              label: "当前会话",
                icon: <FileText className="w-4 h-4" />,
              },
              {
                id: "saved_plan",
              label: "已存计划",
                icon: <Archive className="w-4 h-4" />,
              },
            ]}
            activeItem={activeSubMenuItem}
            onClick={onSubMenuChange}
          />
        </div>

        {
          <>
            <div className="flex items-center justify-between py-2 border-secondary">
              <div className="flex items-center gap-2">
              <span className="text-primary font-medium">会话列表</span>

                {isLoading ? (
                  <div className="py-2 flex text-sm text-secondary">
                  加载中...{" "}
                    <RefreshCcw className="w-4 h-4 inline-block ml-2 animate-spin" />
                  </div>
                ) : (
                  <span className="py-2 bg-accent/10 text-sm text-secondary rounded">
                    {sortedSessions.length}
                  </span>
                )}
              </div>
            </div>

            <div className="my-4 flex text-sm">
                  <Button
              variant="secondary"
                    className="w-full"
                    icon={<Plus className="w-4 h-4" />}
                    onClick={() => onEditSession()}
                  >
              新建会话
                  </Button>
              </div>
          <div className="overflow-y-auto scroll">
            {sortedSessions.length === 0 && !isLoading ? (
              <div className="p-4 text-center text-secondary text-sm border border-dashed rounded-lg">
                <InfoIcon className="w-4 h-4 inline-block mr-1.5" />
                没有最近的会话
                </div>
              ) : (
                <>
                  {groupedSessions.today.length > 0 && (
                    <div>
                    <div className="py-2 text-xs font-bold text-secondary uppercase">
                      今天
                    </div>
                    <div className="space-y-1">
                      {renderSessionGroup(groupedSessions.today)}
                    </div>
                    </div>
                  )}
                  {groupedSessions.yesterday.length > 0 && (
                    <div>
                    <div className="py-2 text-xs font-bold text-secondary uppercase">
                      昨天
                      </div>
                    <div className="space-y-1">
                      {renderSessionGroup(groupedSessions.yesterday)}
                    </div>
                    </div>
                  )}
                  {groupedSessions.last7Days.length > 0 && (
                    <div>
                    <div className="py-2 text-xs font-bold text-secondary uppercase">
                      最近7天
                      </div>
                    <div className="space-y-1">
                      {renderSessionGroup(groupedSessions.last7Days)}
                    </div>
                    </div>
                  )}
                  {groupedSessions.last30Days.length > 0 && (
                    <div>
                    <div className="py-2 text-xs font-bold text-secondary uppercase">
                      最近30天
                      </div>
                    <div className="space-y-1">
                      {renderSessionGroup(groupedSessions.last30Days)}
                    </div>
                    </div>
                  )}
                  {groupedSessions.older.length > 0 && (
                    <div>
                    <div className="py-2 text-xs font-bold text-secondary uppercase">
                      更早
                    </div>
                    <div className="space-y-1">
                      {renderSessionGroup(groupedSessions.older)}
                    </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        }
    </aside>
    );
};
