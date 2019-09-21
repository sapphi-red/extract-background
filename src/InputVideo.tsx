import React, {
  FC,
  useState,
  ChangeEvent,
  SetStateAction,
  Dispatch
} from 'react'

const NO_FILE = '選択されていません'

type onInputChange = (hasFile: boolean) => void

const onChange = (
  e: ChangeEvent<HTMLInputElement>,
  setFilename: Dispatch<SetStateAction<string>>,
  cb: onInputChange
) => {
  let hasFile = false
  const { files } = e.target
  if (files) {
    const file = files.item(0)
    if (file) {
      setFilename(file.name)
      hasFile = true
    }
  }
  if (!hasFile) {
    setFilename(NO_FILE)
  }
  cb(hasFile)
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
