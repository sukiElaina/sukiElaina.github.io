# GitHub Actions 自动化部署指南

本项目使用 GitHub Actions 每天自动抓取 RSS 并生成 AI 摘要。

## 🔐 设置 GitHub Secrets

### 1. 获取硅基流动 API Key

访问 [硅基流动](https://siliconflow.cn) 注册并获取 API Key。

### 2. 在 GitHub 仓库中设置 Secret

1. 打开你的 GitHub 仓库页面
2. 点击 **Settings** (设置)
3. 在左侧菜单中找到 **Secrets and variables** → **Actions**
4. 确保在 **Secrets** 标签页（不是 Variables 或 Environments）
5. 点击 **New repository secret** 按钮
6. 添加以下 Secret：

   - **Name (名称)**: `SILICONFLOW_API_KEY`
   - **Value (值)**: 你的硅基流动 API 密钥

7. 点击 **Add secret** 保存

**重要提示**：
- ✅ 使用 **Repository secrets**（推荐）
- ❌ 不要使用 Environment secrets（除非你需要针对不同环境设置不同的密钥）

## ⏰ 运行时间

工作流程将在每天**北京时间 8:00** 自动运行。

- 对应 UTC 时间：00:00
- Cron 表达式：`0 0 * * *`

## 🔧 手动触发

除了定时运行，你也可以手动触发工作流：

1. 进入仓库的 **Actions** 标签页
2. 选择 **RSS Auto Update** 工作流
3. 点击 **Run workflow** 按钮
4. 选择分支后点击绿色的 **Run workflow** 按钮

## 📋 工作流程步骤

1. **检出代码** - 拉取最新代码
2. **设置 Node.js** - 配置 Node.js 18 环境
3. **安装依赖** - 运行 `npm ci` 安装依赖
4. **运行更新脚本** - 执行 `npm start` 抓取 RSS 并生成摘要
5. **检查变更** - 检查是否有新文件生成
6. **提交变更** - 如果有新内容，自动提交并推送

## 🔒 安全性

- ✅ API 密钥存储在 GitHub Secrets 中，不会暴露在代码里
- ✅ `.gitignore` 配置防止本地 `.env` 文件被提交
- ✅ 工作流使用 `secrets` 注入环境变量，日志中不会显示密钥

## 🧪 本地测试

### 使用环境变量

```bash
export SILICONFLOW_API_KEY=your_api_key_here
npm start
```

### 使用 .env 文件（推荐）

1. 复制模板文件：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，填入你的 API 密钥：
   ```
   SILICONFLOW_API_KEY=sk-your-actual-key
   ```

3. 安装 dotenv（如果使用）：
   ```bash
   npm install dotenv
   ```

4. 运行：
   ```bash
   npm start
   ```

**注意**：`.env` 文件已在 `.gitignore` 中，不会被提交到 Git。

## 📊 查看运行日志

1. 进入仓库的 **Actions** 标签页
2. 查看最近的工作流运行记录
3. 点击具体的运行记录查看详细日志

## ❌ 故障排除

### 工作流失败：API Key 未设置

确保在 GitHub Secrets 中正确设置了 `SILICONFLOW_API_KEY`。

### 工作流失败：权限错误

确保 GitHub Actions 有写入仓库的权限：

1. 进入 **Settings** → **Actions** → **General**
2. 滚动到 **Workflow permissions**
3. 选择 **Read and write permissions**
4. 点击 **Save**

### 本地运行失败：API Key 错误

```bash
# 检查环境变量是否设置
echo $SILICONFLOW_API_KEY

# 重新设置
export SILICONFLOW_API_KEY=your_actual_key
```

## 🔄 修改运行时间

编辑 `.github/workflows/rss-update.yml` 文件的 cron 表达式：

```yaml
schedule:
  - cron: '0 0 * * *'  # UTC 00:00 = 北京时间 08:00
```

常用时间对照：
- 北京时间 06:00 → UTC 22:00 → `0 22 * * *`
- 北京时间 08:00 → UTC 00:00 → `0 0 * * *`
- 北京时间 10:00 → UTC 02:00 → `0 2 * * *`
- 北京时间 12:00 → UTC 04:00 → `0 4 * * *`

## 📝 提交信息规范

自动提交使用的格式：
```
chore: auto update RSS feeds [skip ci]
```

`[skip ci]` 标记防止提交触发新的工作流运行，避免无限循环。

## 🎯 最佳实践

1. **定期检查日志** - 确保工作流正常运行
2. **监控 API 额度** - 注意硅基流动 API 的使用配额
3. **备份重要数据** - 定期备份 `_news/` 目录
4. **更新依赖** - 定期运行 `npm update` 更新依赖包

## 📄 相关文件

- `.github/workflows/rss-update.yml` - GitHub Actions 工作流配置
- `.env.example` - 环境变量配置模板
- `.gitignore` - Git 忽略规则
- `main/index.js` - 主程序
- `main/ai-summary.js` - AI 摘要生成模块

## 📞 问题反馈

如果遇到问题，请检查：
1. GitHub Actions 运行日志
2. API 密钥是否有效
3. RSS 源是否可访问
4. 网络连接是否正常

---

**安全提醒**：永远不要在代码中硬编码 API 密钥！
