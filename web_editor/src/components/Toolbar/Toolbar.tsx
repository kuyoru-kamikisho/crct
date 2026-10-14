import type { FsSupport } from '../../utils/fileSystem'
import styles from './Toolbar.module.less'

type Props = {
  support: FsSupport
  fileName: string
  dirty: boolean
  saving: boolean
  onNew: () => void
  onOpenFile: () => void
  onOpenDir: () => void
  onSave: () => void
}

export function Toolbar({
  support,
  fileName,
  dirty,
  saving,
  onNew,
  onOpenFile,
  onOpenDir,
  onSave,
}: Props) {
  return (
    <header className={styles.toolbar}>
      <div className={styles.brand}>
        <span className={styles.logo} aria-hidden />
        <span className={styles.title}>Local Editor</span>
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.btn} onClick={onNew} title="新建文件">
          新建
        </button>
        <button type="button" className={styles.btn} onClick={onOpenFile} title="打开文件">
          打开文件
        </button>
        {support.directory && (
          <button type="button" className={styles.btn} onClick={onOpenDir} title="打开文件夹">
            打开文件夹
          </button>
        )}
        <button
          type="button"
          className={`${styles.btn} ${styles.primary}`}
          onClick={onSave}
          disabled={saving}
          title={support.file ? '保存到本地' : '下载文件'}
        >
          {saving ? '保存中…' : support.file ? '保存' : '下载'}
        </button>
      </div>

      <div className={styles.meta}>
        <span className={styles.fileName} title={fileName}>
          {fileName || '未命名'}
          {dirty ? ' •' : ''}
        </span>
        <span
          className={`${styles.badge} ${support.file ? styles.ok : styles.warn}`}
          title={
            support.file
              ? '支持 File System Access API，可实时读写本地文件'
              : '当前浏览器不支持 File System Access API，将使用下载方式保存'
          }
        >
          {support.file ? '实时读写' : '下载模式'}
        </span>
      </div>
    </header>
  )
}
