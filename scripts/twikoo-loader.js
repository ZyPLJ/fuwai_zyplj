// src/scripts/twikoo-loader.js

(function () {
	if (window.__twikooLoaderInitialized) return;
	window.__twikooLoaderInitialized = true;

	let twikooLoadTimer;

	// ✅ 加载评论数量
	const loadTwikooCommentCount = () => {
		if (!window.twikoo) return;

		const commentEls = document.querySelectorAll(".comment-count[data-path]");
		if (commentEls.length === 0) return;

		const paths = Array.from(commentEls)
			.map((el) => el.dataset.path)
			.map((path) => path.split("/").map(encodeURIComponent).join("/"));

		// 从全局配置获取Twikoo参数
		const twikooConfig = window.commentConfig?.twikoo || {};

		window.twikoo
			.getCommentsCount({
				envId: twikooConfig.envId || "https://api.pljzy.top", // 默认值作为回退
				region: twikooConfig.region || "",
				urls: paths,
				includeReply: true,
			})
			.then((res) => {
				res.forEach((item) => {
					const el = document.querySelector(
						`.comment-count[data-path="${decodeURIComponent(item.url)}"] span:nth-child(1)`,
					);
					if (el) el.textContent = `${item.count}`;
				});
			})
			.catch(console.error);
	};

	// ✅ 确保 Twikoo 加载
	const ensureTwikooLoaded = () => {
		clearTimeout(twikooLoadTimer);
		twikooLoadTimer = setTimeout(() => {
			if (window.twikooLoaded) {
				loadTwikooCommentCount();
			} else if (!window.twikooLoading) {
				window.twikooLoading = true;
				const script = document.createElement("script");
				script.src =
					"https://registry.npmmirror.com/twikoo/1.6.44/files/dist/twikoo.min.js";
				script.onload = () => {
					window.twikooLoaded = true;
					loadTwikooCommentCount();
				};
				document.head.appendChild(script);
			}
		}, 200);
	};

	// ✅ 绑定事件（只绑定一次）
	const bindEvents = () => {
		const safeReload = () => ensureTwikooLoaded();
		document.addEventListener("astro:page-load", safeReload);
		document.addEventListener("swup:page:view", safeReload);
	};

	// 初始化
	ensureTwikooLoaded();
	bindEvents();
})();
