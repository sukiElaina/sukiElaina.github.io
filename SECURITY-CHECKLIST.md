# 安全检查清单

在提交代码到 GitHub 之前，请确保：

## ✅ 必须检查项

- [ ] 已从代码中移除所有硬编码的 API 密钥
- [ ] 已在 GitHub Secrets 中设置 `SILICONFLOW_API_KEY`
- [ ] `.gitignore` 已配置忽略 `.env` 文件
- [ ] `.env` 文件不在 Git 版本控制中
- [ ] 本地 `.env` 文件已创建并填入密钥

## 🔒 GitHub Secrets 设置

1. 进入仓库 Settings → Secrets and variables → Actions
2. 添加 Secret：
   - Name: `SILICONFLOW_API_KEY`
   - Value: 你的硅基流动 API 密钥

## 🔧 GitHub Actions 权限

1. 进入仓库 Settings → Actions → General
2. Workflow permissions 选择：**Read and write permissions**
3. 勾选：**Allow GitHub Actions to create and approve pull requests**

## 🧪 测试步骤

### 本地测试

```bash
# 1. 设置环境变量
export SILICONFLOW_API_KEY=your_key

# 2. 运行脚本
npm start

# 3. 检查输出
```

### GitHub Actions 测试

```bash
# 1. 推送代码到 GitHub
git add .
git commit -m "feat: add GitHub Actions workflow"
git push

# 2. 手动触发工作流
# - 进入 Actions 标签页
# - 选择 "RSS Auto Update"
# - 点击 "Run workflow"

# 3. 查看运行日志
```

## 🚨 安全提示

❌ **不要做：**
- 在代码中硬编码 API 密钥
- 提交包含密钥的 `.env` 文件
- 在公开的 Issue 或 PR 中暴露密钥
- 将密钥写在提交信息中

✅ **应该做：**
- 使用环境变量或 GitHub Secrets
- 定期轮换 API 密钥
- 监控 API 使用情况
- 限制 API 密钥的权限范围

## 📝 提交前检查

```bash
# 检查是否有敏感信息
git diff

# 检查将要提交的文件
git status

# 确保 .env 不在列表中
git ls-files | grep .env

# 如果 .env 在列表中，移除它
git rm --cached .env
```

## 🔄 密钥泄露应急处理

如果不小心提交了 API 密钥：

1. **立即撤销密钥** - 在硅基流动平台删除或重置密钥
2. **生成新密钥** - 创建新的 API 密钥
3. **更新 GitHub Secret** - 在仓库设置中更新密钥
4. **清理 Git 历史** - 使用 `git filter-branch` 或 BFG Repo-Cleaner 清理
5. **强制推送** - `git push --force`（谨慎使用）

## 📊 监控建议

- 定期检查 GitHub Actions 运行日志
- 监控硅基流动 API 使用量
- 设置 API 额度告警
- 定期审查 GitHub Secrets

---

✅ **完成以上检查后，即可安全地提交和部署！**
