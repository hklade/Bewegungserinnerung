package com.bewegungserinnerung.app.reminder

import java.time.ZoneId

/**
 * The single timezone every reminder-scheduling computation (slots, countdown, backfill,
 * notification text) is anchored to. Always use this instead of a local `ZoneId.of(...)` —
 * mixing zones across modules that each derive a slot's date/time from an `Instant` causes them
 * to disagree on which calendar day/hour a slot falls on (see android/CLAUDE.md's Locale/ZoneId note).
 */
internal val ZONE: ZoneId = ZoneId.of("Europe/Vienna")
