import type {
  FileSystemDirectoryHandle,
  FileSystemFileHandle,
} from '../types/fileSystem'

export type FsSupport = {
  file: boolean
  directory: boolean
}

/** 检测浏览器是否支持 File System Access API */
export function detectFsSupport(): FsSupport {
  return {
    file: typeof window.showOpenFilePicker === 'function'
      && typeof window.showSaveFilePicker === 'function',
    directory: typeof window.showDirectoryPicker === 'function',
  }
}

export type OpenedFile = {
  name: string
  content: string
  handle: FileSystemFileHandle | null
  /** 相对目录的路径，用于侧边栏高亮 */
  path?: string
}

export type DirEntry = {
  name: string
  kind: 'file' | 'directory'
  handle: FileSystemFileHandle | FileSystemDirectoryHandle
  path: string
  children?: DirEntry[]
  loaded?: boolean
}

const TEXT_TYPES: FilePickerAcceptType[] = [
  {
    description: 'Text / Code Files',
    accept: {
      'text/*': [
        '.txt',
        '.md',
        '.json',
        '.js',
        '.ts',
        '.tsx',
        '.jsx',
        '.css',
        '.less',
        '.scss',
        '.html',
        '.htm',
        '.xml',
        '.yml',
        '.yaml',
        '.toml',
        '.ini',
        '.cfg',
        '.conf',
        '.py',
        '.go',
        '.rs',
        '.java',
        '.c',
        '.cpp',
        '.h',
        '.hpp',
        '.cs',
        '.php',
        '.rb',
        '.sh',
        '.bat',
        '.ps1',
        '.sql',
        '.vue',
        '.svelte',
        '.svg',
      ],
      'application/json': ['.json'],
      'application/javascript': ['.js', '.mjs', '.cjs'],
    },
  },
]

/** 打开单个本地文件 */
export async function openLocalFile(): Promise<OpenedFile | null> {
  if (!window.showOpenFilePicker) return null

  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: TEXT_TYPES,
    })
    const file = await handle.getFile()
    const content = await file.text()
    return { name: file.name, content, handle, path: file.name }
  } catch (err) {
    if ((err as DOMException).name === 'AbortError') return null
    throw err
  }
}

/** 打开本地目录 */
export async function openLocalDirectory(): Promise<{
  name: string
  handle: FileSystemDirectoryHandle
  entries: DirEntry[]
} | null> {
  if (!window.showDirectoryPicker) return null

  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
    const entries = await readDirectoryEntries(handle, handle.name)
    return { name: handle.name, handle, entries }
  } catch (err) {
    if ((err as DOMException).name === 'AbortError') return null
    throw err
  }
}

/** 读取目录一级子项 */
export async function readDirectoryEntries(
  dirHandle: FileSystemDirectoryHandle,
  parentPath: string,
): Promise<DirEntry[]> {
  const entries: DirEntry[] = []

  for await (const [name, handle] of dirHandle.entries()) {
    const path = parentPath ? `${parentPath}/${name}` : name
    entries.push({
      name,
      kind: handle.kind,
      handle,
      path,
      children: handle.kind === 'directory' ? [] : undefined,
      loaded: handle.kind === 'directory' ? false : true,
    })
  }

  return entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
}

/** 通过 handle 读取文件内容 */
export async function readFileFromHandle(
  handle: FileSystemFileHandle,
  path?: string,
): Promise<OpenedFile> {
  const file = await handle.getFile()
  const content = await file.text()
  return {
    name: file.name,
    content,
    handle,
    path: path ?? file.name,
  }
}

/**
 * 保存文件：
 * - 有 handle → 直接写入本地
 * - 无 handle 但支持 API → 弹出另存为
 * - 不支持 API → 触发浏览器下载
 */
export async function saveFile(
  content: string,
  current: OpenedFile | null,
  suggestedName = 'untitled.txt',
): Promise<OpenedFile | null> {
  const support = detectFsSupport()

  if (support.file) {
    let handle = current?.handle ?? null

    if (!handle) {
      try {
        handle = await window.showSaveFilePicker!({
          suggestedName: current?.name || suggestedName,
          types: TEXT_TYPES,
        })
      } catch (err) {
        if ((err as DOMException).name === 'AbortError') return null
        throw err
      }
    }

    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()

    return {
      name: handle.name,
      content,
      handle,
      path: current?.path ?? handle.name,
    }
  }

  // 降级：下载文件
  downloadFile(content, current?.name || suggestedName)
  return {
    name: current?.name || suggestedName,
    content,
    handle: null,
    path: current?.path,
  }
}

/** 不支持 File System Access API 时的下载降级 */
export function downloadFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** 通过传统 input[type=file] 打开（API 不支持时的降级） */
export function openFileViaInput(): Promise<OpenedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.txt,.md,.json,.js,.ts,.tsx,.jsx,.css,.less,.scss,.html,.xml,.yml,.yaml,.py,.go,.rs,.java,.c,.cpp,.h,.cs,.php,.rb,.sh,.sql,.vue,.svg'
    input.style.display = 'none'

    input.addEventListener('change', async () => {
      const file = input.files?.[0]
      document.body.removeChild(input)
      if (!file) {
        resolve(null)
        return
      }
      const content = await file.text()
      resolve({ name: file.name, content, handle: null, path: file.name })
    })

    input.addEventListener('cancel', () => {
      document.body.removeChild(input)
      resolve(null)
    })

    document.body.appendChild(input)
    input.click()
  })
}
