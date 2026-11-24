"""Platform Three: score the outgoing train and pull the band out on the POV cut."""
from array import array
from math import exp, sin, tau
from pathlib import Path
from random import Random
import sys
import wave
from score import compose, RATE

ROOT = Path(__file__).resolve().parents[1]

def ramp(t, a, b):
    u = max(0., min(1., (t-a)/(b-a)))
    return u*u*(3-2*u)


def main():
    groove = array('h')
    groove.frombytes(compose(136, 42, tense=True, bars=8))
    if sys.byteorder != 'little': groove.byteswap()
    rng, hiss, samples = Random(7), 0., array('h')
    for i in range(round(28.4 * RATE)):
        t = i/RATE
        # Wheels and air brake sit below the VO, not a loud effect on every cut.
        hiss += .12*(rng.uniform(-1,1)-hiss)
        street = (1-ramp(t,7.6,9.2)) + ramp(t,22.8,24.2)
        age = t % .39
        rail = street*(1850*sin(tau*73*t) + (4300+3600*exp(-age*24))*hiss)
        lift = 1-.93*ramp(t,18.80,19.10)+.93*ramp(t,20.3,20.63)
        bell = sum(1850*exp(-6*(t-a))*sin(tau*f*(t-a)) for a,f in [(25.45,830),(25.72,622)] if t>=a)
        mastered = (.84*groove[i % len(groove)]*lift + rail + bell) * (1-ramp(t,28.13,28.4))
        samples.append(round(mastered))
    if sys.byteorder != 'little': samples.byteswap()
    with wave.open(str(ROOT/'episodes/invisible-score.wav'),'wb') as w:
        w.setparams((1,2,RATE,0,'NONE','not compressed'));w.writeframes(samples.tobytes())

if __name__ == '__main__': main()
