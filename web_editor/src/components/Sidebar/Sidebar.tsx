import type { DirEntry } from '../../utils/fileSystem'
import { FileTree } from './FileTree'
import styles from './Sidebar.module.less'

type Props = {
  dirName: string | null
  entries: DirEntry[]
  activePath?: string
  supported: boolean
  onOpenFile: (entry: DirEntry) => void
  onEntriesChange: (entries: DirEntry[]) => void
}

export function Sidebar({
  dirName,
  entries,
  activePath,
  supported,
  onOpenFile,
  onEntriesChange,
}: Props) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <span className={styles.label}>资源管理器</span>
        {dirName && <span className={styles.dirName} title={dirName}>{dirName}</span>}
      </div>

      <div className={styles.body}>
        {!supported && (
          <div className={styles.hint}>
            当前浏览器不支持打开目录。请使用 Chromium 内核浏览器（Chrome / Edge）。
          </div>
        )}
        {supported && !dirName && (
          <div className={styles.hint}>
            点击顶部「打开文件夹」以浏览本地目录。
          </div>
        )}
        {dirName && (
          <FileTree
            entries={entries}
            activePath={activePath}
            onOpenFile={onOpenFile}
            onEntriesChange={onEntriesChange}
          />
        )}
      </div>
    </aside>
  )
}
