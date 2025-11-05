/*
	功能：
	- 读取 main/rss.json 中的 { 栏目名: [rssUrl, ...] }
	- 拉取各 RSS 源的最新若干条（默认每源取 5 条），按栏目聚合
	- 调用硅基流动 1-0528-Qwen3-8B 进行中文要点式总结（如无 API Key，则本地降级合成摘要）
	- 以“按照栏目名”输出到 _news/ 下，文件名：YYYY-MM-DD-<slug>.md
	- Front matter 格式与现有示例一致：
		---\n
		date: YYYY-MM-DD HH:mm\n
		---\n
		<正文>

	约定：
	- 需要环境变量 SILICONFLOW_API_KEY（可选）。
	- Node >= 18（内置 fetch）。
*/

const fs = require('fs');
const path = require('path');
const RSSParser = require('rss-parser');

const ROOT_REPO = path.resolve(__dirname, '..');
const RSS_CONFIG_PATH = path.resolve(__dirname, 'rss.json');
const NEWS_DIR = path.resolve(ROOT_REPO, '_news');
const RSS_DUMP_ROOT = path.resolve(ROOT_REPO, 'rss');

const MAX_ITEMS_PER_FEED = parseInt(process.env.MAX_ITEMS_PER_FEED || '5', 10);
const MODEL_NAME = process.env.SILICONFLOW_MODEL || '1-0528-Qwen3-8B';
const SF_BASE_URL =
  process.env.SILICONFLOW_BASE_URL || 'https://api.siliconflow.cn/v1';
const SF_API_KEY = process.env.SILICONFLOW_API_KEY || '';

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatDateForFrontMatter(d = new Date()) {
  // 使用本地时间，格式 YYYY-MM-DD HH:mm
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  const HH = pad2(d.getHours());
  const mm = pad2(d.getMinutes());
  return `${yyyy}-${MM}-${dd} ${HH}:${mm}`;
}

function todayFilePrefix(d = new Date()) {
  const yyyy = d.getFullYear();
  const MM = pad2(d.getMonth() + 1);
  const dd = pad2(d.getDate());
  return `${yyyy}-${MM}-${dd}`;
}

function slugify(name) {
  // 将空格转为-，去除两端空白，英文转小写；保留中文与常见符号
  return (name || '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[，、。！？：；“”"'`]/g, '')
    .replace(/\/+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

async function readRssConfig() {
  const raw = await fs.promises.readFile(RSS_CONFIG_PATH, 'utf-8');
  const conf = JSON.parse(raw);
  return conf; // { columnName: [url, ...], ... }
}

async function fetchFeedsByColumn(columnName, urls, parser) {
  const items = [];
  const dump = [];
  for (const url of urls) {
    try {
      const feed = await parser.parseURL(url);
      // feed.items: [{title, link, pubDate, contentSnippet, content, isoDate, ...}]
      const sliced = (feed.items || []).slice(0, MAX_ITEMS_PER_FEED);
      const subset = sliced.map((it) => ({
        title: it.title || '',
        link: it.link || '',
        pubDate: it.isoDate || it.pubDate || '',
        summary: it.contentSnippet || it.content || '',
      }));
      const rawForDump = sliced.map((it) => ({
        title: it.title || '',
        link: it.link || '',
        pubDate: it.pubDate || '',
        isoDate: it.isoDate || '',
        content: it.content || '',
        contentSnippet: it.contentSnippet || '',
        guid: it.guid || '',
        categories: it.categories || [],
        creator: it.creator || '',
        feedUrl: url,
      }));
      items.push(...subset);
      dump.push(...rawForDump);
    } catch (e) {
      console.warn(`[WARN] 拉取 RSS 失败: ${url}\n`, e.message);
    }
  }

  // 按 pubDate 降序，去重链接
  const byLink = new Map();
  for (const it of items) {
    if (it.link && !byLink.has(it.link)) byLink.set(it.link, it);
  }
  const unique = Array.from(byLink.values()).sort((a, b) => {
    const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
    const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
    return tb - ta;
  });
  return { items: unique, dump };
}

function buildItemPrompt(columnName, item) {
  const intro = `你是资深中文科技编辑，正在为栏目“${columnName}”撰写单篇新闻摘要。`;
  const guide = [
    '- 用中文写 3-5 句，概述研究/事件的核心结论、方法或意义，以及潜在影响。',
    '- 语言准确、精炼、避免夸大，不要重复标题；不要输出列表符号或再次包含链接。',
    '- 面向非专业读者，必要时补充一句背景解释。',
  ].join('\n');
  const body = [
    `标题: ${item.title}`,
    item.link ? `链接: ${item.link}` : '',
    item.pubDate ? `时间: ${item.pubDate}` : '',
    item.summary
      ? `摘要片段: ${item.summary.replace(/\s+/g, ' ').slice(0, 800)}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');
  return `${intro}\n\n写作要求:\n${guide}\n\n素材:\n${body}`;
}

async function summarizeWithSiliconFlow(prompt) {
  if (!SF_API_KEY) {
    // 降级：简单裁剪与重排（不调用外部服务）
    const lines = prompt.split('\n').filter((l) => l.startsWith('#'));
    const top = lines.slice(0, 6).map((l) => l.replace(/^#+\d*\s*/, '')); // 取前 6 条标题
    return `- ${top.join('\n- ')}`;
  }
  const url = `${SF_BASE_URL.replace(/\/$/, '')}/chat/completions`;
  const payload = {
    model: MODEL_NAME,
    messages: [
      { role: 'system', content: '你是一个高质量的中文新闻编辑与总结助手。' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
    max_tokens: 800,
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SF_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`SiliconFlow API error ${res.status}: ${t}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content || '';
  return content.trim();
}

function buildNewsMarkdown(dateStr, sections) {
  // 文件头 + 每篇文章使用一级标题（带链接）+ 段落摘要
  const parts = ['---', `date: ${dateStr}`, '---', ''];
  for (const s of sections) {
    const titleLine = s.link ? `# [${s.title}](${s.link})` : `# ${s.title}`;
    parts.push(titleLine, s.summary.trim(), '');
  }
  parts.push('');
  return parts.join('\n');
}

async function writeNewsFile(columnName, markdown, now = new Date()) {
  const slug = slugify(columnName) || 'news';
  const fileName = `${todayFilePrefix(now)}-${slug}.md`;
  const outPath = path.join(NEWS_DIR, fileName);
  await fs.promises.writeFile(outPath, markdown, 'utf-8');
  return outPath;
}

async function writeRssDump(columnName, dumpItems, now = new Date()) {
  const slug = slugify(columnName) || 'news';
  const targetDir = path.join(RSS_DUMP_ROOT, slug);
  await fs.promises.mkdir(targetDir, { recursive: true });
  const hh = pad2(now.getHours());
  const mm = pad2(now.getMinutes());
  const fileName = `${todayFilePrefix(now)}-${hh}${mm}.json`;
  const outPath = path.join(targetDir, fileName);
  const payload = {
    column: columnName,
    generatedAt: new Date(now.getTime()).toISOString(),
    itemCount: dumpItems.length,
    items: dumpItems,
  };
  await fs.promises.writeFile(
    outPath,
    JSON.stringify(payload, null, 2),
    'utf-8'
  );
  return outPath;
}

async function main() {
  // 确保 _news 目录存在
  await fs.promises.mkdir(NEWS_DIR, { recursive: true });

  // 读取 RSS 配置
  const conf = await readRssConfig();
  const parser = new RSSParser({
    timeout: 15000,
    headers: {
      'User-Agent': 'catchnews-bot/1.0 (+https://github.com/sukiElaina)',
    },
  });

  const now = new Date();
  const dateStr = formatDateForFrontMatter(now);

  // 逐栏目处理（每个栏目单独总结并立即输出，同时落盘原始抓取）
  for (const [columnName, urls] of Object.entries(conf)) {
    console.log(`[INFO] 处理栏目: ${columnName}`);
    const { items, dump } = await fetchFeedsByColumn(columnName, urls, parser);
    if (!items.length) {
      console.warn(`[WARN] ${columnName} 无可用条目，跳过输出。`);
      continue;
    }

    // 串行逐篇摘要，确保下一篇在上一篇完成后开始
    const sections = [];
    for (const item of items) {
      const prompt = buildItemPrompt(columnName, item);
      let itemSummary;
      try {
        itemSummary = await summarizeWithSiliconFlow(prompt);
      } catch (e) {
        console.error(`[ERROR] 单篇总结失败（使用降级内容）：`, e.message);
        // 降级：如果失败，仅输出一句话或标题+链接
        itemSummary = item.summary
          ? item.summary.replace(/\s+/g, ' ').slice(0, 280)
          : item.link
          ? `参见原文：${item.link}`
          : '';
      }
      sections.push({
        title: item.title || '无标题',
        link: item.link || '',
        summary: itemSummary,
      });
    }

    const md = buildNewsMarkdown(dateStr, sections);
    const outPath = await writeNewsFile(columnName, md, now);
    console.log(`[OK] 已生成: ${path.relative(ROOT_REPO, outPath)}`);

    // 保存原始抓取
    const dumpPath = await writeRssDump(columnName, dump, now);
    console.log(`[OK] 抓取已保存: ${path.relative(ROOT_REPO, dumpPath)}`);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
