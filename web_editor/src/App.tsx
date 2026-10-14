import { useCallback, useMemo, useRef, useState } from 'react'
import { Toolbar } from './components/Toolbar/Toolbar'
import { Sidebar } from './components/Sidebar/Sidebar'
import { CodeEditor } from './components/Editor/CodeEditor'
import { StatusBar } from './components/StatusBar/StatusBar'
import {
  detectFsSupport,
  openLocalFile,
  openLocalDirectory,
  openFileViaInput,
  readFileFromHandle,
  saveFile,
  type DirEntry,
  type OpenedFile,
} from './utils/fileSystem'
import type { FileSystemFileHandle } from './types/fileSystem'
import { getLanguageByFilename } from './utils/language'
import styles from './App.module.less'

const EMPTY_FILE: OpenedFile = {
  name: 'untitled.txt',
  content: '',
  handle: null,
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function App() {
  const support = useMemo(() => detectFsSupport(), [])
  const [file, setFile] = useState<OpenedFile>(EMPTY_FILE)
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [dirName, setDirName] = useState<string | null>(null)
  const [entries, setEntries] = useState<DirEntry[]>([])

  const contentRef = useRef(content)
  const fileRef = useRef(file)
  const dirtyRef = useRef(dirty)
  contentRef.current = content
  fileRef.current = file
  dirtyRef.current = dirty

  const showMessage = useCallback((text: string) => {
    setMessage(text)
    window.setTimeout(() => {
      setMessage((prev) => (prev === text ? null : prev))
    }, 3000)
  }, [])

  const handleNew = useCallback(() => {
    if (dirtyRef.current) {
      const ok = window.confirm('当前文件有未保存的更改，确定新建吗？')
      if (!ok) return
    }
    setFile({ ...EMPTY_FILE })
    setContent('')
    setDirty(false)
    setLastSaved(null)
    showMessage('已新建空白文件')
  }, [showMessage])

  const handleOpenFile = useCallback(async () => {
    try {
      if (dirtyRef.current) {
        const ok = window.confirm('当前文件有未保存的更改，确定打开其他文件吗？')
        if (!ok) return
      }

      const opened = support.file
        ? await openLocalFile()
        : await openFileViaInput()

      if (!opened) return

      setFile(opened)
      setContent(opened.content)
      setDirty(false)
      setLastSaved(null)
      showMessage(`已打开 ${opened.name}`)
    } catch (err) {
      console.error(err)
      showMessage(`打开失败：${(err as Error).message}`)
    }
  }, [support.file, showMessage])

  const handleOpenDir = useCallback(async () => {
    if (!support.directory) {
      showMessage('当前浏览器不支持打开目录')
      return
    }

    try {
      const result = await openLocalDirectory()
      if (!result) return
      setDirName(result.name)
      setEntries(result.entries)
      showMessage(`已打开文件夹 ${result.name}`)
    } catch (err) {
      console.error(err)
      showMessage(`打开文件夹失败：${(err as Error).message}`)
    }
  }, [support.directory, showMessage])

  const handleOpenTreeFile = useCallback(
    async (entry: DirEntry) => {
      if (entry.kind !== 'file') return

      try {
        if (dirtyRef.current) {
          const ok = window.confirm('当前文件有未保存的更改，确定切换吗？')
          if (!ok) return
        }

        const opened = await readFileFromHandle(
          entry.handle as FileSystemFileHandle,
          entry.path,
        )
        setFile(opened)
        setContent(opened.content)
        setDirty(false)
        setLastSaved(null)
        showMessage(`已打开 ${opened.name}`)
      } catch (err) {
        console.error(err)
        showMessage(`读取失败：${(err as Error).message}`)
      }
    },
    [showMessage],
  )

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    try {
      const saved = await saveFile(
        contentRef.current,
        fileRef.current,
        fileRef.current.name || 'untitled.txt',
      )
      if (!saved) {
        showMessage('已取消保存')
        return
      }

      setFile(saved)
      setDirty(false)
      setLastSaved(formatTime(new Date()))

      if (support.file && saved.handle) {
        showMessage(`已保存 ${saved.name}`)
      } else {
        showMessage(`已下载 ${saved.name}`)
      }
    } catch (err) {
      console.error(err)
      showMessage(`保存失败：${(err as Error).message}`)
    } finally {
      setSaving(false)
    }
  }, [saving, support.file, showMessage])

  /** 失焦时自动保存：仅当有改动时触发 */
  const handleBlurSave = useCallback(() => {
    if (!dirtyRef.current || saving) return
    void handleSave()
  }, [handleSave, saving])

  const handleChange = useCallback((value: string) => {
    setContent(value)
    setDirty(value !== fileRef.current.content)
  }, [])

  const language = getLanguageByFilename(file.name)
  const supportLabel = support.file
    ? support.directory
      ? 'File System Access API'
      : '文件 API（无目录）'
    : '下载降级模式'

  return (
    <div className={styles.app}>
      <Toolbar
        support={support}
        fileName={file.path || file.name}
        dirty={dirty}
        saving={saving}
        onNew={handleNew}
        onOpenFile={handleOpenFile}
        onOpenDir={handleOpenDir}
        onSave={handleSave}
      />

      <div className={styles.main}>
        <Sidebar
          dirName={dirName}
          entries={entries}
          activePath={file.path}
          supported={support.directory}
          onOpenFile={handleOpenTreeFile}
          onEntriesChange={setEntries}
        />

        <CodeEditor
          value={content}
          fileName={file.name}
          onChange={handleChange}
          onBlurSave={handleBlurSave}
        />
      </div>

      <StatusBar
        language={language}
        dirty={dirty}
        saving={saving}
        lastSaved={lastSaved}
        message={message}
        supportLabel={supportLabel}
      />
    </div>
  )
}
