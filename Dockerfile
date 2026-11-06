# 前端构建阶段
FROM node:22-alpine AS frontend
WORKDIR /build
ENV NPM_CONFIG_REGISTRY=https://registry.npmmirror.com

COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Python后端主镜像 python:3.13-slim 底层 Debian trixie
FROM python:3.13-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# trixie 清华源
RUN echo "deb https://mirrors.tuna.tsinghua.edu.cn/debian/ trixie main contrib non-free non-free-firmware" > /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends fonts-wqy-microhei \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONPATH=/app/backend \
    UV_DEFAULT_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple

COPY backend/pyproject.toml backend/uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --all-extras --no-dev --no-install-project

COPY backend/ ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --all-extras --no-dev

COPY --from=frontend /build/dist /app/frontend/dist

ENV PATH="/app/backend/.venv/bin:$PATH"

EXPOSE 7333
