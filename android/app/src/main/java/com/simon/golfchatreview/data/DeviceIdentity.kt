package com.simon.golfchatreview.data

import android.accounts.AccountManager
import android.bluetooth.BluetoothAdapter
import android.content.Context
import android.os.Build
import android.os.UserManager
import android.provider.Settings

data class PhoneIdentity(
    val androidId: String,
    val manufacturer: String,
    val model: String,
    val looksLikePixel: Boolean,
    val owner: String,
    val registeredSimonId: String?,
    val confirmed: Boolean,
    val howDetected: String,
    val userName: String,
    val googleHint: String,
    val deviceName: String,
) {
    val summary: String
        get() = "$manufacturer $model"

    val banner: String
        get() = if (owner == "Simon") {
            "This phone is Simon's"
        } else {
            "This phone is treated as Gaythan's"
        }
}

object DeviceIdentity {
    fun read(context: Context, registeredSimonId: String?): PhoneIdentity {
        val id = Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID).orEmpty()
        val manufacturer = Build.MANUFACTURER.orEmpty()
        val model = Build.MODEL.orEmpty()
        val pixel = manufacturer.equals("Google", true) &&
            model.contains("Pixel", ignoreCase = true)
        val userName = runCatching {
            context.getSystemService(UserManager::class.java)?.userName.orEmpty()
        }.getOrDefault("")
        val deviceName = listOfNotNull(
            Settings.Global.getString(context.contentResolver, Settings.Global.DEVICE_NAME),
            Settings.Secure.getString(context.contentResolver, "bluetooth_name"),
            runCatching { BluetoothAdapter.getDefaultAdapter()?.name }.getOrNull(),
        ).firstOrNull { !it.isNullOrBlank() }.orEmpty()
        val googleHint = googleAccountHint(context)
        val blob = "$userName $googleHint $deviceName $manufacturer $model".lowercase()
        val namedGaythan = blob.contains("gaythan") || blob.contains("gathan")
        val namedSimon = blob.contains("simon")
        val reasons = mutableListOf<String>()
        val owner: String
        val confirmed = !registeredSimonId.isNullOrBlank()
        when {
            confirmed && id.equals(registeredSimonId, ignoreCase = true) -> {
                owner = "Simon"
                reasons += "saved Android ID"
            }
            confirmed -> {
                owner = "Gaythan"
                reasons += "Android ID is not Simon's Pixel"
            }
            namedGaythan && !namedSimon -> {
                owner = "Gaythan"
                reasons += "profile/device name"
            }
            namedSimon -> {
                owner = "Simon"
                reasons += "profile or Google account contains simon"
            }
            pixel -> {
                owner = "Simon"
                reasons += "Google Pixel (your phone)"
            }
            else -> {
                owner = "Gaythan"
                reasons += "not Simon's Pixel"
            }
        }
        return PhoneIdentity(
            androidId = id,
            manufacturer = manufacturer,
            model = model,
            looksLikePixel = pixel,
            owner = owner,
            registeredSimonId = registeredSimonId,
            confirmed = confirmed,
            howDetected = reasons.joinToString(" · "),
            userName = userName,
            googleHint = googleHint,
            deviceName = deviceName,
        )
    }

    private fun googleAccountHint(context: Context): String {
        return runCatching {
            AccountManager.get(context)
                .getAccountsByType("com.google")
                .joinToString(",") { it.name }
        }.getOrDefault("")
    }
}
