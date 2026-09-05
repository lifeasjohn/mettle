import { describe, expect, it } from 'vitest';
import { screenAll, screenForCrisis } from './crisis';

const fires = (t: string) => screenForCrisis(t).crisis;

describe('crisis guardrail: must fire', () => {
  const cases: [string, string][] = [
    ['self-harm, direct', 'honestly some days I just want to kill myself'],
    ['self-harm, spaced', 'I have been thinking about killing my self'],
    ['self-harm, clinical', 'I think I am suicidal again'],
    ['self-harm, euphemism', 'sometimes I think about ending it all'],
    ['self-harm, passive', 'I wish I was dead most mornings'],
    ['self-harm, burden', 'they would be better off without me'],
    ['self-harm, meaning', 'there is no point in living like this'],
    ['self-harm, waking', "I don't want to wake up tomorrow"],
    ['self-harm, cutting', 'I started cutting myself again last week'],
    ['self-harm, overdose', 'I thought about an overdose'],
    ['self-harm, obfuscated', 'I want to k.i.l.l m.y.s.e.l.f'],
    ['abuse, partner', 'my husband hits me when he drinks'],
    ['abuse, bare', 'he punches me and then apologises'],
    ['abuse, fear', 'I am afraid to go home tonight'],
    ['abuse, safety', 'I am not safe at home'],
    ['abuse, named', 'I was physically abused as a kid and it is coming back'],
    ['harm to others, plan', 'I am going to kill him, I mean it'],
    ['harm to others, method', 'I bought a knife and I keep thinking about him'],
  ];

  for (const [name, text] of cases) {
    it(name, () => expect(screenForCrisis(text)).toMatchObject({ crisis: true }));
  }

  it('categorises self-harm over other matches', () => {
    expect(screenForCrisis('he hits me and I want to kill myself').category).toBe('self-harm');
  });

  it('condemns a whole spar if any single round fires', () => {
    expect(screenAll(['I let it go', 'I paused first', 'I want to die']).crisis).toBe(true);
  });
});

describe('crisis guardrail: must NOT fire', () => {
  // An anger-training app receives hyperbole constantly. Flagging it would make
  // the product unusable and teach people to write blandly, so these must pass.
  const cases: [string, string][] = [
    ['deadline idiom', 'this deadline is killing me but I stayed calm'],
    ['kill time', 'I was just killing time until the meeting'],
    ['kill the project', 'they decided to kill the project without telling me'],
    ['dying to know', 'I was dying to know what she meant by it'],
    ['die of embarrassment', 'I could have died of embarrassment'],
    ['to die for', 'the food was to die for'],
    ['dead tired', 'I was dead tired and snapped at him'],
    ['could have killed him', 'honestly I could have killed him, but I paused'],
    ['anger hyperbole', 'I wanted to strangle him, so I left the room instead'],
    ['deadline', 'the deadline is dead and nobody told me'],
    ['ordinary spar answer', 'The event is that he spoke over me. What I made it mean is mine.'],
    ['self-critical but safe', 'I hate that I reacted like that. I felt weak.'],
    ['work abuse of process', 'the process was abused by whoever ran it'],
    ['cutting corners', 'I keep cutting corners and it is catching up with me'],
  ];

  for (const [name, text] of cases) {
    it(name, () => expect(fires(text)).toBe(false));
  }

  it('passes empty and whitespace input', () => {
    expect(fires('')).toBe(false);
    expect(fires('   \n  ')).toBe(false);
  });
});
