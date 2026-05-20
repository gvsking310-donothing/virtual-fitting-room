import Link from "next/link";
import ProfileForm from "./ProfileForm";

export default function ProfilePage() {
  return (
    <main className="min-h-screen px-5 py-6">
      <section className="page-enter mx-auto w-full max-w-md rounded-[2rem] border border-neutral-200 bg-white p-6 shadow-2xl shadow-neutral-200/80">
        <Link href="/" className="text-sm font-medium text-neutral-500">
          返回首页
        </Link>

        <div className="mt-7 space-y-2">
          <h1 className="text-3xl font-semibold tracking-normal text-neutral-950">
            完善用户资料
          </h1>
          <p className="text-sm leading-6 text-neutral-600">
            用于生成更准确的虚拟试衣效果。
          </p>
        </div>

        <ProfileForm />
      </section>
    </main>
  );
}
