import { HardLink as Link } from "@/components/hard-link";
import {
  ArrowRight,
  Radio,
  MessagesSquare,
  Newspaper,
  ShieldCheck,
  Check,
} from "lucide-react";
import { PublicShell } from "@/components/public-shell";
import { Button } from "@/components/ui/button";
export default function Home() {
  const features = [
    {
      icon: Radio,
      title: "The global lobby.",
      text: "Drop in, meet new players, and find your next teammate. There’s always a conversation to join.",
      href: "/chat",
      label: "Find your people",
    },
    {
      icon: MessagesSquare,
      title: "Keep your squad close.",
      text: "Your own corner of the community. Private chats, group hangouts, and voice notes for the whole squad.",
      href: "/messages",
      label: "Make room for your squad",
    },
    {
      icon: Newspaper,
      title: "Stories from the players.",
      text: "The updates, discoveries, and opinions that matter. Read the latest or share a story of your own.",
      href: "/news",
      label: "Explore gaming news",
    },
  ];
  return (
    <PublicShell>
      <section className="hero">
        <div className="hero-image" />
        <div className="wrap hero-content">
          <p className="eyebrow">
            <span className="live-dot" /> FOR THE LOVE OF THE GAME
          </p>
          <h1>
            Your game.
            <br />
            Your people.
            <br />
            <span>Your next chapter.</span>
          </h1>
          <p className="hero-copy">
            Find your squad, share your stories, and stay in the loop. A home
            for everyone who loves to play.
          </p>
          <div className="row wrap-row hero-actions">
            <Button size="lg" asChild>
              <Link href="/register">
                Join the community <ArrowRight size={17} />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#discover">Take a look around</a>
            </Button>
          </div>
          <p className="hero-note">Free to join. No phone number. Just you.</p>
        </div>
        <div className="wrap hero-caption">
          <span>EVERY GREAT ADVENTURE STARTS TOGETHER.</span>
          <span>NEXZZA / 01</span>
        </div>
      </section>
      <div className="platforms wrap">
        <span>ONE COMMUNITY. EVERY PLATFORM.</span>
        <div>
          PC <i /> PlayStation <i /> Xbox <i /> Nintendo <i /> Mobile
        </div>
      </div>
      <section id="discover" className="wrap discover">
        <p className="eyebrow blue">MORE THAN A USERNAME</p>
        <div className="section-intro">
          <h2>
            Good games bring us together.
            <br />
            Good people make us stay.
          </h2>
          <p>
            From the first “gg” to the last match of the night. Make yourself at
            home.
          </p>
        </div>
        <div className="feature-grid">
          {features.map((item, i) => (
            <Link className="feature-card" key={item.title} href={item.href}>
              <div className="row spread">
                <item.icon size={27} />
                <span className="feature-number">0{i + 1}</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <span className="feature-link">
                {item.label}
                <ArrowRight size={17} />
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="principles wrap">
        <div className="shield-art">
          <ShieldCheck size={82} strokeWidth={1} />
        </div>
        <div>
          <p className="eyebrow blue">PLAY NICE. PLAY TOGETHER.</p>
          <h2>
            A community worth
            <br />
            coming back to.
          </h2>
          <p>
            Good company makes every game better. We’re building a space where
            respect comes first.
          </p>
          <ul>
            {[
              "Verified email. Real accountability.",
              "Private spaces for you and your squad.",
              "Clear guidelines. A shared love of gaming.",
            ].map((s) => (
              <li key={s}>
                <Check size={17} />
                {s}
              </li>
            ))}
          </ul>
          <Link className="text-link" href="/guidelines">
            Read our community guidelines <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      <section className="join-banner wrap">
        <div>
          <p className="eyebrow">ALL GAMES. ALL PLAYERS.</p>
          <h2>There’s a place for you here.</h2>
          <p>Your next teammate could be one conversation away.</p>
        </div>
        <Button size="lg" asChild>
          <Link href="/register">
            Create your account <ArrowRight size={17} />
          </Link>
        </Button>
      </section>
    </PublicShell>
  );
}
