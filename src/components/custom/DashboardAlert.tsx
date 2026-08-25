import { useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  InformationCircleIcon,
  Alert02Icon,
  Notification01Icon,
  Cancel01Icon,
} from '@hugeicons/core-free-icons'

import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import type { ServerAlert } from '@/types'

interface AlertProps {
  alerts: ServerAlert[]
}

const ICON_BY_TYPE: Record<string, typeof InformationCircleIcon> = {
  info: InformationCircleIcon,
  alert: Alert02Icon,
}

function getAlertIcon(type: ServerAlert['type']) {
  return type ? ICON_BY_TYPE[type] : Notification01Icon
}

export function DashboardAlerts({ alerts }: AlertProps) {
  const [dismissed, setDismissed] = useState<number[]>([])
  const visibleAlerts = alerts
    .map((alert, index) => ({ alert, index }))
    .filter(({ index }) => !dismissed.includes(index))

  return (
    <div className="flex w-full flex-col gap-2">
      {visibleAlerts.map(({ alert, index }) => (
        <Alert
          key={index}
          variant={alert.type === 'alert' ? 'destructive' : 'default'}
          className="w-full pr-8"
        >
          <HugeiconsIcon icon={getAlertIcon(alert.type)} strokeWidth={2} />
          <AlertTitle>{alert.title}</AlertTitle>
          <AlertDescription>{alert.description}</AlertDescription>
          <AlertAction>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDismissed((prev) => [...prev, index])}
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </AlertAction>
        </Alert>
      ))}
    </div>
  )
}
