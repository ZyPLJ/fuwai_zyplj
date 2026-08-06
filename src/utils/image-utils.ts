// 图片优化辅助函数，移植自 Firefly (CuteLeaf/Firefly) src/utils/image-utils.ts
// 简化版：去掉随机封面图 API（本项目无 image: "api" 用法）

import { siteConfig } from "../config";

export type ImageFormat = "avif" | "webp";
// 与 astro:assets 的 ImageLayout 保持一致（注意是 full-width，带连字符）
export type ResponsiveImageLayout =
	| "constrained"
	| "fixed"
	| "full-width"
	| "none";

/**
 * 获取图片优化格式配置
 */
export function getImageFormats(): ImageFormat[] {
	const formatConfig = siteConfig.imageOptimization?.formats ?? "both";
	switch (formatConfig) {
		case "avif":
			return ["avif"];
		case "webp":
			return ["webp"];
		default:
			return ["avif", "webp"];
	}
}

/**
 * 获取图片优化质量配置
 */
export function getImageQuality(): number {
	return siteConfig.imageOptimization?.quality ?? 80;
}

/**
 * 获取图片回退格式
 */
export function getFallbackFormat(): "avif" | "webp" {
	const formatConfig = siteConfig.imageOptimization?.formats ?? "both";
	return formatConfig === "avif" ? "avif" : "webp";
}

/**
 * 检查是否需要为图片添加 referrerpolicy="no-referrer" 以解决防盗链 403 问题
 */
export function shouldAddNoReferrer(urlStr: string): boolean {
	if (!urlStr.startsWith("http")) return false;
	const domains = siteConfig.imageOptimization?.noReferrerDomains || [];
	if (domains.length === 0) return false;
	try {
		const hostname = new URL(urlStr).hostname;
		return domains.some((pattern) => {
			// 先完整转义正则元字符，再把用户写的 * 通配符还原为 .*
			const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regexPattern = escaped.replace(/\\\*/g, ".*");
			return new RegExp(`^${regexPattern}$`).test(hostname);
		});
	} catch {
		return false;
	}
}
