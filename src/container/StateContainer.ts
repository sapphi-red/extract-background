import { createContainer } from 'unstated-next'
import { useState } from 'react'

interface Progress {
  value: number
}

export default createContainer(() => {
  const [fileUrl, setFileUrl] = useState('')
  const [progress, setProgress] = useState<Progress>({ value: 0 })

  const incrementProgress = () => setProgress({ value: progress.value + 1 })
  const resetProgress = () => setProgress({ value: 0 })

  return {
    fileUrl,
    setFileUrl,
    progress,
    incrementProgress,
    resetProgress
  }
})
