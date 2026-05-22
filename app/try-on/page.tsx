import Link from "next/link";
import TryOnClient from "./TryOnClient";

export default function TryOnPage() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="page-enter mx-auto w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/80">
        <Link href="/" className="text-sm font-medium text-neutral-500">
          返回首页
        </Link>

        <div className="mt-7 space-y-2">
          <p className="text-sm font-medium text-neutral-500">AI试穿</p>
          <h1 className="text-3xl font-semibold tracking-normal text-neutral-950">
            选择试穿服装
          </h1>
          <p className="text-sm leading-6 text-neutral-600">
            先选择一件衣服，下一步会生成试穿预览。
          </p>
        </div>

        <TryOnClient />
      </section>
    </main>
  );
}
