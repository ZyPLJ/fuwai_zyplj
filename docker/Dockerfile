FROM nginx:alpine

# 删除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义配置
COPY ./nginx/default.conf /etc/nginx/conf.d/

# 复制构建好的静态文件（由CI/CD流程完成）
WORKDIR /usr/share/nginx/html

# 暴露端口
EXPOSE 4321