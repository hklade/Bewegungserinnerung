package com.bewegungserinnerung.app.ui.quickentry

enum class ActivityLevel(val value: Int, val label: String, val description: String) {
    None(0, "Keine Pause", "sitzen geblieben"),
    Mini(1, "Mini-Pause", "kurz innegehalten"),
    Light(2, "Leichte Aktivität", "Bürotätigkeit"),
    Movement(3, "Bewegung", "gehen / dehnen"),
    Active(4, "Aktive Pause", "Spaziergang / Übungen"),
    ;

    companion object {
        val default = Mini
    }
}
