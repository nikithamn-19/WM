"""Consensus Service Module per WanderMatch Architecture (PANCHAMI.md line 509).

Orchestrates Mode A (Admin-Led) and Mode NA (Collaborative / Automatic) logic,
calling backend.ai.modes.mode_a_orchestrator and backend.ai.modes.mode_na_orchestrator.
"""

from backend.services.mode_na_service import (
    ConsensusManager,
    ModeNAConsensusManager,
    generate_id,
)

__all__ = ["ConsensusManager", "ModeNAConsensusManager", "generate_id"]
