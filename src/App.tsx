import React, { FC, useState, useReducer, Reducer } from 'react'
import './App.sass'
import InputVideo from './InputVideo'

interface Progress {
  value: number
}
type ProgressAction = IncrementAction
interface IncrementAction {
  type: 'increment'
}

const progressReducer: Reducer<Progress, ProgressAction> = (state, action) => {
  switch (action.type) {
    case 'increment':
      return { value: state.value + 1 }
  }
}

const App: FC = () => {
  const [hasFile, setHasFile] = useState(false)
  const [progress, dispatchProgress] = useReducer(progressReducer, { value: 0 })

  return (
    <div className="App">
      <InputVideo
        disabled={progress.value > 0}
        onChange={hasFile => {
          setHasFile(hasFile)
        }}
      />
      <button
        disabled={!hasFile}
        onClick={() => {
          dispatchProgress({ type: 'increment' })
        }}
      >
        開始
      </button>
      {progress.value}
    </div>
  )
}

export default App
