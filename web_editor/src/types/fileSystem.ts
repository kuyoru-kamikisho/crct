/** File System Access API 类型补充 */

export interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite'
}

export interface FileSystemCreateWritableOptions {
  keepExistingData?: boolean
}

export interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string | WriteParams): Promise<void>
  seek(position: number): Promise<void>
  truncate(size: number): Promise<void>
}

export interface WriteParams {
  type: 'write' | 'seek' | 'truncate'
  data?: BufferSource | Blob | string
  position?: number
  size?: number
}

export interface FileSystemFileHandle extends FileSystemHandle {
  readonly kind: 'file'
  getFile(): Promise<File>
  createWritable(
    options?: FileSystemCreateWritableOptions,
  ): Promise<FileSystemWritableFileStream>
}

export interface FileSystemDirectoryHandle extends FileSystemHandle {
  readonly kind: 'directory'
  getFileHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemFileHandle>
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean },
  ): Promise<FileSystemDirectoryHandle>
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>
  resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>
  keys(): AsyncIterableIterator<string>
  values(): AsyncIterableIterator<
    FileSystemFileHandle | FileSystemDirectoryHandle
  >
  entries(): AsyncIterableIterator<
    [string, FileSystemFileHandle | FileSystemDirectoryHandle]
  >
  [Symbol.asyncIterator](): AsyncIterableIterator<
    [string, FileSystemFileHandle | FileSystemDirectoryHandle]
  >
}

declare global {
  interface Window {
    showOpenFilePicker?: (
      options?: OpenFilePickerOptions,
    ) => Promise<FileSystemFileHandle[]>
    showSaveFilePicker?: (
      options?: SaveFilePickerOptions,
    ) => Promise<FileSystemFileHandle>
    showDirectoryPicker?: (
      options?: DirectoryPickerOptions,
    ) => Promise<FileSystemDirectoryHandle>
  }

  interface OpenFilePickerOptions {
    multiple?: boolean
    excludeAcceptAllOption?: boolean
    types?: FilePickerAcceptType[]
    id?: string
    startIn?: WellKnownDirectory | FileSystemHandle
  }

  interface SaveFilePickerOptions {
    excludeAcceptAllOption?: boolean
    suggestedName?: string
    types?: FilePickerAcceptType[]
    id?: string
    startIn?: WellKnownDirectory | FileSystemHandle
  }

  interface DirectoryPickerOptions {
    id?: string
    mode?: 'read' | 'readwrite'
    startIn?: WellKnownDirectory | FileSystemHandle
  }

  interface FilePickerAcceptType {
    description?: string
    accept: Record<string, string[]>
  }

  type WellKnownDirectory =
    | 'desktop'
    | 'documents'
    | 'downloads'
    | 'music'
    | 'pictures'
    | 'videos'
}
