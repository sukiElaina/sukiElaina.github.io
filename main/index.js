const fs = require('fs').promises;
const path = require('path');
const Parser = require('rss-parser');
const { summarizeArticle } = require('./ai-summary.js');

const parser = new Parser({
  timeout: 30000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; RSS Fetcher/1.0)'
  }
});

// RSS 源配置
const RSS_CONFIG_PATH = path.join(__dirname, 'rss.json');
const RSS_DIR = path.join(__dirname, '..', 'rss');
const NEWS_DIR = path.join(__dirname, '..', '_news');

/**
 * 确保目录存在
 */
async function ensureDir(dirPath) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * 抓取单个 RSS 源
 */
async function fetchRSS(url) {
  console.log(`  抓取: ${url}`);
  return await parser.parseURL(url);
}

/**
 * 保存 RSS 数据
 */
async function saveRSSData(category, feed, url) {
  const filename = `${category}.json`;
  const filepath = path.join(RSS_DIR, filename);

  const data = {
    category,
    url,
    fetchedAt: new Date().toISOString(),
    feed: {
      title: feed.title,
      description: feed.description,
      link: feed.link,
      items: feed.items.map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        creator: item.creator,
        content: item.content || item.contentSnippet,
        contentSnippet: item.contentSnippet,
        guid: item.guid,
        categories: item.categories,
        isoDate: item.isoDate
      }))
    }
  };

  await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`  ✓ 已保存: ${filename} (${feed.items.length} 篇文章)`);

  return data;
}

/**
 * 从 isoDate 提取日期 (YYYY-MM-DD)
 */
function extractDate(isoDate) {
  if (!isoDate) return null;
  return isoDate.split('T')[0];
}

/**
 * 生成文件名 (YYYY-MM-DD-category.md)
 */
function generateNewsFilename(date, category) {
  const categoryLower = category.toLowerCase().replace(/\s+/g, '-');
  return `${date}-${categoryLower}.md`;
}

/**
 * 读取现有的 news 文件
 */
async function readExistingNewsFile(filepath) {
  try {
    const content = await fs.readFile(filepath, 'utf-8');

    // 提取现有的文章链接
    const linkRegex = /\[.*?\]\((https?:\/\/[^\)]+)\)/g;
    const existingLinks = [];
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      existingLinks.push(match[1]);
    }

    return { content, existingLinks };
  } catch {
    return { content: null, existingLinks: [] };
  }
}

/**
 * 生成文章的 Markdown 片段
 */
function generateArticleSection(article, summary) {
  return `## [${article.title}](${article.link})

${summary}

---

`;
}

/**
 * 生成完整的 Markdown 文件头部
 */
function generateFileHeader(date, category) {
  const now = new Date();
  const time = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM

  return `---
title:
date: ${date} ${time}
author: sukiElaina
---

`;
}

/**
 * 处理单个日期-分类组合的所有文章
 */
async function processDayCategoryArticles(date, category, articles) {
  const filename = generateNewsFilename(date, category);
  const filepath = path.join(NEWS_DIR, filename);

  console.log(`\n  处理日期: ${date} (${articles.length} 篇文章)`);

  // 读取现有文件
  const { content: existingContent, existingLinks } = await readExistingNewsFile(filepath);

  // 过滤出新文章
  const newArticles = articles.filter(article => !existingLinks.includes(article.link));

  if (newArticles.length === 0) {
    console.log(`    ⊘ 所有文章都已存在`);
    return;
  }

  console.log(`    发现 ${newArticles.length} 篇新文章`);

  // 生成新文章的内容
  let newContent = '';

  for (const article of newArticles) {
    console.log(`    ✎ 处理: ${article.title}`);
    console.log(`      调用 AI 生成总结...`);

    try {
      const summary = await summarizeArticle(article.title, article.link);
      newContent += generateArticleSection(article, summary);
      console.log(`      ✓ 已生成总结`);

      // 添加延迟，避免 API 请求过快
      await new Promise(resolve => setTimeout(resolve, 2000));

    } catch (error) {
      console.error(`      ✗ 处理失败: ${error.message}`);
      // 即使失败也添加一个占位符
      newContent += generateArticleSection(article, `AI 总结生成失败: ${error.message}`);
    }
  }

  // 合并或创建文件
  let finalContent;
  if (existingContent) {
    // 追加到现有文件
    finalContent = existingContent + '\n' + newContent;
    console.log(`    ✓ 追加到现有文件: ${filename}`);
  } else {
    // 创建新文件
    finalContent = generateFileHeader(date, category) + newContent;
    console.log(`    ✓ 创建新文件: ${filename}`);
  }

  await fs.writeFile(filepath, finalContent, 'utf-8');
}

/**
 * 按日期和分类组织文章
 */
function organizeArticlesByDateAndCategory(rssData) {
  const organized = {};

  for (const article of rssData.feed.items) {
    const date = extractDate(article.isoDate);
    if (!date) continue;

    const key = `${date}|${rssData.category}`;
    if (!organized[key]) {
      organized[key] = {
        date,
        category: rssData.category,
        articles: []
      };
    }
    organized[key].articles.push(article);
  }

  return organized;
}

/**
 * 处理单个分类的所有文章
 */
async function processCategory(category, rssData) {
  console.log(`\n处理分类: ${category}`);
  console.log(`  共 ${rssData.feed.items.length} 篇文章`);

  // 按日期组织文章
  const organized = organizeArticlesByDateAndCategory(rssData);

  // 处理每个日期的文章
  for (const group of Object.values(organized)) {
    await processDayCategoryArticles(group.date, group.category, group.articles);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    console.log('='.repeat(60));
    console.log('RSS 自动化处理系统启动');
    console.log('='.repeat(60));

    // 确保目录存在
    await ensureDir(RSS_DIR);
    await ensureDir(NEWS_DIR);

    // 读取 RSS 配置
    console.log('\n1. 读取 RSS 配置...');
    const rssConfig = JSON.parse(await fs.readFile(RSS_CONFIG_PATH, 'utf-8'));
    console.log(`   找到 ${Object.keys(rssConfig).length} 个分类`);

    // 抓取所有 RSS 源
    console.log('\n2. 抓取 RSS 源...');
    const allRSSData = {};

    for (const [category, urls] of Object.entries(rssConfig)) {
      console.log(`\n分类: ${category}`);

      for (const url of urls) {
        try {
          const feed = await fetchRSS(url);
          const rssData = await saveRSSData(category, feed, url);

          // 存储数据供后续处理
          if (!allRSSData[category]) {
            allRSSData[category] = [];
          }
          allRSSData[category].push(rssData);

        } catch (error) {
          console.error(`  ✗ 抓取失败: ${error.message}`);
        }
      }
    }

    // 处理文章并生成 AI 总结
    console.log('\n3. 处理文章并生成 AI 总结...');

    for (const [category, rssDataList] of Object.entries(allRSSData)) {
      for (const rssData of rssDataList) {
        await processCategory(category, rssData);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✓ 所有任务完成！');
    console.log('='.repeat(60));

    process.exit(0);

  } catch (error) {
    console.error('\n错误:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 运行主函数
main();
