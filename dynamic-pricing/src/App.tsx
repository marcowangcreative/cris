import { useEffect, useState } from "react";
import { HistoryLog } from "./components/HistoryLog";
import { hasOpenSession, LockScreen } from "./components/LockScreen";
import { QuoteDesk } from "./components/QuoteDesk";
import { SeasonalityChart } from "./components/SeasonalityChart";
import { SettingsPanel } from "./components/SettingsPanel";
import type { PricingConfig } from "./engine";
import type { BookingRecord } from "./records";
import { loadConfig, loadHistory, saveConfig, saveHistory } from "./storage";

type Tab = "quote" | "season" | "history" | "settings";

const TABS: { id: Tab; label: string }[] = [
  { id: "quote", label: "Quote" },
  { id: "season", label: "Season" },
  { id: "history", label: "History" },
  { id: "settings", label: "Settings" },
];

function readTab(): Tab {
  const hash = window.location.hash.replace("#", "");
  return TABS.some((tab) => tab.id === hash) ? (hash as Tab) : "quote";
}

export function App() {
  const [config, setConfig] = useState<PricingConfig>(() => loadConfig());
  const [records, setRecords] = useState<BookingRecord[]>(() => loadHistory());
  const [tab, setTab] = useState<Tab>(() => readTab());
  const [unlocked, setUnlocked] = useState(() => hasOpenSession());

  useEffect(() => {
    if (!unlocked) return;
    saveConfig(config);
  }, [config, unlocked]);

  useEffect(() => {
    if (!unlocked) return;
    saveHistory(records);
  }, [records, unlocked]);

  if (!unlocked) {
    return <LockScreen onUnlock={() => setUnlocked(true)} />;
  }

  function select(next: Tab) {
    setTab(next);
    if (window.location.hash !== `#${next}`) {
      window.history.replaceState(null, "", `#${next}`);
    }
  }

  return (
    <>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <div className="shell">
        <header className="letterhead">
          <p className="eyebrow">Marco Wang Photography</p>
          <div className="title-row">
            <h1>Revenue desk</h1>
            <p className="private">Internal</p>
          </div>
          <p className="lede">
            Recommends what to quote when an inquiry comes in. You approve it. Nothing here changes a public price, and an approved quote is never repriced.
          </p>
        </header>
        <nav className="tabs" aria-label="Sections">
          {TABS.map((item) => (
            <button key={item.id} type="button" aria-current={tab === item.id ? "page" : undefined} onClick={() => select(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <main id="main">
          {tab === "quote" ? (
            <QuoteDesk
              config={config}
              history={records}
              onApprove={(record) => setRecords((current) => [record, ...current])}
            />
          ) : null}
          {tab === "season" ? <SeasonalityChart config={config} /> : null}
          {tab === "history" ? <HistoryLog config={config} records={records} onChange={setRecords} /> : null}
          {tab === "settings" ? <SettingsPanel config={config} onChange={setConfig} /> : null}
        </main>
        <footer className="colophon">
          <p>Revenue per available shooting date. Couples never see this screen, and there is no public price.</p>
        </footer>
      </div>
    </>
  );
}
