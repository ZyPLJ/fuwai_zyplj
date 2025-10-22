import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 获取当前脚本的目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 导入friend-links数据
const friendLinksPath = path.resolve(__dirname, "../src/data/friend-links.ts");

// 读取文件内容
const fileContent = fs.readFileSync(friendLinksPath, "utf8");

// 使用正则表达式提取friendLinkSections数据
const dataMatch = fileContent.match(
	/export\s+const\s+friendLinkSections\s*:\s*FriendLinkSection\[\]\s*=\s*(\[.+?\]);/s,
);

if (!dataMatch) {
	console.error("无法提取friendLinkSections数据");
	process.exit(1);
}

// 构造一个安全的环境来解析数据
const sectionsData = eval(`(${dataMatch[1]})`);

// 获取第一个section的items
const firstSectionItems = sectionsData[0]?.items || [];

// 转换为要求的格式
const friendsArray = firstSectionItems.map((item) => [
	item.title,
	item.url,
	item.avatar,
]);

// 创建输出对象
const output = {
	friends: friendsArray,
};

// 确保输出目录存在
const outputDir = path.resolve(__dirname, "../dist");
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

// 写入JSON文件
const outputPath = path.resolve(outputDir, "friend.json");
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), "utf8");

console.log(`成功生成friend.json文件到: ${outputPath}`);
