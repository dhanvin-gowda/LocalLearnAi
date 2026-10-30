import { Suspense } from "react";
import WorkspaceClient from "@/app/workspace/[id]/workspace-client";

export function generateStaticParams() {
  return [
    { id: "py-beg-01-reverse-string" },
    { id: "py-beg-02-find-largest" },
    { id: "py-beg-03-palindrome-check" },
    { id: "py-beg-04-find-duplicates" },
    { id: "py-beg-05-two-sum" },
  ];
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ChallengePracticePage({ params }: PageProps) {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0c] text-white flex items-center justify-center">
          <div className="flex items-center gap-3 text-emerald-400">
            <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Opening practice workspace...</span>
          </div>
        </div>
      }
    >
      <WorkspaceClient id={id} />
    </Suspense>
  );
}
