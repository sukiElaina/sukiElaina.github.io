# ⚡ 快速设置指南

## 1️⃣ 推送代码到 GitHub

```bash
git add .
git commit -m "feat: add GitHub Actions workflow"
git push
```

## 2️⃣ 设置 GitHub Secret（必须！）

1. 打开仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 点击 **New repository secret**
3. 添加：
   - **Name**: `SILICONFLOW_API_KEY`
   - **Value**: 你的硅基流动 API 密钥

## 3️⃣ 设置工作流权限（必须！）

1. **Settings** → **Actions** → **General**
2. **Workflow permissions** 选择：
   - ✅ **Read and write permissions**
3. 点击 **Save**

## 4️⃣ 测试运行

1. 进入 **Actions** 标签页
2. 选择 **RSS Auto Update**
3. 点击 **Run workflow**
4. 查看运行日志

## ✅ 完成！

现在每天北京时间 8:00 会自动运行。

---

**详细文档**：
- [SETUP-COMPLETE.md](./SETUP-COMPLETE.md) - 完整说明
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [SECURITY-CHECKLIST.md](./SECURITY-CHECKLIST.md) - 安全检查
