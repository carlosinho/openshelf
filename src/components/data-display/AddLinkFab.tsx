import { Button } from '../ui/button'

interface AddLinkFabProps {
  onClick: () => void
}

export function AddLinkFab({ onClick }: AddLinkFabProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className="fixed right-4 z-50 h-14 min-h-14 rounded-full border border-amber-300 bg-amber-100 px-6 text-base font-semibold text-amber-950 shadow-xl hover:bg-amber-200 lg:hidden"
      style={{
        bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
        right: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
    >
      + Add
    </Button>
  )
}
