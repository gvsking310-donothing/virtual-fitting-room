import Link from "next/link";
import ClothesForm from "./ClothesForm";

export default function ClothesPage() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="page-enter mx-auto w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/80">
        <Link href="/" className="text-sm font-medium text-neutral-500">
          返回首页
        </Link>

        <div className="mt-7 space-y-2">
          <p className="text-sm font-medium text-neutral-500">衣橱</p>
          <h1 className="text-3xl font-semibold tracking-normal text-neutral-950">
            上传服装
          </h1>
          <p className="text-sm leading-6 text-neutral-600">
            建立你的试衣衣橱，支持服装、配饰和鞋包。
          </p>
        </div>

        <ClothesForm />
      </section>
    </main>
  );
}
