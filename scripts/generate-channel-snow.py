"""Generate original tuning snow. Requires ffmpeg; no reference assets are copied."""
import random,struct,zlib,pathlib,subprocess,tempfile
temporary=tempfile.TemporaryDirectory(prefix='yata-snow-')
out=pathlib.Path(temporary.name)
r=random.Random(1983)
w,h=480,270
for frame in range(12):
 rows=[]
 for y in range(h):
  bias=r.randrange(-20,21)
  row=bytes(max(0,min(255,r.randrange(256)+bias)) for x in range(w))
  rows.append(b'\0'+row)
 def chunk(k,d):return struct.pack('>I',len(d))+k+d+struct.pack('>I',zlib.crc32(k+d)&0xffffffff)
 png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,0,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')
 (out/f'{frame:02}.png').write_bytes(png)

subprocess.run(['ffmpeg','-v','error','-y','-framerate','30','-i',str(out/'%02d.png'),'-vf','split[a][b];[a]palettegen=max_colors=32:stats_mode=full[p];[b][p]paletteuse=dither=none','-loop','0',str(pathlib.Path(__file__).resolve().parents[1]/'assets/decor/channel-snow.gif')],check=True)
temporary.cleanup()
