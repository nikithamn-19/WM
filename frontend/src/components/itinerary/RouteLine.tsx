import React from 'react'
import type { ItineraryItem, SlotStatus } from '../../types/trip'

export interface RouteLineProps {
  slots: ItineraryItem[]
}

export const RouteLine: React.FC<RouteLineProps> = ({ slots }) => {
  const dotColor = (status: SlotStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-amber'
      case 'BRANCHED':
        return 'bg-clay'
      case 'IN_CONSENSUS':
        return 'bg-route'
      case 'EMPTY':
      default:
        return 'bg-slate-light'
    }
  }

  const segmentStyle = (status: SlotStatus) => {
    switch (status) {
      case 'CONFIRMED':
        return 'border-amber border-solid'
      case 'IN_CONSENSUS':
        return 'border-route border-dashed'
      case 'BRANCHED':
        return 'border-clay border-solid'
      case 'EMPTY':
      default:
        return 'border-slate-light border-dashed'
    }
  }

  return (
    <div className="flex flex-col items-center py-2 w-8">
      {slots.map((item, index) => {
        const isLast = index === slots.length - 1
        const isBranched = item.slotStatus === 'BRANCHED'

        return (
          <React.Fragment key={item.itmId}>
            {/* Stop dot (8px circle filled with status color) */}
            <div className={`w-2 h-2 rounded-full ${dotColor(item.slotStatus)} my-1 z-10`} />

            {/* Segment connecting to next dot */}
            {!isLast && (
              <div className="flex-1 w-full flex justify-center py-1">
                {isBranched ? (
                  // Fork into 2 parallel clay lines for BRANCHED status
                  <div className="flex items-center gap-1.5 h-12">
                    <div className="w-0.5 h-full border-l-2 border-clay border-solid" />
                    <div className="w-0.5 h-full border-r-2 border-clay border-solid" />
                  </div>
                ) : (
                  // Single line segment matching slot status
                  <div
                    className={`w-0 h-12 border-l-2 ${segmentStyle(item.slotStatus)} route-line-draw`}
                  />
                )}
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
