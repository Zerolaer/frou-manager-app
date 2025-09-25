import React from 'react'
import { OfflineIndicator, OfflineQueueIndicator, registerServiceWorker } from './OfflineSupport'

export default function OfflineSupportWrapper() {
  React.useEffect(() => {
    registerServiceWorker()
  }, [])

  return (
    <>
      <OfflineIndicator />
      <OfflineQueueIndicator />
    </>
  )
}

