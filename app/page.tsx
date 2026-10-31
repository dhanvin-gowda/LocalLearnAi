"use client";

import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge"
import {
  Blocks,
  ChevronsUpDown,
  FileClock,
  GraduationCap,
  Layout,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  MessagesSquare,
  Plus,
  Settings,
  UserCircle,
  UserCog,
  UserSearch,
  Users,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedAIChat } from "@/components/chat";
import { Dashboard } from "@/components/dashboard";
import { FriendsChat } from "@/components/friends-chat";

const sidebarVariants = {
  open: {
    width: "15rem",
  },
  closed: {
    width: "3.05rem",
  },
};

const contentVariants = {
  open: { display: "block", opacity: 1 },
  closed: { display: "block", opacity: 1 },
};

const variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: {
      x: { stiffness: 1000, velocity: -100 },
    },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: {
      x: { stiffness: 100 },
    },
  },
};

const transitionProps = {
  type: "tween",
  ease: "easeOut",
  duration: 0.2,
  staggerChildren: 0.1,
} as const;

const staggerVariants = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};


interface SessionNavBarProps {
  activeView?: string | null;
  onSelectView?: (view: string) => void;
}

export function SessionNavBar({ activeView, onSelectView }: SessionNavBarProps = {}) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ displayName: string; username: string; initials?: string } | null>(null);
  const pathname = usePathname();

  const currentActive =
    activeView ||
    (pathname === "/chat" || pathname?.startsWith("/chat/")
      ? "chat"
      : pathname === "/friends" || pathname?.startsWith("/friends/")
      ? "friends"
      : pathname?.startsWith("/challenges")
      ? "challenges"
      : pathname?.startsWith("/reports")
      ? "reports"
      : pathname === "/dashboard" || pathname === "/" || pathname?.startsWith("/dashboard/")
      ? "dashboard"
      : null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("chat_user");
      if (raw) setCurrentUser(JSON.parse(raw));
    } catch {}
  }, []);
  return (
    <motion.div
      className={cn(
        "sidebar fixed left-0 z-40 h-full shrink-0 border-r fixed",
      )}
      initial={isCollapsed ? "closed" : "open"}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      transition={transitionProps}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <motion.div
        className={`relative z-40 flex text-muted-foreground h-full shrink-0 flex-col bg-black transition-all font-bold`}
        variants={contentVariants}
      >
        <motion.ul variants={staggerVariants} className="flex h-full flex-col">
          <div className="flex grow flex-col items-center">
            <div className="flex h-[54px] w-full shrink-0  border-b p-2">
              <div className=" mt-[1.5px] flex w-full">
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger className="w-full" asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex w-fit items-center gap-2  px-2"
                    >
                      <Avatar className='rounded size-4'>
                        <AvatarFallback>O</AvatarFallback>
                      </Avatar>
                      <motion.li
                        variants={variants}
                        className="flex w-fit items-center gap-2"
                      >
                        {!isCollapsed && (
                          <>
                            <p className="text-sm font-bold  ">
                              {"Local Learn Ai"}
                            </p>
                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
                          </>
                        )}
                      </motion.li>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem
                      asChild
                      className="flex items-center gap-2"
                    >
                      <Link href="/settings/members">
                        <UserCog className="h-4 w-4" /> Manage members
                      </Link>
                    </DropdownMenuItem>{" "}
                    <DropdownMenuItem
                      asChild
                      className="flex items-center gap-2"
                    >
                      <Link href="/settings/integrations">
                        <Blocks className="h-4 w-4" /> Integrations
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link
                        href="/select-org"
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Create or join an organization
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className=" flex h-full w-full flex-col">
              <div className="flex grow flex-col gap-4">
                <ScrollArea className="h-16 grow p-2">
                  <div className={cn("flex w-full flex-col gap-1")}>
                    <Link
                      href="/dashboard"
                      prefetch={false}
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary cursor-pointer",
                        currentActive === "dashboard" && "bg-muted text-blue-600",
                      )}
                      onClick={() => {
                        onSelectView?.("dashboard");
                      }}
                    >
                      <LayoutDashboard className="h-4 w-4" />{" "}
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-bold">Dashboard</p>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/challenges"
                      prefetch={false}
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary",
                        currentActive === "challenges" && "bg-muted text-blue-600",
                      )}
                    >
                      <Trophy className="h-4 w-4" />{" "}
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <div className="flex items-center gap-2">
                            <p className="ml-2 text-sm font-bold">Challenges</p>
                          </div>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/reports"
                      prefetch={false}
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary",
                        currentActive === "reports" && "bg-muted text-blue-600",
                      )}
                    >
                      <FileClock className="h-4 w-4" />{" "}
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <div className="flex items-center gap-2">
                            <p className="ml-2 text-sm font-bold">Reports</p>
                          </div>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/chat"
                      prefetch={false}
                      className={cn(
                        "flex h-8 flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary cursor-pointer",
                        currentActive === "chat" && "bg-muted text-blue-600",
                      )}
                      onClick={() => {
                        onSelectView?.("chat");
                      }}
                    >
                      <MessagesSquare className="h-4 w-4" />
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <div className="ml-2 flex items-center  gap-2">
                            <p className="text-sm font-bold">Chat</p>
                            <Badge
                              className={cn(
                                "flex h-fit w-fit items-center gap-1.5 rounded border-none bg-blue-50 px-1.5 text-blue-600 dark:bg-blue-700 dark:text-blue-300",
                              )}
                              variant="outline"
                            >
                              BETA
                            </Badge>
                          </div>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/friends"
                      prefetch={false}
                      className={cn(
                        "flex h-8 flex-row items-center rounded-md px-2 py-1.5 transition hover:bg-muted hover:text-primary cursor-pointer",
                        currentActive === "friends" && "bg-muted text-blue-600",
                      )}
                      onClick={() => {
                        onSelectView?.("friends");
                      }}
                    >
                      <Users className="h-4 w-4" />
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <div className="ml-2 flex items-center gap-2">
                            <p className="text-sm font-bold">Friends Chat</p>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          </div>
                        )}
                      </motion.li>
                    </Link>
                    <Separator className="w-full" />
                    <Link
                      href="/deals"
                      prefetch={false}
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5   transition hover:bg-muted hover:text-primary",

                        pathname?.includes("deals") && "bg-muted text-blue-600",
                      )}
                    >
                      <Layout className="h-4 w-4" />{" "}
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-bold">Deals</p>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/accounts"
                      prefetch={false}
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5   transition hover:bg-muted hover:text-primary",

                        pathname?.includes("accounts") &&
                        "bg-muted text-blue-600",
                      )}
                    >
                      <UserCircle className="h-4 w-4" />{" "}
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-bold">Accounts</p>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/competitors"
                      prefetch={false}
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5   transition hover:bg-muted hover:text-primary",

                        pathname?.includes("competitors") &&
                        "bg-muted text-blue-600",
                      )}
                    >
                      <UserSearch className="h-4 w-4" />
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-bold">
                            Competitors
                          </p>
                        )}
                      </motion.li>
                    </Link>
                    <Separator className="w-full" />
                    <Link
                      href="/library/knowledge"
                      prefetch={false}
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5   transition hover:bg-muted hover:text-primary",

                        pathname?.includes("library") &&
                        "bg-muted text-blue-600",
                      )}
                    >
                      <GraduationCap className="h-4 w-4" />{" "}
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-bold">
                            Knowledge Base
                          </p>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/feedback"
                      prefetch={false}
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5   transition hover:bg-muted hover:text-primary",
                        pathname?.includes("feedback") &&
                        "bg-muted text-blue-600",
                      )}
                    >
                      <MessageSquareText className="h-4 w-4" />{" "}
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-bold">Feedback</p>
                        )}
                      </motion.li>
                    </Link>
                    <Link
                      href="/review"
                      prefetch={false}
                      className={cn(
                        "flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5   transition hover:bg-muted hover:text-primary",

                        pathname?.includes("review") &&
                        "bg-muted text-blue-600",
                      )}
                    >
                      <FileClock className="h-4 w-4" />{" "}
                      <motion.li variants={variants}>
                        {!isCollapsed && (
                          <p className="ml-2 text-sm font-bold">
                            Document Review
                          </p>
                        )}
                      </motion.li>
                    </Link>
                  </div>
                </ScrollArea>
              </div>
              <div className="flex flex-col p-2">
                <Link
                  href="/settings/integrations"
                  prefetch={false}
                  className="mt-auto flex h-8 w-full flex-row items-center rounded-md px-2 py-1.5   transition hover:bg-muted hover:text-primary"
                >
                  <Settings className="h-4 w-4 shrink-0" />{" "}
                  <motion.li variants={variants}>
                    {!isCollapsed && (
                      <p className="ml-2 text-sm font-bold"> Settings</p>
                    )}
                  </motion.li>
                </Link>
                <div>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger className="w-full">
                      <div className="flex h-8 w-full flex-row items-center gap-2 rounded-md px-2 py-1.5  transition hover:bg-muted hover:text-primary">
                        <Avatar className="size-4">
                          <AvatarFallback>
                            A
                          </AvatarFallback>
                        </Avatar>
                        <motion.li
                          variants={variants}
                          className="flex w-full items-center gap-2"
                        >
                          {!isCollapsed && (
                            <>
                              <p className="text-sm font-bold">Account</p>
                              <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground/50" />
                            </>
                          )}
                        </motion.li>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent sideOffset={5}>
                      <div className="flex flex-row items-center gap-2 p-2">
                        <Avatar className="size-6">
                          <AvatarFallback>
                            {currentUser?.initials || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-bold">
                            {currentUser?.displayName || "LocalLearn User"}
                          </span>
                          <span className="line-clamp-1 text-xs text-muted-foreground">
                            {currentUser ? `@${currentUser.username}` : "Logged in via JWT"}
                          </span>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          localStorage.removeItem("chat_jwt");
                          localStorage.removeItem("chat_user");
                          window.location.reload();
                        }}
                        className="flex items-center gap-2 cursor-pointer text-rose-400 hover:text-rose-300"
                      >
                        <LogOut className="h-4 w-4" /> Sign out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </motion.ul>
      </motion.div>
    </motion.div>
  );
}

export default function Page({ initialView = "dashboard" }: { initialView?: string | null }) {
  const pathname = usePathname();

  const resolvedView =
    pathname === "/chat" || pathname?.startsWith("/chat/")
      ? "chat"
      : pathname === "/friends" || pathname?.startsWith("/friends/")
      ? "friends"
      : pathname === "/dashboard" || pathname?.startsWith("/dashboard/")
      ? "dashboard"
      : initialView || "dashboard";

  const [activeView, setActiveView] = useState<string | null>(resolvedView);

  useEffect(() => {
    setActiveView(resolvedView);
  }, [resolvedView]);

  const viewToRender = activeView || resolvedView;

  return (
    <div className="flex min-h-screen w-full bg-black text-white relative">
      <SessionNavBar activeView={viewToRender} onSelectView={setActiveView} />
      <main className="flex-1 w-full pl-[3.05rem] min-h-screen relative z-10 overflow-y-auto">
        {viewToRender === "dashboard" && <Dashboard />}
        {viewToRender === "chat" && (
          <div className="w-full min-h-screen flex items-center justify-center">
            <AnimatedAIChat />
          </div>
        )}
        {viewToRender === "friends" && <FriendsChat />}
      </main>
    </div>
  );
}
