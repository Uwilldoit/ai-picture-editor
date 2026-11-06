import uuid

from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.layers import Layer, LayerDocument, LayerKind, Transform
from app.models.asset import Asset
from app.models.tool_run import ToolRun
from app.services import assets, sessions
from app.tools.base import ToolSpec
from app.tools.context import ToolError, document_of, require_session

_NAME_LIMIT = 40


class PlaceImageIn(BaseModel):
    """把一张已有素材叠到画布上，成为可拖动缩放的独立图层。"""

    asset_id: uuid.UUID = Field(description="要置入的素材 id，必须属于当前用户")
    name: str | None = Field(default=None, max_length=_NAME_LIMIT)


def _grow_canvas(document: LayerDocument, target_w: int, target_h: int) -> None:
    """扩画布：已有层向中心平移保持相对居中；画幅只多出留白，不拉伸像素。"""
    new_w = max(document.width, target_w)
    new_h = max(document.height, target_h)
    dx = (new_w - document.width) / 2
    dy = (new_h - document.height) / 2
    for layer in document.layers:
        layer.transform.x += dx
        layer.transform.y += dy
    document.width = new_w
    document.height = new_h


def _place_layer(document: LayerDocument, asset: Asset, name: str | None) -> None:
    """默认按画布含式放缩居中；图片比画布大时自动扩画布，按原始尺寸落中。"""
    scale = min(document.width / asset.width, document.height / asset.height)
    if scale < 1:
        # 图片超过画布：不缩小图片，改成把画布拉大来容纳它
        _grow_canvas(document, asset.width, asset.height)
        scale = 1
    width = round(asset.width * scale)
    height = round(asset.height * scale)
    x = round((document.width - width) / 2)
    y = round((document.height - height) / 2)

    document.layers.append(
        Layer(
            id=f"placed-{asset.id}",
            kind=LayerKind.IMAGE,
            name=name or "置入图",
            width=width,
            height=height,
            asset_id=asset.id,
            transform=Transform(x=x, y=y, scale_x=scale, scale_y=scale),
        )
    )


async def place_image_exec(session: AsyncSession, run: ToolRun) -> dict:
    record = await require_session(session, run)
    document = document_of(record)

    asset = await assets.get_for_user(session, record.user_id, run.params["asset_id"])
    if asset is None:
        raise ToolError("素材不存在或不属于当前用户")
    if asset.id == record.current_asset_id:
        return {"document": document.model_dump(mode="json")}

    # 居中放缩可能得到与当前文档完全一致的文档（1:1 画幅居中在正中），
    # 此时 _record 不会触发 apply_edit，素材也进不了图片墙，需在此显式挂墙。
    _place_layer(document, asset, run.params.get("name"))
    if document.model_dump(mode="json") == record.document:
        record = await sessions.apply_edit(
            session,
            record,
            run.tool,
            params=run.params,
            document=document,
            extra_assets=[asset],
        )
    return {
        "document": document.model_dump(mode="json"),
        "asset_ids": [str(asset.id)],
    }


PLACE_IMAGE = ToolSpec(
    name="insert_image",
    label="置入图片",
    description=(
        "把一张已有素材置入画布，成为可拖动、可缩放的独立图层，位于最上层。"
        "小图按画布比例居中放大；图片比画布大时自动扩画布按原始尺寸落中，不裁切。"
        "asset_id 必须属于当前用户；置入后可用移动、缩放、透明度等工具再调整。"
    ),
    params=PlaceImageIn,
    handler=place_image_exec,
    queued=True,
    session_required=True,
)
