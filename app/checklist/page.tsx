import Link from "next/link";
import ChecklistClient from "./ChecklistClient";

export default function ChecklistPage() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="page-enter mx-auto w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/80">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-neutral-500">
            返回首页
          </Link>
          <Link href="/try-on" className="text-sm font-medium text-neutral-500">
            去试穿
          </Link>
        </div>

        <div className="mt-7 space-y-2">
          <p className="text-sm font-medium text-neutral-500">MVP Checklist</p>
          <h1 className="text-3xl font-semibold tracking-normal text-neutral-950">
            MVP完成度检查
          </h1>
          <p className="text-sm leading-6 text-neutral-600">
            快速确认演示前的关键链路是否都已经准备好。
          </p>
        </div>

        <ChecklistClient />
      </section>
    </main>
  );
}
