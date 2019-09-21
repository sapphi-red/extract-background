import React, { FC, useState, ChangeEvent, Dispatch } from 'react'

const NO_FILE = '選択されていません'

type onInputChange = (file: File | null) => void

const onChange = (
  e: ChangeEvent<HTMLInputElement>,
  setFilename: Dispatch<string>,
  cb: onInputChange
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
  cb(file)
}

const InputVideo: FC<{ disabled: boolean; onChange: onInputChange }> = ({
  disabled,
  onChange: cb
}) => {
  const [filename, setFilename] = useState(NO_FILE)

  return (
    <div className="input-video" data-disabled={disabled}>
      <label>
        ファイルを選択:{' '}
        <input
          type="file"
          accept="video/*"
          disabled={disabled}
          onChange={e => onChange(e, setFilename, cb)}
        />
        <span className="filename">{filename}</span>
      </label>
    </div>
  )
}

export default InputVideo
