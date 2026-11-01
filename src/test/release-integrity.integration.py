"""Run with python3 after lovable auth-session --json --self; never prints credentials."""
import concurrent.futures, json, os, uuid
from pathlib import Path
import requests
config = dict(line.split('=', 1) for line in Path('.env').read_text().splitlines() if '=' in line)
base = config['SUPABASE_URL'].strip('"') + '/rest/v1/'
key = config['SUPABASE_PUBLISHABLE_KEY'].strip('"')
with open(os.path.expanduser('~/.cache/lovable-auth/session.json')) as f:
    session = json.load(f)['session']
uid = session['user']['id']
headers = {'apikey': key, 'Authorization': 'Bearer ' + session['access_token'], 'Prefer': 'return=representation'}
def call(method, path, payload=None, ok=True):
    r = requests.request(method, base + path, headers=headers, json=payload, timeout=30)
    if ok: assert r.ok, f'Request failed ({r.status_code})'
    return r.json() if r.content else None

def test_integrity():
    topic = 'Release regression ' + str(uuid.uuid4())
    interview = call('POST', 'interviews', {'topic': topic, 'category': 'cs'})[0]
    iid = interview['id']
    gained = 0
    try:
        turn = call('POST', 'interview_turns', {'interview_id': iid, 'question': 'Explain a lock', 'difficulty': 'Medium'})[0]
        ev = {'score': 8, 'feedback': 'Regression test'}
        body = {'p_turn': turn['id'], 'p_answer': 'A lock enforces mutual exclusion.', 'p_evaluation': ev}
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: call('POST', 'rpc/save_interview_answer', body), range(2)))
        rating = call('GET', 'topic_ratings?topic=eq.' + requests.utils.quote(topic))[0]
        assert rating['attempts'] == 1
        assert results[0] == results[1]
        call('POST', 'rpc/save_interview_answer', body)
        assert call('GET', 'topic_ratings?topic=eq.' + requests.utils.quote(topic))[0]['attempts'] == 1
        print('PASS: concurrent and sequential answer retry counts once')
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            nexts = list(pool.map(lambda n: call('POST', 'rpc/append_interview_question', {'p_id': iid, 'p_question': 'Next ' + str(n), 'p_difficulty': 'Medium'}), range(2)))
        assert nexts[0]['id'] == nexts[1]['id']
        print('PASS: concurrent next-question calls create one turn')
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            endings = list(pool.map(lambda _: call('POST', 'rpc/complete_interview', {'p_id': iid}), range(2)))
        gained = sum(x['xpGained'] for x in endings)
        assert gained == 50
        assert call('POST', 'rpc/complete_interview', {'p_id': iid})['xpGained'] == 0
        assert call('POST', 'rpc/save_interview_answer', body, ok=False).get('message') == 'This interview has ended'
        print('PASS: completion awards XP once and rejects later grading')
        r = requests.get(base + 'coding_problems?select=id', headers=headers, timeout=30)
        assert r.status_code in (401,403) or (r.ok and r.json() == [])
        print('PASS: hidden coding tests cannot be fetched by app users')
    finally:
        call('DELETE', 'interviews?id=eq.' + iid)
        # Rating table grants deliberately omit DELETE; erase only this test row via privileged cleanup outside this test.
        if gained:
            xp = call('GET', 'profiles?id=eq.' + uid + '&select=xp')[0]['xp']
            call('PATCH', 'profiles?id=eq.' + uid, {'xp': xp - gained})
        print('Test topic requiring cleanup:', topic)
if __name__ == '__main__': test_integrity()
