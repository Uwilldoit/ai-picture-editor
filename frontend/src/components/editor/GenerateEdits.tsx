import { useState } from 'react'

import type { Ratio } from '@/api/runs'
import Button from '@/components/ui/Button'

const RATIOS: { value: Ratio; label: string }[] = [
  { value: '1:1', label: '1:1' },
  { value: '4:5', label: '4:5' },
  { value: '3:4', label: '3:4' },
  { value: '9:16', label: '9:16' },
  { value: '16:9', label: '16:9' },
]

const FIELD =
  'border-line text-ink placeholder:text-faint rounded-control focus:border-line-strong w-full resize-none border px-3 py-2 text-xs leading-relaxed outline-none transition-colors duration-150'

export function BackgroundForm({
  disabled,
  wallOnly,
  onApply,
}: {
  disabled: boolean
  wallOnly: boolean
  onApply: (params: { prompt: string; count: number }) => void
}) {
  const [prompt, setPrompt] = useState('')
  const [count, setCount] = useState(1)
  const ready = prompt.trim().length > 0

  return (
    <section className="border-line border-b px-4 py-4">
      <h2 className="text-muted mb-2.5 text-xs font-medium">换背景</h2>
      <p className="text-faint mb-2.5 text-[11px] leading-relaxed">
        {wallOnly
          ? '写出新背景。已拆层，结果拍平成整图只进图片墙，点选采用；画布与图层保持不变。'
          : '写出新背景。一张直接上画布；多张进图片墙，点选采用。'}
      </p>
      <textarea
        rows={3}
        value={prompt}
        disabled={disabled}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="例如：浅木色桌面，晨光从左侧照入"
        className={FIELD}
      />
      <div className="mt-2 flex gap-1">
        {[1, 2, 4].map((value) => (
          <Button
            key={value}
            variant="outline"
            size="sm"
            block
            active={count === value}
            disabled={disabled}
            onClick={() => setCount(value)}
          >
            {value} 张
          </Button>
        ))}
      </div>
      <Button
        variant="solid"
        block
        className="mt-3"
        disabled={disabled || !ready}
        onClick={() => {
          onApply({ prompt: prompt.trim(), count })
          setPrompt('')
        }}
      >
        生成
      </Button>
    </section>
  )
}

export function ExpandForm({
  disabled,
  wallOnly,
  canvasSize,
  onApply,
  onExpandToSize,
}: {
  disabled: boolean
  wallOnly: boolean
  canvasSize: { width: number; height: number }
  onApply: (params: { ratio: Ratio }) => void
  onExpandToSize: (width: number, height: number) => void
}) {
  const [ratio, setRatio] = useState<Ratio>('16:9')
  const [width, setWidth] = useState(String(canvasSize.width))
  const [height, setHeight] = useState(String(canvasSize.height))

  const sizeValid = /^\d+$/.test(width) && /^\d+$/.test(height)
  const w = Number(width)
  const h = Number(height)
  // 放大、缩小都可以（32–4096 像素内），只要跟当前画布不同就允许
  const canApply =
    sizeValid && w >= 32 && w <= 4096 && h >= 32 && h <= 4096 && (w !== canvasSize.width || h !== canvasSize.height)

  return (
    <section className="border-line border-b px-4 py-4">
      <h2 className="text-muted mb-2.5 text-xs font-medium">扩图</h2>
      <p className="text-faint mb-2.5 text-[11px] leading-relaxed">
        {wallOnly
          ? '扩展到目标比例，主体保留在画面中。已拆层，结果只进图片墙，点选采用；画布与图层保持不变。'
          : '扩展到目标比例，主体保留在画面中，完成后写回画布。'}
      </p>
      <div className="grid grid-cols-5 gap-1">
        {RATIOS.map((item) => (
          <Button
            key={item.value}
            variant="outline"
            size="sm"
            block
            active={ratio === item.value}
            disabled={disabled}
            onClick={() => setRatio(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <Button
        variant="solid"
        block
        className="mt-3"
        disabled={disabled}
        onClick={() => onApply({ ratio })}
      >
        扩展
      </Button>

      <div className="border-line mt-4 border-t pt-4">
        <h3 className="text-ink mb-2 text-xs font-medium">或改到指定尺寸（拉白边，不调 AI）</h3>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={32}
            max={4096}
            value={width}
            disabled={disabled}
            onChange={(event) => setWidth(event.target.value)}
            aria-label="目标宽"
            className="text-ink border-line focus:border-line-strong w-full rounded-control border px-2 py-1.5 text-xs outline-none"
          />
          <span className="text-faint text-xs">×</span>
          <input
            type="number"
            min={32}
            max={4096}
            value={height}
            disabled={disabled}
            onChange={(event) => setHeight(event.target.value)}
            aria-label="目标高"
            className="text-ink border-line focus:border-line-strong w-full rounded-control border px-2 py-1.5 text-xs outline-none"
          />
        </div>
        <p className="text-faint mt-1.5 text-[11px]">
          当前画布 {canvasSize.width}×{canvasSize.height}；可放大或缩小，多出的区域留白，像素不拉伸、不裁切。
        </p>
        <Button
          variant="solid"
          block
          className="mt-3"
          disabled={disabled || !canApply}
          onClick={() => onExpandToSize(w, h)}
        >
          改到此尺寸
        </Button>
      </div>
    </section>
  )
}

export function ReplaceForm({
  disabled,
  onApply,
}: {
  disabled: boolean
  onApply: (params: { prompt: string }) => void
}) {
  const [prompt, setPrompt] = useState('')
  const ready = prompt.trim().length > 0

  return (
    <section className="border-line border-b px-4 py-4">
      <h2 className="text-muted mb-2.5 text-xs font-medium">局部替换</h2>
      <p className="text-faint mb-2.5 text-[11px] leading-relaxed">
        只改当前选区。选区外的画面会保持不动。
      </p>
      <textarea
        rows={3}
        value={prompt}
        disabled={disabled}
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="例如：把杯子换成陶瓷马克杯"
        className={FIELD}
      />
      <Button
        variant="solid"
        block
        className="mt-3"
        disabled={disabled || !ready}
        onClick={() => {
          onApply({ prompt: prompt.trim() })
          setPrompt('')
        }}
      >
        替换
      </Button>
    </section>
  )
}
