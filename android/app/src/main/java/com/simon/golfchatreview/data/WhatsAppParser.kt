package com.simon.golfchatreview.data

import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.nio.charset.Charset
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.zip.ZipInputStream
import java.security.MessageDigest

object WhatsAppParser {
    private val lineRe = Regex(
        """^(?:\[)?(\d{1,2}/\d{1,2}/\d{2,4}),\s*(\d{1,2}:\d{2}(?::\d{2})?(?:[\s\u202f\u00a0]*[APap][Mm])?)(?:\])?\s*-\s*([^:]+):\s*(.*)$"""
    )

    fun isSimon(sender: String): Boolean =
        sender.startsWith("🥸") || sender.contains("simon", ignoreCase = true)

    fun isGaythan(sender: String): Boolean = sender.contains("gaythan", ignoreCase = true)

    fun senderRole(sender: String): String = when {
        isSimon(sender) -> "Simon"
        isGaythan(sender) -> "Gaythan"
        else -> "Other"
    }

    fun dateKey(epochMs: Long): String {
        val z = java.time.Instant.ofEpochMilli(epochMs).atZone(ZoneId.systemDefault()).toLocalDate()
        return "${z.monthValue}/${z.dayOfMonth}/${z.year.toString().takeLast(2)}"
    }

    fun readExport(input: InputStream, fileName: String): Pair<String, List<ChatMessage>> {
        val bytes = input.readBytes()
        val text = if (fileName.endsWith(".zip", true) || looksLikeZip(bytes)) {
            unzipTxt(bytes)
        } else {
            decodeText(bytes)
        }
        return text to parseText(text)
    }

    fun sha256(text: String): String {
        val d = MessageDigest.getInstance("SHA-256").digest(text.toByteArray(Charsets.UTF_8))
        return d.joinToString("") { "%02x".format(it) }
    }

    private fun looksLikeZip(bytes: ByteArray): Boolean =
        bytes.size >= 4 && bytes[0] == 0x50.toByte() && bytes[1] == 0x4b.toByte()

    private fun unzipTxt(bytes: ByteArray): String {
        ZipInputStream(bytes.inputStream()).use { zis ->
            val found = mutableListOf<Pair<String, ByteArray>>()
            while (true) {
                val entry = zis.nextEntry ?: break
                if (entry.isDirectory || entry.name.startsWith("__MACOSX")) continue
                if (!entry.name.endsWith(".txt", true)) continue
                val out = ByteArrayOutputStream()
                zis.copyTo(out)
                found += entry.name to out.toByteArray()
            }
            if (found.isEmpty()) error("Zip has no .txt chat export inside")
            val pick = found.maxWith(
                compareBy<Pair<String, ByteArray>> {
                    val n = it.first.lowercase()
                    when {
                        n.contains("_chat") -> 3
                        n.contains("whatsapp") -> 2
                        else -> 1
                    }
                }.thenBy { it.second.size },
            )
            return decodeText(pick.second)
        }
    }

    private fun decodeText(bytes: ByteArray): String {
        val utf8 = String(bytes, Charsets.UTF_8)
        if (parseText(utf8).isNotEmpty() || !looksLikeUtf16(bytes)) return utf8
        val utf16 = String(bytes, Charset.forName("UTF-16"))
        return if (parseText(utf16).isNotEmpty()) utf16 else utf8
    }

    private fun looksLikeUtf16(bytes: ByteArray): Boolean {
        if (bytes.size < 2) return false
        val b0 = bytes[0].toInt() and 0xff
        val b1 = bytes[1].toInt() and 0xff
        return (b0 == 0xff && b1 == 0xfe) || (b0 == 0xfe && b1 == 0xff)
    }

    fun parseText(text: String): List<ChatMessage> {
        val out = mutableListOf<ChatMessage>()
        for (raw in text.replace("\r\n", "\n").replace("\r", "\n").lineSequence()) {
            val line = raw.removePrefix("\uFEFF")
            val m = lineRe.matchEntire(line)
            if (m != null) {
                val dt = parseDateTime(m.groupValues[1], m.groupValues[2]) ?: continue
                out += ChatMessage(
                    epochMs = dt.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(),
                    sender = m.groupValues[3].trim(),
                    text = m.groupValues[4],
                )
            } else if (out.isNotEmpty() && line.isNotEmpty()) {
                val last = out.last()
                out[out.lastIndex] = last.copy(text = last.text + "\n" + line)
            }
        }
        return out.sortedBy { it.epochMs }
    }

    private fun parseDateTime(dateS: String, timeS: String): LocalDateTime? {
        val parts = dateS.trim().split("/")
        if (parts.size != 3) return null
        var a = parts[0].toInt()
        var b = parts[1].toInt()
        var y = parts[2].toInt()
        if (y < 100) y += 2000
        val month: Int
        val day: Int
        when {
            a > 12 -> { day = a; month = b }
            b > 12 -> { month = a; day = b }
            else -> { month = a; day = b }
        }
        if (month !in 1..12 || day !in 1..31) return null
        val t = timeS.replace('\u202F', ' ').replace('\u00A0', ' ').trim()
        val ampm = Regex("""^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap][Mm])$""").matchEntire(t)
        val h24 = Regex("""^(\d{1,2}):(\d{2})(?::(\d{2}))?$""").matchEntire(t)
        val hour: Int
        val min: Int
        val sec: Int
        when {
            ampm != null -> {
                var h = ampm.groupValues[1].toInt()
                min = ampm.groupValues[2].toInt()
                sec = ampm.groupValues[3].ifBlank { "0" }.toInt()
                val mer = ampm.groupValues[4].uppercase()
                if (mer == "AM") {
                    if (h == 12) h = 0
                } else if (h != 12) h += 12
                hour = h
            }
            h24 != null -> {
                hour = h24.groupValues[1].toInt()
                min = h24.groupValues[2].toInt()
                sec = h24.groupValues[3].ifBlank { "0" }.toInt()
            }
            else -> return null
        }
        return LocalDateTime.of(y, month, day, hour, min, sec)
    }
}
