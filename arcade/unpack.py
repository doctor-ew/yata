"""Extract a verified local GameZIP without trusting archive paths."""
import sys, zipfile, pathlib
source, output = sys.argv[1:]
root = pathlib.Path(output).resolve()
with zipfile.ZipFile(source) as archive:
    entries = archive.infolist()
    if len(entries) > 20000 or sum(e.file_size for e in entries) > 500 * 1024 * 1024:
        raise ValueError('Archive exceeds local extraction limits')
    for entry in entries:
        relative = pathlib.PurePosixPath(entry.filename.replace('\\', '/'))
        if relative.is_absolute() or '..' in relative.parts:
            raise ValueError('Unsafe archive path')
        destination = root.joinpath(*relative.parts)
        if entry.is_dir():
            destination.mkdir(parents=True, exist_ok=True)
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(archive.read(entry))
