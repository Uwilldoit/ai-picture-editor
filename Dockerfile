# 前端构建阶段
FROM node:22-alpine AS frontend
WORKDIR /build

# 淘宝npm镜像，解决国内拉包慢
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Python后端主镜像
FROM python:3.13-slim

# 安装uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# apt换清华源（可选，fonts-wqy-microhei下载更快，注释掉就用默认）
RUN echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian/ bookworm main contrib non-free non-free-firmware" > /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends fonts-wqy-microhei \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# uv配置：字节编译、硬链接、PYTHONPATH + 清华pypi源
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONPATH=/app/backend \
    UV_DEFAULT_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple

# 【分层缓存关键】先只拷贝依赖文件，只要lock/toml不变，这一层会被docker缓存
COPY backend/pyproject.toml backend/uv.lock ./
# uv缓存挂载 + 只安装依赖，不安装项目源码
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --all-extras --no-dev --no-install-project

# 再拷贝后端业务源码
COPY backend/ ./
# 安装项目本身（源码），此时不会重新下载依赖包
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --all-extras --no-dev

# 把前端dist静态产物拷贝进来
COPY --from=frontend /build/dist /app/frontend/dist

ENV PATH="/app/backend/.venv/bin:$PATH"

EXPOSE 7333
