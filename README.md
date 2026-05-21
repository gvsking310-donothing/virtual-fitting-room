# virtual-fitting-room

AI 虚拟试衣间，基于 Next.js App Router、TypeScript、Tailwind CSS 和 Supabase。

流程包含用户资料录入、全身照片上传和服装衣橱上传，照片会保存到 Supabase Storage。

## 本地开发

```bash
npm install
npm run dev
```

## Supabase

在 Supabase SQL Editor 执行：

```sql
-- supabase/schema.sql
```

然后在 Vercel 环境变量中配置：

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

推送到 GitHub `main` 分支后，Vercel 连接该仓库即可自动部署。
