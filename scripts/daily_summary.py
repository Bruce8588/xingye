#!/usr/bin/env python3
"""星夜每日摘要 — 生成后保存到文件并打印输出"""

import sqlite3
import json
import os
import re
from datetime import date, timedelta

DB_PATH = "/opt/xingye/data/daily/investflow.db"
SUMMARY_DIR = "/opt/xingye/data/daily/summaries"

def get_date_str(d):
    return d.strftime("%Y-%m-%d")

def query_db(sql, args=()):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(sql, args)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def main():
    today = date.today()
    yesterday = today - timedelta(days=1)
    today_str = get_date_str(today)
    yesterday_str = get_date_str(yesterday)

    # 数据查询
    done_yesterday = query_db(
        "SELECT text, deadline FROM todos WHERE done=1 AND date(updated_at)=?",
        (yesterday_str,)
    )
    review = query_db(
        "SELECT content, tomorrow_plan FROM reviews WHERE review_date=?",
        (yesterday_str,)
    )
    pending_today = query_db(
        "SELECT text, deadline, sort_order FROM todos WHERE done=0 AND (deadline='today' OR deadline=?) ORDER BY sort_order ASC",
        (today_str,)
    )
    inbox = query_db(
        "SELECT text FROM todos WHERE done=0 AND deadline='inbox' ORDER BY sort_order ASC"
    )
    projects = query_db(
        "SELECT emoji, name, problem, plan FROM projects ORDER BY sort_order ASC"
    )
    plan = query_db(
        "SELECT content FROM daily_plans WHERE plan_date=?", (today_str,)
    )

    # 今天已排的待办文本（用于判断是否遗漏）
    pending_texts = " ".join([t['text'] for t in pending_today])
    plan_text = plan[0]['content'] if plan else ""
    all_today_text = pending_texts + " " + plan_text

    # 构造消息
    lines = [f"☀️ 星夜每日摘要 · {today_str}", ""]

    # 昨天
    lines.append(f"📌 昨天（{yesterday_str}）")
    if review and review[0]['content']:
        # 今天的复盘是昨天写的，取其 content 描述昨天做的事
        content = review[0]['content']
        lines.append(content)
        if done_yesterday:
            done_texts = [t['text'] for t in done_yesterday]
            lines.append(f"另外完成了：{', '.join(done_texts)}")
    elif done_yesterday:
        lines.append("（无复盘）")
        lines.append(f"完成事项：{', '.join([t['text'] for t in done_yesterday])}")
    else:
        lines.append("（无复盘记录，无完成事项）")

    lines.append("")

    # 今天
    lines.append(f"📋 今天要做的事（{len(pending_today)}项）")
    if pending_today:
        for t in pending_today:
            lines.append(f"- {t['text']}")
    else:
        lines.append("（暂无待办）")

    if plan:
        lines.append("")
        lines.append(f"📌 今日规划：{plan[0]['content']}")

    # 助理提醒
    lines.append("")
    lines.append("⚠️ 助理提醒")
    reminders = []

    # 检查收集箱里有没有今天应该做但没排的事
    urgent_keywords = ['新中特', '英语', 'pre', '实习', '论文', 'quiz', '数理金融']
    inbox_texts = [i['text'] for i in inbox]
    uncovered = []
    for item in inbox_texts:
        for kw in urgent_keywords:
            if kw.lower() in item.lower():
                if kw not in all_today_text:
                    uncovered.append(item)
                break
    if uncovered:
        reminders.append(f"收集箱里建议今天处理：{', '.join(uncovered)}")

    # 检查项目有没有在今日安排里
    active_projects = [p for p in projects if p['plan'] or p['problem']]
    project_covered = []
    for p in active_projects:
        if any(word in all_today_text for word in [p['name'], p['problem'] or '']):
            project_covered.append(p['name'])
    uncovered_projects = [p['name'] for p in active_projects if p['name'] not in project_covered]
    if uncovered_projects:
        reminders.append(f"项目暂未排进今天：{', '.join(uncovered_projects)}")

    if reminders:
        lines.append("；".join(reminders))
    else:
        lines.append("今日安排已覆盖主要事项")

    output = "\n".join(lines)

    # 保存到文件
    os.makedirs(SUMMARY_DIR, exist_ok=True)
    filepath = os.path.join(SUMMARY_DIR, f"{today_str}.md")
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(output + "\n")

    print(output)

if __name__ == "__main__":
    main()
