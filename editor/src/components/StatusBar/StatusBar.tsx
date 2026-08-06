import styles from './StatusBar.module.less'

type Props = {
  language: string
  dirty: boolean
  saving: boolean
  lastSaved: string | null
  message: string | null
  supportLabel: string
}

export function StatusBar({
  language,
  dirty,
  saving,
  lastSaved,
  message,
  supportLabel,
}: Props) {
  const status = saving
    ? '正在保存…'
    : dirty
      ? '未保存'
      : lastSaved
        ? `已保存 ${lastSaved}`
        : '就绪'

  return (
    <footer className={styles.bar}>
      <div className={styles.left}>
        <span>{status}</span>
        {message && <span className={styles.message}>{message}</span>}
      </div>
      <div className={styles.right}>
        <span>{supportLabel}</span>
        <span className={styles.lang}>{language}</span>
      </div>
    </footer>
  )
}
