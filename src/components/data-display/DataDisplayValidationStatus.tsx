import { Button } from '../ui/button'
import { ValidationState } from '../../utils/urlValidator'

interface DataDisplayValidationStatusProps {
  validationState: ValidationState
  showValidationResults: boolean
  onCancelValidation: () => void
}

export function DataDisplayValidationStatus({
  validationState,
  showValidationResults,
  onCancelValidation,
}: DataDisplayValidationStatusProps) {
  if (validationState.isRunning) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
        <div className="text-sm text-muted-foreground">
          Checking URLs... {validationState.progress.checked}/{validationState.progress.total} (
          {Math.round(
            (validationState.progress.checked / validationState.progress.total) * 100
          )}
          %)
        </div>
        <Button variant="outline" size="sm" onClick={onCancelValidation}>
          Stop
        </Button>
      </div>
    )
  }

  if (!validationState.isRunning && validationState.results.size > 0 && showValidationResults) {
    return (
      <div className="mb-6 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        Checked {validationState.progress.checked} URLs in the current unread view.
      </div>
    )
  }

  return null
}
