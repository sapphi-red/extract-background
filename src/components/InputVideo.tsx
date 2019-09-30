import React, { FC, useState, ChangeEvent, Dispatch } from 'react'
import StateContainer from '../container/StateContainer'
import { Button } from '@material-ui/core'
import { FolderOpen } from '@material-ui/icons'

const NO_FILE = '選択されていません'

const recreateFileUrl = (
  setFileUrl: Dispatch<string>,
  file: File | null,
  prevFileUrl: string
) => {
  if (prevFileUrl !== '') {
    URL.revokeObjectURL(prevFileUrl)
  }
  setFileUrl(file ? URL.createObjectURL(file) : '')
}

const onChange = (
  e: ChangeEvent<HTMLInputElement>,
  setFilename: Dispatch<string>,
  state: ReturnType<typeof StateContainer.useContainer>
) => {
  let file = null
  const { files } = e.target
  if (files) {
    file = files.item(0)
    if (file) {
      setFilename(file.name)
    }
  }
  if (file == null) {
    setFilename(NO_FILE)
  }
  recreateFileUrl(state.setFileUrl, file, state.fileUrl)
}

const InputVideo: FC<{}> = () => {
  const state = StateContainer.useContainer()
  const [filename, setFilename] = useState(NO_FILE)

  const disabled = state.progress.value > 0

  return (
    <div className="input-video">
      <label htmlFor="input-file-dom">
        <Button variant="contained" component="span" disabled={disabled}>
          <FolderOpen />
          ファイルを選択: <span className="filename">{filename}</span>
        </Button>
      </label>
      <input
        id="input-file-dom"
        type="file"
        accept="video/*"
        disabled={disabled}
        onChange={e => onChange(e, setFilename, state)}
      />
    </div>
  )
}

export default InputVideo
