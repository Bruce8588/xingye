#!/usr/bin/env python3
"""检查今天是否吃了沙拉，没吃就骂人"""
import urllib.request, urllib.parse, json, re
from datetime import date

# 读取凭证
with open('/root/.hermes/.env') as f:
    content = f.read()
app_id_match = re.search(r'^FEISHU_APP_ID=(.+)$', content, re.MULTILINE)
app_secret_match = re.search(r'^FEISHU_APP_SECRET=(.+)$', content, re.MULTILINE)
FEISHU_APP_ID = app_id_match.group(1).strip() if app_id_match else None
FEISHU_APP_SECRET = app_secret_match.group(1).strip() if app_secret_match else None

# 1. 获取 token
data = json.dumps({'app_id': FEISHU_APP_ID, 'app_secret': FEISHU_APP_SECRET}).encode('utf-8')
req = urllib.request.Request(
    'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
    data=data, headers={'Content-Type': 'application/json'})
with urllib.request.urlopen(req) as resp:
    token = json.loads(resp.read())['tenant_access_token']

# 2. 用 Contact API 获取本 app 用户 open_id
contact_req = urllib.request.Request(
    'https://open.feishu.cn/open-apis/contact/v3/users?user_id_type=open_id&page_size=10',
    headers={'Authorization': f'Bearer {token}'})
with urllib.request.urlopen(contact_req) as resp:
    users = json.loads(resp.read()).get('data', {}).get('items', [])
    user_open_id = users[0]['open_id'] if users else None

# 3. 查今日饮食记录
BASE = "http://localhost:5001"
import http.cookiejar
cj = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

login_data = json.dumps({'username': 'BruceNieh', 'password': '8888'}).encode('utf-8')
req = urllib.request.Request(f'{BASE}/api/login',
    data=login_data, headers={'Content-Type': 'application/json'})
with opener.open(req) as resp:
    json.loads(resp.read())

req = urllib.request.Request(f'{BASE}/api/records', headers={'Authorization': f'Bearer {token}'})
with opener.open(req) as resp:
    records = json.loads(resp.read())

today = date.today().isoformat()
today_records = [r for r in records if r.get('created_at', '').startswith(today)]

# 检查是否有沙拉相关记录
salad_keywords = ['沙拉', 'salad', ' Salad', '蔬菜', '生菜']
has_salad = any(
    any(kw.lower() in r.get('food_name', '').lower() for kw in salad_keywords)
    for r in today_records
)

if has_salad:
    msg = f"✅ 乖，今天吃了沙拉，干得漂亮！今日记录：{' / '.join(r['food_name'] for r in today_records)}"
else:
    food_list = ' / '.join(r['food_name'] for r in today_records) if today_records else '无'
    msg = f"""😤 聂凌峰！你给我听着！

中午那顿已经够油腻了：{food_list}
晚上居然敢不吃沙拉？！

三个月的健康方案第6天就给我摆烂？！
给我现在立刻去搞一份沙拉，否则明天早上8:30的市场早报我给你发养生内容！"""

# 4. 发送
payload = {
    "receive_id": user_open_id,
    "msg_type": "text",
    "content": json.dumps({"text": msg})
}
data = json.dumps(payload, ensure_ascii=False).encode('utf-8')
send_req = urllib.request.Request(
    'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=open_id',
    data=data,
    headers={'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'})
with urllib.request.urlopen(send_req) as resp:
    result = json.loads(resp.read())
    print(f"code={result.get('code')}, msg={result.get('msg')}")
