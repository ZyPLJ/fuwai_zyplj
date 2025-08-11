---
title: Astro/fuwai博客配置教程
published: 2025-08-11
description: 新博客站点部署也有2周多时间了，新站的访问量不是很多，但是我发现有人是用我的fuwai_zyplj仓库去修改配置然后再部署自己的博客
tags: [博客教程]
category: 教程
draft: false 
pinned: true
---

# Astro/fuwai博客配置教程

## 前言

新博客站点部署也有2周多时间了，新站的访问量不是很多，但是我发现有人是用我的[fuwai_zyplj](https://github.com/ZyPLJ/fuwai_zyplj)仓库去修改配置然后再部署自己的博客，因为我个人喜欢对博客乱改，所以我这边出一个教程，来讲讲如何部署和我一样的博客。

<font color='red'>本篇文章重点讲解博客配置！！！</font>

为了方便大家使用我的仓库，我特意将原本的仓库改为私有，新建了一个公共的仓库，包括不限于没有我的文章、其他第三方配置。

我的博客只是在原作者[fuwari](https://github.com/saicaca/fuwari)仓库的基础上增加了：

1. 音乐播放器
2. 文章置顶固定（原作者仓库PR中的）
3. 评论系统
4. 友链页面
5. 首图支持视频

如果对于上述功能不感兴趣的可以直接`clone`原作者的仓库。

## 页面基础配置

大部分页面配置都在`src/config.ts`文件中完成,大部分配置都有注释。重点讲解我添加的配置。

### banner图换成视频

将`type`设置为`video`，然后将`src`指向视频`MP4`格式的视频文件，注意视频文件放在 `public/videos/` 目录下。

```ts
banner: {
    enable: true,
    src: "assets/images/banner.jpg", // Relative to the /src directory. Relative to the /public directory if it starts with '/'
    // 如果要使用MP4视频，可以这样配置：
    // src: "/videos/banner-video.mp4", // 视频文件放在 public/videos/ 目录下
    // type: "video", // 设置为视频类型
    position: "center", // Equivalent to object-position, only supports 'top', 'center', 'bottom'. 'center' by default
    type: "image", // Support 'image' or 'video' format
    credit: {
        enable: false, // Display the credit text of the banner image
        text: "", // Credit text to be displayed
        url: "", // (Optional) URL link to the original artwork or artist's page
    },
},
```

### Microsoft Clarity 分析

`Microsoft Clarity`是微软提供的用于网站流量分析的工具，如果用不上改成false即可，如果想用就需要去官网注册个账号：https://clarity.microsoft.com/

```ts
clarity: {
    enable: false, // 是否启用 Microsoft Clarity 分析
    projectId: "", // Clarity 项目 ID
},
```

### 音乐播放器

在`public/lib/MasterMusic.js`中修改音乐数据源。

```ts
musicPlayer: {
    enable: true, // 是否启用音乐播放器
},
```

### 评论系统

`envId`替换成你部署的评论系统的域名或者ip地址。

本博客集成的[快速上手 | Twikoo 文档](https://twikoo.js.org/quick-start.html)评论系统，如果想部署这个评论系统，官网的部署文档还是很详细的，推荐有服务器的人使用`宝塔+Docker`部署。

如果不想用或者部署不好评论系统，修改`enable`为`false`就能关闭评论。

```ts
export const commentConfig = {
	enable: true,
	provider: "twikoo",
	twikoo: {
		envId: "https://api.pljzy.top", // 移除末尾的斜杠
		region: "",
		lang: "zh-CN",
	},
};

```

如果发现评论系统没有出现，可能是`CDN`文件引入的问题，可以在`src/components/Comment.astro`组件中修改`CDN`文件路径。

```ts
// https://twikoo.js.org/frontend.html CDN指南
const script = document.createElement('script');
script.src = 'https://registry.npmmirror.com/twikoo/1.6.44/files/dist/twikoo.min.js' 
```

### 友链页面

`src/content/spec/links.md`友链页面其实就是`md`文件，如果有新的友链，将参考的`div`复制一份修改里面的内容就行了，对于没有评论系统的，也想使用友链，可以将自己仓库的`issues`地址放出来，让其他博主在`github`上体积`issues`来达到友链提交的效果

### 文章置顶

`pinned` 属性设置为true即为置顶显示

```markdown
---
title: ***文章标题
published: 2025-06-21 发布时间
description: 文章简介
image: ./5.png 文章首图,非必须可删除。
tags: [日常,测试] 文章标签 可多个 
category: 记录生活 文章分类
draft: false 
pinned: false 文章是否固定、置顶
---
```

## 多提一嘴

大部分博客的配置都是在`src/config.ts`文件中完成，文章底部显示的内容在`src/components/Footer.astro`组件中设置。
部署博客的话可以参考：[基于Astro开发的Fuwari静态博客模版配置CICD流程 - ZY知识库](https://blog.pljzy.top/posts/astro/基于astro开发的fuwari静态博客模版配置cicd流程/)--https://blog.pljzy.top/posts/astro/  这篇文章

## 结语

上述就是博主所集成的工具开关，如果还有问题可以在文章下留言。
推荐先去了解原作者的模版：[fuwari](https://github.com/saicaca/fuwari)--https://github.com/saicaca/fuwari。 如果喜欢本博客集成功能可以参考代码添加进去。