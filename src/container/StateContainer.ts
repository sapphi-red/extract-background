import { createContainer } from 'unstated-next'
import { useState } from 'react'

interface Progress {
  phase: number
  value: number
}

export default createContainer(() => {
  const [fileUrl, setFileUrl] = useState('')
  const [progress, setProgress] = useState<Progress>({
    phase: 0,
    value: 0
  })

  const setProgressValue = (value: number) =>
    setProgress(progress => ({ ...progress, value }))
  const incrementProgressPhase = () =>
    setProgress(progress => ({ ...progress, phase: progress.phase + 1 }))
  const resetProgress = () => setProgress({ phase: 0, value: 0 })

  return {
    fileUrl,
    setFileUrl,
    progress,
    setProgressValue,
    incrementProgressPhase,
    resetProgress
  }
})
