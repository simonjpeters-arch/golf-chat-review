package com.simon.golfchatreview.data

import com.google.gson.annotations.SerializedName

data class Snapshot(
    val confirmed: List<ConfirmedRow> = emptyList(),
    val weekday: List<WeekdayRow> = emptyList(),
    val borderline: List<BorderlineRow> = emptyList(),
    val analytics: Analytics = Analytics(),
    val stats: Stats = Stats(),
    val autoNew: Int = 0,
    val meta: ImportMeta? = null,
)

data class ConfirmedRow(
    @SerializedName("Date") val date: String = "",
    @SerializedName("WhoSkipped") val whoSkipped: String = "",
    @SerializedName("Planned") val planned: String = "",
    @SerializedName("Reason") val reason: String = "",
    @SerializedName("Outcome") val outcome: String = "",
    val source: String = "curated",
)

data class WeekdayRow(
    @SerializedName("WeekdayDate") val weekdayDate: String = "",
    @SerializedName("WhoMentionedPlanned") val whoMentionedPlanned: String = "",
    @SerializedName("WeekendDatePlanned") val weekendDatePlanned: String = "",
    @SerializedName("MidWeekQuote") val midWeekQuote: String = "",
    @SerializedName("WeekendOutcome") val weekendOutcome: String = "",
    @SerializedName("WhoFailed") val whoFailed: String = "",
    @SerializedName("Type") val type: String = "",
    val source: String = "curated",
)

data class BorderlineRow(
    @SerializedName("Date") val date: String = "",
    @SerializedName("Who") val who: String = "",
    @SerializedName("Notes") val notes: String = "",
)

data class Analytics(
    @SerializedName("excuse_categories") val excuseCategories: List<ExcuseCat> = emptyList(),
    @SerializedName("top_excuses") val topExcuses: List<TopExcuse> = emptyList(),
    val notice: List<NoticeRow> = emptyList(),
    @SerializedName("notice_buckets") val noticeBuckets: Map<String, Int> = emptyMap(),
    @SerializedName("notice_summary") val noticeSummary: NoticeSummary = NoticeSummary(),
    @SerializedName("worst_notice") val worstNotice: List<NoticeRow> = emptyList(),
)

data class ExcuseCat(val category: String = "", val count: Int = 0)
data class TopExcuse(val rank: Int = 0, val category: String = "", val count: Int = 0)

data class NoticeRow(
    val date: String = "",
    val who: String = "",
    val category: String = "",
    @SerializedName("session_iso") val sessionIso: String? = null,
    @SerializedName("cancel_iso") val cancelIso: String? = null,
    @SerializedName("notice_hours") val noticeHours: Double? = null,
    val bucket: String = "",
    val note: String = "",
    val planned: String = "",
    val reason: String = "",
    val outcome: String = "",
    val source: String = "",
)

data class NoticeSummary(
    @SerializedName("median_hours") val medianHours: Double? = null,
    @SerializedName("mean_hours") val meanHours: Double? = null,
    @SerializedName("under_2h") val under2h: Int = 0,
    @SerializedName("same_day") val sameDay: Int = 0,
    @SerializedName("after_start") val afterStart: Int = 0,
    @SerializedName("known_count") val knownCount: Int = 0,
    @SerializedName("simon_median") val simonMedian: Double? = null,
    @SerializedName("gaythan_median") val gaythanMedian: Double? = null,
)

data class Stats(
    @SerializedName("confirmed_total") val confirmedTotal: Int = 0,
    val simon: Int = 0,
    val gaythan: Int = 0,
    val both: Int = 0,
    val borderline: Int = 0,
    @SerializedName("weekday_confirmed") val weekdayConfirmed: Int = 0,
    @SerializedName("weekday_fizzled") val weekdayFizzled: Int = 0,
)

data class ImportMeta(
    val fileName: String = "",
    val lastUpdated: String = "",
    val messageCount: Int = 0,
    val dateRange: String = "—",
    val golfMentions: Int = 0,
    val sha256: String = "",
)

data class ChatMessage(
    val epochMs: Long,
    val sender: String,
    val text: String,
)

data class AuditItem(
    val date: String,
    val who: String,
    val planned: String,
    val quote: String,
    val outcome: String,
    val noticeHours: Double?,
    val category: String,
    val sessionIso: String,
    val cancelIso: String,
    val source: String,
    val bucket: String,
)
