#!/usr/bin/env python3
"""Compose the original underscore for 'Your last $10 on red' (stdlib only)."""
from array import array
import json
from math import exp, pi, sin
from pathlib import Path
from random import Random
import sys
import wave

ROOT = Path(__file__).resolve().parents[1]
RATE = 24000
BEAT = 0.5  # 120 BPM: one bar per two-second wager
TAU = 2 * pi


def compose():
    episode = json.loads((ROOT / 'episodes/casino_martingale.json').read_text())
    end = 0
    bets = []
    for shot in episode['shots']:
        bets.extend(end + ev['time'] for ev in shot.get('events', []) if ev.get('placedBy'))
        end += shot['duration']
    bus = array('f', [0]) * round(end * RATE)
    rng = Random(81)

    def hit(t, length, voice, midi, amp):
        start = round(t * RATE)
        freq = 440 * 2 ** ((midi - 69) / 12)
        for i in range(min(round(length * RATE), len(bus) - start)):
            s = i / RATE
            phase = TAU * freq * s
            if voice == 'kick':
                value = sin(TAU * (52*s + 1.6*(1-exp(-33*s)))) * exp(-17*s)
            elif voice == 'brush':
                value = rng.uniform(-1, 1) * exp(-65*s)
            elif voice == 'felt':  # muted electric keys, not another bright register ding
                value = sin(phase + .65 * exp(-9*s) * sin(2*phase)) * exp(-3.8*s)
            else:  # include harmonics so the bass rhythm survives a phone speaker
                value = (.64*sin(phase) + .32*sin(2*phase) + .18*sin(3*phase)) * exp(-2*s)
            gate = min(1, s/.008, (length-s)/.035)
            bus[start+i] += amp * gate * value

    # D minor, Bb major 7, G minor 9, A7(b9). Revoice the same motif rather
    # than introducing a competing lead when the player starts to panic.
    harmony = [(38, (53, 57, 64)), (34, (53, 57, 62)),
               (31, (53, 58, 62)), (33, (52, 55, 58))]
    for bar in range(int(end / (4*BEAT)) + 1):
        t = bar * 4 * BEAT
        root, chord = harmony[bar % 4]
        if t >= 38:  # leave the last line exposed; no drum fill into the loop
            hit(t, 1.55, 'felt', 50 if t == 38 else 45, .16)
            continue
        for offset in ([0, 1.5] if t < 14 else [0, .75, 1.5]):
            hit(t+offset, .35, 'bass', root + (12 if offset == .75 else 0), .49)
        for n, midi in enumerate(chord):
            hit(t+.245+n*.019, .85, 'felt', midi, .14)
        if t >= 6:
            for offset in [0, 1]:
                hit(t+offset, .23, 'kick', 0, .49)
            for offset in ([.51, 1.51] if t < 22 else [.26, .51, 1.26, 1.51, 1.77]):
                hit(t+offset, .095, 'brush', 0, .16)
        if t >= 22:
            hit(t+1.375, .43, 'felt', chord[-1]+2, .19)

    pcm = array('h')
    for i, sample in enumerate(bus):
        t = i / RATE
        # Give each cash register transient space; dialogue ducking is applied at mix time.
        accent = min(min(1, .32 + abs(t-cue)*4) for cue in bets) if bets else 1
        pcm.append(round(28000 * max(-1, min(1, sample * accent))))
    if sys.byteorder != 'little':
        pcm.byteswap()
    with wave.open(str(ROOT / 'episodes/casino-score.wav'), 'wb') as out:
        out.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
        out.writeframes(pcm.tobytes())


if __name__ == '__main__':
    compose()
