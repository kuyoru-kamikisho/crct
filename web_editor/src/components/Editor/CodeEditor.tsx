import Editor, { type OnMount } from '@monaco-editor/react'
import { useCallback, useRef } from 'react'
import { getLanguageByFilename } from '../../utils/language'
import styles from './CodeEditor.module.less'

type Props = {
  value: string
  fileName: string
  onChange: (value: string) => void
  onBlurSave: () => void
}

export function CodeEditor({ value, fileName, onChange, onBlurSave }: Props) {
  const blurSaveRef = useRef(onBlurSave)
  blurSaveRef.current = onBlurSave

  const language = getLanguageByFilename(fileName || 'untitled.txt')

  const handleMount: OnMount = useCallback((editor) => {
    editor.onDidBlurEditorWidget(() => {
      blurSaveRef.current()
    })
  }, [])

  return (
    <div className={styles.wrap}>
      <Editor
        height="100%"
        theme="vs-dark"
        language={language}
        value={value}
        path={fileName || 'untitled.txt'}
        onChange={(v) => onChange(v ?? '')}
        onMount={handleMount}
        options={{
          fontSize: 14,
          fontFamily: "var(--font-mono), 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
          minimap: { enabled: true, scale: 1 },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 8 },
          renderLineHighlight: 'line',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          bracketPairColorization: { enabled: true },
        }}
        loading={<div className={styles.loading}>正在加载编辑器…</div>}
      />
    </div>
  )
}
