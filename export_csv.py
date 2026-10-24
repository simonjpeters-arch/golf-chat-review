"""Generate CSV exports from GOLF-NO-SHOWS.md data."""
import csv
from pathlib import Path

ROOT = Path(__file__).parent

CONFIRMED = [
    ("8/6/20", "Simon", "Gaythan invited golf later", 'Thumb injury: "I won\'t be able to hold the club"; later "working late tonight"', "Did not play together"),
    ("8/10/20", "Simon", "Golf suggested", '"Would say golf but want to give my thumb another day to recover"', "Declined"),
    ("9/15/20", "Gaythan", "Had plans to play golf", '"Had plans to play golf but then James said we were offered a ned spot"', "Chose swimming instead"),
    ("4/23/21", "Gaythan", "Golf (few days)", '"I\'ve had to avoid golf for a few days" (finger split)', "Skipped several days"),
    ("5/23/21", "Simon", "Golf that day", '"not a chance i am playing golf today" (finger)', 'Gaythan played solo later ("I went golfing today")'),
    ("6/2/21", "Simon", "Golf that day", 'Surgery on finger: "Also no golf for me today"', "Skipped"),
    ("6/20/21", "Both", "Golf that day", 'Gaythan: "not sure how much i fancy golf today"; Simon: "I am not feeling it"; "maybe let golf know we arent coming"', "Cancelled; £150 cancellation fee mentioned"),
    ("6/30/21", "Both", "Pitch booked 11am", 'Gaythan: "I can\'t make it"; Simon: "Neither can I"; "Can\'t cancel either as it\'s within 24 hours"', "Neither attended"),
    ("8/24/21", "Simon", "Golf (same-day plan)", '"I don\'t think my thumb can do golf"', "Did something else instead"),
    ("9/23/21", "Simon", "Booked golf that day", '"i am not going to be able to make it" — work deadline', 'Gaythan went solo: "I can\'t cancel now so will head down"'),
    ("10/7/21", "Gaythan", "Pitch session (9pm, bay 1)", '"I\'m not going to get back from the office in time, you should go"', "Simon went solo"),
    ("10/19/21", "Gaythan", "Golf", '"I can\'t make golf" — Reading office + dinner', "Skipped"),
    ("10/22/21", "Simon", "Golf that evening", 'Back injury: "Not sure I will be hitting a golf ball later"', 'Gaythan played: "How ws golf" / "Was ok"'),
    ("12/8/21", "Gaythan", "Golf that day", '"don\'t fancy golf… just want to chill"', "Cancelled booking"),
    ("1/28/22", "Gaythan", "Pitch session", 'Locked out: "You go golf"; Simon: "Presume you are not going to make it"', "Simon went solo"),
    ("2/7/22", "Gaythan", "(Likely joint plan)", '"No I forgot I was playing golf with some old varonis people"', "Missed your plan"),
    ("4/23/22", "Simon", "Real golf that day", '"I Probably won\'t be free today for real golfs"', "Gaythan did pitch/swim instead"),
    ("4/24/22", "Gaythan", "Pitch that day", '"I didn\'t go in the end was playing a lot of playstation"', "Skipped"),
    ("5/17/22", "Gaythan", "Pitch (card given to Simon)", '"I forgot I\'ve got a gig tonight"; Simon: "Dw cancel it"', "Gaythan skipped; Simon could use card"),
    ("5/25/22", "Simon", "Golf/bowling that day", '"As much as I would like to golf" but seeing Eve later', "Skipped"),
    ("6/14/22", "Gaythan", "Golf that evening", '"I\'m really not in the mood for golf later… shall I cancel"', "Cancelled (Simon agreed)"),
    ("7/12/22", "Simon", "Pitch golf that night", 'Boss/work: "Go ahead and cancel"', "Cancelled (Simon noted he could have made it after work)"),
    ("7/14/22", "Simon", "Golf that night", 'Gaythan: "You can\'t golf tonight right"; Simon: "Nope… Going to see Dan"', "Skipped"),
    ("9/3/22", "Simon", "Real golf (morning tee)", 'Stayed at a girl\'s: "sorry been an arse… ended up at a girls last night"', "Gaythan played solo (9 holes)"),
    ("9/26/22", "Gaythan", "Saturday Trent golf", '"I can\'t do Saturday golf Trent but let\'s move to Sunday"', "Rescheduled"),
    ("10/3/22", "Gaythan", "Golf that weekend", '"I\'m away this weekend… can\'t do golf this weekend"; Simon: "Go ahead and cancel"', "Cancelled; moved to Thu/Fri"),
    ("10/29/22", "Both", "Golf that Saturday", 'Gaythan: "Not so sure I fancy golf"; Simon went back to bed', "Both skipped"),
    ("1/26/23", "Gaythan", "Golf that evening", '"Not going to be able to I\'m afraid sorry bro"', "Skipped; Simon booked solo slot"),
    ("3/4/23", "Simon", "Golf next morning", 'After night out: "Mate, I am being lame"; Gaythan had said "Don\'t miss golf tomorrow"', "Skipped"),
    ("4/3/23", "Gaythan", "Golf that evening", '"I\'m bailing on golf later, you go by all means"', "Simon could go solo"),
    ("4/28/23", "Gaythan", "Golf that day", '"Can we not golf? 😂" — legs dead', "Moved to next day"),
    ("5/2/23", "Gaythan", "Pitch golf that evening", '"you might be on your own… don\'t fancy it"', 'Simon played solo: "Was a successful session"'),
    ("9/22/23", "Gaythan", "Golf that evening", '"Interest in playing golf now= 0"; "Don\'t really fancy it"', "Simon went and played solo"),
    ("10/9/23", "Gaythan", "Golf next day", '"I can\'t golf tomorrow, Zoe is organising birthday dinner for mum"', "Moved to Wednesday"),
    ("10/11/23", "Gaythan", "Golf that evening", '"back is still sore… not going to risk it"', "Skipped; tried to find replacement"),
    ("10/14/23", "Gaythan", "Golf that morning", '"Haven\'t gone golf, didn\'t see the point"', "Skipped"),
    ("11/5/23", "Gaythan", "Real golf that Sunday", '"Decided against it, don\'t really fancy. Lugging a golf bag around for 4 hours."', "Skipped"),
    ("11/22/23", "Simon", "Pitch membership session", '"I cant do tonight, have an early thanksgiving with some GS people"', "Skipped that night"),
    ("3/11/24", "Simon", "Friday golf booking", 'Work/Thai cooking; "not going to leave early enough for golf" — part of ongoing no-show pattern', "Friday ruled out"),
    ("4/7/24", "Gaythan", "Golf before trip (~3–4pm)", 'Cycle/packing priority: "not sure I\'ll be that keen, sorry mate"; Simon: "So you are bailing?"', "Skipped; Simon didn't play"),
    ("3/28/25", "Simon", "MK golf weekend (tee + BBQ)", '"I am bailing… just you" / "no need a good nights sleep"', "Simon didn't go"),
    ("6/7/25", "Simon", "Golf that morning", '"I am not going to golf, even though I am up" — heartburn', "Skipped"),
]

WEEKDAY = [
    ("6/17/21 (Thu)", "Simon", "6/20/21 Sun", '"should we do golf on sunday?" — Gaythan: "We should"', 'Sun: Gaythan "not sure how much i fancy golf today"; Simon "I am not feeling it"; "maybe let golf know we arent coming" — £150 cancellation fee', "Both", "confirmed"),
    ("8/31/22 (Wed)", "Both", "9/3/22 Sat", '"Should we play golf somewhere different outside London on Saturday" — agreed, looked at weather', 'Sat AM: Simon "sorry been an arse… ended up at a girls last night"; Gaythan played solo (9 holes)', "Simon", "confirmed"),
    ("9/26/22 (Mon)", "Gaythan", "10/1/22 Sat → 10/2/22 Sun", '"I can\'t do Saturday golf Trent but let\'s move to Sunday"; Wed 9/28 agreed Sun afternoon Trent', 'Rescheduled again to following Sat; 10/3/22 Mon: Gaythan "I\'m away this weekend… can\'t do golf this weekend" — never played', "Gaythan", "confirmed"),
    ("10/3/22 (Mon)", "Gaythan", "10/7–9/22 weekend", '"I\'m away this weekend I forgot so I can\'t do golf this weekend"; Simon: "Go ahead and cancel"', "Camping with James; golf cancelled", "Gaythan", "confirmed"),
    ("10/27/22 (Thu)", "Simon", "10/29/22 Sat", '"You fancy some real world golf this weekend" — weather good; Gaythan: "I could possibly do Saturday"; Fri agreed Trent', 'Sat: Gaythan "Not so sure I fancy golf"; Simon "Once I saw your message on sat I just went back to bed"', "Both", "confirmed"),
    ("11/1/23 (Wed)", "Simon", "11/5/23 Sun", '"Sunday is looking dry if you want to play real golf"; evening: "Are we sure play golf on sunday" — Simon: "I would say yeees"', 'Sun AM: Gaythan "Decided against it, don\'t really fancy. Lugging a golf bag around for 4 hours."', "Gaythan", "confirmed"),
    ("4/4/24 (Thu)", "Simon", "4/6–7/24 Sat–Sun", '"Could play golf after cycling this weekend"; Gaythan: "Yeah possibly, Sunday I think is better"', 'Sat 4/6: both agreed tomorrow; Sun 4/7: Gaythan cycle/packing — "not sure I\'ll be that keen, sorry mate"; Simon: "So you are bailing?"', "Gaythan", "confirmed"),
    ("3/1/22 (Tue) → 3/3/22 (Thu)", "Simon → Gaythan", "3/6/22 Sun", 'Tue: "Are we Golfing this week/weekend"; Thu: "Are we golfing this weekend" — agreed Sunday Trent', "No chat evidence of Sunday round; played pitch Fri lunch instead; by 3/13 still planning golf for later in week", "Unclear (plan fizzled)", "fizzled"),
    ("9/1/21 (Wed)", "Simon", "9/5/21 Sun", '"Proper golf on Sunday ?"', 'Gaythan same day: wiped out by COVID jab ("feel like I\'ve got covid"); no follow-up booking or round', "Gaythan (illness)", "fizzled"),
    ("6/30/22 (Thu)", "Gaythan", "7/3/22 Sun", '"Can we do golf Sunday" — agreed 10/11am', 'Sun AM Gaythan from a girl\'s: "won\'t be joining you"; no golf messages that day — plan appears to have lapsed', "Gaythan (likely)", "fizzled"),
    ("8/21/23 (Mon)", "Simon", "8/26–28/23 BH weekend", '"do you have time for golf irl this weekend?"', 'Gaythan: "I\'m going to go with no for now but that might change" — no golf chat all bank-holiday weekend', "Gaythan", "fizzled"),
    ("9/26/23 (Tue)", "Simon", "9/30–10/1/23 weekend", '"We should golf irl this weekend" — "No ifs no butts"; Gaythan: "Agreed ok"', 'Fri 9/29: Gaythan "We should have played golf today" but work/busy; no joint weekend round materialised', "Both (enthusiasm, no execution)", "fizzled"),
    ("10/4/23 (Wed)", "Both", "10/8/23 Sun", 'Gaythan thinking about golf; Simon: "Not going to make it back in time this weekend" (Ryanair trip)', "Simon still abroad; no Sunday golf", "Simon (travel)", "fizzled"),
    ("2/27/23 (Mon)", "Simon", "3/4–5/23 weekend", '"Golf maybe this weekend?" — Gaythan: "Could be done"', "No golf messages that weekend; plan never booked", "Unclear", "fizzled"),
]

BORDERLINE = [
    ("5/23/21", "Gaythan", '"i forgot ive got golf planned saturday with James" — double-booking awareness, not same-day skip with you'),
    ("10/17/21", "", '"Lucky we didn\'t get golf for tomorrow" — no booking made'),
    ("4/8/22", "Gaythan", '"Not coming boo" during cycle ride — not clearly golf'),
    ("4/12/22", "", "Discussed being late for Trent Park — they still went"),
    ("10/21/22", "Gaythan", '"I forgot to book golf" — forgot to organise, not a skip'),
    ("4/27/23", "Gaythan", '"And likely not turn up" — banter about you organising'),
    ("5/13/22", "Gaythan", '"bit late for golf" on Sunday — logistics only, suggested pitch instead'),
    ("6/22/22", "Gaythan", '"let me confirm with golf tomorrow" — unclear if Friday happened'),
    ("7/21/23", "Gaythan", "Early reluctance, but session happened"),
    ("9/6/23", "Simon", '"You already have one for not turning up this morning" — appears to be swim booking dispute, not golf'),
    ("11/13/23", "Gaythan", 'Wants to "start golfing or cancel" membership — general frustration, not one session'),
    ("12/2/23", "Gaythan", '"Can\'t believe you haven\'t turned up" — drug delivery, not golf'),
    ("3/29/23", "Both", "Low interest in pitch membership generally — not one missed round"),
    ("5/8/25", "Debate", "Who bailed most recently — Gaythan says you twice since; you say he last bailed and you went with James/Haz"),
    ("9/11/25", "Simon", '"You bailed" — Harold\'s stuff / dinner, not golf'),
    ("10/17/25", "Simon", '"You don\'t fancy one round of pga" — virtual PGA, not real golf'),
    ("11/28/25", "Simon", '"Training for a race you bailed on" — running race, not golf'),
    ("63383+", "Simon (pattern)", '"54th booking" / repeated no-shows — aggregate accusation, not one dated round'),
]

FALSE_POSITIVES = [
    ("5/5/23", 'Gaythan: "Already tired and don\'t fancy it" — but they moved to 5pm and played'),
    ("7/21/23", 'Gaythan: "I already don\'t want to play golf later" — but moved to 6pm and Simon went ("Leaving" next day)'),
    ("8/24/22", 'Gaythan asked "So we playing or you bailing" — they played'),
    ("10/25/22", 'Gaythan: "So you can\'t golf tonight?" — Simon: "I could" and was happy to go'),
    ("1/18/23", 'Gaythan: "may be a little crap at golf tomorrow, work" — still played (shortened booking)'),
    ("3/12/24", 'Gaythan joked "not want to play golf" but said "No I\'m coming" and met up'),
]

WEEKDAY_SUCCESS = [
    ("5/12/21 (Wed)", "5/15/21 Sat", 'Played — "in for a soaking" but went with Harold'),
    ("4/27/23 (Thu)", "4/29/23 Sat", 'Played — "Yay golf day"'),
    ("4/28/25 (Mon) + 4/30/25 (Wed)", "5/3/25 Sat MK", "Played — early tee booked Wed; Simon arrived Fri; sparse Sat chat but clubs carried into Sun"),
    ("7/9/25 (Wed)", "7/12/25 Sat Trent", "Played — booked 9:12 tee Wed; both at course Sat AM"),
]


def write_csv(path: Path, headers: list[str], rows: list[tuple]) -> None:
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f, quoting=csv.QUOTE_MINIMAL)
        writer.writerow(headers)
        writer.writerows(rows)


def main() -> None:
    write_csv(
        ROOT / "confirmed-no-shows.csv",
        ["Date", "WhoSkipped", "Planned", "Reason", "Outcome"],
        CONFIRMED,
    )
    write_csv(
        ROOT / "weekday-weekend-failures.csv",
        ["WeekdayDate", "WhoMentionedPlanned", "WeekendDatePlanned", "MidWeekQuote", "WeekendOutcome", "WhoFailed", "Type"],
        WEEKDAY,
    )
    write_csv(
        ROOT / "borderline.csv",
        ["Date", "Who", "Notes"],
        BORDERLINE,
    )

    all_rows = []
    for row in CONFIRMED:
        all_rows.append(("confirmed_no_show", row[0], row[1], row[2], row[3], row[4], ""))
    for row in WEEKDAY:
        all_rows.append(("weekday_weekend_failure", row[0], row[5], row[2], row[3], row[4], row[6]))
    for row in BORDERLINE:
        all_rows.append(("borderline", row[0], row[1], "", row[2], "", ""))
    for row in FALSE_POSITIVES:
        all_rows.append(("false_positive", row[0], "", "", row[1], "", ""))
    for row in WEEKDAY_SUCCESS:
        all_rows.append(("weekday_weekend_success", row[0], "", row[1], "", row[2], ""))

    write_csv(
        ROOT / "golf-analysis.csv",
        ["Category", "Date", "Who", "PlannedOrWeekend", "ReasonOrNotes", "Outcome", "Type"],
        all_rows,
    )

    for p in sorted(ROOT.glob("*.csv")):
        print(p)


if __name__ == "__main__":
    main()
