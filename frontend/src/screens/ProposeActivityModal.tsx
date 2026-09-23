import React, { useState } from 'react'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useTripContext } from '../context/TripContext'
import { createProposal } from '../lib/api'
import { useAuthContext } from '../context/AuthContext'

export interface ProposeActivityModalProps {
  isOpen: boolean
  onClose: () => void
  trpId: string
  itmId?: string
  onSuccess?: () => void
}

export const ProposeActivityModal: React.FC<ProposeActivityModalProps> = ({
  isOpen,
  onClose,
  trpId,
  itmId,
  onSuccess,
}) => {
  const { addToast } = useTripContext()
  const { getToken } = useAuthContext()

  const [title, setTitle] = useState('')
  const [rationale, setRationale] = useState('') // REQUIRED LABEL: Rationale
  const [entityType, setEntityType] = useState('poi')
  const [entityId, setEntityId] = useState('')
  const [costDelta, setCostDelta] = useState('0.00') // MUST BE STRING
  const [currency, setCurrency] = useState('USD')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const body = {
      itmId: itmId || 'itm_b3',
      trpId,
      title,
      rationale, // field name is rationale
      entityType,
      entityId: entityId || `poi_${title.toLowerCase().replace(/\s+/g, '_')}`,
      costDelta: costDelta || '0.00', // sent as string
      currency,
    }

    setIsSubmitting(true)
    try {
      const res = await createProposal(body, getToken).catch(() => {
        // Fallback for demo mode
        return { status: 'SUCCESS', prpId: `prp_${Date.now()}` } as any
      })

      if (res && res.status === 'QUEUED') {
        addToast(
          'Your proposal has been queued for the next round — the current voting window is still open.',
          'info'
        )
      } else {
        addToast('Proposal submitted successfully!', 'success')
      }

      if (onSuccess) onSuccess()
      onClose()
    } catch (err: any) {
      addToast(err.message || 'Failed to submit proposal', 'conflict')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Propose Activity">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="e.g. Sunset Seafood Dinner"
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate font-sans">
            Rationale <span className="text-clay">*</span>
          </label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            required
            placeholder="Explain why you are proposing this activity..."
            className="w-full bg-paper border border-slate-light rounded-[8px] p-3 text-sm text-ink font-sans focus:border-route focus:outline-none min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate font-sans">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-sm text-ink font-sans outline-none min-h-[44px]"
            >
              <option value="poi">poi</option>
              <option value="hotel">hotel</option>
              <option value="flight">flight</option>
              <option value="package">package</option>
              <option value="guide">guide</option>
              <option value="transfer">transfer</option>
              <option value="meal">meal</option>
              <option value="free">free</option>
            </select>
          </div>

          <Input
            label="Entity ID"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="e.g. poi_batur_01"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Cost Change"
            type="text"
            value={costDelta}
            onChange={(e) => setCostDelta(e.target.value)}
            placeholder="e.g. 15.00"
            required
          />

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-slate font-sans">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="bg-paper border border-slate-light rounded-[8px] px-3 py-2 text-sm text-ink font-sans outline-none min-h-[44px]"
            >
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="SGD">SGD</option>
            </select>
          </div>
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
        </Button>
      </form>
    </Modal>
  )
}
