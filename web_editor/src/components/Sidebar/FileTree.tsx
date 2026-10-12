import { useCallback, useState } from 'react'
import type { DirEntry } from '../../utils/fileSystem'
import { readDirectoryEntries } from '../../utils/fileSystem'
import type { FileSystemDirectoryHandle } from '../../types/fileSystem'
import styles from './FileTree.module.less'

type Props = {
  entries: DirEntry[]
  activePath?: string
  onOpenFile: (entry: DirEntry) => void
  onEntriesChange: (entries: DirEntry[]) => void
}

function updateEntry(
  list: DirEntry[],
  path: string,
  updater: (entry: DirEntry) => DirEntry,
): DirEntry[] {
  return list.map((item) => {
    if (item.path === path) return updater(item)
    if (item.children) {
      return { ...item, children: updateEntry(item.children, path, updater) }
    }
    return item
  })
}

type NodeProps = {
  entry: DirEntry
  depth: number
  expanded: Set<string>
  activePath?: string
  onToggle: (entry: DirEntry) => void
  onOpenFile: (entry: DirEntry) => void
}

function TreeNode({
  entry,
  depth,
  expanded,
  activePath,
  onToggle,
  onOpenFile,
}: NodeProps) {
  const isDir = entry.kind === 'directory'
  const isOpen = expanded.has(entry.path)
  const isActive = !isDir && entry.path === activePath

  return (
    <div className={styles.node}>
      <button
        type="button"
        className={`${styles.row} ${isActive ? styles.active : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => (isDir ? onToggle(entry) : onOpenFile(entry))}
        title={entry.path}
      >
        <span className={`${styles.chevron} ${isDir ? '' : styles.hidden}`}>
          <span className={`${styles.arrow} ${isOpen ? styles.open : ''}`} />
        </span>
        <span
          className={`${styles.icon} ${isDir ? (isOpen ? styles.folderOpen : styles.folder) : styles.file}`}
        />
        <span className={styles.name}>{entry.name}</span>
      </button>

      {isDir && isOpen && entry.children && (
        <div className={styles.children}>
          {entry.children.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              depth={depth + 1}
              expanded={expanded}
              activePath={activePath}
              onToggle={onToggle}
              onOpenFile={onOpenFile}
            />
          ))}
          {entry.loaded && entry.children.length === 0 && (
            <div
              className={styles.empty}
              style={{ paddingLeft: 24 + (depth + 1) * 14 }}
            >
              空目录
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function FileTree({
  entries,
  activePath,
  onOpenFile,
  onEntriesChange,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const handleToggle = useCallback(
    async (entry: DirEntry) => {
      const next = new Set(expanded)
      if (next.has(entry.path)) {
        next.delete(entry.path)
        setExpanded(next)
        return
      }

      next.add(entry.path)
      setExpanded(next)

      if (!entry.loaded && entry.kind === 'directory') {
        const children = await readDirectoryEntries(
          entry.handle as FileSystemDirectoryHandle,
          entry.path,
        )
        onEntriesChange(
          updateEntry(entries, entry.path, (e) => ({
            ...e,
            children,
            loaded: true,
          })),
        )
      }
    },
    [expanded, entries, onEntriesChange],
  )

  if (entries.length === 0) {
    return <div className={styles.emptyRoot}>目录为空</div>
  }

  return (
    <div className={styles.tree}>
      {entries.map((entry) => (
        <TreeNode
          key={entry.path}
          entry={entry}
          depth={0}
          expanded={expanded}
          activePath={activePath}
          onToggle={handleToggle}
          onOpenFile={onOpenFile}
        />
      ))}
    </div>
  )
}
