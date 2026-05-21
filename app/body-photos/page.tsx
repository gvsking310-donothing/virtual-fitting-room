import Link from "next/link";
import BodyPhotosForm from "./BodyPhotosForm";

export default function BodyPhotosPage() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="page-enter mx-auto w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/80">
        <Link href="/profile" className="text-sm font-medium text-neutral-500">
          返回资料
        </Link>

        <div className="mt-7 space-y-2">
          <p className="text-sm font-medium text-neutral-500">第二步</p>
          <h1 className="text-3xl font-semibold tracking-normal text-neutral-950">
            上传全身照片
          </h1>
          <p className="text-sm leading-6 text-neutral-600">
            正面全身照必填，侧面全身照可选。
          </p>
        </div>

        <BodyPhotosForm />
      </section>
    </main>
  );
}
