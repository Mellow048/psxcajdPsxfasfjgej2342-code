"""Bake the 150 BPM double-pulse / rising synth ostinato. No sample libraries."""
from array import array
from math import exp, pi, sin
from pathlib import Path
import sys
import wave

rate = 24000
samples = array('h')
for i in range(round(rate * 6.4)):
    t = i / rate
    beat = t % .4
    def thump(a):
        return 0 if a < 0 else sin(2*pi*(48*a + .85*(1-exp(-50*a))))*exp(-23*a)
    step = int(t/.2) % 8
    phase = t % .2
    hz = (146.83, 155.56, 146.83, 220, 146.83, 155.56, 174.61, 233.08)[step]
    arp = sin(2*pi*hz*phase + .9*sin(4*pi*hz*phase))*exp(-20*phase)*min(1,phase*300)
    samples.append(round(23000*(.64*thump(beat)+.36*thump(beat-.125)+.22*arp)))
if sys.byteorder != 'little': samples.byteswap()
with wave.open(str(Path(__file__).resolve().parents[1]/'episodes/tense-heartbeat.wav'),'wb') as w:
    w.setparams((1,2,rate,0,'NONE','not compressed')); w.writeframes(samples.tobytes())
