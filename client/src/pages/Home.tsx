import { useState, type FormEvent } from "react";
import { ArrowRight, Compass, Sparkles, UsersRound } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const principles = [
  { icon: Compass, title: "Find your direction", copy: "Explore a focused network of mentors and categories built around meaningful progress." },
  { icon: UsersRound, title: "Learn with context", copy: "Move from broad discovery to the right person, the right subject, and the next useful conversation." },
  { icon: Sparkles, title: "Make momentum visible", copy: "A calm, considered workspace for the work between ambition and achievement." },
];

function localLearningGuide(question: string) {
  const lower = question.toLowerCase();
  if (lower.includes("confidence") || lower.includes("speak") || lower.includes("communication")) return "Start with communication practice: choose one small situation, define the outcome, and look for a mentor who can review your next attempt.";
  if (lower.includes("career") || lower.includes("job") || lower.includes("work")) return "Start with career direction: name the role or decision you are moving toward, then compare the skills and mentor perspectives that support it.";
  if (lower.includes("code") || lower.includes("build") || lower.includes("technical")) return "Start with a build pathway: turn the idea into one testable milestone and choose the category that gives you the strongest technical context.";
  return "Start by naming the outcome you want in one sentence, then choose a focused category and one mentor perspective to make the next step concrete.";
}

export default function Home() {
  const [question, setQuestion] = useState("");
  const [assistantStatus, setAssistantStatus] = useState("Edu-Pro’s guide is ready to turn a loose intention into a concrete next step.");
  const learningGuide = trpc.learningGuide.useMutation({
    onSuccess: (result) => setAssistantStatus(result.answer),
    onError: () => setAssistantStatus(localLearningGuide(question)),
  });

  function askAssistant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    setAssistantStatus("Finding a useful starting point…");
    learningGuide.mutate({ question: trimmed });
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#071527] text-[#f6f0e4]">
      <section className="relative isolate min-h-[760px] border-b border-[#d9b978]/15">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_72%_18%,rgba(217,185,120,.18),transparent_28%),linear-gradient(120deg,#071527_0%,#0b2038_58%,#12304a_100%)]" />
        <div className="mx-auto grid min-h-[760px] max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-12">
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            <p className="mb-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.28em] text-[#d9b978]"><span className="h-px w-10 bg-[#d9b978]" />Edu-Pro / Learning, reframed</p>
            <h1 className="font-serif text-6xl leading-[.95] tracking-[-.05em] sm:text-7xl lg:text-[7.25rem]">A better way to <em className="text-[#d9b978]">move forward.</em></h1>
            <p className="mt-8 max-w-lg text-lg leading-8 text-[#c2d0dc]">A premium learning platform that turns curiosity into direction through trusted mentors, clear categories, and a calmer digital workspace.</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/app"><Button className="h-12 rounded-full bg-[#d9b978] px-6 text-[#071527] hover:bg-[#eed39a]">Enter your workspace <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
              <a href="#principles" className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-sm text-white/85 transition hover:border-[#d9b978]/70 hover:text-[#d9b978]">See the approach</a>
            </div>
          </div>
          <div className="relative min-h-[420px] animate-in fade-in zoom-in-95 duration-1000 lg:min-h-[560px]">
            <div className="absolute right-0 top-10 h-[420px] w-[78%] rounded-[2rem] border border-[#d9b978]/30 bg-[#e9dcc4] p-5 text-[#071527] shadow-2xl shadow-black/30 sm:h-[500px]">
              <div className="flex items-center justify-between border-b border-[#071527]/15 pb-4"><span className="font-serif text-xl">Your next chapter</span><span className="text-xs uppercase tracking-[.2em] text-[#607084]">01 / 04</span></div>
              <div className="mt-10 grid gap-5"><div className="h-36 rounded-2xl bg-[#0d2b47] p-6 text-[#f6f0e4]"><p className="text-xs uppercase tracking-[.2em] text-[#d9b978]">Featured path</p><p className="mt-4 font-serif text-3xl">Build with intent.</p></div><div className="grid grid-cols-2 gap-4"><div className="rounded-2xl bg-[#d9b978] p-5"><p className="text-3xl font-semibold">12</p><p className="mt-2 text-sm text-[#071527]/70">mentor perspectives</p></div><div className="rounded-2xl bg-white/70 p-5"><p className="text-3xl font-semibold">04</p><p className="mt-2 text-sm text-[#071527]/70">active pathways</p></div></div></div>
            </div>
            <div className="absolute bottom-2 left-0 w-[58%] rounded-[1.5rem] border border-white/15 bg-white/10 p-5 backdrop-blur-xl"><p className="text-xs uppercase tracking-[.2em] text-[#d9b978]">A considered starting point</p><p className="mt-3 font-serif text-2xl">Less noise. More signal.</p></div>
          </div>
        </div>
      </section>
      <section id="principles" className="bg-[#f6f0e4] py-24 text-[#071527]"><div className="mx-auto max-w-7xl px-6 lg:px-12"><div className="grid gap-12 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-xs font-semibold uppercase tracking-[.28em] text-[#a47b32]">The Edu-Pro point of view</p><h2 className="mt-5 max-w-md font-serif text-5xl leading-none tracking-[-.04em]">Designed for the work that matters after the first click.</h2></div><div className="grid gap-4 sm:grid-cols-3">{principles.map(({ icon: Icon, title, copy }) => <article key={title} className="rounded-3xl border border-[#071527]/10 bg-white/60 p-6 transition duration-300 hover:-translate-y-1 hover:shadow-xl"><Icon className="h-6 w-6 text-[#a47b32]" /><h3 className="mt-10 font-serif text-2xl">{title}</h3><p className="mt-3 text-sm leading-6 text-[#607084]">{copy}</p></article>)}</div></div></div></section>
      <section className="bg-[#e9dcc4] px-6 py-24 text-[#071527] lg:px-12" aria-labelledby="learning-guide-title"><div className="mx-auto grid max-w-7xl items-end gap-12 lg:grid-cols-[.9fr_1.1fr]"><div><p className="text-xs font-semibold uppercase tracking-[.28em] text-[#a47b32]">A considered first question</p><h2 id="learning-guide-title" className="mt-5 max-w-xl font-serif text-5xl leading-none tracking-[-.04em]">Start with what you’re trying to understand.</h2><p className="mt-6 max-w-lg leading-7 text-[#607084]">Edu-Pro’s guide turns a loose learning intention into a focused next step using the platform’s learning themes and mentor pathways.</p></div><form onSubmit={askAssistant} className="grid gap-3 rounded-3xl border border-[#071527]/10 bg-white/55 p-6"><label htmlFor="learning-question" className="text-sm font-semibold">What would make progress feel clearer?</label><div className="grid gap-3 sm:grid-cols-[1fr_auto]"><input id="learning-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={240} required placeholder="I want to build confidence with…" className="min-w-0 rounded-full border border-[#071527]/15 bg-white/70 px-5 py-3 text-sm outline-none focus:border-[#a47b32] focus:ring-2 focus:ring-[#d9b978]/40" /><Button type="submit" disabled={learningGuide.isPending} className="rounded-full bg-[#071527] px-5 text-[#f6f0e4] hover:bg-[#0d2b47]">Find a path <ArrowRight className="ml-2 h-4 w-4" /></Button></div><p className="min-h-6 text-sm text-[#607084]" role="status" aria-live="polite">{assistantStatus}</p></form></div></section>
      <footer className="bg-[#071527] px-6 py-8 text-sm text-[#c2d0dc] lg:px-12"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row"><span>Edu-Pro / A learning practice for curious people.</span><span className="text-[#d9b978]">Built with intention.</span></div></footer>
    </main>
  );
}
