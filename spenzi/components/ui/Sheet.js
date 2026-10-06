'use client'
import { ModalOverlay, Modal, Dialog, Heading } from 'react-aria-components'
import { X } from 'lucide-react'
import { Button, IconButton } from './Button'

/** Accessible bottom sheet (focus-trapped, Esc / outside-click to dismiss). */
export function Sheet({ isOpen, onOpenChange, title, children, footer }) {
  return (
    <ModalOverlay
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable
      className="fill-screen fixed z-[60] flex items-end justify-center bg-black/65 backdrop-blur-sm data-[entering]:animate-rise"
    >
      <Modal className="w-full max-w-lg outline-none">
        <Dialog className="flex max-h-[88dvh] flex-col rounded-t-[2rem] border border-b-0 border-line bg-raised outline-none">
          {({ close }) => (
            <>
              <div className="flex items-center justify-between px-6 pt-6 pb-3">
                <Heading slot="title" className="display text-2xl font-semibold text-ivory">{title}</Heading>
                <IconButton label="Close" variant="quiet" onPress={close}><X size={18} /></IconButton>
              </div>
              <div className="flex-1 overflow-y-auto px-6 pb-4">{typeof children === 'function' ? children({ close }) : children}</div>
              {footer && <div className="safe-bottom border-t border-line px-6 pt-4">{typeof footer === 'function' ? footer({ close }) : footer}</div>}
            </>
          )}
        </Dialog>
      </Modal>
    </ModalOverlay>
  )
}

export function ConfirmSheet({ isOpen, onOpenChange, title, message, confirmLabel = 'Confirm', danger, onConfirm, isPending }) {
  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={title}
      footer={({ close }) => (
        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onPress={close}>Cancel</Button>
          <Button variant={danger ? 'danger' : 'primary'} className="flex-1" isPending={isPending} onPress={async () => { await onConfirm(); close() }}>
            {confirmLabel}
          </Button>
        </div>
      )}
    >
      <p className="pb-4 text-[15px] leading-relaxed text-muted">{message}</p>
    </Sheet>
  )
}
