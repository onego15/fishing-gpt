"""Encode genuine browser screenshots, preserving the recorded wall-clock timing."""
import json, sys, subprocess
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
data = json.loads((root / 'docs/capture.json').read_text())
frames = []
durations = []
catch_ms = next((e['ms'] for e in data.get('events',[]) if e['state']=='catch'), 12000)
end_ms = max(14500, catch_ms+1700)
start_ms = max(0,end_ms-14800)
selected = [f for f in data['frames'] if start_ms <= f['ms'] < end_ms]
palette = Image.open(root / selected[0]['file']).resize((900, 562)).quantize(colors=192)
for i, item in enumerate(selected):
    image = Image.open(root / item['file']).convert('RGB').resize((900, 562), Image.Resampling.LANCZOS)
    frames.append(image.quantize(palette=palette, dither=Image.Dither.NONE))
    next_ms = selected[i+1]['ms'] if i+1 < len(selected) else end_ms
    durations.append(max(20, round((next_ms-item['ms'])/10)*10))
frames[0].save(root/'docs/demo.gif', save_all=True, append_images=frames[1:], duration=durations, loop=0, optimize=False, disposal=1)
print(f"GIF: {len(frames)} actual frames, {sum(durations)/1000:.2f}s, {(root/'docs/demo.gif').stat().st_size:,} bytes")
sys.path.insert(0,str(root/'tools/.deps'))
try:
    import imageio_ffmpeg
    lines=[]
    for i,item in enumerate(data['frames']):
        lines.append("file '"+str((root/item['file']).resolve()).replace('\\','/')+"'")
        next_ms=data['frames'][i+1]['ms'] if i+1<len(data['frames']) else data['duration']
        lines.append(f"duration {max(.02,(next_ms-item['ms'])/1000):.3f}")
    manifest=root/'docs/frames/concat.txt'
    manifest.write_text('\n'.join(lines),encoding='utf-8')
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-f','concat','-safe','0','-i',str(manifest),'-vf','scale=960:600','-c:v','libx264','-pix_fmt','yuv420p','-r','24','-crf','23','-movflags','+faststart',str(root/'docs/gameplay.mp4')],check=True,capture_output=True)
    print('MP4: docs/gameplay.mp4 (actual screencast; silent)')
    # Compact GitHub preview; sampled directly from the same genuine screencast.
    subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-ss',str(start_ms/1000),'-t',str((end_ms-start_ms)/1000),'-i',str(root/'docs/gameplay.mp4'),'-filter_complex','fps=8,scale=720:450:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle','-loop','0',str(root/'docs/demo.gif')],check=True,capture_output=True)
    print(f"Optimized GIF: {(root/'docs/demo.gif').stat().st_size:,} bytes")
except ImportError:
    print('Optional MP4 encoder unavailable')
