import React, { FC, ChangeEventHandler } from 'react'
import StateContainer from '../container/StateContainer'
import { TextField, Typography } from '@material-ui/core'

const PositionSetter: FC<{}> = () => {
  const state = StateContainer.useContainer()

  const handleStartPosChange: ChangeEventHandler<HTMLInputElement> = e => {
    state.setStartPos(+e.target.value)
  }
  const handleEndPosChange: ChangeEventHandler<HTMLInputElement> = e => {
    state.setEndPos(+e.target.value)
  }

  return (
    <div
      className="position-setter"
      style={{ display: 'flex', alignItems: 'center' }}
    >
      <Typography
        variant="subtitle1"
        component="span"
        style={{ verticalAlign: 'middle' }}
      >
        Position:{' '}
      </Typography>
      <TextField
        label="Start"
        type="number"
        value={state.startPos}
        size="small"
        variant="filled"
        onChange={handleStartPosChange}
        style={{ width: '5em' }}
      />
      <TextField
        label="End"
        type="number"
        value={state.endPos}
        size="small"
        variant="filled"
        onChange={handleEndPosChange}
        style={{ width: '5em' }}
      />
    </div>
  )
}

export default PositionSetter
