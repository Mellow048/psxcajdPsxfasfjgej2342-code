"""Bake a quiet casino bed: diffuse room noise, wheel rattle and distant chip chinks."""
from array import array
from math import exp, pi, sin
from pathlib import Path
from random import Random
import sys
import wave

rate, seconds = 24000, 12
rng = Random(7)
room = low = 0.0
samples = array('h')
for i in range(rate * seconds):
    t = i / rate
    low += .018 * (rng.uniform(-1, 1) - low)
    room += .002 * (low - room)
    tick = t % .134
    rattle = sin(2*pi*870*tick) * exp(-380*tick) * (.4+.3*sin(t))
    age = t % 2.4
    chink = (sin(2*pi*1790*age)+.4*sin(2*pi*2450*age))*exp(-45*age)
    envelope = min(1, t*30, (seconds-t)*30)
    samples.append(round(14000 * envelope * (.8*room+.42*low+.065*rattle+.067*chink)))
if sys.byteorder != 'little': samples.byteswap()
with wave.open(str(Path(__file__).resolve().parents[1]/'episodes/casino-room-tone.wav'), 'wb') as w:
    w.setparams((1,2,rate,0,'NONE','not compressed')); w.writeframes(samples.tobytes())
