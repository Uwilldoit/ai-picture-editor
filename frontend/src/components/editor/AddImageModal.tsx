import { useState } from 'react'

import { errorMessage } from '@/hooks/useAuth'
import { useAssetLibrary, useUploadAsset, checkFile } from '@/hooks/useAssets'
import { buttonClass } from '@/components/ui/buttonStyles'
import ImageDropzone from '@/components/ImageDropzone'

type Tab = 'upload' | 'library'

/**
 * 把一张新图放进当前会话画布的入口。上传后或从历史素材选一张，
 * 交由父级挂进图片墙并置入为可拖动图层；这里只负责选图。
 */
export default function AddImageModal({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (assetId: string) => void
}) {
  const [tab, setTab] = useState<Tab>('upload')
  const [fileError, setFileError] = useState<string | null>(null)
  const upload = useUploadAsset()
  const { data: groups = [] } = useAssetLibrary()
  const busy = upload.isPending

  if (!open) return null

  const handleFile = (file: File) => {
    const problem = checkFile(file)
    setFileError(problem)
    if (!problem) {
      upload.mutate(file, {
        onSuccess: (asset) => {
          upload.reset()
          onPick(asset.id)
        },
      })
    }
  }

  const noLibrary = groups.length === 0 || groups.every((group) => group.assets.length === 0)
  const shownError = fileError || (upload.error ? errorMessage(upload.error) : null)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="bg-paper border-line absolute inset-0 bg-black/40" />
      <div
        className="bg-paper border-line relative z-10 w-full max-w-2xl rounded-[20px] border p-5 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-ink mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">添加图片到画布</h2>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="text-muted hover:text-ink rounded p-1 text-lg leading-none"
          >
            ×
          </button>
        </div>

        <div className="mb-4 flex gap-1">
          <button
            type="button"
            onClick={() => {
              setTab('upload')
              setFileError(null)
            }}
            className={buttonClass({ active: tab === 'upload' })}
          >
            上传新图
          </button>
          <button
            type="button"
            onClick={() => setTab('library')}
            className={buttonClass({ active: tab === 'library' })}
          >
            历史素材
          </button>
        </div>

        {tab === 'upload' ? (
          <div>
            <ImageDropzone onFile={handleFile} disabled={busy} />
            {shownError && <p className="text-danger mt-2 text-xs">{shownError}</p>}
            <p className="text-faint mt-3 text-xs">
              上传后自动挂进图片墙并置入为可拖动图层；比画布大时会自动扩画布。
            </p>
          </div>
        ) : noLibrary ? (
          <p className="text-faint py-6 text-center text-sm">
            还没有历史素材，先用「上传新图」放一张进来。
          </p>
        ) : (
          <ul className="grid max-h-72 grid-cols-3 gap-3 overflow-y-auto pr-1 sm:grid-cols-4">
            {groups
              .flatMap((group) => group.assets)
              .map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => onPick(asset.id)}
                    title={`置入 · ${asset.width}×${asset.height}`}
                    className="bg-canvas border-line hover:border-brand group relative size-full overflow-hidden rounded-chip border-2"
                  >
                    <img
                      src={asset.url}
                      alt=""
                      loading="lazy"
                      className="aspect-square w-full object-contain transition-transform duration-150 group-hover:scale-[1.03]"
                    />
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}
