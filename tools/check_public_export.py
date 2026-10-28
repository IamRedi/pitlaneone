"""Verify a bounded source export, not a complete security certification."""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

ROOT=Path(__file__).resolve().parents[1]
RULES={
 'credential marker': re.compile(r'(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{18,}|sb_secret_[A-Za-z0-9_-]{18,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)'),
 'JWT literal': re.compile(r'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}'),
 'personal host path': re.compile(r'[A-Za-z]:[\\/](?:Users|All my app)[\\/]',re.I),
 'private provider/document pointer': re.compile(r'(?:[a-z]{20}\.supabase\.co|prj_[A-Za-z0-9]{16,}|team_[A-Za-z0-9]{16,}|https://(?:docs|drive)\.google\.com/)'),
 'personal mailbox': re.compile(r'[\w.+-]+@(?:gmail|hotmail|outlook|yahoo)\.[A-Za-z]{2,}',re.I),
}

def main():
 names=[n for n in subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0') if n]
 if not names: raise SystemExit('Stage the export before checking.')
 failures=[]
 for name in names:
  path=Path(name)
  if any(part in {'.private','.vercel','node_modules','.next','uploads','__pycache__'} for part in path.parts) or (path.name.startswith('.env') and path.name!='.env.example') or path.suffix in {'.pdf','.zip','.dump','.backup','.pem','.key','.mp4'} or '/production-' in name:
   failures.append((name,'private/runtime file path'))
  data=(ROOT/name).read_bytes()
  try: text=data.decode('utf-8')
  except UnicodeDecodeError:
   if path.suffix.lower() not in {'.png','.webp','.jpg','.jpeg','.ico'}: failures.append((name,'unexpected binary'))
   continue
  for label,rule in RULES.items():
   if rule.search(text): failures.append((name,label))
 manifest=json.loads((ROOT/'docs/SOURCE_SNAPSHOT.json').read_text(encoding='utf-8'))
 for name,record in manifest['files'].items():
  if name not in names or hashlib.sha256((ROOT/name).read_bytes()).hexdigest()!=record['export_sha256']:
   failures.append((name,'export hash mismatch'))
 covered={n for n in names if n.startswith(('frontend/','supabase/')) and n!='frontend/.env.example'}
 if covered!=set(manifest['files']): failures.append(('docs/SOURCE_SNAPSHOT.json','source coverage mismatch'))
 if failures:
  for name,issue in failures: print(f'{name}: {issue}',file=sys.stderr)
  raise SystemExit(1)
 print(f'PASS: {len(names)} tracked files; {len(covered)} source hashes; no rejected publication markers.')

if __name__=='__main__': main()
