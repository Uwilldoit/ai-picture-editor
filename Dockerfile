# 前端构建阶段
FROM node:22-alpine AS frontend
WORKDIR /build
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

COPY frontend/package*.json ./
# --omit=optional：跳过平台专属可选二进制包，根治 npm ci 平台报错
RUN npm ci --omit=optional
COPY frontend/ ./
RUN npm run build

# Python后端主镜像
FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# 替换debian国内源，字体安装提速
RUN echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm main contrib non-free non-free-firmware" > /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends fonts-wqy-microhei \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONPATH=/app/backend \
    UV_DEFAULT_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple

# 分层缓存：先只安装第三方依赖，不安装项目自身代码
COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --all-extras --no-dev --no-install-project

# 拷贝后端源码，再安装项目本身（代码改动不会重下依赖包）
COPY backend/ ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --all-extras --no-dev

# 复制前端打包产物
COPY --from=frontend /build/dist /app/frontend/dist

ENV PATH="/app/backend/.venv/bin:$PATH"

EXPOSE 7302
