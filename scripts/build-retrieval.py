"""Build a deterministic, pinned pure-Python Lambda artifact outside the repository."""
import argparse
import hashlib
import pathlib
import subprocess
import sys
import tempfile
import zipfile

root = pathlib.Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--out', type=pathlib.Path, required=True)
args = parser.parse_args()
with tempfile.TemporaryDirectory(prefix='yata-retrieval-build-') as folder:
    stage = pathlib.Path(folder)
    subprocess.run([sys.executable, '-m', 'pip', 'install', '--quiet', '--no-compile', '--target', str(stage),
                    '-r', str(root / 'services/retrieval/requirements-lock.txt')], check=True)
    for name in ['core.py', 'budget.py', 'handler.py', 'ingest.py', 'jev.py', 'intent.py', 'feedback.py']:
        (stage / name).write_bytes((root / 'services/retrieval' / name).read_bytes())
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.out, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(stage.rglob('*')):
            if not path.is_file() or '__pycache__' in path.parts or path.suffix == '.pyc':
                continue
            info = zipfile.ZipInfo(path.relative_to(stage).as_posix(), date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            archive.writestr(info, path.read_bytes())
print('Artifact SHA256:', hashlib.sha256(args.out.read_bytes()).hexdigest())
