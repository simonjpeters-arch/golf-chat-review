package com.simon.golfchatreview.data

import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlin.math.round

object AnalysisEngine {
    private val cancelRe = Regex(
        "can't|cannot|won't|wont|bail|not going|no golf|cancel|neither can|" +
            "not feeling|not fancy|don't fancy|dont fancy|not sure i|interest in playing|" +
            "didn't go|didnt go|haven't gone|decided against|probably won't|" +
            "not going to be able|can we not|not make|not in the mood|being lame|" +
            "not so sure|you go golf|you should go|on your own|legs dead|away this weekend",
        RegexOption.IGNORE_CASE,
    )
    private val golfRe = Regex("golf|pitch|tee|urban|trent|bay", RegexOption.IGNORE_CASE)

    private val manual = mapOf(
        "8/6/20" to Pair("2020-08-06T18:00", "2020-08-06T17:19"),
        "8/10/20" to Pair("2020-08-10T12:00", "2020-08-10T11:02"),
        "9/15/20" to Pair("2020-09-15T12:00", "2020-09-15T10:41"),
        "4/23/21" to Pair("2021-04-23T18:00", "2021-04-23T09:12"),
        "3/4/23" to Pair("2023-03-05T09:00", "2023-03-04T23:47"),
        "10/9/23" to Pair("2023-10-10T18:00", "2023-10-09T14:22"),
        "3/28/25" to Pair("2025-03-29T08:00", "2025-03-28T20:31"),
        "9/26/22" to Pair("2022-09-24T09:00", "2022-09-22T18:05"),
        "10/3/22" to Pair("2022-10-01T10:00", "2022-09-29T12:18"),
        "10/14/23" to Pair("2023-10-14T09:00", "2023-10-14T10:52"),
    )

    fun build(seed: Snapshot, messages: List<ChatMessage>, meta: ImportMeta?): Snapshot {
        val curated = seed.confirmed.map { it.copy(source = it.source.ifBlank { "curated" }) }
        val known = curated.map { it.date }.toSet()
        val auto = if (messages.isEmpty()) emptyList() else detectNewSkips(messages, known)
        val confirmed = curated + auto
        val curatedW = seed.weekday.map { it.copy(source = it.source.ifBlank { "curated" }) }
        val autoW = if (messages.isEmpty()) emptyList() else detectWeekday(messages, curatedW)
        val weekday = curatedW + autoW
        val borderline = seed.borderline
        val analytics = buildAnalytics(confirmed, messages)
        val stats = Stats(
            confirmedTotal = confirmed.size,
            simon = confirmed.count { it.whoSkipped == "Simon" },
            gaythan = confirmed.count { it.whoSkipped == "Gaythan" },
            both = confirmed.count { it.whoSkipped == "Both" },
            borderline = borderline.size,
            weekdayConfirmed = weekday.count { it.type == "confirmed" },
            weekdayFizzled = weekday.count { it.type == "fizzled" },
        )
        return Snapshot(
            confirmed = confirmed,
            weekday = weekday,
            borderline = borderline,
            analytics = analytics,
            stats = stats,
            autoNew = auto.size,
            meta = meta,
        )
    }

    fun auditItems(snap: Snapshot): List<AuditItem> {
        val byDate = snap.analytics.notice.associateBy { it.date }
        return snap.confirmed.map { r ->
            val n = byDate[r.date]
            AuditItem(
                date = r.date,
                who = r.whoSkipped,
                planned = r.planned,
                quote = r.reason,
                outcome = r.outcome,
                noticeHours = n?.noticeHours,
                category = n?.category ?: classifyExcuse(r.reason, r.planned),
                sessionIso = n?.sessionIso.orEmpty(),
                cancelIso = n?.cancelIso.orEmpty(),
                source = r.source,
                bucket = n?.bucket.orEmpty(),
            )
        }
    }

    fun metaFrom(messages: List<ChatMessage>): Triple<Int, String, Int> {
        if (messages.isEmpty()) return Triple(0, "—", 0)
        val fmt = DateTimeFormatter.ofPattern("d MMM yyyy")
        fun fmtMs(ms: Long) =
            Instant.ofEpochMilli(ms).atZone(ZoneId.systemDefault()).toLocalDate().format(fmt)
        val golf = messages.count { it.text.contains("golf", true) }
        return Triple(
            messages.size,
            "${fmtMs(messages.first().epochMs)} – ${fmtMs(messages.last().epochMs)}",
            golf,
        )
    }

    private fun detectNewSkips(messages: List<ChatMessage>, known: Set<String>): List<ConfirmedRow> {
        val byDate = linkedMapOf<String, ConfirmedRow>()
        for (msg in messages) {
            if (isFalsePositive(msg.text)) continue
            if (!golfRe.containsMatchIn(msg.text) || !cancelRe.containsMatchIn(msg.text)) continue
            val role = WhatsAppParser.senderRole(msg.sender)
            if (role == "Other") continue
            val key = WhatsAppParser.dateKey(msg.epochMs)
            if (key in known) continue
            val rec = ConfirmedRow(
                date = key,
                whoSkipped = role,
                planned = "Golf (auto-detected from export)",
                reason = "\"${msg.text.replace(Regex("\\s+"), " ").take(180)}\"",
                outcome = "Auto-detected skip/cancel phrasing in golf context",
                source = "auto",
            )
            val prev = byDate[key]
            if (prev == null) byDate[key] = rec
        }
        for ((day, rec) in byDate) {
            val roles = messages
                .filter { WhatsAppParser.dateKey(it.epochMs) == day && golfRe.containsMatchIn(it.text) && cancelRe.containsMatchIn(it.text) }
                .map { WhatsAppParser.senderRole(it.sender) }
                .filter { it != "Other" }
                .toSet()
            if ("Simon" in roles && "Gaythan" in roles) {
                byDate[day] = rec.copy(whoSkipped = "Both")
            }
        }
        return byDate.values.toList()
    }

    private fun detectWeekday(messages: List<ChatMessage>, existing: List<WeekdayRow>): List<WeekdayRow> {
        val seen = existing.map { "${it.weekdayDate}|${it.weekendDatePlanned}" }.toMutableSet()
        val extra = mutableListOf<WeekdayRow>()
        for (msg in messages) {
            val z = Instant.ofEpochMilli(msg.epochMs).atZone(ZoneId.systemDefault())
            val dow = z.dayOfWeek.value // 1 Mon
            if (dow >= 5) continue
            val tl = msg.text.lowercase()
            if (!golfRe.containsMatchIn(msg.text)) continue
            if (!tl.contains("weekend") && !tl.contains("saturday") && !tl.contains("sunday")) continue
            if (isFalsePositive(msg.text)) continue
            val daysUntilFri = 5 - dow
            val weekendStart = z.toLocalDate().plusDays(daysUntilFri.toLong())
            val startMs = weekendStart.atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
            val endMs = weekendStart.plusDays(3).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
            val weekendMsgs = messages.filter { it.epochMs >= startMs && it.epochMs < endMs }
            val cancel = weekendMsgs.filter { golfRe.containsMatchIn(it.text) && cancelRe.containsMatchIn(it.text) }
            val type = if (cancel.isNotEmpty()) "confirmed" else "fizzled"
            val outcome = if (cancel.isNotEmpty()) {
                cancel.first().text.replace(Regex("\\s+"), " ").take(160)
            } else {
                "No explicit weekend golf skip found; plan may have fizzled."
            }
            val wkDate = WhatsAppParser.dateKey(msg.epochMs)
            val weDate = "${weekendStart.monthValue}/${weekendStart.dayOfMonth}/${weekendStart.year.toString().takeLast(2)}"
            val key = "$wkDate|$weDate"
            if (key in seen) continue
            seen += key
            extra += WeekdayRow(
                weekdayDate = "$wkDate (auto)",
                whoMentionedPlanned = WhatsAppParser.senderRole(msg.sender),
                weekendDatePlanned = weDate,
                midWeekQuote = msg.text.replace(Regex("\\s+"), " ").take(160),
                weekendOutcome = outcome,
                whoFailed = if (cancel.isNotEmpty()) WhatsAppParser.senderRole(cancel.first().sender) else "Unclear",
                type = type,
                source = "auto",
            )
            if (extra.size >= 40) break
        }
        return extra
    }

    private fun isFalsePositive(t: String): Boolean {
        val x = t.lowercase()
        if (x.contains("skipping rope") || x.contains("skip rope")) return true
        if (Regex("mini[\\s-]?golf").containsMatchIn(x)) return true
        if (x.contains("pga") && (x.contains("virtual") || x.contains("playstation") || x.contains("one round of pga"))) return true
        if (x.contains("training for a race you bailed")) return true
        if (x.contains("harold") && x.contains("bail") && !x.contains("golf")) return true
        if (x.contains("so we playing or you bailing")) return true
        return false
    }

    private fun buildAnalytics(confirmed: List<ConfirmedRow>, messages: List<ChatMessage>): Analytics {
        val notices = confirmed.mapNotNull { enrich(it, messages) }
        val catCounts = notices.groupingBy { it.category }.eachCount()
        val top = catCounts.entries.sortedByDescending { it.value }
        val buckets = notices.groupingBy { it.bucket }.eachCount()
        val known = notices.mapNotNull { it.noticeHours }
        val byWho = mapOf(
            "Simon" to notices.filter { it.who == "Simon" }.mapNotNull { it.noticeHours },
            "Gaythan" to notices.filter { it.who == "Gaythan" }.mapNotNull { it.noticeHours },
        )
        val worst = notices.filter { it.noticeHours != null }.sortedBy { it.noticeHours }.take(8)
        return Analytics(
            excuseCategories = top.map { ExcuseCat(it.key, it.value) },
            topExcuses = top.take(5).mapIndexed { i, e -> TopExcuse(i + 1, e.key, e.value) },
            notice = notices,
            noticeBuckets = buckets,
            noticeSummary = NoticeSummary(
                medianHours = median(known)?.let { rnd1(it) },
                meanHours = if (known.isEmpty()) null else rnd1(known.average()),
                under2h = known.count { it >= 0 && it < 2 },
                sameDay = known.count { it >= 0 && it < 24 },
                afterStart = known.count { it < 0 },
                knownCount = known.size,
                simonMedian = median(byWho["Simon"].orEmpty())?.let { rnd1(it) },
                gaythanMedian = median(byWho["Gaythan"].orEmpty())?.let { rnd1(it) },
            ),
            worstNotice = worst,
        )
    }

    private fun enrich(row: ConfirmedRow, messages: List<ChatMessage>): NoticeRow? {
        val rowDate = parseCsvDate(row.date) ?: return null
        val category = classifyExcuse(row.reason, row.planned)
        val session: LocalDateTime
        val cancel: LocalDateTime?
        var note = ""
        val man = manual[row.date]
        if (man != null) {
            session = LocalDateTime.parse(man.first)
            cancel = LocalDateTime.parse(man.second)
            note = "Manual session/cancel timestamps"
        } else {
            session = inferSession(rowDate, row.planned)
            val found = findCancel(messages, row.whoSkipped, rowDate, session, row.reason)
            cancel = found?.first
            note = found?.second.orEmpty()
        }
        val hours = if (cancel != null) {
            val s = session.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
            val c = cancel.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
            round(((s - c) / 3600000.0) * 100.0) / 100.0
        } else null
        return NoticeRow(
            date = row.date,
            who = row.whoSkipped,
            category = category,
            sessionIso = session.toString().take(16),
            cancelIso = cancel?.toString()?.take(16),
            noticeHours = hours,
            bucket = noticeBucket(hours),
            note = note,
            planned = row.planned,
            reason = row.reason,
            outcome = row.outcome,
            source = row.source,
        )
    }

    private fun findCancel(
        messages: List<ChatMessage>,
        who: String,
        rowDate: LocalDateTime,
        session: LocalDateTime,
        reason: String,
    ): Pair<LocalDateTime, String>? {
        val quotes = extractQuotes(reason)
        val sessionMs = session.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli()
        val start = sessionMs - 5L * 24 * 3600 * 1000
        val end = sessionMs + 2L * 3600 * 1000
        data class Cand(val dt: LocalDateTime, val text: String, val score: Int)
        val cands = mutableListOf<Cand>()
        for (msg in messages) {
            if (msg.epochMs < start || msg.epochMs > end) continue
            if (!senderMatches(who, msg.sender)) continue
            val tl = msg.text.lowercase()
            var score = 0
            if (cancelRe.containsMatchIn(tl)) score += 3
            if (golfRe.containsMatchIn(tl)) score += 2
            for (q in quotes) {
                if (tl.contains(q.take(20)) || q.contains(tl.take(40))) score += 8
            }
            if (score >= 3) {
                val dt = Instant.ofEpochMilli(msg.epochMs).atZone(ZoneId.systemDefault()).toLocalDateTime()
                cands += Cand(dt, msg.text, score)
            }
        }
        if (cands.isEmpty()) {
            val day = rowDate.toLocalDate()
            for (msg in messages) {
                val d = Instant.ofEpochMilli(msg.epochMs).atZone(ZoneId.systemDefault()).toLocalDate()
                if (d != day) continue
                if (!senderMatches(who, msg.sender)) continue
                if (cancelRe.containsMatchIn(msg.text) && (golfRe.containsMatchIn(msg.text) || quotes.isNotEmpty())) {
                    val dt = Instant.ofEpochMilli(msg.epochMs).atZone(ZoneId.systemDefault()).toLocalDateTime()
                    cands += Cand(dt, msg.text, 2)
                }
            }
        }
        val pick = cands.minWithOrNull(compareByDescending<Cand> { it.score }.thenBy { it.dt }) ?: return null
        return pick.dt to pick.text.take(100)
    }

    private fun senderMatches(who: String, sender: String): Boolean = when (who) {
        "Simon" -> WhatsAppParser.isSimon(sender)
        "Gaythan" -> WhatsAppParser.isGaythan(sender)
        "Both" -> WhatsAppParser.isSimon(sender) || WhatsAppParser.isGaythan(sender)
        else -> false
    }

    private fun extractQuotes(reason: String): List<String> {
        val out = mutableListOf<String>()
        val re = Regex("\"\"([^\"]+)\"\"|\"([^\"]+)\"")
        for (m in re.findAll(reason)) {
            val q = (m.groups[1]?.value ?: m.groups[2]?.value ?: "").trim().lowercase()
            if (q.length >= 8) out += q
        }
        return out
    }

    private fun inferSession(rowDate: LocalDateTime, planned: String): LocalDateTime {
        val p = planned.lowercase()
        var d = rowDate.toLocalDate()
        if ("next morning" in p || "golf next day" in p) d = d.plusDays(1)
        else if ("tomorrow" in p && "golf" in p) d = d.plusDays(1)
        fun at(h: Int, m: Int = 0) = d.atTime(h, m)
        return when {
            "11am" in p || "11 am" in p -> at(11)
            "9pm" in p || "9 pm" in p -> at(21)
            "3-4pm" in p || "3–4pm" in p || "~3" in p -> at(15, 30)
            "morning" in p || "tee" in p -> at(9)
            "evening" in p || "night" in p || "tonight" in p -> at(19)
            "friday" in p -> at(17)
            "weekend" in p || "saturday" in p || "sunday" in p -> at(10)
            "few days" in p -> at(18)
            else -> at(12)
        }
    }

    private fun classifyExcuse(reason: String, planned: String): String {
        val t = "$reason $planned".lowercase()
        return when {
            Regex("don't fancy|dont fancy|not fancy|interest in playing|not in the mood|chill|didn't see the point|decided against|legs dead|can we not|not so sure|being lame|playstation")
                .containsMatchIn(t) -> "Don't fancy / mood"
            Regex("thumb|finger|back|sore|injury|surgery|heartburn|split|hold the club").containsMatchIn(t) ->
                "Injury / physical"
            Regex("work|boss|office|deadline|reading|dinner|gig|varonis|james|swim|ned spot|birthday|thanksgiving|thai|cooking|camping|cycle|packing|trip")
                .containsMatchIn(t) -> "Other plans / work / social"
            Regex("girl|eve|dan|night out|hungover|arose|ended up at").containsMatchIn(t) ->
                "Social / dating / night out"
            Regex("locked out|forgot").containsMatchIn(t) -> "Forgot / logistics"
            Regex("away|weekend|can't do saturday").containsMatchIn(t) -> "Travel / schedule"
            else -> "Other / unclear"
        }
    }

    private fun noticeBucket(hours: Double?): String = when {
        hours == null -> "Unknown"
        hours < 0 -> "After start / none"
        hours < 2 -> "<2 hours"
        hours < 6 -> "Same day (2-6h)"
        hours < 24 -> "Same day (6h+)"
        hours < 48 -> "Previous day"
        hours < 72 -> "2-3 days"
        else -> "3+ days"
    }

    private fun parseCsvDate(s: String): LocalDateTime? {
        val m = Regex("""(\d{1,2})/(\d{1,2})/(\d{2,4})""").find(s) ?: return null
        var mo = m.groupValues[1].toInt()
        var d = m.groupValues[2].toInt()
        var y = m.groupValues[3].toInt()
        if (y < 100) y += 2000
        if (mo > 12 && d <= 12) {
            val tmp = mo; mo = d; d = tmp
        }
        return LocalDateTime.of(y, mo, d, 0, 0)
    }

    private fun median(vals: List<Double>): Double? {
        if (vals.isEmpty()) return null
        val s = vals.sorted()
        val m = s.size / 2
        return if (s.size % 2 == 1) s[m] else (s[m - 1] + s[m]) / 2.0
    }

    private fun rnd1(v: Double) = round(v * 10.0) / 10.0
}
