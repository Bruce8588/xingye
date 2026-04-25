#!/usr/bin/env python3
"""
早餐提醒脚本：检查最近3天早餐是否有油腻食物，提醒用户
"""
import sqlite3
import sys
from datetime import datetime, timedelta

DATABASE = '/opt/xingye/data/diet/diet_tracker.db'
USER_ID = 1  # BruceNieh

# 健康早餐关键词（只含这些 = 健康）
HEALTHY_KEYWORDS = ['鸡蛋', '蛋清', '牛奶', '玉米', '山芋', '红薯']

# 视为油腻食物的关键词（出现则当天不算健康）
OILY_KEYWORDS = ['肉包', '酱肉', '豆干包', '包子', '油条', '煎饼', '油饼', '炸', '汉堡', '薯条', '鸡腿', '鸡翅', '鸡块', '培根', '香肠']


def normalize(s):
    """去除空格、逗号、顿号等分隔符，便于匹配"""
    return s.replace('，', '').replace(',', '').replace('、', '').replace(' ', '')


def is_oily(food_name):
    """判断某天早餐是否偏油腻"""
    norm = normalize(food_name)
    # 先检查是否有明显油腻食物
    for kw in OILY_KEYWORDS:
        if kw in food_name:  # 用原始字符串匹配，更准确
            return True
    return False


def is_healthy(food_name):
    """判断是否纯粹健康早餐（只有健康食材）"""
    if is_oily(food_name):
        return False
    # 检查是否包含健康食物（至少要有）
    has_healthy = any(kw in food_name for kw in HEALTHY_KEYWORDS)
    return has_healthy


def check_recent_breakfasts():
    """检查最近3天早餐记录"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    today = datetime.now().strftime('%Y-%m-%d')
    three_days_ago = (datetime.now() - timedelta(days=3)).strftime('%Y-%m-%d')

    cursor.execute("""
        SELECT DATE(created_at) as date, food_name
        FROM food_records
        WHERE user_id = ? AND category = 'breakfast'
          AND DATE(created_at) >= ?
          AND DATE(created_at) < ?
        ORDER BY date DESC;
    """, (USER_ID, three_days_ago, today))

    records = cursor.fetchall()
    conn.close()

    oily_dates = []
    healthy_dates = []

    for date, food_name in records:
        if is_oily(food_name):
            oily_dates.append((date, food_name))
        else:
            healthy_dates.append((date, food_name))

    return oily_dates, healthy_dates


def build_message():
    oily, healthy = check_recent_breakfasts()

    msg = "🌅 早安！该吃早餐啦～\n\n"
    msg += "🥚 健康早餐推荐：鸡蛋 + 牛奶 + 玉米（或其他粗粮）\n\n"

    if oily:
        oily_list = '\n'.join([f"  • {d}：{f}" for d, f in oily])
        msg += f"⚠️ 最近3天早餐记录：\n{oily_list}\n\n"
        msg += "以上含有油腻食物，今天尽量别吃油腻的啦～\n"
        msg += "推荐：鸡蛋🥚 + 牛奶🥛 + 玉米🌽 简单健康！"
    else:
        msg += "✅ 最近3天早餐都很健康，继续保持！\n"
        msg += "今天也来一顿简单健康的早餐吧～"

    return msg


if __name__ == '__main__':
    print(build_message())
