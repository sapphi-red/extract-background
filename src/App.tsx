import React, {
  FC,
  useState,
  useReducer,
  Reducer,
  Dispatch,
  useRef
} from 'react'
import './App.sass'
import InputVideo from './InputVideo'

interface Progress {
  value: number
}
type ProgressAction = IncrementAction | ResetAction
interface IncrementAction {
  type: 'increment'
}
interface ResetAction {
  type: 'reset'
}

const progressReducer: Reducer<Progress, ProgressAction> = (state, action) => {
  switch (action.type) {
    case 'increment':
      return { value: state.value + 1 }
    case 'reset':
      return { value: 0 }
  }
}

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

const exec = async ($video: HTMLVideoElement, progress: () => void) => {
  const { duration } = $video
  while ($video.currentTime < duration) {
    if ($video.readyState < 3) {
      await new Promise(resolve => {
        $video.oncanplay = resolve
      })
    }
    try {
      const imageb = await createImageBitmap($video)
      console.log(imageb)
    } catch (e) {
      console.warn(e)
    }
    progress()
    $video.currentTime += 1
  }
}

const App: FC = () => {
  const [fileUrl, setFileUrl] = useState('')
  const [progress, dispatchProgress] = useReducer(progressReducer, { value: 0 })

  const $video = useRef<HTMLVideoElement>(null)

  return (
    <div id="App">
      <InputVideo
        disabled={progress.value > 0}
        onChange={file => {
          recreateFileUrl(setFileUrl, file, fileUrl)
        }}
      />
      <button
        disabled={fileUrl === ''}
        onClick={async () => {
          if ($video.current) {
            await exec($video.current, () => {
              dispatchProgress({ type: 'increment' })
            })
            dispatchProgress({ type: 'reset' })
          }
        }}
      >
        開始
      </button>
      {progress.value}
      {fileUrl !== '' && (
        <video
          src={fileUrl}
          controls
          ref={$video}
          style={{ maxWidth: '100%' }}
        />
      )}
    </div>
  )
}

export default App
