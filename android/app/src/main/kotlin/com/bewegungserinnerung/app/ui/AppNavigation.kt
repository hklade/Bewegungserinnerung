package com.bewegungserinnerung.app.ui

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

private const val ROUTE_QUICK_ENTRY = "schnelleingabe"
private const val ROUTE_SETTINGS = "optionen"
private const val ROUTE_HEATMAP = "letzte-aktive-tage"

/**
 * The app's three screens: quick-entry is the start destination (and so what every cold start
 * shows); settings and the week heatmap are one navigation action away and return via back.
 */
@Composable
fun AppNavigation(
    quickEntry: @Composable (openSettings: () -> Unit, openHeatmap: () -> Unit) -> Unit,
    settings: @Composable (back: () -> Unit) -> Unit,
    heatmap: @Composable (back: () -> Unit) -> Unit,
) {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = ROUTE_QUICK_ENTRY) {
        composable(ROUTE_QUICK_ENTRY) {
            quickEntry(
                { navController.navigate(ROUTE_SETTINGS) { launchSingleTop = true } },
                { navController.navigate(ROUTE_HEATMAP) { launchSingleTop = true } },
            )
        }
        composable(ROUTE_SETTINGS) {
            settings { navController.popBackStack() }
        }
        composable(ROUTE_HEATMAP) {
            heatmap { navController.popBackStack() }
        }
    }
}
