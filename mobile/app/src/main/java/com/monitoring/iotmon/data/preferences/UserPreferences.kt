package com.monitoring.iotmon.data.preferences

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.monitoring.iotmon.data.models.AuthUser
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_prefs")

class UserPreferences(private val context: Context) {

    companion object {
        private val USER_ID = intPreferencesKey("user_id")
        private val USERNAME = stringPreferencesKey("username")
        private val EMAIL = stringPreferencesKey("email")
        private val IS_ADMIN = intPreferencesKey("is_admin")
    }

    val userFlow: Flow<AuthUser?> = context.dataStore.data.map { preferences ->
        val userId = preferences[USER_ID]
        if (userId != null) {
            AuthUser(
                id = userId,
                username = preferences[USERNAME] ?: "",
                email = preferences[EMAIL] ?: "",
                isAdmin = preferences[IS_ADMIN] ?: 0
            )
        } else {
            null
        }
    }

    suspend fun saveUser(user: AuthUser) {
        context.dataStore.edit { preferences ->
            preferences[USER_ID] = user.id
            preferences[USERNAME] = user.username
            preferences[EMAIL] = user.email
            preferences[IS_ADMIN] = user.isAdmin
        }
    }

    suspend fun updateUser(user: AuthUser) {
        context.dataStore.edit { preferences ->
            preferences[USERNAME] = user.username
            preferences[EMAIL] = user.email
        }
    }

    suspend fun clearUser() {
        context.dataStore.edit { preferences ->
            preferences.clear()
        }
    }

    suspend fun getUserId(): Int? {
        var userId: Int? = null
        context.dataStore.edit { preferences ->
            userId = preferences[USER_ID]
        }
        return userId
    }
}
