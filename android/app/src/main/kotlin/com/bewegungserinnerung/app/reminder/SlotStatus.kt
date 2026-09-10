package com.bewegungserinnerung.app.reminder

import java.time.Duration
import java.time.Instant

enum class SlotStatus {
    Pending,
    Unanswered,
    Answered,
    AnsweredWithExtra,
}

private val BACKFILL_THRESHOLD = Duration.ofMinutes(59)

fun computeSlotStatus(slotTime: Instant, now: Instant, entryCount: Int): SlotStatus {
    if (entryCount > 1) return SlotStatus.AnsweredWithExtra
    if (entryCount == 1) return SlotStatus.Answered

    val overdueBy = Duration.between(slotTime, now)
    return if (overdueBy > BACKFILL_THRESHOLD) SlotStatus.Unanswered else SlotStatus.Pending
}
