package com.bewegungserinnerung.app.ui

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController

private const val ROUTE_QUICK_ENTRY = "schnelleingabe"
private const val ROUTE_SETTINGS = "optionen"

/**
 * The app's two screens: quick-entry is the start destination (and so what every cold start
 * shows); settings is one navigation action away and returns via back.
 */
@Composable
fun AppNavigation(
    quickEntry: @Composable (openSettings: () -> Unit) -> Unit,
    settings: @Composable (back: () -> Unit) -> Unit,
) {
    val navController = rememberNavController()
    NavHost(navController = navController, startDestination = ROUTE_QUICK_ENTRY) {
        composable(ROUTE_QUICK_ENTRY) {
            quickEntry { navController.navigate(ROUTE_SETTINGS) { launchSingleTop = true } }
        }
        composable(ROUTE_SETTINGS) {
            settings { navController.popBackStack() }
        }
    }
}
